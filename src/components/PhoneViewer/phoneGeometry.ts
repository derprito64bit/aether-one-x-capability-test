import * as THREE from 'three'
import { roundedRectPoints } from '../../lib/rounded-rect.ts'
import {
  BACK_PANEL,
  BEZEL,
  BEZEL_SURFACE,
  CORNER_R,
  CHAMFER,
  DIM,
  MIDFRAME,
  RING_BASE_Z,
  RING_DEPTH,
} from './phoneDimensions.ts'

/**
 * Body outline loop: rounded rect with the frozen corner radius, sampled
 * by polar angle (+X start, monotone CCW, 4 * perQuadrant points). The old
 * superellipse family is retired (round 02): its ever-curving sides bowed
 * outward along their whole length and read as a pebble, not a phone.
 * Inner holes inset the corner radius by the ledge so the band stays a
 * uniform width through the corners.
 */
export function bodyOutlinePoints(
  halfW: number,
  halfH: number,
  cornerR: number,
  perQuadrant: number,
): Array<[number, number]> {
  return roundedRectPoints(halfW, halfH, cornerR, perQuadrant)
}

/** Builds a closed THREE.Shape from a rounded-rect body outline. */
export function bodyOutlineShape(
  halfW: number,
  halfH: number,
  cornerR: number,
  perQuadrant = 64,
): THREE.Shape {
  const shape = new THREE.Shape()
  const pts = bodyOutlinePoints(halfW, halfH, cornerR, perQuadrant)
  const first = pts[0]
  if (first === undefined) return shape
  shape.moveTo(first[0], first[1])
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    if (p !== undefined) shape.lineTo(p[0], p[1])
  }
  shape.closePath()
  return shape
}

/**
 * Traces a centered rounded-square outline with corner radius r. Kept for
 * genuinely rectangular parts (buttons, trays, collars). Body outlines use
 * the superellipse instead: circular-arc corners carry a curvature
 * discontinuity that reads as cheap plastic.
 */
export function roundedRectPath(
  path: THREE.Shape | THREE.Path,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const c = Math.min(r, w / 2, h / 2)
  path.moveTo(x + c, y)
  path.lineTo(x + w - c, y)
  path.quadraticCurveTo(x + w, y, x + w, y + c)
  path.lineTo(x + w, y + h - c)
  path.quadraticCurveTo(x + w, y + h, x + w - c, y + h)
  path.lineTo(x + c, y + h)
  path.quadraticCurveTo(x, y + h, x, y + h - c)
  path.lineTo(x, y + c)
  path.quadraticCurveTo(x, y, x + c, y)
}

/**
 * Frame-to-back panel gap: a dark hairline following the top (or bottom)
 * edge rail to rail, corners included. A straight box of phone width pokes
 * 5mm past each rounded corner (round 02 poke-out fix), so the strip is
 * built from an outline loop: the top band of loop points, ribboned
 * inward. Flat, facing -Z (the back viewer). Defaults to the ceramic
 * panel's edge, where the panel actually meets the frame: on the full
 * body outline the strip floated in the air beside the frame chamfer.
 */
