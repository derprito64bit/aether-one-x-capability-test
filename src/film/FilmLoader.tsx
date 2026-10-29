import { useEffect, useRef, useState } from 'react'
import { LOAD_EXPECTED_S, type LoadTracker } from './loadTracker.ts'

/** Delay before showing: a warm-cache visit finishes first and never flashes. */
const SHOW_AFTER_MS = 160
/** Never strand a visitor behind the loader if something stalls. */
const FAILSAFE_MS = 20000
/** Hand-off: the silhouette grows toward the hero phone as the veil lifts. */
const LEAVE_MS = 760
/** Quick catch-up to a newly reached floor before the slow approach begins. */
const CATCH_UP_MS = 380

type Phase = 'pending' | 'visible' | 'leaving' | 'gone'

// Silhouette in body proportions (76.8 x 159.6 mm -> 160 x 332 units), with
// the front glass inset by the frame and bezel and the round punch-hole.
const BODY = { x: 2, y: 2, w: 156, h: 328, r: 27 }
const SCREEN = { x: 8, y: 8, w: 144, h: 316, r: 21 }
/** The screen rect as percentages of the phone box, for the HTML fill. */
const SCREEN_BOX = {
  left: `${(SCREEN.x / 160) * 100}%`,
  top: `${(SCREEN.y / 332) * 100}%`,
  width: `${(SCREEN.w / 160) * 100}%`,
  height: `${(SCREEN.h / 332) * 100}%`,
  borderRadius: `${(SCREEN.r / SCREEN.w) * 100}% / ${(SCREEN.r / SCREEN.h) * 100}%`,
}

/** Fill amount (0..1) currently on screen, read from the mask's live transform. */
function shownFill(mask: HTMLElement): number {
  const t = getComputedStyle(mask).transform
  if (t === 'none' || mask.offsetHeight === 0) return 0
  const ty = new DOMMatrixReadOnly(t).m42
  return Math.min(1, Math.max(0, 1 - ty / mask.offsetHeight))
}

/** Keyframes for the reveal pair at fill s (mask down, wallpaper counter-up). */
const maskAt = (s: number): Keyframe => ({
  transform: `translateY(${((1 - s) * 100).toFixed(3)}%)`,
})
const wallAt = (s: number): Keyframe => ({
  transform: `translateY(${(-(1 - s) * 100).toFixed(3)}%)`,
})

/**
 * First-visit loader where the phone is the progress bar: its outline draws
 * in, then the screen fills from the bottom with the live-screen wallpaper
 * as real milestones land (see loadTracker.ts).
 *
 * The fill runs on the compositor (Web Animations on transforms only), so it
 * keeps moving while building the scene holds the main thread for seconds:
 * at each milestone one animation catches up to the new floor, then eases
 * toward the next milestone's ceiling and never past it. A mask and a
 * counter-moved wallpaper reveal the gradient without squashing it; a lit
 * edge rides the mask. At 100% the silhouette scales toward the hero phone
 * while the veil dissolves into the film's first frame.
 */
/** True when the page was opened at a specific place (a hash or ?t=). */
function deepLinked(): boolean {
  return window.location.hash !== '' || new URLSearchParams(window.location.search).has('t')
}

