import {
  ANTENNA_BAND,
  CERAMIC_FACE_Z,
  DISPLAY_FLEX,
  DISPLAY_PANEL,
  EARPIECE,
  FRONT_GLASS,
  GLASS_FRONT_Z,
  MIDFRAME,
  MODULE,
  MODULE_FACE_Z,
  PERISCOPE,
  PUNCH,
  SX,
  TOF,
} from '../../components/PhoneViewer/phoneDimensions.ts'
import { lensSeat } from '../../components/PhoneViewer/cameraLayout.ts'
import { LENSES } from '../../components/PhoneViewer/phoneDimensions.ts'
import {
  BATTERY_CELL,
  BATTERY_PARTS,
  BOARD_PARTS,
  CAMERA_INTERNAL,
  COIL,
  FERRITE,
  GRAPHITE,
  MAIN_BOARD,
  MECH,
  MECH_Z,
  NFC,
  SCREWS,
  SOC_STACK,
  THERMAL_PAD,
  VAPOR_CHAMBER,
} from '../internals/layout.ts'

/**
 * Showcase manifest, one entry per teardown layer (same order as
 * TEARDOWN_LAYERS): the subject box the presentation frames (phone-local,
 * assembled; it bounds every mesh the layer carries, layerShowcase.test
 * checks), which face is the detailed one, the hero tilt, and the named
 * sub-component anchors the overlay labels. Anchors sit ON the visible
 * face of each sub-component; `n` is that face's outward normal, so the
 * director can switch off an anchor the camera cannot see.
 */
export interface ShowcaseAnchorDef {
  key: string
  at: readonly [number, number, number]
  n: readonly [number, number, number]
  /** Rides the die lift (silicon) instead of the layer origin. */
  lift?: boolean
}

export interface ShowcaseLayerDef {
  id: string
  center: readonly [number, number, number]
  half: readonly [number, number, number]
  /** +1 shows the front (+z) face to the camera, -1 the rear. */
  face: 1 | -1
  /** Hero tilt (rad): yaw turns the part toward the copy, pitch looks up. */
  yaw: number
  pitch: number
  /** In-plane roll at presentation (rad). */
  roll: number
  anchors: readonly ShowcaseAnchorDef[]
}

const FRONT = [0, 0, 1] as const
const REAR = [0, 0, -1] as const
const YAW = -0.28
const PITCH = -0.12

/** Box from min/max corners. */
function box(
  min: readonly [number, number, number],
  max: readonly [number, number, number],
): Pick<ShowcaseLayerDef, 'center' | 'half'> {
  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2],
  }
}

const MAIN_REAR_Z = MAIN_BOARD.cz - MAIN_BOARD.thickness / 2
const SOC = BOARD_PARTS[0] as { x: number; y: number }
const mech = (id: string) => MECH.find((m) => m.id === id) as (typeof MECH)[number]
const lens = (key: string) => {
  const def = LENSES.find((l) => l.key === key) as (typeof LENSES)[number]
  // Seats are absolute phone coordinates (module centre included).
  return lensSeat(def.angleDeg)
}
const TOF_RAD = (TOF.angleDeg * Math.PI) / 180
const CAM_REAR = CAMERA_INTERNAL.cz - 0.0012

