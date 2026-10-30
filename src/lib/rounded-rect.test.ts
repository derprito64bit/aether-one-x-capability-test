import { describe, expect, it } from 'vitest'
import { roundedRectPoint, roundedRectPoints } from './rounded-rect.ts'

const HW = 0.0384
const HH = 0.0798
const R = 0.011

/** Rounded-rect outline (round 02): straight rails, tangent arc corners. */
describe('roundedRectPoints', () => {
  it('returns 4-per-quadrant points starting at +X', () => {
    const pts = roundedRectPoints(HW, HH, R, 48)
    expect(pts).toHaveLength(192)
    expect(pts[0]?.[0]).toBeCloseTo(HW, 9)
    expect(pts[0]?.[1]).toBeCloseTo(0, 9)
  })

  it('runs straight along the rails', () => {
    // theta = 0: +X rail midpoint. theta = 90deg: top rail midpoint.
    const [x0] = roundedRectPoint(HW, HH, R, 0)
    expect(x0).toBeCloseTo(HW, 9)
    const [, y90] = roundedRectPoint(HW, HH, R, Math.PI / 2)
    expect(y90).toBeCloseTo(HH, 9)
    // Slightly off-axis rays still hit the straight edge, not the arc:
    // x stays exactly halfW across the rail span.
    for (const deg of [5, 10, 15, 20]) {
      const [x] = roundedRectPoint(HW, HH, R, (deg * Math.PI) / 180)
      expect(x).toBeCloseTo(HW, 9)
    }
  })

  it('lands on the corner circle in the corner span', () => {
    // The rect is tall, so the corner span sits near 64deg (the diagonal
    // to the arc center), not at 45deg — 45deg still hits the right rail.
    // At 70deg both straight edges miss their bands; only the arc hits.
    const [x, y] = roundedRectPoint(HW, HH, R, (70 * Math.PI) / 180)
    const dist = Math.hypot(x - (HW - R), y - (HH - R))
    expect(dist).toBeCloseTo(R, 9)
  })

  it('gives every corner arc half of its quadrant (the corners are where it curves)', () => {
    // Polar sampling left a tall phone ~5 of 48 points per corner: the
    // polished rails turned the corner in visible facets.
    for (const n of [24, 32, 48, 64]) {
      const pts = roundedRectPoints(HW, HH, R, n)
      const onArc = pts.filter(
        ([x, y]) =>
          Math.abs(x) > HW - R + 1e-9 &&
          Math.abs(y) > HH - R + 1e-9 &&
          Math.abs(Math.hypot(Math.abs(x) - (HW - R), Math.abs(y) - (HH - R)) - R) < 1e-9,
      )
      // Each corner: n/2 samples, minus the arc start that sits on the edge.
      expect(onArc.length).toBeGreaterThanOrEqual(4 * (n / 2 - 1))
    }
  })

  it('walks CCW from +X without turning back', () => {
    const pts = roundedRectPoints(HW, HH, R, 32)
    let prev = -Infinity
    for (const [x, y] of pts) {
      const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)
      expect(a).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = a
    }
  })

  it('pairs concentric outlines point for point along the normal', () => {
    // An inset part with its radius inset by the same amount sits a
    // uniform band inside its opening, corners included, so it can never
    // poke through (the rear panel did, at its corners).
    const d = 0.00115
    const outer = roundedRectPoints(HW, HH, R, 48)
    const inner = roundedRectPoints(HW - d, HH - d, R - d, 48)
    for (let i = 0; i < outer.length; i++) {
      const [ox, oy] = outer[i] as [number, number]
      const [ix, iy] = inner[i] as [number, number]
      expect(Math.hypot(ox - ix, oy - iy)).toBeCloseTo(d, 9)
    }
  })

  it('handles pills and sharp corners without duplicate points', () => {
    for (const [hw, hh, r] of [
      [0.002, 0.006, 0.002],
      [0.004, 0.004, 0.004],
      [0.01, 0.02, 0],
    ] as const) {
      const pts = roundedRectPoints(hw, hh, r, 8)
      expect(pts).toHaveLength(32)
      expect(pts[0]?.[0]).toBeCloseTo(hw, 12)
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i] as [number, number]
        const b = pts[(i + 1) % pts.length] as [number, number]
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1e-9)
      }
    }
  })

  it('keeps every loop point on the boundary (inset stays positive)', () => {
    for (const [hw, hh, r] of [
      [HW, HH, R],
      [HW - 0.006, HH - 0.006, R - 0.006],
      [0.03, 0.0774, R - 0.0016],
    ] as const) {
      for (const p of roundedRectPoints(hw, hh, r, 32)) {
        const [x, y] = p
        expect(Math.abs(x)).toBeLessThanOrEqual(hw + 1e-9)
        expect(Math.abs(y)).toBeLessThanOrEqual(hh + 1e-9)
        // On an edge or on a corner arc: not floating inside.
        const onEdgeX = Math.abs(Math.abs(x) - hw) < 1e-9
        const onEdgeY = Math.abs(Math.abs(y) - hh) < 1e-9
        const cornerDist = Math.hypot(Math.abs(x) - (hw - r), Math.abs(y) - (hh - r))
        const onArc = Math.abs(cornerDist - r) < 1e-6
        expect(onEdgeX || onEdgeY || onArc, `${x},${y}`).toBe(true)
      }
    }
  })
})
