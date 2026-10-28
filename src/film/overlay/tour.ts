import { cursorAt } from '../teardown/layers.ts'
import type { ActId } from '../key.ts'
import { ACTS } from '../timeline.ts'

/**
 * The teardown tour's progress span, read off cursorAt (one layer per
 * step) so the copy, the play rate and the rest map can never drift from
 * the 3D.
 */
export const TOUR_STEP = 0.02 / (cursorAt(0.4) - cursorAt(0.38))
export const TOUR_START = 0.4 - cursorAt(0.4) * TOUR_STEP
export const TOUR_END = TOUR_START + 10 * TOUR_STEP

/** A layer's hold, as cursor fractions: the part sits still at its pose. */
export const HOLD_IN = 0.3
export const HOLD_OUT = 0.7
/** Settles land this far inside a rest zone, clear of a move's damped tail. */
const INSET = 0.0012
/**
 * Progress either side of an act boundary that counts as "between
 * sections" (~37vh on desktop): a scroll resting there is completed.
 */
const EDGE = 0.012

/** Raw (undamped, unclamped) tour cursor: negative before layer 0. */
export function rawCursor(p: number): number {
  return (p - TOUR_START) / TOUR_STEP
}

/**
 * Where the film may rest, as [start, end] progress spans in order: the
 * composed middle of every act, and inside the teardown the overview plus
 * each layer's hold. Everything between is a move (an act changing, a
 * part flying out), and a scroll that stops there gets completed.
 */
export const REST_ZONES: ReadonlyArray<readonly [number, number]> = (() => {
  const zones: Array<[number, number]> = []
  for (const act of ACTS) {
    if (act.id === 'teardown') {
      // The opening (lay down, sandwich opens, overview) is a show of its
      // own: free to scrub, like the middle of any act.
      zones.push([act.start + EDGE, TOUR_START - 0.001])
      for (let i = 0; i < 10; i++) {
        zones.push([
          TOUR_START + (i + HOLD_IN) * TOUR_STEP,
          TOUR_START + (i + HOLD_OUT) * TOUR_STEP,
        ])
      }
      continue
    }
    const z = Math.min(EDGE, (act.end - act.start) * 0.2)
    zones.push([act.start === 0 ? 0 : act.start + z, act.end === 1 ? 1 : act.end - z])
  }
  return zones
})()

/**
 * Where a resting scroll should settle so the film never stops between
 * sections. Inside a rest zone it stays put (null). Between zones it
 * completes the move in the direction of travel, like a page turn:
 * forward to the start of the next zone, backward to the end of the
 * previous one. Null at the ends of the film.
 */
export function restTarget(p: number, dir: number): number | null {
  let prev: readonly [number, number] | undefined
  for (const zone of REST_ZONES) {
    if (p >= zone[0] - 1e-6 && p <= zone[1] + 1e-6) return null
    if (zone[1] < p) prev = zone
    else {
      if (dir >= 0) return zone[0] + INSET
      return prev === undefined ? null : prev[1] - INSET
    }
  }
  return dir < 0 && prev !== undefined ? prev[1] - INSET : null
}

/**
 * Where a jump to an act (rail, arrow keys) lands: the start of its first
 * rest zone, so the jump ends on a composed shot rather than on the act
 * boundary, which the settle would read as "between sections".
 */
export function actRestStart(id: ActId): number {
  const act = ACTS.find((a) => a.id === id)
  if (act === undefined) return 0
  const zone = REST_ZONES.find((z) => z[0] >= act.start - 1e-9)
  return zone === undefined ? act.start : zone[0] + INSET
}

/**
 * Auto-play rate in progress per second: the opening sandwich and its
 * overview in about five seconds, then four seconds per layer (about
 * 1.6 s of that held still at the hero pose).
 */
export function playRate(p: number): number {
  return p < TOUR_START ? 0.009 : TOUR_STEP / 4
}
