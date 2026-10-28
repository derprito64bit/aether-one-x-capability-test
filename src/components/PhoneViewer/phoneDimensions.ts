/** Aether One X body proportions in meters. Single source of truth for geometry. */
export const DIM = {
  w: 0.0768,
  h: 0.1596,
  t: 0.0078,
} as const

/** Glass panel inset from the frame edge (symmetric bezel, 1.45mm actual). */
export const BEZEL = 0.00145
/** Thin dark bezel between the glass edge and the lit display (1.6mm actual). */
export const DISPLAY_INSET = 0.0016

/**
 * Rear ceramic panel: 0.8mm, outer face on CERAMIC_FACE_Z, inner face on
 * the internals manifest's BACK_INNER_Z (-3.11mm, layout.ts). It was 2.8mm
 * thick (inner face -1.11mm), so every rear internal sat inside it.
 */
export const BACK_PANEL = {
  depth: 0.0008,
  z: -0.00351,
  bevel: 0.0003, // under half the depth, or the extrusion overruns it
  halfW: 0.03695,
  halfH: 0.07835,
} as const
export const BACK_FACE = -DIM.t / 2
/**
 * Front stack, front to back: cover glass (front face 0.15mm under the
 * frame lid), bezel ink printed on its underside, then the display panel
 * behind both. The panel used to sit 0.45mm inside the glass slab.
 */
export const FRONT_GLASS = { depth: 0.0015, z: 0.003 } as const
/** Cover glass outer face: front details (earpiece, punch-hole) seat on it. */
export const GLASS_FRONT_Z = FRONT_GLASS.z + FRONT_GLASS.depth / 2
/** Cover glass underside. */
export const GLASS_BACK_Z = FRONT_GLASS.z - FRONT_GLASS.depth / 2
export const DISPLAY_PANEL = { depth: 0.0006, z: GLASS_BACK_Z - 0.00004 - 0.0003 } as const
/**
 * Display flex tail (chip-on-film): hinged on the panel's bottom edge,
 * 0.1mm behind its back face. Folded behind the panel in the device; the
 * teardown showcase unfolds it below the panel so the driver IC shows.
 * Authored unfolded, relative to the hinge (tail runs -y).
 */
export const DISPLAY_FLEX = {
  hingeY: -0.0774,
  z: DISPLAY_PANEL.z - DISPLAY_PANEL.depth / 2 - 0.0001,
  width: 0.016,
  length: 0.019,
  thickness: 0.0001,
  /** Driver IC: centre this far down the tail, on its front face. */
  icY: 0.0085,
  icW: 0.011,
  icH: 0.0018,
  icDepth: 0.0003,
  /** Board-to-board connector near the tail end. */
  connY: 0.0162,
  connW: 0.0085,
  connH: 0.0026,
  connDepth: 0.0005,
} as const

/** Front frame split: solid rear body plus a perimeter bezel ring. */
export const FRAME_BODY_DEPTH = 0.0042 // body zone; slab depth derives from planes
// The ring tiles against the body with no gap: body top sits at -0.0001
// (back face + depth - bevels), so the ring base starts exactly there. The
// old 0.0004 base left a 0.5mm perimeter groove that read edge-on as the
// device split in two phones.
export const RING_BASE_Z = -0.0001
export const RING_DEPTH = 0.004
/**
 * Midframe: the rails are an open ring (wall inward from the outline) and
 * a thin mid-plate sits just under the ring lid. Components mount on the
 * plate's rear face; the screws seat on it.
 */
export const MIDFRAME = {
  wall: 0.0016,
  plateZ: -0.00035,
  plateDepth: 0.0005,
  /** Screw seat (group z) and head rear face. */
  screwSeatZ: -0.0008,
  screwZ: -0.001,
} as const

/** Rear ceramic outboard face: the reference plane every rear feature seats against. */
export const CERAMIC_FACE_Z = -0.00391

/**
 * Circular camera module (Prompt A2, newest design authority). Centered on
 * the body axis in the upper third: two machined collar steps, domed cover
 * glass, three round lenses on a triangle plus a folded periscope, arc
 * flash, ToF pair, and a module mic. Replaces the Prompt-A square plateau.
 */
