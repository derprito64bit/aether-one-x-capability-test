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
    gap(p, 0.882, 0.892, 0.926, 0.936),
  )
}