export function createPanelGapGeometry(
  top: boolean,
  halfW: number = BACK_PANEL.halfW + 0.0001,
  halfH: number = BACK_PANEL.halfH + 0.0001,
): THREE.BufferGeometry {
  const sign = top ? 1 : -1
  const loop = bodyOutlinePoints(halfW, halfH, CORNER_R, 64)
  const band = loop.filter(([, y]) => sign * y > halfH - 0.004)
  const width = 0.00012
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const m = band.length
  for (let i = 0; i < m; i++) {
    const a = band[i] as [number, number]
    const b = band[(i + 1) % m] as [number, number]
    // Inward = toward centroid (origin), in plane.
    const inA = inward(a)
    const inB = inward(b)
    quad(a, inA, inB, b)
  }
  function inward(p: [number, number]): [number, number] {
    const len = Math.hypot(p[0], p[1]) || 1
    return [p[0] - (p[0] / len) * width, p[1] - (p[1] / len) * width]
  }
  function quad(
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ): void {
    // Wound for a -Z normal (back viewer).
    const z = 0
    const tris: Array<[number, number]> = [p0, p2, p3, p0, p1, p2]
    for (const [x, y] of tris) {
      positions.push(x, y, z)
      normals.push(0, 0, -1)
      uvs.push(x, y)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

/**
 * Lower rear panel for split finishes: the ceramic panel outline (inset)
 * below `topY`, rounded corners included, extruded `depth` along +z and
 * centered on z = 0. A straight box of panel width poked past the rounded
 * bottom corners, outside the body silhouette.
 */
export function createLowerPanelGeometry(
  halfW: number,
  halfH: number,
  cornerR: number,
  topY: number,
  depth: number,
): THREE.BufferGeometry {
  const loop = bodyOutlinePoints(halfW, halfH, cornerR, 64)
  // The loop runs CCW from +X; rotate it to start at the first point
  // below the cut so the kept arc is contiguous.
  const start = loop.findIndex(([, y], i) => {
    const prev = loop[(i - 1 + loop.length) % loop.length] as [number, number]
    return y < topY && prev[1] >= topY
  })
  const shape = new THREE.Shape()
  shape.moveTo(-halfW, topY)
  for (let k = 0; k < loop.length; k++) {
    const p = loop[(start + k) % loop.length] as [number, number]
    if (p[1] >= topY) break
    shape.lineTo(p[0], p[1])
  }
  shape.lineTo(halfW, topY)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  fitPlanarUVs(geometry)
  return geometry
}

/**
 * Perimeter bezel ring with a display opening, built as an explicit annulus:
 * front lid strip, outer wall, outer chamfer band, and inner hole walls.
 * A holed ExtrudeGeometry is not used because earcut drops dense holes
 * against a dense superellipse outer (the ring rendered as a solid plate;
 * see ringHole.test.ts). Every triangle here is constructed, so the
 * opening exists by construction. Outer and inner loops are angle-matched
 * (same ray from the center hits both at the same index), which keeps the
 * strip quads clean with no twisting.
 */
export function createFrameRingGeometry(coarse = false): THREE.BufferGeometry {
  const perQuadrant = coarse ? 32 : 64
  const total = perQuadrant * 4
  const outer = bodyOutlinePoints(DIM.w / 2, DIM.h / 2, CORNER_R, perQuadrant)
  // Display opening as an inset rounded rect, not a rounded rect of fixed
  // radius: insetting the corner radius by the ledge keeps the lid strip a
  // uniform width all the way around. Phase-compatible by construction
  // (+X start, monotone CCW), so the annulus never pinwheels.
  const ledge = BEZEL * 0.95
  const inner = bodyOutlinePoints(
    DIM.w / 2 - ledge,
    DIM.h / 2 - ledge,
    Math.max(0.0005, CORNER_R - ledge),
    perQuadrant,
  )
  const zBack = RING_BASE_Z
  const zFront = RING_BASE_Z + RING_DEPTH
  const chamfer = CHAMFER.glassMeet
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []

  const push = (
    p: [number, number, number],
    n: [number, number, number],
    uv: [number, number],
  ): void => {
    positions.push(p[0], p[1], p[2])
    normals.push(n[0], n[1], n[2])
    uvs.push(uv[0], uv[1])
  }
  const tri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    na: [number, number, number],
    nb: [number, number, number],
    nc: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number],
  ): void => {
    push(a, na, uva)
    push(b, nb, uvb)
    push(c, nc, uvc)
  }
  // Smooth in-plane normals around a loop, for rail walls without faceting.
  const loopNormals = (loop: Array<[number, number]>): Array<[number, number]> =>
    loop.map(([,], i) => {
      const prev = loop[(i - 1 + loop.length) % loop.length] as [number, number]
      const next = loop[(i + 1) % loop.length] as [number, number]
      const tx = (next[0] ?? 0) - (prev[0] ?? 0)
      const ty = (next[1] ?? 0) - (prev[1] ?? 0)
      const len = Math.hypot(tx, ty) || 1
      return [-ty / len, tx / len]
    })

  // Smooth normals around each loop. loopNormals returns the left of
  // travel; both loops run CCW, so the outer wall normals are negated to
  // face outward while the hole walls keep the inward direction.
  const outerNormals = loopNormals(outer).map(([x, y]): [number, number] => [-x, -y])
  const innerNormals = loopNormals(inner)
  for (let i = 0; i < total; i++) {
    const j = (i + 1) % total
    const o0 = outer[i] as [number, number]
    const o1 = outer[j] as [number, number]
    const h0 = inner[i] as [number, number]
    const h1 = inner[j] as [number, number]
    const n0 = outerNormals[i] as [number, number]
    const n1 = outerNormals[j] as [number, number]
    const m0 = innerNormals[i] as [number, number]
    const m1 = innerNormals[j] as [number, number]
    // Lid outer edge pulled inboard so the chamfer band replaces the strip.
    const q0: [number, number] = [o0[0] - n0[0] * chamfer, o0[1] - n0[1] * chamfer]
    const q1: [number, number] = [o1[0] - n1[0] * chamfer, o1[1] - n1[1] * chamfer]
    const front: [number, number, number] = [0, 0, 1]
    const F0: [number, number, number] = [q0[0], q0[1], zFront]
    const F1: [number, number, number] = [q1[0], q1[1], zFront]
    const G0: [number, number, number] = [h0[0], h0[1], zFront]
    const G1: [number, number, number] = [h1[0], h1[1], zFront]
    const B0: [number, number, number] = [o0[0], o0[1], zBack]
    const B1: [number, number, number] = [o1[0], o1[1], zBack]
    const H0: [number, number, number] = [h0[0], h0[1], zBack]
    const H1: [number, number, number] = [h1[0], h1[1], zBack]
    const W0: [number, number, number] = [o0[0], o0[1], zFront - chamfer]
    const W1: [number, number, number] = [o1[0], o1[1], zFront - chamfer]
    const lidUv = (p: [number, number]): [number, number] => [p[0], p[1]]
    // Front annulus lid, facing the viewer. Wound counter-clockwise as
    // seen from the front: it was wound the other way, so the 1.4mm lid
    // was back-face culled and the front read straight into the ring.
    tri(F0, G1, G0, front, front, front, lidUv(q0), lidUv(h1), lidUv(h0))
    tri(F0, F1, G1, front, front, front, lidUv(q0), lidUv(q1), lidUv(h1))
    // Outer chamfer band, 45 degrees, catching the rim highlight.
    const chamferN0 = normalize3(n0[0], n0[1], 1)
    const chamferN1 = normalize3(n1[0], n1[1], 1)
    const bandUv = (p: [number, number]): [number, number] => [p[0], p[1]]
    tri(F0, W0, W1, chamferN0, chamferN0, chamferN1, bandUv(q0), bandUv(o0), bandUv(o1))
    tri(F0, W1, F1, chamferN0, chamferN1, chamferN1, bandUv(q0), bandUv(o1), bandUv(q1))
    // Outer wall below the chamfer, smooth outward normals.
    const N0: [number, number, number] = [n0[0], n0[1], 0]
    const N1: [number, number, number] = [n1[0], n1[1], 0]
    tri(W0, B0, B1, N0, N0, N1, bandUv(o0), bandUv(o0), bandUv(o1))
    tri(W0, B1, W1, N0, N1, N1, bandUv(o0), bandUv(o1), bandUv(o1))
    // Inner hole walls, facing the opening (hidden under the glass).
    const wallH0: [number, number, number] = [m0[0], m0[1], 0]
    const wallH1: [number, number, number] = [m1[0], m1[1], 0]
    tri(G0, G1, H1, wallH0, wallH1, wallH1, lidUv(h0), lidUv(h1), lidUv(h1))
    tri(G0, H1, H0, wallH0, wallH1, wallH0, lidUv(h0), lidUv(h1), lidUv(h0))
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.userData.annulusOpening = RING_OPENING
  return geometry
}

/** Front ring display opening (rounded rect), shared by glass and ink. */
export const RING_OPENING = {
  halfW: DIM.w / 2 - BEZEL * 0.95,
  halfH: DIM.h / 2 - BEZEL * 0.95,
  r: Math.max(0.0005, CORNER_R - BEZEL * 0.95),
} as const

/** Rear rim panel opening: the ceramic panel's widest outline plus 0.05mm. */
export const REAR_RIM_OPENING = {
  halfW: BACK_PANEL.halfW + BACK_PANEL.bevel + 0.00005,
  halfH: BACK_PANEL.halfH + BACK_PANEL.bevel + 0.00005,
  r: CORNER_R + BACK_PANEL.bevel + 0.00005,
} as const

/**
 * Rear frame rim: the explicit-annulus counterpart of the front ring,
 * carrying the frame's rear chamfer (0.9mm across, 0.6mm deep) and a
 * lid facing the rear, with the ceramic panel seated in its opening. The
 * frame body used to be one solid extrusion down to the rear face, so the
 * ceramic panel sat buried inside it; now the body stops at the panel's
 * inner face and this rim frames the panel.
 */
export function createRearRimGeometry(
  zLid: number,
  zBase: number,
  coarse = false,
): THREE.BufferGeometry {
  const perQuadrant = coarse ? 32 : 64
  const total = perQuadrant * 4
  const outer = bodyOutlinePoints(DIM.w / 2, DIM.h / 2, CORNER_R, perQuadrant)
  const inner = bodyOutlinePoints(
    REAR_RIM_OPENING.halfW,
    REAR_RIM_OPENING.halfH,
    REAR_RIM_OPENING.r,
    perQuadrant,
  )
  const chamferW = CHAMFER.body
  const chamferH = 0.0006
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const push = (p: number[], n: number[], uv: [number, number]): void => {
    positions.push(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0)
    normals.push(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0)
    uvs.push(uv[0], uv[1])
  }
  const loopNormals = (loop: Array<[number, number]>): Array<[number, number]> =>
    loop.map((_, i) => {
      const prev = loop[(i - 1 + loop.length) % loop.length] as [number, number]
      const next = loop[(i + 1) % loop.length] as [number, number]
      const tx = next[0] - prev[0]
      const ty = next[1] - prev[1]
      const len = Math.hypot(tx, ty) || 1
      return [-ty / len, tx / len]
    })
  // Outward normals for the outer loop, opening-facing for the hole wall.
  const outerNormals = loopNormals(outer).map(([x, y]): [number, number] => [-x, -y])
  const innerNormals = loopNormals(inner)
  const rear = [0, 0, -1]
  for (let i = 0; i < total; i++) {
    const j = (i + 1) % total
    const o0 = outer[i] as [number, number]
    const o1 = outer[j] as [number, number]
    const h0 = inner[i] as [number, number]
    const h1 = inner[j] as [number, number]
    const n0 = outerNormals[i] as [number, number]
    const n1 = outerNormals[j] as [number, number]
    const m0 = innerNormals[i] as [number, number]
    const m1 = innerNormals[j] as [number, number]
    const q0: [number, number] = [o0[0] - n0[0] * chamferW, o0[1] - n0[1] * chamferW]
    const q1: [number, number] = [o1[0] - n1[0] * chamferW, o1[1] - n1[1] * chamferW]
    const F0 = [q0[0], q0[1], zLid]
    const F1 = [q1[0], q1[1], zLid]
    const G0 = [h0[0], h0[1], zLid]
    const G1 = [h1[0], h1[1], zLid]
    const W0 = [o0[0], o0[1], zLid + chamferH]
    const W1 = [o1[0], o1[1], zLid + chamferH]
    const B0 = [o0[0], o0[1], zBase]
    const B1 = [o1[0], o1[1], zBase]
    const H0 = [h0[0], h0[1], zBase]
    const H1 = [h1[0], h1[1], zBase]
    // Rear lid, facing -z (counter-clockwise seen from behind).
    push(F0, rear, q0)
    push(G0, rear, h0)
    push(G1, rear, h1)
    push(F0, rear, q0)
    push(G1, rear, h1)
    push(F1, rear, q1)
    // Rear chamfer band, outward and rearward.
    const c0 = normalize3(n0[0] * chamferH, n0[1] * chamferH, -chamferW)
    const c1 = normalize3(n1[0] * chamferH, n1[1] * chamferH, -chamferW)
    push(F0, c0, q0)
    push(W1, c1, o1)
    push(W0, c0, o0)
    push(F0, c0, q0)
    push(F1, c1, q1)
    push(W1, c1, o1)
    // Outer wall up to the body.
    const N0 = [n0[0], n0[1], 0]
    const N1 = [n1[0], n1[1], 0]
    push(W0, N0, o0)
    push(B1, N1, o1)
    push(B0, N0, o0)
    push(W0, N0, o0)
    push(W1, N1, o1)
    push(B1, N1, o1)
    // Opening wall, facing the ceramic panel.
    const M0 = [m0[0], m0[1], 0]
    const M1 = [m1[0], m1[1], 0]
    push(G0, M0, h0)
    push(H1, M1, h1)
    push(G1, M1, h1)
    push(G0, M0, h0)
    push(H0, M0, h0)
    push(H1, M1, h1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.userData.annulusOpening = REAR_RIM_OPENING
  return geometry
}

/** Normalizes a 3-vector. */
function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1
  return [x / len, y / len, z / len]
}

/**
 * Circular module base (Prompt A2): the concave G1 fillet that blends the
 * collar wall into the rear panel. Lathe profile in (radius, rise) space,
 * flaring from `radius + fillet` on the panel to `radius` at `fillet` rise,
 * so the pad-to-panel transition is one machined surface, not a chamfer.
 * The collar wall above it is its own mesh: the base used to run the full
 * module height at the collar radius, coplanar with the collar wall, and
 * the two z-fought (and its convex bullnose undercut the panel instead of
 * filleting into it). Rotate -PI/2 about X so rise maps to rear (-z).
 */
export function createModuleBaseGeometry(
  radius: number,
  fillet: number,
  segments = 96,
): THREE.BufferGeometry {
  const points: THREE.Vector2[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2)
    points.push(
      new THREE.Vector2(radius + fillet - fillet * Math.sin(t), fillet - fillet * Math.cos(t)),
    )
  }
  return new THREE.LatheGeometry(points, segments)
}

/**
 * Lathe through (radius, rise) profile points, rotated so rise runs rear
 * (-z) from the ceramic face plane at z = 0. Point order sets the facing:
 * rising profiles face away from the axis, falling profiles face the axis
 * (bores and risers seen from inside a recess). Every face is visible from
 * its open side with single-sided materials, unlike an open cylinder,
 * whose inside is back-face culled.
 */
export function createRearLatheGeometry(
  profile: ReadonlyArray<readonly [number, number]>,
  segments = 96,
): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, rise]) => new THREE.Vector2(r, rise)),
    segments,
  )
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/**
 * Flat rounded-rect annulus (outer rect with a rounded-rect opening),
 * extruded `depth` along +z and centered on z = 0. Used for mouth rims: a
 * solid rounded rect would cap the opening it is meant to frame.
 */
