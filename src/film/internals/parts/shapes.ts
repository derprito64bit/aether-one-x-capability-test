import * as THREE from 'three'
import { bodyOutlineShape, fitPlanarUVs } from '../../../components/PhoneViewer/phoneGeometry.ts'
import { markCellUv } from '../showcaseTextures.ts'

/**
 * Light rounded slab for internal parts: a rounded-rect outline with a
 * soft edge bevel, centred on z, outer extent exactly halfW x halfH.
 * Coarse on purpose (a few points per corner): the shell's slab helper
 * spends ~5k triangles on one panel, which a 6mm chip cannot use.
 */
export function softSlab(
  halfW: number,
  halfH: number,
  depth: number,
  bevel: number,
  cornerR: number,
  perQuadrant = 5,
): THREE.BufferGeometry {
  const b = Math.max(0, Math.min(bevel, depth / 2 - 0.000005, halfW / 2, halfH / 2))
  const shape = bodyOutlineShape(
    halfW - b,
    halfH - b,
    Math.max(0.00005, Math.min(cornerR, halfW, halfH) - b),
    perQuadrant,
  )
  const body = Math.max(0.000005, depth - b * 2)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: body,
    bevelEnabled: b > 0,
    bevelSize: b,
    bevelThickness: b,
    bevelSegments: 2,
    curveSegments: 4,
    steps: 1,
  })
  geometry.translate(0, 0, -body / 2)
  fitPlanarUVs(geometry)
  return geometry
}

/** A plane whose UVs cover one cell of the marking atlas. */
export function markPlane(w: number, h: number, cell: number): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(w, h)
  const [u0, v0, u1, v1] = markCellUv(cell)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) < 0.5 ? u0 : u1, uv.getY(i) < 0.5 ? v0 : v1)
  }
  uv.needsUpdate = true
  return geometry
}

/** Disposes every geometry in a record (useEffect cleanup helper). */
export function disposeAll(geometries: Record<string, THREE.BufferGeometry>): void {
  for (const g of Object.values(geometries)) g.dispose()
}
