import type { ActId } from '../key.ts'
import { ACTS } from '../timeline.ts'

/**
 * Section scenes: the room the phone stands in, act by act, so the film
 * stops floating in one empty sweep. The studio is the 3D sweep the film
 * always had (porcelain, used for the opening, the teardown and the
 * finale); every other scene is an HTML backdrop painted behind a
 * transparent canvas, with a giant figure for the act behind the phone.
 *
 * Shared contract: the 3D side fades its studio sweep and floor by
 * `studioWeight`, the ground shadow by `1 - darkWeight`, and relights the
 * phone for dark rooms; the overlay picks ink or light copy by
 * `darkWeight`. Everything is a pure function of progress.
 */
export type SceneId =
  'studio' | 'titanium' | 'glass' | 'projector' | 'spectrum' | 'data' | 'charge' | 'os' | 'neural'

export const SCENE_IDS: readonly SceneId[] = [
  'studio',
  'titanium',
  'glass',
  'projector',
  'spectrum',
  'data',
  'charge',
  'os',
  'neural',
]

export const ACT_SCENE: Readonly<Record<ActId, SceneId>> = {
  arrival: 'studio',
  settle: 'titanium',
  approach: 'glass',
  teardown: 'studio',
  camera: 'projector',
  display: 'spectrum',
  storage: 'data',
  battery: 'charge',
  software: 'os',
  ai: 'neural',
  final: 'studio',
}

/** Index of each scene in SCENE_IDS (no searching inside the frame loop). */
const SCENE_INDEX = Object.fromEntries(SCENE_IDS.map((id, i) => [id, i])) as Record<SceneId, number>

/** Rooms whose base is near-black: copy turns light, the phone is rim-lit. */
export const DARK_SCENES: ReadonlySet<SceneId> = new Set([
  'projector',
  'spectrum',
  'data',
  'charge',
  'os',
  'neural',
])

/** Progress width of a crossfade, centred on each act boundary. */
export const SCENE_FADE = 0.008

const smooth = (t: number): number => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Writes each scene's weight at progress p into `out` (indexed like
 * SCENE_IDS; they sum to 1). Two acts sharing a scene never fade. Zero
 * allocation: callers keep one Float32Array.
 */
export function sceneWeights(p: number, out: Float32Array): Float32Array {
  out.fill(0)
  let index = -1
  for (let i = 0; i < ACTS.length; i++) {
    const a = ACTS[i] as (typeof ACTS)[number]
    if (p >= a.start && p < a.end) {
      index = i
      break
    }
  }
  if (index < 0) index = p >= 1 ? ACTS.length - 1 : 0
  const act = ACTS[index]
  if (act === undefined) return out
  const here = SCENE_INDEX[ACT_SCENE[act.id]]
  // Blend toward the neighbour across whichever boundary p is near.
  const prev = ACTS[index - 1]
  const next = ACTS[index + 1]
  let other = -1
  let mix = 0
  if (prev !== undefined && p < act.start + SCENE_FADE / 2) {
    other = SCENE_INDEX[ACT_SCENE[prev.id]]
    mix = 1 - smooth((p - (act.start - SCENE_FADE / 2)) / SCENE_FADE)
  } else if (next !== undefined && p > act.end - SCENE_FADE / 2) {
    other = SCENE_INDEX[ACT_SCENE[next.id]]
    mix = smooth((p - (act.end - SCENE_FADE / 2)) / SCENE_FADE)
  }
  if (other < 0 || other === here) {
    out[here] = 1
    return out
  }
  out[here] = 1 - mix
  out[other] = mix
  return out
}

const scratch = new Float32Array(SCENE_IDS.length)

/** 1 where the 3D studio sweep owns the background, 0 where a scene does. */
export function studioWeight(p: number): number {
  return sceneWeights(p, scratch)[0] ?? 0
}

/** 0..1: how much of the background is a dark room right now. */
export function darkWeight(p: number): number {
  sceneWeights(p, scratch)
  let dark = 0
  for (let i = 0; i < SCENE_IDS.length; i++) {
    if (DARK_SCENES.has(SCENE_IDS[i] as SceneId)) dark += scratch[i] ?? 0
  }
  return dark
}

/**
 * Opacity of figure k of n across an act (t 0..1): each holds its share
 * of the act, the first in from the start and the last out at the end.
 */
export function figureWeight(t: number, k: number, n: number): number {
  const seg = 1 / n
  const fade = Math.min(0.05, seg / 4)
  const start = k * seg
  const end = (k + 1) * seg
  // Sequential, never overlapping: one figure is gone before the next
  // arrives (two giant figures in one spot read as noise).
  const inW = k === 0 ? 1 : Math.min(1, Math.max(0, (t - start) / fade))
  const outW = k === n - 1 ? 1 : Math.min(1, Math.max(0, (end - t) / fade))
  return Math.min(inW, outW)
}
