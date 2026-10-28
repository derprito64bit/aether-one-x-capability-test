import { PauseIcon, PlayIcon } from '../../components/icons.tsx'
import { motion, useMotionValueEvent, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Glass } from '../../components/Glass/Glass.tsx'
import { CHAPTERS, TEARDOWN_COPY } from '../chapters.ts'
import { inspectHit } from '../inspect.ts'
import type { ActId } from '../key.ts'
import { luminance, scrimForStage, stageColors } from '../stage/stageColors.ts'
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
 * Porcelain veils behind the copy column (page token, varying alpha).
 * Eased stops: a linear ramp to zero leaves a visible Mach band where it
 * ends, which reads as a panel edge cutting the stage.
 */
const VEIL_STOPS = (dir: string, reach: number): string => {
  const at = (f: number): string => `${(f * reach).toFixed(1)}%`
  return `linear-gradient(${dir}, rgba(242,240,235,0.8) 0%, rgba(242,240,235,0.7) ${at(0.3)}, rgba(242,240,235,0.48) ${at(0.55)}, rgba(242,240,235,0.22) ${at(0.75)}, rgba(242,240,235,0.07) ${at(0.9)}, rgba(242,240,235,0) ${at(1)})`
}
const VEIL_LEFT = VEIL_STOPS('to right', 50)
const VEIL_RIGHT = VEIL_STOPS('to left', 50)
const VEIL_BOTTOM = VEIL_STOPS('to top', 62).replace('0.8)', '0.95)')