export const SHOWCASE_LAYERS: readonly ShowcaseLayerDef[] = [
  {
    id: 'cover-glass',
    ...box([-0.0371, -0.0785, 0.0022], [0.0371, 0.0785, 0.0038]),
    face: 1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'glass.surface', at: [-0.012, -0.022, GLASS_FRONT_Z], n: FRONT },
      { key: 'glass.edge', at: [0.0368, -0.04, FRONT_GLASS.z], n: [1, 0, 0] },
      { key: 'glass.earpiece', at: [0, EARPIECE.y, GLASS_FRONT_Z], n: FRONT },
    ],
  },
  {
    id: 'display',
    // The flex tail unfolds below the panel while presented.
    ...box([-0.0371, -0.0774 - DISPLAY_FLEX.length - 0.0001, 0.0014], [0.0371, 0.0785, 0.0023]),
    face: 1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'display.panel', at: [-0.012, 0.012, DISPLAY_PANEL.z + 0.0003], n: FRONT },
      { key: 'display.punch', at: [0, PUNCH.y, DISPLAY_PANEL.z + 0.0003], n: FRONT },
      {
        key: 'display.flex',
        at: [DISPLAY_FLEX.width / 2 - 0.002, -0.0774 - DISPLAY_FLEX.length * 0.25, DISPLAY_FLEX.z],
        n: FRONT,
      },
      {
        key: 'display.driver',
        at: [0, -0.0774 - DISPLAY_FLEX.icY, DISPLAY_FLEX.z + DISPLAY_FLEX.icDepth],
        n: FRONT,
      },
    ],
  },
  {
    id: 'midframe',
    ...box([-0.0389, -0.08, -0.0039], [0.0389, 0.08, 0.00395]),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      {
        key: 'midframe.rail',
        at: [-SX, 0.058, (ANTENNA_BAND.zMax + ANTENNA_BAND.zMin) / 2],
        n: [-1, 0, 0],
      },
      {
        key: 'midframe.screw',
        at: [(SCREWS[3] as { x: number }).x, (SCREWS[3] as { y: number }).y, MIDFRAME.screwZ],
        n: REAR,
      },
      {
        key: 'midframe.haptic',
        at: [
          mech('haptic').x,
          mech('haptic').y,
          (mech('haptic').z ?? MECH_Z) - mech('haptic').d / 2,
        ],
        n: REAR,
      },
      {
        key: 'midframe.speaker',
        at: [
          mech('speaker').x,
          mech('speaker').y,
          (mech('speaker').z ?? MECH_Z) - mech('speaker').d / 2 - 0.0001,
        ],
        n: REAR,
      },
    ],
  },
  {
    id: 'battery',
    ...box([-0.0303, -0.0555, -0.00275], [0.0303, 0.0276, 0.00162]),
    face: 1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      {
        key: 'battery.cell',
        at: [0.006, BATTERY_CELL.cy - 0.012, BATTERY_CELL.cz + BATTERY_CELL.thickness / 2],
        n: FRONT,
      },
      {
        key: 'battery.bms',
        at: [BATTERY_PARTS.bms.x + 0.008, BATTERY_PARTS.bms.y, BATTERY_PARTS.bms.zFront],
        n: FRONT,
      },
      {
        key: 'battery.connector',
        at: [BATTERY_PARTS.connector.x, BATTERY_PARTS.connector.y, BATTERY_PARTS.connector.zFront],
        n: FRONT,
      },
      {
        key: 'battery.tabs',
        at: [
          BATTERY_PARTS.tabs.xs[1] as number,
          BATTERY_PARTS.tabs.gripY,
          BATTERY_PARTS.tabs.zFront,
        ],
        n: FRONT,
      },
    ],
  },
  {
    id: 'logic-board',
    ...box([-0.036, -0.0793, -0.0029], [0.036, 0.0651, 0.00135]),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'board.memory', at: [0.01, 0.0345, MAIN_REAR_Z - 0.0008], n: REAR },
      { key: 'board.modem', at: [0.021, 0.048, MAIN_REAR_Z - 0.0007], n: REAR },
      { key: 'board.pmic', at: [-0.024, 0.0485, MAIN_REAR_Z - 0.0006], n: REAR },
      {
        key: 'board.port',
        at: [mech('port-block').x, mech('port-block').y, (mech('port-block').z ?? 0) - 0.0013],
        n: REAR,
      },
    ],
  },
  {
    id: 'silicon',
    ...box(
      [SOC.x - 0.0081, SOC.y - 0.0081, SOC_STACK.dieZ - 0.0004 - SOC_STACK.dieLift],
      [SOC.x + 0.0081, SOC.y + 0.0081, MAIN_REAR_Z + 0.00005],
    ),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'soc.die', at: [SOC.x, SOC.y + 0.002, SOC_STACK.dieZ - 0.00035], n: REAR, lift: true },
      {
        key: 'soc.package',
        at: [SOC.x + 0.0068, SOC.y - 0.0068, SOC_STACK.substrateZ - 0.0004],
        n: REAR,
      },
      { key: 'soc.bga', at: [SOC.x - 0.0062, SOC.y + 0.0062, SOC_STACK.bgaZ - 0.00035], n: REAR },
      {
        key: 'soc.caps',
        at: [SOC.x + SOC_STACK.capInset, SOC.y + 0.0015, SOC_STACK.substrateZ - 0.0008],
        n: REAR,
      },
    ],
  },
  {
    id: 'thermal',
    ...box([-0.0311, -0.0351, -0.00298], [0.0311, 0.0631, -0.00218]),
    face: 1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      {
        key: 'thermal.chamber',
        at: [0.014, VAPOR_CHAMBER.cy + 0.01, VAPOR_CHAMBER.cz + VAPOR_CHAMBER.thickness / 2],
        n: FRONT,
      },
      {
        key: 'thermal.graphite',
        at: [0.012, GRAPHITE.cy - 0.025, GRAPHITE.cz + GRAPHITE.thickness / 2],
        n: FRONT,
      },
      { key: 'thermal.contact', at: [THERMAL_PAD.x, THERMAL_PAD.y, THERMAL_PAD.z], n: FRONT },
    ],
  },
  {
    id: 'power-coil',
    ...box(
      [-FERRITE.half - 0.0001, NFC.cy - FERRITE.half - 0.0001, -0.00315],
      [COIL.cx + COIL.rOut + 0.0086, NFC.cy + FERRITE.half + 0.0001, FERRITE.z + 0.00005],
    ),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      {
        key: 'coil.windings',
        at: [COIL.cx - (COIL.rIn + COIL.rOut) / 2, COIL.cy, COIL.cz - COIL.thickness / 2],
        n: REAR,
      },
      {
        key: 'coil.ferrite',
        at: [FERRITE.half - 0.004, NFC.cy - FERRITE.half + 0.004, FERRITE.z - FERRITE.depth / 2],
        n: REAR,
      },
      { key: 'coil.nfc', at: [0, NFC.cy - (NFC.rIn + NFC.rOut) / 2, NFC.cz - 0.0001], n: REAR },
    ],
  },
  {
    id: 'camera',
    ...box(
      [CAMERA_INTERNAL.cx - 0.0236, CAMERA_INTERNAL.cy - 0.0228, CAM_REAR - 0.00005],
      [CAMERA_INTERNAL.cx + 0.0236, CAMERA_INTERNAL.cy + 0.0228, CAMERA_INTERNAL.cz + 0.0014],
    ),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'camera.main', at: [lens('main').x, lens('main').y, CAM_REAR - 0.00001], n: REAR },
      { key: 'camera.ultra', at: [lens('ultra').x, lens('ultra').y, CAM_REAR - 0.00001], n: REAR },
      {
        key: 'camera.periscope',
        at: [
          CAMERA_INTERNAL.cx + PERISCOPE.x,
          CAMERA_INTERNAL.cy + PERISCOPE.y,
          CAMERA_INTERNAL.cz - 0.00113,
        ],
        n: REAR,
      },
      {
        key: 'camera.tof',
        at: [
          CAMERA_INTERNAL.cx + TOF.ringR * Math.cos(TOF_RAD),
          CAMERA_INTERNAL.cy + TOF.ringR * Math.sin(TOF_RAD),
          CAMERA_INTERNAL.cz - 0.00062,
        ],
        n: REAR,
      },
    ],
  },
  {
    id: 'rear-panel',
    ...box([-0.0373, -0.0787, MODULE_FACE_Z - 0.0004], [0.0373, 0.0787, -0.00308]),
    face: -1,
    yaw: YAW,
    pitch: PITCH,
    roll: 0,
    anchors: [
      { key: 'rear.finish', at: [0.012, -0.03, CERAMIC_FACE_Z], n: REAR },
      {
        key: 'rear.window',
        at: [MODULE.cx - 0.013, MODULE.cy + 0.0105, MODULE_FACE_Z],
        n: REAR,
      },
      { key: 'rear.mark', at: [0, -0.065, CERAMIC_FACE_Z - 0.00005], n: REAR },
    ],
  },
]

/** Sub-component keys in manifest order, for tests and docs. */
export const SHOWCASE_KEYS: readonly string[] = SHOWCASE_LAYERS.flatMap((l) =>
  l.anchors.map((a) => a.key),
)
