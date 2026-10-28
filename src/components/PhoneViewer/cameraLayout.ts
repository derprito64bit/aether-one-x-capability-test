import * as THREE from 'three'
import {
  CERAMIC_FACE_Z,
  COLLAR,
  LENSES,
  LENS_COLLAR,
  LENS_RING_R,
  MODULE,
  PERISCOPE,
} from './phoneDimensions.ts'
import { roundedRectPath } from './phoneGeometry.ts'
import type { PhoneMaterialSet } from './phoneMaterials.ts'
import type { FocusLensId } from './PhoneConfig.tsx'

/**
 * Camera-module layout math (Prompt A2), shared by CameraAssembly, the
 * internals optics, the explode registry, and tests. Pure: no React.
 */
export interface LensSpec {
  key: FocusLensId
  x: number
  y: number
  r: number
  coatHue: number
  barrelDepth: number
  glass: keyof Pick<PhoneMaterialSet, 'lensGlassA' | 'lensGlassB' | 'lensGlassC'>
}

const GLASS_FOR: Record<'main' | 'ultra' | 'mid', LensSpec['glass']> = {
  main: 'lensGlassA',
  ultra: 'lensGlassB',
  mid: 'lensGlassC',
}

/** Module center in phone meters. The module is centered, not offset. */
export function moduleCenter(): { x: number; y: number } {
  return { x: MODULE.cx, y: MODULE.cy }
}

/** Polar seat of a round lens in phone meters. */
export function lensSeat(angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  const c = moduleCenter()
  return { x: c.x + LENS_RING_R * Math.cos(a), y: c.y + LENS_RING_R * Math.sin(a) }
}

/** Round lens seats in phone meters, derived from LENSES polar placement. */
export function lensSpecs(): LensSpec[] {
  return LENSES.map((lens) => {
    const seat = lensSeat(lens.angleDeg)
    return {
      key: lens.key,
      x: seat.x,
      y: seat.y,
      r: lens.r,
      coatHue: lens.coatHue,
      barrelDepth: lens.barrelDepth,
      glass: GLASS_FOR[lens.key],
    }
  })
}

/**
 * Module heights, as rise above the ceramic face (rear is -z, so a rise
 * maps to z = CERAMIC_FACE_Z - rise). The collar is a stepped bowl: outer
 * collar top highest, bead-blasted step below it, cover glass lowest.
 */
export const MODULE_RISE = {
  outer: COLLAR.outer.rise,
  step: COLLAR.step.rise,
  glass: COLLAR.glass.rise,
  /** Lens turret collar top: stands proud of the module top plane. */
  lensTop: MODULE.proud + LENS_COLLAR.proud,
  /** Lens mouth: barrels open 0.1mm under the module top plane. */
  lensMouth: MODULE.proud - 0.0001,
} as const

/** Phone-space z of a module rise. */
export function riseZ(rise: number): number {
  return CERAMIC_FACE_Z - rise
}

/**
 * Lens turret profiles in (radius, rise) space. The collar is one lathe:
 * tapered outer wall standing on the cover glass, top annulus, inner wall,
 * and the mouth ledge down to the barrel; the barrel is an inward-facing
 * lathe to its floor. Both read from their open sides with single-sided
 * materials (the old open cylinders were back-face culled from inside).
 */
export function lensTurretProfile(spec: Pick<LensSpec, 'r' | 'barrelDepth'>): {
  collar: Array<[number, number]>
  barrel: Array<[number, number]>
  bottomRise: number
} {
  const { r } = spec
  const bottomRise = MODULE_RISE.lensMouth - spec.barrelDepth
  return {
    collar: [
      [r + LENS_COLLAR.base, MODULE_RISE.glass],
      [r + LENS_COLLAR.top, MODULE_RISE.lensTop],
      [r, MODULE_RISE.lensTop],
      [r, MODULE_RISE.lensMouth],
      [r * 0.8, MODULE_RISE.lensMouth],
    ],
    barrel: [
      [r * 0.8, MODULE_RISE.lensMouth],
      [r * 0.86, bottomRise],
    ],
    bottomRise,
  }
}

/**
 * Lens tunnel internals as fractions of the lens radius / barrel depth,
 * shared by CameraAssembly and the tests (one source, no copied literals).
 */
