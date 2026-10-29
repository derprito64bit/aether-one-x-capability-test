import { PauseIcon, PlayIcon } from '../../components/icons.tsx'
import { motion, useMotionValueEvent, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Glass } from '../../components/Glass/Glass.tsx'
import {
  CHAPTERS,
  TEARDOWN_COPY,
  TEARDOWN_INTRO_STATS,
  figureFor,
  type TeardownStat,
} from '../chapters.ts'
import { inspectHit } from '../inspect.ts'
import type { ActId } from '../key.ts'
import { stageColors } from '../stage/stageColors.ts'
import { darkWeight, studioWeight } from '../backdrop/scenes.ts'
import { runScramble } from '../../lib/scramble.ts'
import { ScrambleText } from '../../components/ScrambleText.tsx'
import { scrollToProgress } from '../scroll.ts'
import { TEARDOWN_LAYERS, cursorAt } from '../teardown/layers.ts'
import { ACTS } from '../timeline.ts'
import { useChapter } from '../useChapter.ts'
import { BigNumeral } from './BigNumeral.tsx'
import { Callouts } from './Callouts.tsx'
import { overlayCursor } from './callouts.ts'
import { Headline } from './Headline.tsx'
import { Kicker } from './Kicker.tsx'
import { CHAPTER, ITEM } from './motion.ts'
import { SpecLines } from './SpecLines.tsx'
import { TOUR_END, TOUR_START, actRestStart, playRate, rawCursor, restTarget } from './tour.ts'
import { useScrollSettle } from '../../hooks/useScrollSettle.ts'
import { XrayReadout } from './XrayReadout.tsx'

interface FilmOverlayProps {
  progress: MotionValue<number>
  /** Runway section: rail and keyboard jumps map progress through it. */
  runway: RefObject<HTMLElement | null>
}

/** Rail labels: what each act is about, in plain words. */
const ACT_LABELS: Record<ActId, string> = {
  arrival: 'Arrival',
  settle: 'Design',
  approach: 'Glass',
  teardown: 'Teardown',
  camera: 'Camera',
  display: 'Display',
  storage: 'Storage',
  battery: 'Battery',
  software: 'Software',
  ai: 'Intelligence',
  final: 'Finish',
}

/**
 * Veils behind the copy column, in the room's colour (--veil-rgb).
 * Eased stops: a linear ramp to zero leaves a visible Mach band where it
 * ends, which reads as a panel edge cutting the stage. The side veils
 * scale by --veil-k: a dark room is already dark behind the copy, so the
 * veil eases off there and stops greying out the room's wall figure. The
 * phone veil (bottom) stays full: phone copy sits over the device itself.
 */
const VEIL_STOPS = (dir: string, reach: number, first = 0.8, scaled = true): string => {
  const at = (f: number): string => `${(f * reach).toFixed(1)}%`
  const a = (alpha: number): string =>
    scaled ? `calc(${alpha} * var(--veil-k, 1))` : String(alpha)
  return `linear-gradient(${dir}, rgb(var(--veil-rgb) / ${a(first)}) 0%, rgb(var(--veil-rgb) / ${a(0.7)}) ${at(0.3)}, rgb(var(--veil-rgb) / ${a(0.48)}) ${at(0.55)}, rgb(var(--veil-rgb) / ${a(0.22)}) ${at(0.75)}, rgb(var(--veil-rgb) / ${a(0.07)}) ${at(0.9)}, rgb(var(--veil-rgb) / 0) ${at(1)})`
}
const VEIL_LEFT = VEIL_STOPS('to right', 50)
const VEIL_RIGHT = VEIL_STOPS('to left', 50)
const VEIL_BOTTOM = VEIL_STOPS('to top', 62, 0.95, false)

/** 0..1 copy-card strength across the camera macro dive (p ~0.63-0.72). */
function macroCard(p: number): number {
  const up = Math.min(1, Math.max(0, (p - 0.622) / 0.02))
  const down = Math.min(1, Math.max(0, (0.722 - p) / 0.012))
  return Math.min(up, down)
}

let reducedQuery: MediaQueryList | null = null

/** One cached query: the overlay loops read this every frame. */
function reducedMotion(): boolean {
  reducedQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)')
  return reducedQuery.matches
}

/**
 * Scroll-linked stagger inside a teardown card: step `n` of the card
 * fades and rises in as the card's --reveal (0..1, written by the card
 * loop) passes it. Pure CSS off one variable, so it scrubs both ways.
 */
