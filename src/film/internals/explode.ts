import * as THREE from 'three'
import {
  BATTERY_CELL,
  BOARD_PARTS,
  BTB_FLEX,
  CAMERA_INTERNAL,
  COAX,
  COIL,
  GRAPHITE,
  MAIN_BOARD,
  MECH,
  NFC,
  SCREWS,
  SHIELD_CANS,
  SUB_BOARD,
  SUB_PARTS,
  VAPOR_CHAMBER,
} from './layout.ts'
import { PERISCOPE, TOF } from '../../components/PhoneViewer/phoneDimensions.ts'
import { lensSeat } from '../../components/PhoneViewer/cameraLayout.ts'
import { LENSES } from '../../components/PhoneViewer/phoneDimensions.ts'

/**
 * Exploded-view part registry (Prompt B section 3, staged by Prompt C
 * section 4). Direction is derived, never authored: each part's offset from
 * the assembly centroid, blended with an explicit axial removal direction.
 *
 * Staging: delay = 0.55 x normalized removal order + 0.30 x normalized
 * radial distance, clamped into [0, 0.45]. Order dominates (a technician's
 * removal sequence), distance breaks ties within a layer so same-layer
 * parts do not move in lockstep. radialMix varies per layer (Prompt C
 * section 4.2): flat sheets lift almost straight back, screws fan almost
 * purely radial, the battery goes straight back slow because it is heavy.
 */
export interface ExplodePart {
  id: string
  /** Assembly origin in meters, used to derive the radial component. */
  origin: [number, number, number]
  /** Distance this part travels at explode = 1, in meters. */
  distance: number
  /** 0..1 fraction of the explode window before this part starts moving. */
  delay: number
  /** Removal sequence index into REMOVAL_ORDER. Lower leaves first. */
  order: number
  /** Radial-vs-axial blend for this part's layer. */
  radialMix: number
  /** Axial removal direction: -1 rearward (toward the x-ray viewer). */
  axial: -1 | 1
  /** Extra rotation at full explode, in radians, so parts turn as they lift. */
  tumble?: [number, number, number]
  /** Full 2π spin about the part axis at full explode (screws). */
  spin?: boolean
  /** Which layer it belongs to, for the dim and focus passes. */
  layer: 'chassis' | 'board' | 'silicon' | 'power' | 'optics' | 'thermal'
}

/** Removal order. Lower index leaves first (Prompt C section 4.1). */
export const REMOVAL_ORDER = [
  'rear-panel', // 0 (shell-handled, unregistered)
  'nfc', // 1
  'coil', // 1
  'graphite', // 2
  'screws', // 3
  'shield-lids', // 4
  'vapor-chamber', // 5
  'coax', // 6
  'btb-flex', // 6
  'battery', // 7
  'sub-board', // 8
  'mech', // 9
  'main-board', // 10
  'board-parts', // 11
  'camera-module', // 12
  'midframe', // 13 (shell-handled, unregistered)
  'display-stack', // 14 (shell-handled, unregistered)
] as const

const REAR_Z = MAIN_BOARD.cz - MAIN_BOARD.thickness / 2

interface RawEntry {
  part: ExplodePart
  dist: number
}

function register(
  id: ExplodePart['id'],
  origin: ExplodePart['origin'],
  distance: number,
  order: number,
  radialMix: number,
  layer: ExplodePart['layer'],
  extra?: { axial?: -1 | 1; tumble?: ExplodePart['tumble']; spin?: boolean },
): RawEntry {
  const dx = origin[0] - ASSEMBLY_CENTROID[0]
  const dy = origin[1] - ASSEMBLY_CENTROID[1]
  return {
    part: {
      id,
      origin,
      distance,
      delay: 0,
      order,
      radialMix,
      axial: extra?.axial ?? -1,
      layer,
      tumble: extra?.tumble,
      spin: extra?.spin,
    },
    dist: Math.hypot(dx, dy),
  }
}