export function createRoundedRectRingGeometry(
  outerW: number,
  outerH: number,
  outerR: number,
  innerW: number,
  innerH: number,
  innerR: number,
  depth: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  roundedRectPath(shape, -outerW / 2, -outerH / 2, outerW, outerH, outerR)
  const hole = new THREE.Path()
  roundedRectPath(hole, -innerW / 2, -innerH / 2, innerW, innerH, innerR)
  shape.holes.push(hole)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

/**
 * Display bezel ink ring: rounded-rect outline with a rounded-rect opening
 * for the active area, feathered by the grain map's alpha falloff. Sits
 * under the front glass (BEZEL_SURFACE.z) so the glass reflection passes
 * over it unbroken. The opening insets the corner radius by the band so
 * the ink band is a uniform width, corners included.
 */
export function createBezelGeometry(
  outerHW: number,
  outerHH: number,
  innerHW: number,
  innerHH: number,
  cornerR: number = CORNER_R,
): THREE.BufferGeometry {
  const band = Math.max(0.0005, Math.min(outerHW - innerHW, outerHH - innerHH))
  const shape = bodyOutlineShape(outerHW, outerHH, cornerR, 64)
  const holePts = bodyOutlinePoints(innerHW, innerHH, Math.max(0.0005, cornerR - band), 64)
  const hole = new THREE.Path()
  const first = holePts[0]
  if (first !== undefined) {
    hole.moveTo(first[0], first[1])
    for (let i = 1; i < holePts.length; i++) {
      const p = holePts[i]
      if (p !== undefined) hole.lineTo(p[0], p[1])
    }
    hole.closePath()
  }
  shape.holes.push(hole)
  const geometry = new THREE.ShapeGeometry(shape, 16)
  geometry.translate(0, 0, BEZEL_SURFACE.z)
  return geometry
}

/**
 * Centered rounded-rect slab with soft bevels. Front glass, display, and
 * back panel share the body outline: the glass extends out to meet the
 * rail overhang with a slight uniform gap, corners included.
 *
 * Centered means centered: the extrusion spans [-bevel, body + bevel], so
 * the translate is -body / 2. It used to subtract one more bevel, which
 * shifted every slab a bevel rearward: the 1.3mm back-panel bevel pushed
 * the ceramic 1.3mm proud of the frame, burying the module's glass,
 * medallion, flash, and ToF, plus the wordmark and regulatory print, and
 * dropped the cover glass 0.35mm below its front details.
 *
 * UVs are planar 0..1 over the slab footprint (see fitPlanarUVs): the
 * display wallpaper, glass smudge and gradient, and ceramic mottle are
 * whole-panel maps. Extrude UVs are raw meters, so every one of them
 * sampled a few texels at the corner and the screen read as one flat
 * colour (near-black with the old wallpaper, washed-out with the new).
 */
export function roundedRectSlabGeometry(
  halfW: number,
  halfH: number,
  depth: number,
  bevel: number,
  cornerR: number = CORNER_R,
): THREE.BufferGeometry {
  const shape = bodyOutlineShape(halfW, halfH, cornerR, 64)
  const body = Math.max(0.0001, depth - bevel * 2)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: body,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  })
  geometry.translate(0, 0, -body / 2)
  fitPlanarUVs(geometry)
  return geometry
}

