import { cursorAt } from '../teardown/layers.ts'

/**
 * The teardown tour's progress span, read off cursorAt (one layer per
 * step) so the copy, the play rate and the hold settle can never drift
 * from the 3D.
 */
export const TOUR_STEP = 0.02 / (cursorAt(0.4) - cursorAt(0.38))
export const TOUR_START = 0.4 - cursorAt(0.4) * TOUR_STEP
export const TOUR_END = TOUR_START + 10 * TOUR_STEP

/** A layer's hold, as cursor fractions: the part sits still at its pose. */
export const HOLD_IN = 0.22
export const HOLD_OUT = 0.78
/** Settle lands this far inside a hold, clear of the move's damped tail. */
const SETTLE_INSET = 0.06

/** Raw (undamped, unclamped) tour cursor: negative before layer 0. */
export function rawCursor(p: number): number {
  return (p - TOUR_START) / TOUR_STEP
}

/**
 * Where a resting scroll should settle so a part is never left half-way
 * through a move. Inside a hold it stays put (null). Between holds it
 * completes the move in the direction of travel, like a page turn:
 * forward lands just inside the next hold, backward just inside the
 * previous one. Null outside the tour.
 */
export function holdTarget(p: number, dir: number): number | null {
  const raw = rawCursor(p)
  if (raw < 0 || raw >= 10) return null
  const i = Math.floor(raw)
  const d = raw - i
  if (d >= HOLD_IN && d <= HOLD_OUT) return null
  const target =
    dir >= 0
      ? (d < HOLD_IN ? i : i + 1) + HOLD_IN + SETTLE_INSET
      : (d > HOLD_OUT ? i : i - 1) + HOLD_OUT - SETTLE_INSET
  if (target < 0 || target > 10) return null
  return TOUR_START + target * TOUR_STEP
}

/**
 * Auto-play rate in progress per second: the opening sandwich and its
 * overview in about five seconds, then four seconds per layer (about 2.4 s
 * of that held still at the hero pose).
 */
export function playRate(p: number): number {
  return p < TOUR_START ? 0.009 : TOUR_STEP / 4
}
