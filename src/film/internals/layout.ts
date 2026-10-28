import { MODULE } from '../../components/PhoneViewer/phoneDimensions.ts'

/**
 * Internal component manifest (Prompt C section 2). Single source of truth
 * for every internal position, in meters, origin at body centre: +y up, +z
 * toward the front face. Back face at -0.0039, front face at +0.0039.
 *
 * The z stack, front to back, matches the teardown layer order so the
 * peel never drags one layer through another (layerStack.test.ts): display
 * back (+1.61mm); battery (+1.6 to -2.6) beside the main board (+0.7 to
 * -0.1); board components and shield fences on the board's rear face;
 * the SoC stack and shield lids; vapour chamber; graphite; coil and NFC;
 * back panel inner face (-3.11). The camera housings are the documented
 * exception: they pass through the board where the module mounts.
 * No coordinates live in JSX: parts files map over these entries.
 */

/** Main logic board, upper third. Component side faces the rear cover. */
export const MAIN_BOARD = {
  w: 0.066,
  h: 0.046,
  thickness: 0.0008,
  cx: 0,
  cy: 0.042,
  // Front face 0.9mm behind the display: room behind it for components,
  // cans, the SoC stack, and the thermal stack ahead of the back panel.
  cz: 0.0003,
} as const

/**
 * Daughterboard, bottom strip under the port. Carries the port, SIM, and
 * charge path. Kept below the haptic and speaker so no midframe part sits
 * on it in plan.
 */
export const SUB_BOARD = {
  w: 0.062,
  h: 0.012,
  thickness: 0.0008,
  cx: 0,
  cy: -0.072,
  cz: -0.0012,
} as const

/** Board-to-board flex, routed up the left edge, outboard of the cell. */
export const BTB_FLEX = {
  x: -0.0315,
  yTop: 0.0215,
  yBottom: -0.067,
  width: 0.003,
  thickness: 0.00018,
} as const

export interface BoardPartDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  z: number
  label: string | null
}

/** Main-board components on the rear face (cz = -0.0016 plane). */
export const BOARD_PARTS: BoardPartDef[] = [
  // SoC plus RAM package-on-package stack. The hero of the chip act.
  { id: 'soc', x: -0.013, y: 0.0345, w: 0.016, h: 0.016, z: 0.0011, label: 'A1 Ultra' },
  { id: 'nand', x: 0.01, y: 0.0345, w: 0.011, h: 0.009, z: 0.0008, label: 'Storage' },
  { id: 'modem', x: 0.021, y: 0.048, w: 0.009, h: 0.009, z: 0.0007, label: 'Modem' },
  { id: 'pmic', x: -0.024, y: 0.0485, w: 0.008, h: 0.007, z: 0.0006, label: 'Power' },
  { id: 'codec', x: -0.006, y: 0.0585, w: 0.005, h: 0.005, z: 0.0005, label: 'Audio' },
  { id: 'rf-a', x: 0.026, y: 0.0585, w: 0.005, h: 0.004, z: 0.0005, label: 'RF' },
  { id: 'rf-b', x: -0.028, y: 0.0585, w: 0.005, h: 0.004, z: 0.0005, label: 'RF' },
  { id: 'rf-c', x: 0.028, y: 0.03, w: 0.005, h: 0.004, z: 0.0005, label: 'RF' },
  { id: 'btb-up', x: 0, y: 0.0215, w: 0.008, h: 0.002, z: 0.0009, label: null },
]

/** Sub-board components on the rear face. */
export const SUB_PARTS: BoardPartDef[] = [
  { id: 'charge-ic', x: -0.015, y: -0.072, w: 0.006, h: 0.005, z: 0.0006, label: 'Charge' },
  { id: 'sim-cage', x: 0.016, y: -0.0725, w: 0.012, h: 0.006, z: 0.0011, label: 'SIM' },
  { id: 'btb-low', x: 0, y: -0.067, w: 0.008, h: 0.002, z: 0.0009, label: null },
]

export interface ShieldCanDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  rise: number
}

/**
 * Shield cans over the component groups. Lids lift separately. The SoC can
 * rises 1.9mm so its lid clears the die on top of the package stack (at
 * 1.4mm the die stood through the lid).
 */
export const SHIELD_CANS: ShieldCanDef[] = [
  { id: 'can-soc', x: -0.013, y: 0.0345, w: 0.019, h: 0.019, rise: 0.0019 },
  { id: 'can-mem', x: 0.0105, y: 0.0345, w: 0.014, h: 0.012, rise: 0.0011 },
  { id: 'can-rf', x: 0.021, y: 0.049, w: 0.013, h: 0.013, rise: 0.001 },
  // Clear of the SoC can by 0.6mm: the two used to share a wall.
  { id: 'can-power', x: -0.023, y: 0.0505, w: 0.013, h: 0.0118, rise: 0.0009 },
]