/**
 * Rewrites UVs as a planar XY projection normalized to the geometry's
 * footprint: u 0..1 left to right, v 0..1 bottom to top (canvas row 0 at
 * the top edge with the default flipY).
 */
export function fitPlanarUVs(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
  if (box === null || uv === undefined) return
  const w = Math.max(1e-9, box.max.x - box.min.x)
  const h = Math.max(1e-9, box.max.y - box.min.y)
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - box.min.x) / w, (pos.getY(i) - box.min.y) / h)
  }
  uv.needsUpdate = true
}

/** Midframe rail opening: the body outline inset by the rail wall. */
export const FRAME_BODY_OPENING = {
  halfW: DIM.w / 2 - MIDFRAME.wall,
  halfH: DIM.h / 2 - MIDFRAME.wall,
  r: CORNER_R - MIDFRAME.wall,
} as const

/**
 * Frame body (round 05): the rails as an explicit open annulus from the
 * rear panel's inner face to the ring lid, wall MIDFRAME.wall thick, so
 * the parts mounted inside the frame show from the rear when the midframe
 * is presented (it was one solid extrusion that buried every internal).
 * Outer wall, opening wall, and both annular caps, non-indexed so
 * assignRailGroups can split it per rail. The opening is tagged for the
 * layer-stack test's annulus check.
 */