export const MODULE = {
  cx: 0, // centered horizontally, not offset
  cy: 0.0458, // 45.8mm up from body center
  outerR: 0.0235, // 47mm diameter, 61% of body width (enlarged per review)
  proud: 0.0019, // 1.9mm total rise off the rear panel
  baseFillet: 0.0007, // 0.7mm blend into the rear panel, a fillet not a chamfer
} as const
/** Concentric collar rings. Two machined steps, not one band. */
export const COLLAR = {
  outer: { rOut: 0.0235, rIn: 0.0206, rise: 0.0019, knurlTeeth: 192, knurlDepth: 0.00018 },
  step: { rOut: 0.0206, rIn: 0.0191, rise: 0.0012 },
  glass: { r: 0.0191, rise: 0.0008, dome: 0.00006 },
} as const
/** Dark seal ring where the cover glass meets the step. */
export const GLASS_SEAL = { rOut: 0.01915, rIn: 0.0188, depth: 0.00006 } as const
/** Three round assemblies on a triangle, apex up. Radius from module center. */
export const LENS_RING_R = 0.0102
/**
 * Round lens specs, polar placement. Per-lens barrel depths are physical:
 * ultra shallow (1.0mm), main (1.6mm), mid-tele deepest (1.75mm). Barrels
 * open 0.1mm under the collar-top plane (1.8mm above the ceramic face) and
 * must bottom out in front of the ceramic: the old 2.1mm mid barrel put
 * its sensor 0.3mm inside the rear panel, where it never rendered.
 * coatHue drives per-lens AR coating tint in radians.
 */
export const LENSES = [
  { key: 'main', angleDeg: 90, r: 0.006, barrelDepth: 0.0016, coatHue: 2.1 },
  { key: 'ultra', angleDeg: 210, r: 0.0049, barrelDepth: 0.001, coatHue: 4.6 },
  { key: 'mid', angleDeg: 330, r: 0.0049, barrelDepth: 0.00175, coatHue: 0.3 },
] as const
/**
 * Lens turret collar: tapers from r + base at the cover glass to r + top at
 * the collar top, which stands `proud` above the module top plane.
 */
export const LENS_COLLAR = { base: 0.0012, top: 0.0009, proud: 0.00035 } as const
/** Periscope window: a rounded rectangle, folded optic below the triangle. */
export const PERISCOPE = {
  x: 0,
  // Deviation from the first draft (y -0.0118, w 0.0128, h 0.0062): those
  // numbers collide with the ultra/mid collars and escape the cover glass.
  // Parked and sized to clear every collar and land inside the glass.
  y: -0.0151,
  w: 0.0122,
  h: 0.0055,
  r: 0.0022,
  recess: 0.0004,
  // Prism face tilt cap. The cavity under the window is only as deep as
  // the window's rise above the ceramic face (~0.9mm), so the face spans
  // the cavity diagonal at the steepest tilt that fits, capped here; the
  // old fixed 40-degree, 8.8mm plane ran 4.6mm deep, through the window
  // and cavity walls and into the body.
  prismAngleDeg: 40,
  wall: 0.0004, // cavity wall thickness, centered on the window edge
} as const
/** Flash as an arc segment cut into the step ring, not a satellite circle. */
export const FLASH_ARC = {
  startDeg: 24,
  sweepDeg: 34,
  rIn: 0.0195,
  rOut: 0.0204,
  dies: 2,
  diffuserRough: 0.62,
} as const
/** Module microphone, 0.7mm. Present because real modules have one. */
export const MODULE_MIC = { angleDeg: 152, ringR: 0.0168, d: 0.0007, depth: 0.0011 } as const
/** Time-of-flight scanner: separate emitter and receiver under one window. */
export const TOF = {
  ringR: 0.0142,
  angleDeg: 18,
  emitter: { d: 0.0021, offsetDeg: -4.2, depth: 0.0008 },
  receiver: { d: 0.0026, offsetDeg: 4.2, depth: 0.0011 },
  window: { w: 0.0082, h: 0.0034, r: 0.0017, recess: 0.00018 },
} as const
/** Medallion: polished metal inlay bonded under the cover glass. */
export const MEDALLION = {
  r: 0.0034,
  // 0.12mm inboard of the glass (rear is -z, so under the glass is +z).
  // It was -0.00012, which stood the inlay 0.04-0.12mm proud of the glass.
  z: 0.00012,
  thickness: 0.00008,
  ringWidth: 0.00008,
} as const
/**
 * Display bezel: fine matte ink layer printed on the glass underside,
 * 0.02mm under the glass and 0.02mm over the panel (never coplanar).
 */