function stagger(n: number): CSSProperties {
  const t = `clamp(0, calc((var(--reveal, 1) - ${(n * 0.1).toFixed(2)}) * 4), 1)`
  return { opacity: t, transform: `translateY(calc((1 - ${t}) * 10px))` }
}

/** A part's headline capabilities: figure first, then what it buys you. */
function StatGrid({
  stats,
  columns,
  className = '',
}: {
  stats: TeardownStat[]
  columns: 2 | 3
  className?: string
}) {
  return (
    <dl
      className={`mt-5 grid gap-x-6 gap-y-3.5 border-t border-(--color-border-hairline) pt-4 md:mt-7 md:gap-y-5 md:pt-6 ${
        columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
      } ${className}`}
    >
      {stats.map((stat, k) => (
        <div key={stat.label} className="flex flex-col" style={stagger(2 + k * 0.6)}>
          <dt className="mt-1 text-[11.5px] leading-snug text-(--color-dim) md:mt-1.5 md:text-[12.5px]">
            {stat.label}
          </dt>
          <dd className="order-first flex items-baseline gap-1 font-mono text-[1.15rem] leading-none font-medium tracking-[-0.05em] text-(--color-ink) tabular-nums md:text-[clamp(1.3rem,1.75vw,1.75rem)]">
            <ScrambleText auto={false} text={stat.value} />
            {stat.unit !== '' && (
              <span className="text-[0.52em] font-medium tracking-normal text-(--color-dim)">
                {stat.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The copy numeral stands down where the act's room projects the figure:
 * everywhere, or on desktop only when phones get no figure (see
 * SceneBoard.onPhones).
 */
function numeralQuiet(id: ActId): boolean | 'desktop' {
  const board = figureFor(id)
  if (board === null) return false
  return board.onPhones === false ? 'desktop' : true
}

/** Progress of the runway's current scroll position (mapped like Film). */
function runwayProgress(el: HTMLElement): number | null {
  const rect = el.getBoundingClientRect()
  const span = rect.height - window.innerHeight
  if (span <= 0) return null
  return (window.scrollY - (rect.top + window.scrollY)) / span
}

/**
 * Editorial captions, act rail, teardown controls and inspect tooltip.
 * Copy owns a side column (the camera keeps the device centred), with a
 * soft porcelain veil on that side only; under 768px it drops to the
 * bottom over an upward veil. Chapters enter in reading order and exit
 * fast. The rail numbers a true sequence and carries a continuous
 * progress line bound straight to the scroll MotionValue.
 */
export function FilmOverlay({ progress, runway }: FilmOverlayProps) {
  const act = useChapter(progress)
  const [readout, setReadout] = useState<string | null>(null)
  const chapter = CHAPTERS.find((c) => c.act === act.id) ?? CHAPTERS[0]
  const side = act.align === 'right' ? 'right' : 'left'
  // Teardown showcase copy: the overview intro and one card per layer
  // render once in a grid stack, and a rAF loop writes opacity and the
  // stagger variable straight from the cursor (round 03 Part B):
  // AnimatePresence wedged on fast scrolls, while scroll-positioned cards
  // are exactly reversible because they are a pure function of progress.
  const introRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const segRefs = useRef<Array<HTMLSpanElement | null>>([])
  useEffect(() => {
    let raf = 0
    const last = TEARDOWN_COPY.length - 1
    // Edge-triggered decode: a card's code-set parts scramble in each time
    // it turns visible (a time-based UI flourish; the card itself stays a
    // pure function of progress).
    const lit = new WeakSet<HTMLElement>()
    const show = (el: HTMLElement, o: number, reveal: number): void => {
      el.style.opacity = o.toFixed(3)
      el.style.visibility = o <= 0.01 ? 'hidden' : 'visible'
      el.style.setProperty('--reveal', reveal.toFixed(3))
      if (o > 0.5 && !lit.has(el)) {
        lit.add(el)
        runScramble(el)
      } else if (o < 0.05 && lit.has(el)) lit.delete(el)
    }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const p = progress.get()
      const reduced = reducedMotion()
      // Cards follow the cursor the layers move on (damped by the director
      // while the canvas runs), so copy never changes ahead of the part.
      // Before the tour the raw cursor runs negative: the intro holds over
      // the opening sandwich and hands over just before layer 0 arrives.
      const raw = rawCursor(p)
      const c = raw < 0 ? raw : Math.min(overlayCursor(cursorAt(p), performance.now()), 10)
      const intro = introRef.current
      if (intro !== null) {
        const entry = Math.min(1, Math.max(0, (p - 0.252) / 0.012))
        const exit = Math.min(1, Math.max(0, (-0.06 - raw) / 0.1))
        show(intro, entry * exit, reduced ? 1 : entry)
      }
      const activeLayer = raw < -0.04 ? -1 : Math.min(last, Math.max(0, Math.floor(c + 0.04)))
      for (let i = 0; i <= last; i++) {
        const el = cardRefs.current[i]
        if (el !== null && el !== undefined) {
          // One card at a time: in as the part starts to arrive, out as it
          // returns, so the copy turns over with the part (never overlaps).
          const d = c - i
          const entry = Math.min(1, Math.max(0, (d + 0.04) / 0.08))
          const exit = i === last ? 1 : Math.min(1, Math.max(0, (0.96 - d) / 0.1))
          // Stagger: headline, intro, then each capability, as it arrives.
          const reveal = reduced ? 1 : Math.min(1, Math.max(0, (d + 0.04) / 0.4))
          show(el, entry * exit, reveal)
        }
        const seg = segRefs.current[i]
        if (seg !== null && seg !== undefined) {
          seg.style.opacity = i === activeLayer ? '1' : i < activeLayer ? '0.42' : '0.14'
          seg.style.transform = i === activeLayer ? 'scaleY(1.6)' : 'scaleY(1)'
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  useEffect(() => {
    if (act.id !== 'teardown') {
      setReadout(null)
      return
    }
    const timer = window.setInterval(() => {
      const hit = inspectHit()
      setReadout(hit?.readout ?? null)
    }, 200)
    return () => window.clearInterval(timer)
  }, [act.id])

  // Auto-play the teardown (overnight watchability): one press opens the
  // sandwich, holds the overview, then presents each layer for about four
  // seconds. Any manual input (wheel, touch, keys) takes over instantly.
  // Never offered under reduced motion. Pure scroll driving, the film
  // follows exactly. The position accumulates in progress space: rereading
  // a rounded scrollY each frame stalls on slow phones.
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const el = runway.current
    const start = el === null ? null : runwayProgress(el)
    if (el === null || start === null) return
    let raf = 0
    let last = performance.now()
    let pos = start >= TOUR_END ? TOUR_START : start
    const stop = (): void => setPlaying(false)
    // Input on the button itself is the button's own business: a key or tap
    // there must reach its toggle, not stop the tour only for the click
    // that follows to start it again.
    const onInterrupt = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest('[data-testid="teardown-play"]'))
        return
      stop()
    }
    window.addEventListener('wheel', onInterrupt, { passive: true })
    window.addEventListener('touchstart', onInterrupt, { passive: true })
    window.addEventListener('keydown', onInterrupt)
    const step = (now: number): void => {
      raf = requestAnimationFrame(step)
      // Up to a quarter second per frame: a struggling device still keeps
      // roughly the tour's pace (the film follows progress exactly).
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      pos += dt * playRate(pos)
      if (pos >= TOUR_END) {
        scrollToProgress(el, TOUR_END, 'instant')
        stop()
        return
      }
      scrollToProgress(el, pos, 'instant')
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onInterrupt)
      window.removeEventListener('touchstart', onInterrupt)
      window.removeEventListener('keydown', onInterrupt)
    }
  }, [playing, runway])

  // Section settle across the whole film: a scroll that comes to rest
  // between sections (an act changing, a part half out of the stack)
  // finishes that move in the direction of travel, so the film always rests
  // on a composed shot. The page-level settle (SectionSettle) takes over at
  // the runway's ends. Off while the tour plays.
  useScrollSettle(
    progress,
    (dir) => {
      const el = runway.current
      const p = progress.get()
      if (el === null || p <= 0 || p >= 1) return null
      const to = restTarget(p, dir)
      if (to === null) return null
      const rect = el.getBoundingClientRect()
      return rect.top + window.scrollY + to * (rect.height - window.innerHeight)
    },
    !playing,
  )

  // Keyboard film navigation: arrows jump between acts with an aria-live
  // announcement of the act name (the chapter container below is the live
  // region). Ignored inside text fields and the dev scrubber slider.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      const target = event.target as HTMLElement | null
      if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const index = ACTS.findIndex((a) => a.id === act.id)
      const next = event.key === 'ArrowRight' ? ACTS[index + 1] : ACTS[index - 1]
      if (next === undefined) return
      event.preventDefault()
      const el = runway.current
      if (el !== null)
        scrollToProgress(el, actRestStart(next.id), reducedMotion() ? 'instant' : 'smooth')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act.id, runway])

  // Scroll-driven page tint (Prompt D section 8.1): the act colour at low
  // opacity over the page. Written straight to the DOM, never React state.
  // Hooks stay above the empty-chapters bail so the order never changes.
  const tintRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  useMotionValueEvent(progress, 'change', (p) => {
    const v = typeof p === 'number' ? p : 0
    // The camera macro fills the whole frame with the phone's back, so no
    // side is free: the copy rides a porcelain card for that span only.
    // Desktop only; mobile copy already sits over the bottom veil.
    const card = cardRef.current
    if (card !== null) {
      const amount = window.innerWidth >= 768 ? macroCard(v) : 0
      card.style.setProperty('--card', amount.toFixed(3))
    }
    const { base } = stageColors(v)
    // The act tint belongs to the studio sweep; scenes carry their own.
    const tint = tintRef.current
    if (tint !== null) {
      tint.style.backgroundColor = `#${base.getHexString()}2e`
      tint.style.opacity = studioWeight(v).toFixed(3)
    }
    // Copy tone follows the room (section scenes): ink in light rooms,
    // light type in the dark ones, over a veil that blends continuously.
    const dark = darkWeight(v)
    const light = dark < 0.5
    const root = rootRef.current
    if (root !== null) {
      root.classList.toggle('light-scope', light)
      root.classList.toggle('dark-scope', !light)
      const mix = (a: number, b: number): number => Math.round(a + (b - a) * dark)
      root.style.setProperty('--veil-rgb', `${mix(242, 7)} ${mix(240, 8)} ${mix(235, 11)}`)
      root.style.setProperty('--veil-k', (1 - 0.5 * dark).toFixed(3))
      root.style.setProperty('--card-rgb', light ? '254 253 251' : '18 20 27')
      root.style.setProperty('--card-ring', light ? '220 216 207' : '52 57 74')
    }
  })
  if (chapter === undefined) return null
  const teardown = act.id === 'teardown'
  return (
    <div
      ref={rootRef}
      className="group/film light-scope pointer-events-none absolute inset-0"
      style={
        {
          '--veil-rgb': '242 240 235',
          '--card-rgb': '254 253 251',
          '--card-ring': '220 216 207',
        } as CSSProperties
      }
    >
      <div ref={tintRef} aria-hidden="true" className="absolute inset-0" />
      {/* Copy-side veils: crossfade with the act's side; never over the device. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden transition-opacity duration-700 md:block"
        style={{ background: VEIL_LEFT, opacity: side === 'left' ? 1 : 0 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden transition-opacity duration-700 md:block"
        style={{ background: VEIL_RIGHT, opacity: side === 'right' ? 1 : 0 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 md:hidden"
        style={{ background: VEIL_BOTTOM }}
      />
      {/* Stage foot dissolves into the page, so the film hands off to the
          configurator without a hard tone edge when the runway ends. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 hidden h-32 md:block"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--veil-rgb) / 0.92) 0%, rgb(var(--veil-rgb) / 0.5) 45%, rgb(var(--veil-rgb) / 0) 100%)',
        }}
      />

      {/* Mobile film progress: a hairline across the top of the stage. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 md:hidden">
        <motion.div className="h-full origin-left bg-(--color-ink)" style={{ scaleX: progress }} />
      </div>

      <div
        data-align={side}
        data-testid="film-chapter"
        data-act={act.id}
        aria-live="polite"
        className={`absolute inset-x-0 bottom-0 px-5 md:inset-x-auto md:bottom-auto md:top-1/2 md:w-[min(24vw,28rem)] xl:w-[min(27vw,28rem)] md:-translate-y-1/2 md:px-0 md:pb-0 md:data-[align=left]:left-[max(var(--page-gutter),4vw)] md:data-[align=right]:right-[calc(4vw+4.5rem)] ${
          teardown ? 'pb-20 md:pb-0' : 'pb-[calc(2rem+var(--sab))]'
        }`}
      >
        <div
          ref={cardRef}
          className="md:-m-7 md:rounded-[1.75rem] md:p-7"
          style={{
            background: 'rgb(var(--card-rgb) / calc(var(--card, 0) * 0.9))',
            boxShadow:
              '0 0 0 1px rgb(var(--card-ring) / var(--card, 0)), 0 24px 60px -30px rgb(0 0 0 / calc(var(--card, 0) * 0.45))',
            backdropFilter: 'blur(calc(var(--card, 0) * 18px))',
          }}
        >
          {/* Keyed remount, no exit wait: AnimatePresence mode="wait" wedged
              on an old chapter when a long jump (e.g. /#buy from another
              page) crossed several acts faster than the exits could finish. */}
          <motion.div
            key={act.id}
            variants={CHAPTER}
            initial="hidden"
            animate="show"
            className={teardown ? 'flex flex-col' : undefined}
          >
            {teardown ? (
              <>
                <div className="grid">
                  <div
                    ref={introRef}
                    data-testid="teardown-intro"
                    className="col-start-1 row-start-1"
                    style={{ opacity: 0, visibility: 'hidden' }}
                  >
                    <p className="kicker flex items-center gap-3 text-(--color-aether-strong)">
                      <span aria-hidden="true" className="h-px w-8 bg-(--color-aether)" />
                      <ScrambleText auto={false} text={chapter.kicker} />
                    </p>
                    <h2
                      className="display-lg mt-3 text-[1.55rem] text-balance md:mt-4 md:text-[clamp(1.85rem,3.3vw,3.35rem)]"
                      style={stagger(0)}
                    >
                      {chapter.headline}
                    </h2>
                    <p
                      className="mt-3 max-w-[38ch] text-[14px] md:mt-4 leading-relaxed text-(--color-dim) md:text-[17px]"
                      style={stagger(1)}
                    >
                      {chapter.body}
                    </p>
                    <StatGrid
                      stats={TEARDOWN_INTRO_STATS}
                      columns={3}
                      className="group-data-[overview=num]/film:hidden"
                    />
                    {/* Legend for the numbered overview markers (phones, or
                        wherever names do not fit beside the sandwich). */}
                    <ol
                      className="mt-4 hidden grid-flow-col grid-rows-5 gap-x-6 gap-y-1 border-t border-(--color-border-hairline) pt-3 font-mono text-[10.5px] tracking-[0.08em] text-(--color-ink) uppercase group-data-[overview=num]/film:grid"
                      style={stagger(2)}
                    >
                      {TEARDOWN_COPY.map((copy, i) => (
                        <li key={copy.key} className="flex gap-2">
                          <span className="text-(--color-faint)">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {copy.name}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {TEARDOWN_COPY.map((copy, i) => (
                    <article
                      key={copy.key}
                      ref={(el) => {
                        cardRefs.current[i] = el
                      }}
                      aria-label={`Layer ${i + 1} of ${TEARDOWN_COPY.length}: ${copy.name}`}
                      data-testid={`teardown-card-${copy.key}`}
                      className="col-start-1 row-start-1"
                      style={{ opacity: 0, visibility: 'hidden' }}
                    >
                      <p className="kicker flex items-center gap-2.5">
                        <span className="text-(--color-ink) tabular-nums">
                          <ScrambleText auto={false} text={String(i + 1).padStart(2, '0')} />
                        </span>
                        <span className="text-(--color-faint)">/ {TEARDOWN_COPY.length}</span>
                        <span
                          aria-hidden="true"
                          className="mx-1 h-px w-7"
                          style={{ backgroundColor: TEARDOWN_LAYERS[i]?.accent ?? '#1f5fd0' }}
                        />
                        <ScrambleText
                          auto={false}
                          className="text-(--color-aether-strong)"
                          text={copy.name}
                        />
                      </p>
                      <h2
                        className="display-lg mt-3 text-[1.5rem] text-balance md:mt-4 md:text-[clamp(1.7rem,3vw,3.1rem)]"
                        style={stagger(0)}
                      >
                        {copy.headline}
                      </h2>
                      <p
                        className="mt-3 max-w-[40ch] text-[14px] md:mt-4 leading-relaxed text-(--color-dim) md:text-[16.5px]"
                        style={stagger(1)}
                      >
                        {copy.intro}
                      </p>
                      <StatGrid stats={copy.stats} columns={2} />
                    </article>
                  ))}
                </div>
                {/* Ten layers, physical stack order: where the tour is. On
                    phones the card index carries it, so the part keeps the frame. */}
                <motion.div
                  aria-hidden="true"
                  className="mt-8 hidden items-center gap-1 md:flex"
                  variants={ITEM}
                >
                  {TEARDOWN_COPY.map((copy, i) => (
                    <span
                      key={copy.key}
                      ref={(el) => {
                        segRefs.current[i] = el
                      }}
                      className="h-[3px] w-4 rounded-full bg-(--color-ink) transition-[opacity,transform] duration-300 md:w-6"
                      style={{ opacity: 0.14 }}
                    />
                  ))}
                </motion.div>
              </>
            ) : (
              <>
                <Kicker>{chapter.kicker}</Kicker>
                <Headline text={chapter.headline} />
                <motion.p
                  className="mt-4 max-w-[34ch] text-base leading-relaxed text-(--color-dim) md:text-lg"
                  variants={ITEM}
                >
                  {chapter.body}
                </motion.p>
                {chapter.numeral !== undefined ? (
                  <BigNumeral numeral={chapter.numeral} quiet={numeralQuiet(act.id)} />
                ) : null}
                {chapter.spec !== undefined ? <SpecLines lines={chapter.spec} /> : null}
              </>
            )}
          </motion.div>
        </div>
      </div>

      {readout !== null ? (
        <div className="dark-scope absolute left-1/2 top-24 -translate-x-1/2">
          <Glass variant="tooltip" label="Inspected part">
            <XrayReadout readout={readout} />
          </Glass>
        </div>
      ) : null}

      {teardown && <Callouts progress={progress} />}

      {teardown ? (
        <button
          type="button"
          aria-pressed={playing}
          aria-label={playing ? 'Pause the teardown showcase' : 'Play the teardown showcase'}
          data-testid="teardown-play"
          onClick={() => setPlaying((v) => !v && !reducedMotion())}
          className="btn pointer-events-auto absolute right-5 bottom-6 bg-(--color-raise)/85 text-sm shadow-[0_0_0_1px_var(--color-border-hairline),0_10px_30px_-14px_rgba(40,30,10,0.4)] backdrop-blur-md md:right-[calc(4vw+4.5rem)] md:bottom-10"
        >
          {playing ? (
            <PauseIcon size={16} weight="fill" aria-hidden="true" />
          ) : (
            <PlayIcon size={16} weight="fill" aria-hidden="true" />
          )}
          {playing ? 'Pause' : 'Play the teardown'}
        </button>
      ) : null}

      <nav
        aria-label="Film acts"
        className="pointer-events-auto absolute top-1/2 right-4 hidden -translate-y-1/2 md:block lg:right-6"
      >
        <div className="relative flex flex-col">
          <span
            aria-hidden="true"
            className="absolute top-3 right-[7px] bottom-3 w-px bg-(--color-border-strong)"
          />
          <motion.span
            aria-hidden="true"
            className="absolute top-3 right-[7px] bottom-3 w-px origin-top bg-(--color-ink)"
            style={{ scaleY: progress }}
          />
          {ACTS.map((a, i) => (
            <a
              key={a.id}
              href={`#act-${a.id}`}
              aria-label={`Act ${i + 1}: ${a.id} (${ACT_LABELS[a.id]})`}
              aria-current={a.id === act.id ? 'true' : undefined}
              data-active={a.id === act.id}
              className="group flex items-center justify-end gap-3 py-[5px]"
              onClick={(e) => {
                e.preventDefault()
                const el = runway.current
                if (el !== null)
                  scrollToProgress(el, actRestStart(a.id), reducedMotion() ? 'instant' : 'smooth')
              }}
            >
              <span className="translate-x-1 text-xs font-medium text-(--color-dim) opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-data-[active=true]:translate-x-0 group-data-[active=true]:text-(--color-ink) group-data-[active=true]:opacity-100">
                {ACT_LABELS[a.id]}
              </span>
              <span className="relative flex h-[15px] w-[15px] items-center justify-center">
                <span className="h-[5px] w-[5px] rounded-full bg-(--color-dim) transition-transform duration-300 group-hover:bg-(--color-ink) group-data-[active=true]:scale-[1.8] group-data-[active=true]:bg-(--color-ink)" />
              </span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}
