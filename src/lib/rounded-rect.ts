/**
 * Rounded-rectangle outline (round 02): straight rails with tangent
 * circular-arc corners, the silhouette the superellipse's ever-curving
 * sides never quite landed. Loops are walked by arc (half of every
 * quadrant's points on its corner), +X start, monotone CCW, identical
 * counts, so annulus loops stay index-paired. roundedRectPoint is the
 * ray-cast boundary query. Pure math, unit tested.
 */

export type Point2 = readonly [number, number]

/** Point where the ray at angle `theta` exits the rounded rect. */
export function roundedRectPoint(halfW: number, halfH: number, r: number, theta: number): Point2 {
  const dx = Math.cos(theta)
  const dy = Math.sin(theta)
  const c = Math.max(0, Math.min(r, halfW, halfH))
  let best = Infinity
  // Straight edges: x = +/-halfW for |y| <= halfH - c, similarly y.
  if (Math.abs(dx) > 1e-12) {
    for (const sx of [-1, 1]) {
      const t = (sx * halfW) / dx
      if (t > 0) {
        const y = t * dy
        if (Math.abs(y) <= halfH - c + 1e-12 && t < best) best = t
      }
    }
  }
  if (Math.abs(dy) > 1e-12) {
    for (const sy of [-1, 1]) {
      const t = (sy * halfH) / dy
      if (t > 0) {
        const x = t * dx
        if (Math.abs(x) <= halfW - c + 1e-12 && t < best) best = t
      }
    }
  }
  // Corner arcs: centers (+/-qx, +/-qy), radius c.
  const qx = halfW - c
  const qy = halfH - c
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cx = sx * qx
      const cy = sy * qy
      // |(o + t d) - c|^2 = r^2, o = origin.
      const b = dx * -cx + dy * -cy
      const cc = cx * cx + cy * cy - c * c
      const disc = b * b - cc
      if (disc < 0) continue
      const sq = Math.sqrt(disc)
      for (const t of [-b - sq, -b + sq]) {
        if (t <= 0 || t >= best) continue
        // Accept only the arc span, not the full circle: the hit must sit
        // outside both straight-edge bands (the corner region).
        const x = t * dx
        const y = t * dy
        if (Math.abs(x) >= halfW - c - 1e-9 && Math.abs(y) >= halfH - c - 1e-9) best = t
      }
    }
  }
  if (!Number.isFinite(best)) best = Math.min(halfW, halfH)
  return [best * dx, best * dy]
}

/**
 * Share of each quadrant's points spent on its corner arc. Sampling by
 * polar angle gave a tall phone's corner only the ~10 degrees of polar
 * angle it subtends from the centre: about 5 of 48 points per corner, so
 * polished rails turned the corner in visible facets and nested outlines
 * (a panel in its opening) crossed at the corners.
 */
const ARC_SHARE = 0.5
const EPS = 1e-12

/**
 * Splits a quadrant's n points over its three runs (straight side, corner
 * arc, straight side) in the ARC_SHARE proportions. Depends only on n and
 * on which runs exist, so every non-degenerate outline gets the same
 * layout and loops stay index-paired. The first run keeps at least one
 * point when it exists (it starts the quadrant on its axis).
 */
function quadrantCounts(
  n: number,
  has: readonly [boolean, boolean, boolean],
): [number, number, number] {
  const weights = [
    has[0] ? (1 - ARC_SHARE) / 2 : 0,
    has[1] ? ARC_SHARE : 0,
    has[2] ? (1 - ARC_SHARE) / 2 : 0,
  ]
  const sum = weights[0]! + weights[1]! + weights[2]!
  if (sum <= 0) return [n, 0, 0]
  const arc = has[1] ? Math.max(1, Math.round((n * weights[1]!) / sum)) : 0
  const rest = n - arc
  const first = has[0] ? Math.max(1, has[2] ? Math.ceil(rest / 2) : rest) : 0
  const last = has[2] ? Math.max(0, rest - first) : 0
  // Whatever rounding left over goes to the arc.
  return [first, n - first - last, last]
}

/**
 * Full closed loop, 4 * perQuadrant points: (halfW, 0) first, CCW,
 * monotone. Each quadrant walks its straight half-side, its corner arc at
 * even angle steps, then the next half-side, so the corners get half the
 * points and two concentric outlines (radius inset with the edges) pair
 * point for point along their shared normals: annulus walls and lids stay
 * a uniform band and an inset part can never poke through its opening.
 */
export function roundedRectPoints(
  halfW: number,
  halfH: number,
  r: number,
  perQuadrant: number,
): Array<[number, number]> {
  const c = Math.max(0, Math.min(r, halfW, halfH))
  const qx = halfW - c
  const qy = halfH - c
  const n = Math.max(1, Math.floor(perQuadrant))
  const axis = (q: number): [number, number] => {
    const k = ((q % 4) + 4) % 4
    return k === 0 ? [halfW, 0] : k === 1 ? [0, halfH] : k === 2 ? [-halfW, 0] : [0, -halfH]
  }
  const pts: Array<[number, number]> = []
  for (let q = 0; q < 4; q++) {
    const sx = q === 0 || q === 3 ? 1 : -1
    const sy = q < 2 ? 1 : -1
    const cx = sx * qx
    const cy = sy * qy
    const t0 = (q * Math.PI) / 2
    const from = axis(q)
    const to = axis(q + 1)
    const arcStart: [number, number] = [cx + c * Math.cos(t0), cy + c * Math.sin(t0)]
    const arcEnd: [number, number] = [
      cx + c * Math.cos(t0 + Math.PI / 2),
      cy + c * Math.sin(t0 + Math.PI / 2),
    ]
    // Even quadrants start on a long side (x = +/-halfW), odd ones on a
    // short side; a side of zero length (a pill) gets no points.
    const has: [boolean, boolean, boolean] = [
      Math.hypot(arcStart[0] - from[0], arcStart[1] - from[1]) > EPS,
      c > EPS,
      Math.hypot(to[0] - arcEnd[0], to[1] - arcEnd[1]) > EPS,
    ]
    const [s1, nArc, s2] = quadrantCounts(n, has)
    for (let k = 0; k < s1; k++) {
      const t = k / s1
      pts.push([from[0] + (arcStart[0] - from[0]) * t, from[1] + (arcStart[1] - from[1]) * t])
    }
    for (let k = 0; k < nArc; k++) {
      const theta = t0 + (Math.PI / 2) * (k / nArc)
      pts.push([cx + c * Math.cos(theta), cy + c * Math.sin(theta)])
    }
    for (let k = 0; k < s2; k++) {
      const t = k / s2
      pts.push([arcEnd[0] + (to[0] - arcEnd[0]) * t, arcEnd[1] + (to[1] - arcEnd[1]) * t])
    }
  }
  return pts
}
