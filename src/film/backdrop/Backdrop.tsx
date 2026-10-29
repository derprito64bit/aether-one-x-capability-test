import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { MotionValue } from 'motion/react'
import { runScramble } from '../../lib/scramble.ts'
import { SCENE_BOARDS } from '../chapters.ts'
import type { ActId } from '../key.ts'
import { ACTS } from '../timeline.ts'
import { ACT_SCENE, SCENE_IDS, figureWeight, sceneWeights, type SceneId } from './scenes.ts'
import './backdrop.css'

/**
 * Where each room hangs its figure on desktop: the free wall between the
 * copy column and the phone, measured by projecting the phone across each
 * act's rest zone at 1440x900 (x/y = centre, w = zone width, all % of the
 * frame). The figure is sized to fill its zone, so it is never hidden
 * behind the phone or run under the copy. The battery's x-ray fills the
 * middle of the frame, so its figure sits under the copy instead.
 */
/**
 * `fadeOut` (act-local t): the figure gives way where the phone pans
 * across its wall later in the act (glass: measured 0.55-0.7 of the zone).
 */
const FIGURE_AT: Partial<
  Record<ActId, { x: number; y: number; w: number; fadeOut?: readonly [number, number] }>
> = {
  settle: { x: 76, y: 47, w: 28 },
  approach: { x: 21, y: 46, w: 30, fadeOut: [0.5, 0.62] },
  camera: { x: 25, y: 45, w: 40 },
  display: { x: 77, y: 45, w: 27 },
  storage: { x: 54, y: 47, w: 16 },
  battery: { x: 17.5, y: 85, w: 24 },
  software: { x: 73, y: 46, w: 28 },
  ai: { x: 17, y: 46, w: 24 },
}

/** The act a scene belongs to (each non-studio scene has exactly one). */
const SCENE_ACT = new Map<SceneId, ActId>(
  ACTS.filter((a) => ACT_SCENE[a.id] !== 'studio').map((a) => [ACT_SCENE[a.id], a.id]),
)

/** A deterministic wall of hex for the storage room (no Math.random). */
const HEX_WALL = (() => {
  let x = 0x2f6b9d
  const rows: string[] = []
  for (let r = 0; r < 64; r++) {
    let row = ''
    for (let c = 0; c < 28; c++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0
      row += ((x >>> 8) & 0xff).toString(16).toUpperCase().padStart(2, '0') + ' '
    }
    rows.push(row)
  }
  return rows.join('\n')
})()

function Figure({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="bd-figure-line">
      <span data-scramble-text={value}>{value}</span>
      {unit !== '' && <span className="bd-unit">{unit}</span>}
    </span>
  )
}

/**
 * Section rooms (see scenes.ts): every act that is not the studio gets
 * an environment painted behind the transparent canvas, with its giant
 * figure on the back wall. One progress subscription writes weights and
 * the act's local progress (--t) as CSS variables; everything inside is
 * transforms and opacity, so scrubbing is free and exactly reversible.
 * Figures decode (scramble) each time their room takes over.
 */