/**
 * Battery cell. Largest single component. Volume checked against product
 * data. Spans y -51.5 to +18mm: top edge 1mm clear of the main board
 * (0.019), bottom edge clear of the haptic and speaker (it used to run
 * down to -60mm, over the sub-board, speaker, and haptic, which all sat
 * inside it). Front face on the display's back.
 */
export const BATTERY_CELL = {
  w: 0.0595,
  h: 0.0695,
  thickness: 0.0042,
  cx: 0,
  cy: -0.01675,
  cz: -0.0005,
  tabX: 0.019,
  tabY: 0.0165, // tabs ride the top edge, never float above it or onto the board
} as const

/**
 * Wireless charging coil, flat litz (rectangular section: `thickness` deep,
 * `wireW` wide), behind the graphite and just ahead of the back panel.
 */
export const COIL = {
  rOut: 0.021,
  rIn: 0.011,
  turns: 18,
  wireW: 0.00052,
  thickness: 0.00015,
  cx: 0,
  cy: -0.008,
  cz: -0.00303,
} as const

/** NFC antenna ring, outboard of the coil, on the back panel's inner face. */
export const NFC = {
  rOut: 0.026,
  rIn: 0.023,
  thickness: 0.00012,
  cx: 0,
  cy: -0.008,
  cz: -0.00305,
} as const

/**
 * Vapor chamber over the SoC, behind the shield lids, spanning the board
 * (y 19 to 63mm). It used to run down over the battery top, which put it
 * inside the cell and inside the shield cans.
 */
export const VAPOR_CHAMBER = {
  w: 0.048,
  h: 0.044,
  thickness: 0.0006,
  cx: 0,
  cy: 0.041,
  cz: -0.00252,
} as const

/** Graphite spreader, larger and thinner, behind the chamber and the cell. */
export const GRAPHITE = {
  w: 0.062,
  h: 0.09,
  thickness: 0.00012,
  cx: 0,
  cy: 0.01,
  cz: -0.00288,
} as const

export interface MechPartDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  d: number
  /** Centre z; defaults to MECH_Z. */
  z?: number
}

/** Default centre plane for electromechanical parts. */
export const MECH_Z = -0.0012

/**
 * Electromechanical parts: haptics, speakers, port block. The haptic and
 * speaker sit side by side between the cell and the sub-board (the haptic
 * used to sit inside the cell). The USB-C block runs 4.2mm into the body
 * from the bottom wall, 2.6mm tall across the thickness, centred on the
 * exterior port (it was built with depth and height swapped).
 */
export const MECH: MechPartDef[] = [
  // X-axis linear resonant actuator. Rectangular, heavy-looking, flex tail.
  { id: 'haptic', x: -0.017, y: -0.0585, w: 0.024, h: 0.009, d: 0.003 },
  { id: 'speaker', x: 0.02, y: -0.0585, w: 0.018, h: 0.011, d: 0.0036 },
  { id: 'earpiece', x: 0, y: 0.072, w: 0.012, h: 0.004, d: 0.0025 },
  { id: 'port-block', x: 0, y: -0.0771, w: 0.0084, h: 0.0042, d: 0.0026, z: 0 },
]

/** Coaxial RF cables routed along both edges, outboard of everything. */
export const COAX = [
  { id: 'coax-l', x: -0.0355, yTop: 0.056, yBottom: -0.056, d: 0.00085 },
  { id: 'coax-r', x: 0.0355, yTop: 0.052, yBottom: -0.06, d: 0.00085 },
] as const

/** Midframe fasteners. Eight, Torx, perimeter, clear of boards and flex. */
export const SCREWS = [
  { x: -0.03, y: 0.07 },
  { x: 0.03, y: 0.07 },
  { x: -0.034, y: 0.02 },
  { x: 0.034, y: 0.02 },
  { x: -0.034, y: -0.03 },
  { x: 0.034, y: -0.03 },
  { x: -0.029, y: -0.072 },
  { x: 0.029, y: -0.072 },
] as const
export const SCREW = { headD: 0.0016, headDepth: 0.0004, driveD: 0.0009 } as const

/**
 * Internal camera housing: the A2 module mounts to the main board and
 * protrudes rearward through the cover. Overlap in plan view is correct.
 */
export const CAMERA_INTERNAL = {
  cx: MODULE.cx,
  cy: MODULE.cy,
  // Housings span -3.0 to -0.6mm: ahead of the back panel inner face.
  cz: -0.0018,
  r: MODULE.outerR,
} as const

/** Back panel inner face: the rearmost internal plane. Matches BACK_PANEL. */
export const BACK_INNER_Z = -0.00311