export const LENS_TUNNEL = {
  /** Baffle torus ring radius (x r) and tube radius (m). */
  baffleR: 0.78,
  baffleTube: 0.00022,
  /** Baffle depths (x barrel depth): two on LOD0, one on LOD1. */
  baffleDepths: [0.35, 0.7],
  baffleDepthLow: [0.5],
  /** Front element rim radius (x r) and pole depth (x barrel depth). */
  elementRim: 0.72,
  elementPole: 0.45,
  /** Aperture ring depth (x barrel depth). */
  aperture: 0.8,
} as const

/**
 * Front element cap: rim radius 0.72r, pole at 45% barrel depth, height
 * capped so the cap clears the aperture ring and sensor below it (the old
 * fixed 1.5r sphere ran past the sensor plane on the main and ultra).
 */
export function lensElementCap(spec: Pick<LensSpec, 'r' | 'barrelDepth'>): {
  sphereR: number
  theta: number
  poleDepth: number
  height: number
} {
  const a = spec.r * LENS_TUNNEL.elementRim
  const height = Math.min(spec.r * 0.183, spec.barrelDepth * 0.3)
  const sphereR = (a * a + height * height) / (2 * height)
  return {
    sphereR,
    theta: Math.asin(a / sphereR),
    poleDepth: spec.barrelDepth * LENS_TUNNEL.elementPole,
    height,
  }
}

/** Periscope cavity: open-wall frame from the window down to the ceramic. */
export function periscopeLayout(): {
  windowRise: number
  windowDepth: number
  wallTopRise: number
  prism: { length: number; width: number; tilt: number; rise: number }
} {
  const windowDepth = 0.00015
  // Window bottom 0.075mm proud of the cover glass: a separate pane.
  const windowRise = MODULE_RISE.glass + 0.000075 + windowDepth / 2
  const wallTopRise = windowRise - windowDepth / 2
  // Prism face fits inside the walls: spans the cavity height diagonally
  // at the steepest tilt the depth allows, capped at the design angle.
  const innerH = PERISCOPE.h - PERISCOPE.wall
  const depth = wallTopRise - 0.00004
  const tilt = Math.min((PERISCOPE.prismAngleDeg * Math.PI) / 180, Math.atan(depth / innerH))
  const length = Math.min(innerH / Math.cos(tilt), depth / Math.sin(tilt)) * 0.96
  return {
    windowRise,
    windowDepth,
    wallTopRise,
    prism: {
      length,
      width: PERISCOPE.w - PERISCOPE.wall * 1.5,
      tilt,
      rise: 0.00002 + (length * Math.sin(tilt)) / 2,
    },
  }
}

/**
 * Cover glass disc with openings where the lens turrets and the periscope
 * cavity pass through it (the solid disc used to slice every barrel and
 * sat coplanar with the ultra sensor). Built in glass-local space mirrored
 * in x, because the mesh turns PI about Y to face the rear; UVs match a
 * CircleGeometry so the micro-text map lands where it did.
 */
export function createModuleGlassGeometry(): THREE.BufferGeometry {
  const R = COLLAR.glass.r
  const shape = new THREE.Shape()
  shape.absarc(0, 0, R, 0, Math.PI * 2, false)
  const center = moduleCenter()
  for (const spec of lensSpecs()) {
    const hole = new THREE.Path()
    // Turret radius where it crosses the glass plane, plus 0.01mm.
    const hr = spec.r + LENS_COLLAR.base + 0.00001
    hole.absarc(-(spec.x - center.x), spec.y - center.y, hr, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  }
  const ph = new THREE.Path()
  const pw = PERISCOPE.w + PERISCOPE.wall
  const phh = PERISCOPE.h + PERISCOPE.wall
  roundedRectPath(ph, -PERISCOPE.x - pw / 2, PERISCOPE.y - phh / 2, pw, phh, PERISCOPE.r + 0.0002)
  shape.holes.push(ph)
  const geometry = new THREE.ShapeGeometry(shape, 24)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / (2 * R) + 0.5, pos.getY(i) / (2 * R) + 0.5)
  }
  uv.needsUpdate = true
  return geometry
}
