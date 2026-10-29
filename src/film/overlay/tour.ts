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
 * last (forward) or before the first (backward). A stop within `eps` of p
 * counts as reached.
 */
export function nextStop(p: number, dir: number, eps = EPS): number | null {
  if (dir >= 0) {
    for (const s of FILM_STOPS) if (s > p + eps) return s
    return null
  }
  for (let i = FILM_STOPS.length - 1; i >= 0; i--) {
    const s = FILM_STOPS[i] as number
    if (s < p - eps) return s
  }
  return null
}

/** True when p rests on a stop (within `eps`): nothing left to finish. */
export function atStop(p: number, eps: number): boolean {
  return FILM_STOPS.some((s) => Math.abs(s - p) <= eps)
}

/**
 * Where a gesture that began at `from` and came to rest at `p` glides to.
 * One gesture, one stop: if the page already ran past a stop on the way
 * (a big wheel notch, a fast flick) by no more than `snap`, it returns to
 * that stop; otherwise it carries on to the next stop ahead. `eps` is a
 * stop's own catchment (a few pixels, in progress units).
 */
export function gestureStop(
  from: number,
  p: number,
  dir: number,
  snap: number,
  eps: number,
): number | null {
  let crossed: number | null = null
  for (const s of FILM_STOPS) {
    const past = dir * (p - s)
    if (dir * (s - from) > eps && past >= 0 && past <= snap) {
      if (crossed === null || dir * (s - crossed) > 0) crossed = s
    }
  }
  return crossed ?? nextStop(p, dir, eps)
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
