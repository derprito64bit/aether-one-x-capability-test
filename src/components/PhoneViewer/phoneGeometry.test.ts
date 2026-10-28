import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  assignRailGroups,
  bodyOutlineShape,
  createFrameBodyGeometry,
  createFrameRingGeometry,
  createPanelGapGeometry,
  createRearRimGeometry,
  REAR_RIM_OPENING,
} from './phoneGeometry.ts'
import { BACK_FACE, CHAMFER, CORNER_R, DIM } from './phoneDimensions.ts'

function groupSizes(geometry: THREE.BufferGeometry): number[] {
  return geometry.groups.map((group) => group.count)
}

describe('assignRailGroups', () => {
  it('splits the frame body into four contiguous rail groups', () => {
    const geometry = createFrameBodyGeometry(BACK_FACE)
    const before = (geometry.getAttribute('position') as THREE.BufferAttribute).count
    assignRailGroups(geometry)
    expect(geometry.groups).toHaveLength(4)
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1, 2, 3])
    const sizes = groupSizes(geometry)
    const total = sizes.reduce((a, b) => a + b, 0)
    expect(total).toBe(before)
    // Every rail owns real faces; contiguity holds by construction.
    for (const size of sizes) {
      expect(size).toBeGreaterThan(0)
      expect(size % 3).toBe(0)
    }
    let start = 0
    for (const [i, size] of sizes.entries()) {
      expect(geometry.groups[i]?.start).toBe(start)
      start += size
    }
    geometry.dispose()
  })

  it('splits the bezel ring the same way', () => {
    const geometry = createFrameRingGeometry()
    assignRailGroups(geometry)
    expect(geometry.groups).toHaveLength(4)
    const total = groupSizes(geometry).reduce((a, b) => a + b, 0)
    expect(total).toBe((geometry.getAttribute('position') as THREE.BufferAttribute).count)
    geometry.dispose()
  })

  it('preserves normals and uvs through the reorder', () => {
    const geometry = createFrameBodyGeometry(BACK_FACE)
    const count = (geometry.getAttribute('position') as THREE.BufferAttribute).count
    assignRailGroups(geometry)
    for (const name of ['position', 'normal', 'uv']) {
      expect((geometry.getAttribute(name) as THREE.BufferAttribute).count).toBe(count)
    }
    geometry.computeBoundingSphere()
    expect(geometry.boundingSphere?.radius).toBeGreaterThan(0.05)
    geometry.dispose()
  })

  it('builds a closed rounded-rect body shape', () => {
    const shape = bodyOutlineShape(0.03, 0.05, CORNER_R, 16)
    expect(shape.getPoints().length).toBeGreaterThan(0)
    const pts = shape.getPoints()
    let maxX = 0
    for (const p of pts) maxX = Math.max(maxX, Math.abs(p.x))
    // Straight rails: the outline touches halfW along a span, not a point.
    expect(maxX).toBeCloseTo(0.03, 6)
  })

  it('keeps the panel gap hairlines inside the body outline (no poke-out)', () => {
    // A straight full-width box pokes ~5mm past each rounded corner.
    // The ribbon follows the edge, so every vertex stays in-bounds.
    for (const top of [true, false]) {
      const geometry = createPanelGapGeometry(top)
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute
      expect(pos.count).toBeGreaterThan(0)
      const nrm = geometry.getAttribute('normal') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        // 1e-6 still catches any real poke-out (the boxes stuck out 5mm).
        expect(Math.abs(x)).toBeLessThanOrEqual(DIM.w / 2 + 1e-6)
        expect(Math.abs(y)).toBeLessThanOrEqual(DIM.h / 2 + 1e-6)
        expect(nrm.getZ(i)).toBe(-1)
      }
      geometry.dispose()
    }
  })
})

/**
 * Hand-built annuli must wind every triangle the way its normals face:
 * the front ring's lid was wound backwards, so the 1.4mm lid around the
 * glass was back-face culled and never rendered.
 */
describe('hand-built frame annuli', () => {
  function windingDisagreements(geometry: THREE.BufferGeometry): number {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    const nor = geometry.getAttribute('normal') as THREE.BufferAttribute
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const n = new THREE.Vector3()
    let bad = 0
    for (let t = 0; t < pos.count / 3; t++) {
      a.fromBufferAttribute(pos, t * 3)
      b.fromBufferAttribute(pos, t * 3 + 1).sub(a)
      c.fromBufferAttribute(pos, t * 3 + 2).sub(a)
      n.fromBufferAttribute(nor, t * 3)
      if (b.cross(c).dot(n) <= 0) bad++
    }
    return bad
  }

  it('winds the front ring and the rear rim to face their normals', () => {
    for (const geometry of [
      createFrameRingGeometry(),
      createFrameRingGeometry(true),
      createRearRimGeometry(BACK_FACE + 0.00005, -0.00311),
      createRearRimGeometry(BACK_FACE + 0.00005, -0.00311, true),
    ]) {
      expect(windingDisagreements(geometry)).toBe(0)
      geometry.dispose()
    }
  })

  it('opens the rear rim around the ceramic panel and closes it to the body outline', () => {
    const geometry = createRearRimGeometry(BACK_FACE + 0.00005, -0.00311)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox as THREE.Box3
    expect(box.max.x).toBeCloseTo(DIM.w / 2, 6)
    expect(box.min.z).toBeCloseTo(BACK_FACE + 0.00005, 9)
    expect(box.max.z).toBeCloseTo(-0.00311, 9)
    expect(REAR_RIM_OPENING.halfW).toBeLessThan(DIM.w / 2 - CHAMFER.body)
    geometry.dispose()
  })
})
