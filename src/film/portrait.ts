/**
 * Portrait placement (round 07): on phones (aspect < 1) the copy card owns
 * the bottom ~45% of the frame, so in every act the phone simply poses in
 * it is fitted into the top ~55%, centred horizontally. The director widens
 * the lens until the goal pose's box fits PORTRAIT_SPAN and lifts it with
 * a vertical view offset to PORTRAIT_CENTER (NDC). Pure functions of
 * progress; zero allocation.
 */

/** Phone region on portrait: y 4%-55% of the height, as an NDC span and centre. */
export const PORTRAIT_SPAN = 0.98
export const PORTRAIT_CENTER = 0.41

function smooth01(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** The battery x-ray close-up's span (eased in and out at the ends). */
const BATTERY_GAP = [0.882, 0.892, 0.926, 0.936] as const

/** 1 outside [a, d], 0 inside [b, c], eased between. */
function gap(p: number, a: number, b: number, c: number, d: number): number {
  const fall = smooth01((p - a) / (b - a))
  const rise = smooth01((p - c) / (d - c))
  return 1 - Math.min(fall, 1 - rise)
}

/**
 * How much the portrait placement applies at progress p: 1 wherever the
 * phone poses, 0 where the framing is its own: the teardown (it fits the
 * overlay's slot), the camera macro dive, and the battery x-ray close-up.
 */
export function portraitWeight(p: number): number {
  return Math.min(
    gap(p, 0.24, 0.255, 0.515, 0.53),
    gap(p, 0.595, 0.615, 0.715, 0.73),
    gap(p, BATTERY_GAP[0], BATTERY_GAP[1], BATTERY_GAP[2], BATTERY_GAP[3]),
  )
}

/**
 * The battery x-ray on portrait: fitting the whole phone would lose the
 * close-up, so the same fit is made on the cell alone (it takes the top
 * half, clear of the copy card; the board above it may leave the frame).
 * How much of that cell fit applies at progress p; it and portraitWeight
 * sum to 1 across the x-ray's edges.
 */
export function batteryFitWeight(p: number): number {
  return 1 - gap(p, BATTERY_GAP[0], BATTERY_GAP[1], BATTERY_GAP[2], BATTERY_GAP[3])
}