/** Assembly centroid of the phone interior stack, phone-local meters. */
export const ASSEMBLY_CENTROID: [number, number, number] = [0, 0.01, -0.001]

const soc = BOARD_PARTS[0] as { x: number; y: number }
const SOC: [number, number, number] = [soc.x, soc.y, REAR_Z - 0.001]

const RAW: RawEntry[] = [
  register('nfc', [NFC.cx, NFC.cy, NFC.cz], 0.009, 1, 0.15, 'power'),
  register('charge-coil', [COIL.cx, COIL.cy, COIL.cz], 0.0095, 1, 0.15, 'power', {
    tumble: [0, 0, -0.15],
  }),
  register('graphite-sheet', [GRAPHITE.cx, GRAPHITE.cy, GRAPHITE.cz], 0.008, 2, 0.15, 'thermal', {
    tumble: [0.03, 0, 0],
  }),
  // Eight fasteners fan almost purely radial, spinning as they go. A
  // spinning screw reads as a screw; the spin is explode x 2PI, a pure
  // function, so reassembly retraces exactly.
  ...SCREWS.map((screw, i) =>
    register(`screw-${i}`, [screw.x, screw.y, -0.0005], 0.011, 3, 0.85, 'board', {
      spin: true,
    }),
  ),
  register(
    'shield-lid',
    [
      SHIELD_CANS.reduce((sum, can) => sum + can.x, 0) / SHIELD_CANS.length,
      SHIELD_CANS.reduce((sum, can) => sum + can.y, 0) / SHIELD_CANS.length,
      REAR_Z - 0.001,
    ],
    0.007,
    4,
    0.25,
    'board',
    { tumble: [0.25, 0, 0] },
  ),
  register(
    'shield-fence',
    [
      SHIELD_CANS.reduce((sum, can) => sum + can.x, 0) / SHIELD_CANS.length,
      SHIELD_CANS.reduce((sum, can) => sum + can.y, 0) / SHIELD_CANS.length,
      REAR_Z - 0.0005,
    ],
    0.004,
    4,
    0.25,
    'board',
  ),
  register(
    'vapor-chamber',
    [VAPOR_CHAMBER.cx, VAPOR_CHAMBER.cy, VAPOR_CHAMBER.cz],
    0.008,
    5,
    0.15,
    'thermal',
  ),
  register('coax-l', [COAX[0]?.x ?? -0.033, 0, -0.0012], 0.006, 6, 0.4, 'board'),
  register('coax-r', [COAX[1]?.x ?? 0.033, -0.004, -0.0012], 0.006, 6, 0.4, 'board'),
  register(
    'btb-flex',
    [BTB_FLEX.x, (BTB_FLEX.yTop + BTB_FLEX.yBottom) / 2, -0.0012],
    0.006,
    6,
    0.4,
    'board',
  ),
  // The battery is the heaviest thing in there: straight back, slow, still.
  register('cell', [BATTERY_CELL.cx, BATTERY_CELL.cy, BATTERY_CELL.cz], 0.008, 7, 0.1, 'power'),
  register('cell-wrap', [BATTERY_CELL.cx, BATTERY_CELL.cy, BATTERY_CELL.cz], 0.01, 7, 0.1, 'power'),
  register('sub-board', [SUB_BOARD.cx, SUB_BOARD.cy, SUB_BOARD.cz], 0.007, 8, 0.3, 'board'),
  ...MECH.map((mech) => register(mech.id, [mech.x, mech.y, -0.0012], 0.007, 9, 0.45, 'power')),
  register('main-board', [MAIN_BOARD.cx, MAIN_BOARD.cy, MAIN_BOARD.cz], 0.005, 10, 0.3, 'board'),
  // Board components fan outward so labels can place between them.
  // btb-up/btb-low render as connectors inside the flex group, not here.
  ...[...BOARD_PARTS.slice(1), ...SUB_PARTS]
    .filter((part) => part.id !== 'btb-up' && part.id !== 'btb-low')
    .map((part, i) =>
      register(
        part.id,
        [part.x, part.y, REAR_Z - part.z / 2],
        0.005 + (i % 3) * 0.0008,
        11,
        0.55,
        'board',
      ),
    ),
  register('decoupling-cluster', [SOC[0], SOC[1], SOC[2]], 0.006, 11, 0.55, 'silicon'),
  register('substrate', [SOC[0], SOC[1], SOC[2]], 0.006, 11, 0.4, 'silicon'),
  register('die', [SOC[0], SOC[1], SOC[2]], 0.009, 11, 0.4, 'silicon', {
    tumble: [0.12, 0, 0],
  }),
  register('bga-array', [SOC[0], SOC[1], SOC[2]], 0.007, 11, 0.4, 'silicon'),
  register(
    'camera-module',
    [CAMERA_INTERNAL.cx, CAMERA_INTERNAL.cy, CAMERA_INTERNAL.cz],
    0.009,
    12,
    0.2,
    'optics',
    { tumble: [0.3, 0, 0] },
  ),
  ...LENSES.map((lens) => {
    const seat = lensSeat(lens.angleDeg)
    return register(
      `lens-${lens.key}`,
      [seat.x, seat.y, CAMERA_INTERNAL.cz],
      0.01,
      12,
      0.35,
      'optics',
    )
  }),
  register(
    'lens-periscope',
    [CAMERA_INTERNAL.cx + PERISCOPE.x, CAMERA_INTERNAL.cy + PERISCOPE.y, CAMERA_INTERNAL.cz],
    0.01,
    12,
    0.35,
    'optics',
  ),
  register(
    'sensor-stack',
    [CAMERA_INTERNAL.cx, CAMERA_INTERNAL.cy, CAMERA_INTERNAL.cz],
    0.008,
    12,
    0.2,
    'optics',
  ),
  register(
    'tof-module',
    [
      CAMERA_INTERNAL.cx + TOF.ringR * Math.cos((TOF.angleDeg * Math.PI) / 180),
      CAMERA_INTERNAL.cy + TOF.ringR * Math.sin((TOF.angleDeg * Math.PI) / 180),
      CAMERA_INTERNAL.cz,
    ],
    0.009,
    12,
    0.3,
    'optics',
  ),
]

