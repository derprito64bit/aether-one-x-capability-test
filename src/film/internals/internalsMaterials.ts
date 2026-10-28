import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { createDieMarkingTexture, createFloorplanTexture } from './siliconTextures.ts'

export interface InternalsMaterialSet {
  board: MeshStandardMaterial
  trace: MeshStandardMaterial
  shield: MeshStandardMaterial
  gold: MeshStandardMaterial
  substrate: MeshStandardMaterial
  die: MeshStandardMaterial
  cell: MeshStandardMaterial
  cellGlow: MeshStandardMaterial
  housing: MeshStandardMaterial
  coil: MeshStandardMaterial
  dark: MeshStandardMaterial
  /** Vapour chamber: stamped copper, distinct from the coil. */
  vapor: MeshStandardMaterial
  /** Coil status ring: charging indicator for the Clear finish. */
  coilRing: MeshStandardMaterial
  /** Laser marking decal, low contrast. */
  dieMark: MeshBasicMaterial
  /** Floorplan detail overlay. */
  dieFloor: MeshBasicMaterial
}

export const INTERNALS_KEYS = [
  'board',
  'trace',
  'shield',
  'gold',
  'substrate',
  'die',
  'cell',
  'cellGlow',
  'housing',
  'coil',
  'dark',
  'vapor',
  'coilRing',
  'dieMark',
  'dieFloor',
] as const satisfies ReadonlyArray<keyof InternalsMaterialSet>

/**
 * X-ray hardware material registry. All transparent from birth so the
 * opacity dissolve never triggers a shader recompile mid-film.
 *
 * Dressed mode serves the Clear finish (Prompt C section 3): brushed
 * shield cans, brighter screw plating, copper coil saturation raised. Real
 * transparent-back products dress their internals for display.
 */
export function createInternalsMaterials(dressed = false): InternalsMaterialSet {
  const transparent = { transparent: true, opacity: 0 }
  const board = new MeshStandardMaterial({
    color: new Color('#0d2b26'),
    roughness: 0.55,
    metalness: 0.2,
    ...transparent,
  })
  const trace = new MeshStandardMaterial({
    color: new Color('#c98f2e'),
    roughness: 0.35,
    metalness: 1,
    emissive: new Color('#3a2703'),
    emissiveIntensity: 0.6,
    ...transparent,
  })
  const shield = new MeshStandardMaterial({
    color: new Color(dressed ? '#b8c0cc' : '#9aa2ad'),
    roughness: dressed ? 0.22 : 0.3,
    metalness: 1,
    ...transparent,
  })
  const gold = new MeshStandardMaterial({
    color: new Color(dressed ? '#e8bc4e' : '#d8a83e'),
    roughness: dressed ? 0.18 : 0.25,
    metalness: 1,
    ...transparent,
  })
  const substrate = new MeshStandardMaterial({
    color: new Color('#12351f'),
    roughness: 0.5,
    metalness: 0.3,
    ...transparent,
  })
  const die = new MeshStandardMaterial({
    color: new Color('#101623'),
    roughness: 0.2,
    metalness: 0.6,
    emissive: new Color('#2f63c8'),
    emissiveIntensity: 0.7,
    ...transparent,
  })
  const cell = new MeshStandardMaterial({
    // Mid-gray metallic, not bright silver: the cell is the largest part
    // and at near-white it bricks over the whole x-ray read into one slab.
    color: new Color('#6a7078'),
    roughness: 0.5,
    metalness: 0.85,
    ...transparent,
  })
  const cellGlow = new MeshStandardMaterial({
    color: new Color('#7fb4ff'),
    emissive: new Color('#478dff'),
    emissiveIntensity: 1.2,
    roughness: 0.4,
    metalness: 0,
    ...transparent,
  })
  const housing = new MeshStandardMaterial({
    // Machined mid-gray, not black: the camera plate dominates the tour
    // frames from above and must read as metal under the key, with the
    // dark lens cups contrasting against it. Double-sided: flat rings and
    // caps stay visible when their layer parks turned over.
    color: new Color('#3a414c'),
    roughness: 0.38,
    metalness: 0.85,
    side: DoubleSide,
    ...transparent,
  })
  const coil = new MeshStandardMaterial({
    color: new Color(dressed ? '#c97a2e' : '#b06a28'),
    roughness: 0.35,
    metalness: 1,
    emissive: new Color(dressed ? '#2a1200' : '#000000'),
    emissiveIntensity: dressed ? 0.4 : 0,
    ...transparent,
  })
  const coilRing = new MeshStandardMaterial({
    color: new Color('#0c1016'),
    emissive: new Color('#8fc2ff'),
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0,
    ...transparent,
  })
  const vapor = new MeshStandardMaterial({
    color: new Color('#a86a32'),
    roughness: 0.38,
    metalness: 1,
    emissive: new Color('#1c0e00'),
    emissiveIntensity: 0.25,
    ...transparent,
  })
  const dark = new MeshStandardMaterial({
    color: new Color('#05070a'),
    roughness: 0.9,
    metalness: 0,
    side: DoubleSide,
    ...transparent,
  })
  const dieMark = new MeshBasicMaterial({
    map: createDieMarkingTexture(),
    depthWrite: false,
    ...transparent,
  })
  dieMark.opacity = 0
  const dieFloor = new MeshBasicMaterial({
    map: createFloorplanTexture(),
    depthWrite: false,
    ...transparent,
  })
  dieFloor.opacity = 0
  const set: InternalsMaterialSet = {
    board,
    trace,
    shield,
    gold,
    substrate,
    die,
    cell,
    cellGlow,
    housing,
    coil,
    dark,
    vapor,
    coilRing,
    dieMark,
    dieFloor,
  }
  // Named by registry key so live scene probes can identify every part.
  for (const k of INTERNALS_KEYS) set[k].name = `internals:${k}`
  return set
}

/** Disposes every registry material. Safe to call once per owner. */
export function disposeInternalsMaterials(set: InternalsMaterialSet): void {
  for (const k of INTERNALS_KEYS) set[k].dispose()
}
