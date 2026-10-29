import { cursorAt } from '../teardown/layers.ts'
import type { ActId } from '../key.ts'
import { ACTS } from '../timeline.ts'

/**
 * The teardown tour's progress span, read off cursorAt (one layer per
 * step) so the copy, the play rate and the stops can never drift from the
 * 3D.
 */
export const TOUR_STEP = 0.02 / (cursorAt(0.4) - cursorAt(0.38))
export const TOUR_START = 0.4 - cursorAt(0.4) * TOUR_STEP
export const TOUR_END = TOUR_START + 10 * TOUR_STEP

/** A layer's hold, as cursor fractions: the part sits still at its pose. */
export const HOLD_IN = 0.4
export const HOLD_OUT = 0.6

/** Raw (undamped, unclamped) tour cursor: negative before layer 0. */
export function rawCursor(p: number): number {
  return (p - TOUR_START) / TOUR_STEP
}

/** A composed moment in an act, a fraction of the way through it. */
const beat = (id: ActId, f: number): number => {
  const act = ACTS.find((a) => a.id === id)
  if (act === undefined) throw new Error(`no act ${id}`)
  return act.start + f * (act.end - act.start)
}

/**
 * Film stops: every composed moment a scroll gesture can carry the reader
 * to, in order. One per act where the shot composes, plus the beats of the
 * long acts (the camera's macro dive, each of the display's three
 * figures), the teardown's open-sandwich overview and each layer's hold,
 * and the fully opened finish fan. Stop to stop, the film plays itself.
 */
export const FILM_STOPS: readonly number[] = [
  0,
  beat('arrival', 0.5),
  beat('settle', 0.22),
  beat('approach', 0.13),
  TOUR_START - 0.006,
  ...Array.from({ length: 10 }, (_, i) => TOUR_START + (i + 0.5) * TOUR_STEP),
  beat('camera', 0.06),
  beat('camera', 0.6),
  beat('display', 0.1),
  beat('display', 0.45),
  beat('display', 0.78),
  beat('storage', 0.24),
  beat('battery', 0.3),
  beat('software', 0.25),
  beat('ai', 0.25),
  beat('final', 0.8),
]

/** A stop already reached counts as passed: no re-targeting it. */
const EPS = 0.0015

/**
 * The next stop beyond p in the direction of travel, or null past the
 * last (forward) or before the first (backward).
 */
export function nextStop(p: number, dir: number): number | null {
  if (dir >= 0) {
    for (const s of FILM_STOPS) if (s > p + EPS) return s
    return null
  }
  for (let i = FILM_STOPS.length - 1; i >= 0; i--) {
    const s = FILM_STOPS[i] as number
    if (s < p - EPS) return s
  }
  return null
}

/**
 * How long the film takes to play from one stop to the next: longer for
 * more film, and an even 1.8 s between teardown layers: about twice the
 * old pace, so each part is shown coming out rather than rushed, without
 * dragging (the 3D also caps the stack's speed).
 */
export function stopDurationMs(from: number, to: number): number {
  const inTour = (p: number): boolean => p > TOUR_START && p < TOUR_END
  if (inTour(from) && inTour(to)) return 1800
  return Math.min(3200, 1000 + 14000 * Math.abs(to - from))
}

/** Where a jump to an act (rail, arrow keys) lands: its first stop. */
export function actRestStart(id: ActId): number {
  const act = ACTS.find((a) => a.id === id)
  if (act === undefined) return 0
  const stop = FILM_STOPS.find((s) => s >= act.start - 1e-9)
  return stop ?? act.start
}

/**
 * Auto-play rate in progress per second: the opening sandwich and its
 * overview in about five seconds, then four seconds per layer.
 */
export function playRate(p: number): number {
  return p < TOUR_START ? 0.009 : TOUR_STEP / 4
}