const maxDist = Math.max(...RAW.map((r) => r.dist))
const MAX_ORDER = REMOVAL_ORDER.length - 1
for (const { part, dist } of RAW) {
  const ordered = 0.55 * (part.order / MAX_ORDER)
  const radial = maxDist > 0 ? 0.3 * (dist / maxDist) : 0
  part.delay = Math.min(0.45, ordered + radial)
}

export const EXPLODE_PARTS: ExplodePart[] = RAW.map((r) => r.part)

/** Radial-plus-axial explode direction. radialMix 0 = pure axial, 1 = pure outward fan. */
export function explodeVector(
  origin: readonly [number, number, number],
  centroid: readonly [number, number, number],
  radialMix: number,
  axial: -1 | 1,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.set(origin[0] - centroid[0], origin[1] - centroid[1], 0)
  if (out.lengthSq() < 1e-12) out.set(0, 0, 0)
  else out.normalize()
  out.multiplyScalar(radialMix)
  out.z += axial * (1 - radialMix)
  return out.normalize()
}

/** Maps the master explode scalar through a part's delay window. */
export function partProgress(explode: number, delay: number): number {
  const t = Math.min(1, Math.max(0, (explode - delay) / (1 - delay)))
  return t * t * (3 - 2 * t)
}

/** Precomputed unit directions per part id, built once at module load. */
export const EXPLODE_DIRECTIONS: Record<string, THREE.Vector3> = {}
for (const part of EXPLODE_PARTS) {
  EXPLODE_DIRECTIONS[part.id] = explodeVector(
    part.origin,
    ASSEMBLY_CENTROID,
    part.radialMix,
    part.axial,
    new THREE.Vector3(),
  )
}