/** 0..1 copy-card strength across the camera macro dive (p ~0.63-0.72). */
function macroCard(p: number): number {
  const up = Math.min(1, Math.max(0, (p - 0.622) / 0.02))
  const down = Math.min(1, Math.max(0, (0.722 - p) / 0.012))
  return Math.min(up, down)
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  // Teardown layer cards: all ten render once in a grid stack and a rAF
  // loop writes opacity/transform straight from the continuous cursor
  // (round 03 Part B). AnimatePresence mode="wait" wedged on fast scrolls
  // (280ms exits vs 0.02 progress per layer); scroll-positioned cards are
  // exactly reversible because they are a pure function of progress.
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const segRefs = useRef<Array<HTMLSpanElement | null>>([])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const p = progress.get()
      // Cards follow the cursor the layers move on (damped by the director
      // while the canvas runs), so copy never changes ahead of the stack.
      const c = Math.min(overlayCursor(cursorAt(p), performance.now()), 9.5)
      const activeLayer = Math.min(9, Math.max(0, Math.floor(c + 0.15)))
      // The cursor sits clamped at 0 until the tour starts, so the first
      // card fades in with the lay-down (p 0.262-0.272) instead of showing
      // from the act's first frame over the still-centred phone.
      const firstEntry = Math.min(1, Math.max(0, (p - 0.262) / 0.01))
      for (let i = 0; i < TEARDOWN_COPY.length; i++) {
        const el = cardRefs.current[i]
        if (el !== null && el !== undefined) {
          const d = c - i
          const cursorEntry = Math.min(1, Math.max(0, (d + 0.15) / 0.15))
          const entry = i === 0 ? Math.min(cursorEntry, firstEntry) : cursorEntry
          const exit = Math.min(1, Math.max(0, (1 - d) / 0.1))
          const o = entry * exit
          el.style.opacity = String(o)
          el.style.visibility = o <= 0.01 ? 'hidden' : 'visible'
          el.style.transform = `translateY(${((1 - o) * 12).toFixed(2)}px)`
        }
        const seg = segRefs.current[i]
        if (seg !== null && seg !== undefined) {
          seg.style.opacity = i === activeLayer ? '1' : i < activeLayer ? '0.42' : '0.14'
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

  // Auto-scroll the teardown tour (overnight watchability): one press
  // plays the ten layer windows at ~3s per layer while the camera tours
  // the open stack. Any manual input (wheel, touch, keys) takes over
  // instantly. Never offered under reduced motion. Pure scroll driving —
  // the film follows exactly.
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    if (reducedMotion()) {
      setPlaying(false)
      return
    }
    let raf = 0
    let last = performance.now()
    const stop = (): void => setPlaying(false)
    const onInterrupt = (): void => stop()
    window.addEventListener('wheel', onInterrupt, { passive: true })
    window.addEventListener('touchstart', onInterrupt, { passive: true })
    window.addEventListener('keydown', onInterrupt)
    const step = (now: number): void => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const el = runway.current
      if (el === null) return
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const span = rect.height - window.innerHeight
      if (span <= 0) return
      const p = (window.scrollY - top) / span
      const np = p + (dt * 0.2) / 30
      if (np >= 0.495 || p >= 0.52) {
        stop()
        return
      }
      scrollToProgress(el, Math.max(np, 0.295), 'auto')
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onInterrupt)
      window.removeEventListener('touchstart', onInterrupt)
      window.removeEventListener('keydown', onInterrupt)
    }
  }, [playing, runway])

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
      if (el !== null) scrollToProgress(el, next.start, reducedMotion() ? 'instant' : 'smooth')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act.id, runway])

  // Scroll-driven page tint (Prompt D section 8.1): the act colour at low
  // opacity over the page. Written straight to the DOM, never React state.
  // Hooks stay above the empty-chapters bail so the order never changes.
  const tintRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
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
    const baseHex = `#${base.getHexString()}`
    const tint = tintRef.current
    if (tint !== null) tint.style.backgroundColor = `${baseHex}2e`
    // Light stages wear ink text directly instead of the dark veil
    // (Prompt D 11 scrim only applies while a stage is actually dark).
    const light = luminance(baseHex) > 0.25
    const root = rootRef.current
    if (root !== null) root.classList.toggle('light-scope', light)
    const scrim = scrimRef.current
    if (scrim !== null) scrim.style.opacity = light ? '0' : String(scrimForStage(baseHex))
  })
  if (chapter === undefined) return null
  const teardown = act.id === 'teardown'
  return (
    <div ref={rootRef} className="light-scope pointer-events-none absolute inset-0">
      <div ref={tintRef} aria-hidden="true" className="absolute inset-0" />
      <div
        ref={scrimRef}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(5,6,10,0.92) 0%, rgba(5,6,10,0.92) 38%, rgba(5,6,10,0) 68%)',
          opacity: 0,
        }}
      />
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
            'linear-gradient(to top, rgba(242,240,235,0.92) 0%, rgba(242,240,235,0.5) 45%, rgba(242,240,235,0) 100%)',
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
        className={`absolute inset-x-0 bottom-0 px-5 md:inset-x-auto md:bottom-auto md:top-1/2 md:w-[min(27vw,28rem)] md:-translate-y-1/2 md:px-0 md:pb-0 md:data-[align=left]:left-[max(var(--page-gutter),4vw)] md:data-[align=right]:right-[calc(4vw+4.5rem)] ${
          teardown ? 'pb-24' : 'pb-[calc(2rem+var(--sab))]'
        }`}
      >
        <div
          ref={cardRef}
          className="md:-m-7 md:rounded-[1.75rem] md:p-7"
          style={{
            background: 'rgb(254 253 251 / calc(var(--card, 0) * 0.93))',
            boxShadow:
              '0 0 0 1px rgb(220 216 207 / var(--card, 0)), 0 24px 60px -30px rgb(40 30 10 / calc(var(--card, 0) * 0.45))',
            backdropFilter: 'blur(calc(var(--card, 0) * 18px))',
          }}
        >
          {/* Keyed remount, no exit wait: AnimatePresence mode="wait" wedged
              on an old chapter when a long jump (e.g. /#buy from another
              page) crossed several acts faster than the exits could finish. */}
          <motion.div key={act.id} variants={CHAPTER} initial="hidden" animate="show">
            {teardown ? (
              <>
                <div className="grid">
                  {TEARDOWN_COPY.map((copy, i) => (
                    <div
                      key={copy.key}
                      ref={(el) => {
                        cardRefs.current[i] = el
                      }}
                      data-testid={`teardown-card-${copy.key}`}
                      className="col-start-1 row-start-1"
                    >
                      <p className="kicker flex items-center gap-3 text-(--color-aether-strong)">
                        <span
                          aria-hidden="true"
                          className="h-px w-8"
                          style={{ backgroundColor: TEARDOWN_LAYERS[i]?.accent ?? '#1f5fd0' }}
                        />
                        {copy.kicker}
                      </p>
                      <h2 className="display-lg mt-4 text-[clamp(2.25rem,3.9vw,3.75rem)]">
                        {copy.headline}
                      </h2>
                      <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-(--color-dim) md:text-lg">
                        {copy.body}
                      </p>
                      <p className="mt-5 inline-flex rounded-full bg-(--color-raise)/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-(--color-ink) uppercase shadow-[0_0_0_1px_var(--color-border-hairline)]">
                        {copy.figure}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Ten layers, physical stack order: where the tour is. */}
                <motion.div
                  aria-hidden="true"
                  className="mt-8 flex items-center gap-1"
                  variants={ITEM}
                >
                  {TEARDOWN_COPY.map((copy, i) => (
                    <span
                      key={copy.key}
                      ref={(el) => {
                        segRefs.current[i] = el
                      }}
                      className="h-[3px] w-6 rounded-full bg-(--color-ink) transition-opacity duration-300"
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
                {chapter.numeral !== undefined ? <BigNumeral numeral={chapter.numeral} /> : null}
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
          onClick={() => setPlaying((v) => !v)}
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
                  scrollToProgress(el, a.start, reducedMotion() ? 'instant' : 'smooth')
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