export function createFrameBodyGeometry(backFaceZ: number, coarse = false): THREE.BufferGeometry {
  const geometry = createOutlineAnnulusGeometry(
    { halfW: DIM.w / 2, halfH: DIM.h / 2, r: CORNER_R },
    FRAME_BODY_OPENING,
    backFaceZ,
    RING_BASE_Z,
    coarse ? 24 : 48,
  )
  geometry.userData.annulusOpening = FRAME_BODY_OPENING
  return geometry
}

/** A rounded-rect outline (half extents and corner radius, metres). */
export interface OutlineRect {
  halfW: number
  halfH: number
  r: number
}

/**
 * Explicit annulus between two body-style outlines (circular corners, the
 * same sampling as the glass and body slabs), from zBack to zFront: outer
 * wall, opening wall, and both caps, non-indexed, with world-unit UVs
 * (caps in xy, walls along z) like ExtrudeGeometry's. Explicit because
 * earcut drops dense holes, and because roundedRectPath's quadratic
 * corners bulge up to 0.06r past a circular corner.
 */
export function createOutlineAnnulusGeometry(
  outerRect: OutlineRect,
  innerRect: OutlineRect,
  zBack: number,
  zFront: number,
  perQuadrant: number,
): THREE.BufferGeometry {
  const total = perQuadrant * 4
  const outer = bodyOutlinePoints(outerRect.halfW, outerRect.halfH, outerRect.r, perQuadrant)
  const inner = bodyOutlinePoints(innerRect.halfW, innerRect.halfH, innerRect.r, perQuadrant)
  const zB = zBack
  const zF = zFront
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const tri = (a: number[], b: number[], c: number[], n: number[]): void => {
    // Wind to match the intended normal.
    const ux = (b[0] ?? 0) - (a[0] ?? 0)
    const uy = (b[1] ?? 0) - (a[1] ?? 0)
    const uz = (b[2] ?? 0) - (a[2] ?? 0)
    const vx = (c[0] ?? 0) - (a[0] ?? 0)
    const vy = (c[1] ?? 0) - (a[1] ?? 0)
    const vz = (c[2] ?? 0) - (a[2] ?? 0)
    const cx = uy * vz - uz * vy
    const cy = uz * vx - ux * vz
    const cz = ux * vy - uy * vx
    const flip = cx * (n[0] ?? 0) + cy * (n[1] ?? 0) + cz * (n[2] ?? 0) < 0
    // World-unit UVs like ExtrudeGeometry's: caps in xy, walls along z,
    // so the rail brush maps tile exactly as they did on the solid body.
    const cap = Math.abs(n[2] ?? 0) > 0.5
    const alongY = Math.abs(n[0] ?? 0) >= Math.abs(n[1] ?? 0)
    for (const v of flip ? [a, c, b] : [a, b, c]) {
      positions.push(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0)
      normals.push(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0)
      if (cap) uvs.push(v[0] ?? 0, v[1] ?? 0)
      else uvs.push(alongY ? (v[1] ?? 0) : (v[0] ?? 0), 1 - (v[2] ?? 0))
    }
  }
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[]): void => {
    tri(a, b, c, n)
    tri(a, c, d, n)
  }
  const outward = (loop: Array<[number, number]>, i: number): [number, number] => {
    const p = loop[i] as [number, number]
    // Average of the neighbouring edge normals, pointing away from centre.
    const prev = loop[(i - 1 + loop.length) % loop.length] as [number, number]
    const next = loop[(i + 1) % loop.length] as [number, number]
    let nx = next[1] - prev[1]
    let ny = -(next[0] - prev[0])
    const m = Math.hypot(nx, ny) || 1
    nx /= m
    ny /= m
    if (nx * p[0] + ny * p[1] < 0) {
      nx = -nx
      ny = -ny
    }
    return [nx, ny]
  }
  for (let i = 0; i < total; i++) {
    const j = (i + 1) % total
    const a = outer[i] as [number, number]
    const b = outer[j] as [number, number]
    const c = inner[i] as [number, number]
    const d = inner[j] as [number, number]
    const na = outward(outer, i)
    const nb = outward(outer, j)
    const n0: [number, number] = [(na[0] + nb[0]) / 2, (na[1] + nb[1]) / 2]
    const ma = outward(inner, i)
    const mb = outward(inner, j)
    const m0: [number, number] = [-(ma[0] + mb[0]) / 2, -(ma[1] + mb[1]) / 2]
    // Outer wall, opening wall, front cap, rear cap.
    quad([a[0], a[1], zB], [b[0], b[1], zB], [b[0], b[1], zF], [a[0], a[1], zF], [n0[0], n0[1], 0])
    quad([c[0], c[1], zB], [c[0], c[1], zF], [d[0], d[1], zF], [d[0], d[1], zB], [m0[0], m0[1], 0])
    quad([a[0], a[1], zF], [b[0], b[1], zF], [d[0], d[1], zF], [c[0], c[1], zF], [0, 0, 1])
    quad([a[0], a[1], zB], [c[0], c[1], zB], [d[0], d[1], zB], [b[0], b[1], zB], [0, 0, -1])
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

/** Centered rounded-rectangle extrusion with optional chamfered end lips. */
export function createRoundedRectGeometry(
  w: number,
  h: number,
  radius: number,
  depth: number,
  bevelSize = 0,
  bevelThickness = 0,
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  roundedRectPath(shape, -w / 2, -h / 2, w, h, radius)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelSize,
    bevelThickness,
    bevelSegments: 2,
    curveSegments: 16,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

/**
 * Centered rounded-rectangle slab with soft bevels. Replaces a rounded box.
 * Spans exactly [-depth / 2, depth / 2] in z (see roundedRectSlabGeometry).
 */
export function createSlabGeometry(
  w: number,
  h: number,
  depth: number,
  r: number,
  bevel: number = CHAMFER.glassMeet,
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  roundedRectPath(shape, -w / 2, -h / 2, w, h, r)
  const body = Math.max(0.0001, depth - bevel * 2)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: body,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  })
  geometry.translate(0, 0, -body / 2)
  return geometry
}