export function Backdrop({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRefs = useRef(new Map<SceneId, HTMLDivElement>())
  const figureRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    const weights = new Float32Array(SCENE_IDS.length)
    const shown = new Set<string>()
    let height = rootRef.current?.clientHeight ?? window.innerHeight
    const onResize = (): void => {
      height = rootRef.current?.clientHeight ?? window.innerHeight
      apply(progress.get())
    }
    const apply = (p: number): void => {
      sceneWeights(p, weights)
      SCENE_IDS.forEach((id, i) => {
        const el = sceneRefs.current.get(id)
        if (el === undefined) return
        const w = weights[i] ?? 0
        el.style.opacity = w.toFixed(3)
        el.style.visibility = w <= 0.001 ? 'hidden' : 'visible'
        const act = ACTS.find((a) => a.id === SCENE_ACT.get(id))
        if (act === undefined) return
        if (w <= 0.001) {
          // Re-arm the decode even when a fast scroll skips the fade.
          for (const key of shown) if (key.startsWith(`${act.id}:`)) shown.delete(key)
          return
        }
        const t = Math.min(1, Math.max(0, (p - act.start) / (act.end - act.start)))
        el.style.setProperty('--t', t.toFixed(4))
        if (id === 'charge') {
          el.style.setProperty('--level-px', `${((0.18 + 0.72 * t) * height).toFixed(1)}px`)
        }
        // A figure the phone pans across late in its act gives way first.
        const fade = FIGURE_AT[act.id]?.fadeOut
        const boardEl = el.querySelector<HTMLElement>('.bd-board')
        if (fade !== undefined && boardEl !== null) {
          const x = Math.min(1, Math.max(0, (t - fade[0]) / (fade[1] - fade[0])))
          boardEl.style.opacity = (1 - x * x * (3 - 2 * x)).toFixed(3)
        }
        // Rooms with several figures show them in turn across the act.
        const board = SCENE_BOARDS[act.id]
        const count = board?.figures.length ?? 0
        for (let k = 0; k < count; k++) {
          const key = `${act.id}:${k}`
          const fig = figureRefs.current.get(key)
          if (fig === undefined) continue
          const a = count === 1 ? 1 : figureWeight(t, k, count)
          fig.style.opacity = a.toFixed(3)
          const visible = w > 0.6 && a > 0.6
          if (visible && !shown.has(key)) {
            shown.add(key)
            runScramble(fig, 900)
          } else if (!visible && shown.has(key) && (w < 0.05 || a < 0.05)) shown.delete(key)
        }
      })
    }
    apply(progress.get())
    const unsubscribe = progress.on('change', apply)
    window.addEventListener('resize', onResize)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', onResize)
    }
  }, [progress])

  const scene = (id: SceneId, children: ReactNode) => {
    const act = SCENE_ACT.get(id)
    const board = act === undefined ? undefined : SCENE_BOARDS[act]
    const at = act === undefined ? undefined : FIGURE_AT[act]
    return (
      <div
        key={id}
        ref={(el) => {
          if (el !== null) sceneRefs.current.set(id, el)
          else sceneRefs.current.delete(id)
        }}
        className={`bd bd-${id}`}
        data-scene={id}
        style={
          {
            '--fx': `${at?.x ?? 50}%`,
            '--fy': `${at?.y ?? 46}%`,
            '--fw': `${at?.w ?? 40}vw`,
          } as CSSProperties
        }
      >
        {children}
        {board !== undefined && act !== undefined && (
          <div className={board.onPhones === false ? 'bd-board bd-board--desktop' : 'bd-board'}>
            {board.figures.map((f, k) => (
              <div
                key={f.value}
                className="bd-figure"
                style={{ '--chars': f.value.length } as CSSProperties}
                ref={(el) => {
                  const key = `${act}:${k}`
                  if (el !== null) figureRefs.current.set(key, el)
                  else figureRefs.current.delete(key)
                }}
              >
                <Figure value={f.value} unit={f.unit} />
              </div>
            ))}
            <p className="bd-caption">{board.caption}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0" data-testid="film-backdrop">
      {scene(
        'titanium',
        <>
          <div className="bd-brush" />
          <div className="bd-sheen" />
          <div className="bd-spot" />
          <div className="bd-horizon" />
        </>,
      )}
      {scene(
        'glass',
        <>
          <div className="bd-streak bd-streak--a" />
          <div className="bd-streak bd-streak--b" />
          <div className="bd-spot" />
          <div className="bd-horizon" />
        </>,
      )}
      {scene(
        'projector',
        <>
          <div className="bd-beam" />
          <div className="bd-screen" />
          <div className="bd-grain" />
        </>,
      )}
      {scene(
        'spectrum',
        <>
          <div className="bd-band-wrap">
            <div className="bd-band" />
          </div>
          <div className="bd-pixels" />
          <div className="bd-vignette" />
        </>,
      )}
      {scene(
        'data',
        <>
          <pre className="bd-hex">{HEX_WALL}</pre>
          <div className="bd-vignette" />
        </>,
      )}
      {scene(
        'charge',
        <>
          <div className="bd-fill" />
          <div className="bd-meniscus" />
          <div className="bd-vignette" />
        </>,
      )}
      {scene(
        'os',
        <>
          <div className="bd-tiles" />
          <div className="bd-vignette" />
        </>,
      )}
      {scene(
        'neural',
        <>
          <div className="bd-dots" />
          <div className="bd-pulse">
            <div className="bd-dots bd-dots--hot" />
          </div>
          <div className="bd-vignette" />
        </>,
      )}
    </div>
  )
}

export default Backdrop