export const BEZEL_SURFACE = {
  color: '#07080b',
  roughness: 0.84,
  z: GLASS_BACK_Z - 0.00002,
  feather: 0.00012,
} as const
/** Optional two-material rear panel. Only some finishes get it. */
export const PANEL_SPLIT = {
  seamY: -0.0126, // 12.6mm below body center, lower third
  seamWidth: 0.00035,
  step: 0.00012, // lower panel sits 0.12mm proud of the upper
  seamChamfer: 0.00008,
} as const
/** Fictional optics partner for the medallion and collar text. */
export const OPTICS_PARTNER = 'NOVEK' as const
/** Module top plane: every lens builds outward from here. */
export const MODULE_FACE_Z = CERAMIC_FACE_Z - MODULE.proud

/**
 * Bottom-edge hardware. Grille slots: w along x, h across the thickness
 * (z), sunk `depth` into the wall with the open face a hair proud of it.
 */
export const GRILLE_SLOT = { w: 0.00055, h: 0.0012, depth: 0.0003 } as const
/**
 * USB-C receptacle on the bottom face (normal -y): 8.4mm along x by 2.6mm
 * across the thickness (z). A true boolean hole is out of reach
 * procedurally and the frame is opaque, so the mouth is layered plates a
 * few hundredths proud of the wall: chamfered rim, dark opening, centred
 * tongue (6.4 x 0.7mm), contact glint. They used to be built with y and z
 * swapped, so the rim stood 1.7mm out of the edge and the opening read
 * 4.2mm tall.
 */
export const PORT = {
  w: 0.0084,
  h: 0.0026,
  r: 0.0013,
  rim: 0.0002,
  tongue: { w: 0.0064, h: 0.0007 },
} as const
/** Six speaker slots marching right of the port, instanced. */
export const SPEAKER_XS = [0.0082, 0.0106, 0.013, 0.0154, 0.0178, 0.0202] as const
/** Primary mic hole left of the port, different diameter from the grille. */
export const MIC_X = -0.0085
export const MIC_R = 0.00042

/** Half spans for edge details. */
export const SX = DIM.w / 2
export const SY = DIM.h / 2

/**
 * Antenna interruption bands: 1.4mm wide across the rail flat, finish-
 * matched. Flush (0.02mm proud): the rail is an opaque solid, so the old
 * 0.05mm-recessed band rendered inside it and never showed.
 */
export const ANTENNA_BAND = { w: 0.0014, proud: 0.00002, zMin: -0.0032, zMax: 0.0034 } as const
/**
 * Buttons: pill caps centered on the rail, 1.4mm across, 0.4mm proud, in a
 * dark 0.1mm gap line with a polished chamfer ring. The rail is solid, so
 * the pocket reads as a flush dark outline rather than a cut recess.
 */
export const BUTTON_POCKET = { gap: 0.0001, proud: 0.0004, thickness: 0.0014 } as const
/** Front sensors: 3.2mm punch-hole with 0.15mm dark ring, earpiece slot. */
export const PUNCH = { r: 0.0016, ring: 0.00015, y: 0.0728 } as const
export const EARPIECE = { w: 0.012, h: 0.0006, y: 0.0772 } as const

/**
 * Body corner radius in meters (round 02, user call): the body is a
 * rounded rectangle — straight rails with tangent circular-arc corners,
 * iPhone silhouette — not a superellipse whose sides bow outward along
 * their whole length. 11mm corners on the 76.8mm width. The camera module
 * is circular (Prompt A2), not a squircle.
 */
export const CORNER_R = 0.011

/**
 * Chamfer sizes in meters. Every visible edge gets one or it renders as a
 * hard colour boundary with no specular line.
 */
export const CHAMFER = {
  glassMeet: 0.00035,
  moduleBase: 0.0005, // 0.50mm, module into the rear panel, a fillet not a flat
  collarStep: 0.0003, // 0.30mm, between collar tiers
  collar: 0.00015,
  button: 0.0001,
  portMouth: 0.0002,
  body: 0.0009, // 0.90mm, frame body edge: rectangular, smoothed corners
} as const

/**
 * Vertical silhouette height in meters for a scale and x-rotation.
 * World-axis measure, valid only while the camera looks along world -Z
 * (front-on acts); use projectedExtentM once the camera leaves that axis.
 */
export function silhouetteHeightM(scale: number, rxRad: number): number {
  return scale * (DIM.h * Math.abs(Math.cos(rxRad)) + DIM.t * Math.abs(Math.sin(rxRad)))
}

/**
 * Horizontal silhouette width in meters for a scale and y-rotation.
 * World-axis measure, valid only while the camera looks along world -Z;
 * use projectedExtentM once the camera leaves that axis.
 */
export function silhouetteWidthM(scale: number, ryRad: number): number {
  return scale * (Math.abs(DIM.w * Math.cos(ryRad)) + DIM.t * Math.abs(Math.sin(ryRad)))
}