/** Disposes every geometry in the set. Safe to call once per owner. */
export function disposeGeometries(set: { [key: string]: THREE.BufferGeometry }): void {
  for (const geometry of Object.values(set)) geometry.dispose()
}

/**
 * Splits a non-indexed extrusion into four rail groups (+X, -X, +Y, -Y) by
 * face-centroid sector, so each rail takes its own anisotropy rotation.
 * Triangles are reordered into contiguous buckets; group material indices
 * follow RAIL_KEYS order. Deterministic and allocation-light.
 */
export function assignRailGroups(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const triCount = Math.floor(position.count / 3)
  const buckets: number[][] = [[], [], [], []]
  for (let t = 0; t < triCount; t++) {
    const cx = (position.getX(t * 3) + position.getX(t * 3 + 1) + position.getX(t * 3 + 2)) / 3
    const cy = (position.getY(t * 3) + position.getY(t * 3 + 1) + position.getY(t * 3 + 2)) / 3
    const sector = Math.abs(cx) >= Math.abs(cy) ? (cx >= 0 ? 0 : 1) : cy >= 0 ? 2 : 3
    const bucket = buckets[sector]
    if (bucket !== undefined) bucket.push(t)
  }
  const names = Object.keys(geometry.attributes)
  const copies = new Map<string, THREE.BufferAttribute>()
  for (const name of names) {
    const attr = geometry.getAttribute(name) as THREE.BufferAttribute
    copies.set(name, attr.clone())
  }
  geometry.clearGroups()
  let vertex = 0
  buckets.forEach((bucket, materialIndex) => {
    for (const t of bucket) {
      for (let v = 0; v < 3; v++) {
        const s = t * 3 + v
        for (const [name, source] of copies) {
          const target = geometry.getAttribute(name) as THREE.BufferAttribute
          if (target.itemSize === 2) {
            target.setXY(vertex, source.getX(s), source.getY(s))
          } else if (target.itemSize === 3) {
            target.setXYZ(vertex, source.getX(s), source.getY(s), source.getZ(s))
          } else {
            target.setXYZW(vertex, source.getX(s), source.getY(s), source.getZ(s), source.getW(s))
          }
        }
        vertex += 1
      }
    }
    geometry.addGroup(vertex - bucket.length * 3, bucket.length * 3, materialIndex)
  })
}