export function FilmLoader({ tracker }: { tracker: LoadTracker }) {
  // A link that lands somewhere specific (/#buy below the film, or a ?t=
  // frame inside it) never gets the loader: it would cover the very thing
  // the reader asked for while the 3D loads.
  const [phase, setPhase] = useState<Phase>(() =>
    tracker.seen || tracker.complete() || deepLinked() ? 'gone' : 'pending',
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  // Phase gate: show only if loading outlasts SHOW_AFTER_MS.
  useEffect(() => {
    if (phase !== 'pending') return
    const t = window.setTimeout(() => {
      if (tracker.complete()) {
        tracker.seen = true
        setPhase('gone')
      } else setPhase('visible')
    }, SHOW_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [phase, tracker])

  // Visible: drive the compositor fill from milestones; update the readout.
  useEffect(() => {
    if (phase !== 'visible') return
    const mask = maskRef.current
    const wall = wallRef.current
    if (mask === null || wall === null) return
    let raf = 0
    let lastFloor = -1
    let lastPending: string | null = 'init'
    let finishing = false
    let anims: Animation[] = []
    let lastPct = -1
    // Our own model of the running animation. Right after a long main-thread
    // stall the computed-style readback can lag what the compositor already
    // showed, and starting the next animation from that stale value made the
    // bar jump backwards (caught in a cold-load screencast). The fill is
    // therefore taken as the max of the model, the readback and the highest
    // value shown so far: it can step forward, never back.
    let model: { t0: number; duration: number; points: Array<[number, number]> } | null = null
    let highest = 0
    const modelAt = (now: number): number => {
      if (model === null) return 0
      const k = Math.min(1, Math.max(0, (now - model.t0) / model.duration))
      const pts = model.points
      for (let i = 1; i < pts.length; i++) {
        const [o1, s1] = pts[i]!
        const [o0, s0] = pts[i - 1]!
        if (k <= o1) return s0 + (s1 - s0) * ((k - o0) / Math.max(1e-6, o1 - o0))
      }
      return pts[pts.length - 1]![1]
    }
    const failsafe = window.setTimeout(() => setPhase('leaving'), FAILSAFE_MS)

    const run = (from: number, frames: Array<[number, number]>, duration: number): void => {
      // Pin the base style to the current fill first: between cancelling the
      // old animation and the new one reaching the compositor there is a
      // frame where only the base style shows (it read as a one-frame drop).
      mask.style.transform = maskAt(from).transform as string
      wall.style.transform = wallAt(from).transform as string
      for (const a of anims) a.cancel()
      model = { t0: performance.now(), duration, points: [[0, from], ...frames] }
      const opts: KeyframeAnimationOptions = { duration, fill: 'forwards', easing: 'linear' }
      anims = [
        mask.animate(
          [
            { ...maskAt(from), offset: 0 },
            ...frames.map(([o, s]) => ({ ...maskAt(s), offset: o })),
          ],
          opts,
        ),
        wall.animate(
          [
            { ...wallAt(from), offset: 0 },
            ...frames.map(([o, s]) => ({ ...wallAt(s), offset: o })),
          ],
          opts,
        ),
      ]
      // Start the clock now, explicitly. A new animation's start time is
      // otherwise resolved when it reaches the compositor, and a milestone is
      // often followed at once by a multi-second scene-building task: the
      // animation then began late from its stale first keyframe and the bar
      // fell back (measured: 62% -> 26%). With the start time fixed here, a
      // late commit lands already advanced, a step forward, never back.
      const startTime = document.timeline.currentTime
      if (startTime !== null) for (const a of anims) a.startTime = startTime
    }

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      highest = Math.max(highest, modelAt(now), shownFill(mask))
      const shown = highest
      const pct = Math.round(shown * 100)
      if (pct !== lastPct) {
        lastPct = pct
        rootRef.current?.setAttribute('aria-valuenow', String(pct))
        rootRef.current?.setAttribute(
          'aria-valuetext',
          `${pct} percent, ${tracker.label().toLowerCase()}`,
        )
      }
      if (finishing) {
        if (shown > 0.998) {
          cancelAnimationFrame(raf)
          setPhase('leaving')
        }
        return
      }
      if (tracker.complete()) {
        finishing = true
        if (labelRef.current !== null) labelRef.current.textContent = tracker.label()
        run(shown, [[1, 1]], 420)
        return
      }
      const floor = tracker.value()
      const pending = tracker.pending()
      if (floor === lastFloor && pending === lastPending) return
      lastFloor = floor
      lastPending = pending
      if (labelRef.current !== null) labelRef.current.textContent = tracker.label()
      // One compositor animation per milestone: catch up to the floor, then
      // ease toward 80% of the gap to the next ceiling over its typical time.
      const start = shown
      const approach = floor + (tracker.ceiling() - floor) * 0.8
      const slowMs = (pending !== null ? LOAD_EXPECTED_S[pending] : 1) * 1000 * 1.4
      const total = CATCH_UP_MS + slowMs
      const q = CATCH_UP_MS / total
      // Ease-out approach sampled into keyframes (linear between samples).
      const frames: Array<[number, number]> = [[q, Math.max(start, floor)]]
      for (let i = 1; i <= 8; i++) {
        const k = i / 8
        const eased = 1 - Math.pow(1 - k, 3)
        frames.push([q + (1 - q) * k, Math.max(start, floor + (approach - floor) * eased)])
      }
      run(start, frames, total)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(failsafe)
    }
  }, [phase, tracker])

  // Leaving: let the hand-off play, then unmount.
  useEffect(() => {
    if (phase !== 'leaving') return
    tracker.seen = true
    const t = window.setTimeout(() => setPhase('gone'), LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [phase, tracker])

  // Hold the page still only while the loader is on screen, by refusing
  // scroll input rather than toggling overflow on <html>: WebKit can drop
  // the scroll position when the root's overflow changes.
  useEffect(() => {
    if (phase !== 'visible') return
    const block = (event: Event): void => event.preventDefault()
    const keys = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])
    const blockKeys = (event: KeyboardEvent): void => {
      if (keys.has(event.key)) event.preventDefault()
    }
    window.addEventListener('wheel', block, { passive: false })
    window.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('keydown', blockKeys)
    return () => {
      window.removeEventListener('wheel', block)
      window.removeEventListener('touchmove', block)
      window.removeEventListener('keydown', blockKeys)
    }
  }, [phase])

  if (phase === 'gone' || phase === 'pending') return null
  const leaving = phase === 'leaving'
  return (
    <div
      ref={rootRef}
      role="progressbar"
      aria-label="Loading the Aether One X film"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      data-testid="film-loader"
      data-phase={phase}
      className="film-loader fixed inset-0 z-[45] grid place-items-center"
      style={{
        opacity: leaving ? 0 : 1,
        transition: `opacity ${LEAVE_MS - 120}ms var(--ease-out-quint) 80ms`,
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col items-center">
        <div
          className="relative aspect-[160/332] h-[min(46vh,22rem)]"
          style={{
            transform: leaving ? 'scale(1.55)' : 'scale(1)',
            transition: `transform ${LEAVE_MS}ms var(--ease-out-expo)`,
          }}
        >
          {/* Body plate under everything. */}
          <svg viewBox="0 0 160 332" aria-hidden="true" className="absolute inset-0 h-full w-full">
            <rect
              x={BODY.x}
              y={BODY.y}
              width={BODY.w}
              height={BODY.h}
              rx={BODY.r}
              className="fill-(--color-raise)"
            />
            <rect
              x={SCREEN.x}
              y={SCREEN.y}
              width={SCREEN.w}
              height={SCREEN.h}
              rx={SCREEN.r}
              className="fill-(--color-sunken)"
            />
          </svg>
          {/* Screen fill: compositor-only reveal (mask down, wallpaper up). */}
          <div aria-hidden="true" className="absolute overflow-hidden" style={SCREEN_BOX}>
            <div
              ref={maskRef}
              className="absolute inset-0 overflow-hidden will-change-transform"
              style={{ transform: 'translateY(100%)' }}
            >
              <div
                ref={wallRef}
                className="film-loader-wall absolute inset-0 will-change-transform"
                style={{ transform: 'translateY(-100%)' }}
              />
              <div className="film-loader-edge absolute inset-x-0 top-0 h-3 -translate-y-1/2" />
            </div>
          </div>
          {/* Outline drawn on top, then the punch-hole. */}
          <svg viewBox="0 0 160 332" aria-hidden="true" className="absolute inset-0 h-full w-full">
            <rect
              x={BODY.x}
              y={BODY.y}
              width={BODY.w}
              height={BODY.h}
              rx={BODY.r}
              pathLength={1}
              className="film-loader-draw fill-none stroke-(--color-ink)"
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={SCREEN.x}
              y={SCREEN.y}
              width={SCREEN.w}
              height={SCREEN.h}
              rx={SCREEN.r}
              pathLength={1}
              className="film-loader-draw film-loader-draw--late fill-none stroke-(--color-ink)"
              strokeOpacity={0.35}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={80} cy={20} r={3.4} className="fill-(--color-ink)" />
          </svg>
        </div>
        {/* No visible number: text can only update on the main thread, so
            during scene building it would contradict the compositor fill.
            The fill is the bar; the step names what is happening; the exact
            percentage stays on aria-valuenow for assistive tech. */}
        <p className="mt-8 text-sm font-medium tracking-[-0.01em] text-(--color-ink)">
          Aether One X
        </p>
        <p className="kicker mt-2">
          <span ref={labelRef}>{tracker.label()}</span>
        </p>
      </div>
    </div>
  )
}
