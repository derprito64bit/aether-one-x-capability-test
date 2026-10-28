import { key, type FilmKey } from '../key.ts'

/**
 * Teardown (Prompt D): the horizontal layer-by-layer sequence replacing
 * xray, chip, and rebuild within their exact span (0.25 to 0.52), so
 * nothing downstream moves. Lay down (0.250-0.272), separate and hold the
 * stack (0.272-0.295), ten feature windows (0.295-0.495, driven per-layer
 * by the director, not by camera keys), restack and stand (0.495-0.520).
 * The camera stands ~14 degrees above the phone's plane looking slightly
 * down (Prompt D section 3.1): the stack reads side-on as strata, not
 * foreshortened toward the lens. The layers do the moving.
 */
/**
 * Round 05 showcase: the phone lies down turned a quarter in its own plane,
 * long axis across the frame, so the opened sandwich stacks as wide strips
 * whose faces all read from the tour camera (long axis into depth, each
 * plate foreshortened to a sliver and the stack ran off the frame). While
 * the stack is open the showcase rig (teardown/showcase.ts) owns the
 * camera; these keys hand over to it and take back from it.
 */
const SPIN = -Math.PI / 2

export const TEARDOWN_KEYS: FilmKey[] = [
  // Handoff bridge: the approach ends low on the bottom rail (port beat),
  // so the first teardown key meets it halfway (~8 degrees) instead of
  // whipping across the frame in one knot span.
  key({
    at: 0.26,
    pose: { rx: -0.5, ry: 0.5, rz: -0.55, scale: 1.35, px: -0.05, py: 0 },
    camera: { pos: [0.09, 0.06, 0.63], target: [0, -0.03, -0.01] },
    lens: { fov: 24, fit: 0.55 },
    look: { exposure: 1, glass: 0.4 },
  }),
  key({
    at: 0.272,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.02, 0.1396, 0.6604], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
    ease: 'smooth',
  }),
  key({
    at: 0.295,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.02, 0.1379, 0.6535], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
    ease: 'smooth',
  }),
  key({
    at: 0.34,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.018, 0.1345, 0.6396], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
  }),
  key({
    at: 0.4,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.01, 0.1259, 0.6054], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
  }),
  key({
    at: 0.45,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.01, 0.1259, 0.6054], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
  }),
  key({
    at: 0.49,
    pose: { rx: -1.352, ry: 0, rz: SPIN, scale: 1.4, px: 0, py: 0.02 },
    camera: { pos: [0.01, 0.1259, 0.6054], target: [0, -0.03, -0.02] },
    lens: { fov: 25, fit: 0.5 },
    look: { exposure: 1.05, glass: 0.4 },
  }),
  key({
    at: 0.52,
    pose: { rx: -0.35, ry: 1.85, rz: 0.03, scale: 1.29, px: 0, py: 0.03 },
    camera: { pos: [0.0104, 0.0348, 0.64], target: [-0.0096, 0.0548, 0] },
    lens: { fov: 22, fit: 0.62 },
    look: { exposure: 1.05, glass: 0.4 },
  }),
]
