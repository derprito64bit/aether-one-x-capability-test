import { smoothstep } from './key.ts'

export interface FilmStates {
  /** 0..1 how far the outer shell has dissolved. */
  shellGhost: number
  /** 0..1 how far the shell layers split apart. */
  shellSplit: number
  /** 0..1 how visible the internal hardware is. */
  internalOpacity: number
  /** 0..1 how far the internals explode apart (x-ray pass). */
  explodeXray: number
  /** 0..1 how far only the battery separates (energy climax). */
  explodeBatt: number
  /** 0..1 whether the A1 Ultra is the focused subject. */
  chipFocus: number
  /** 0..1 how far the die lifts out of the board plane. */
  chipLift: number
  /** 0..1 how far the cell pulls toward camera at the climax. */
  battLift: number
  /** 0..1 how far surroundings step back behind the subject. */
  subjectDim: number
  /** 0..1 whether the camera dives on the physical lens barrels. */
  cameraFocus: number
  /** 0..1 how far shell optics spread from the rear surface. */
  optical: number
  /** 0..1 partial interior glow during the energy story. */
  energy: number
  /** 0..1 live screen brightness. */
  screenOn: number
  /** 0..1 radial fan amount, separate from the axial explode. */
  explodeRadial: number
  /** 0..1 how far the camera module separates for its own beat. */
  explodeOptics: number
  /** 0..1 label and callout opacity for the exploded diagram. */
  calloutOpacity: number
  /** 0..1 cross-section clip, reserved for a future cutaway beat. */
  sectionCut: number
  /** 0..1 focus-pull amount toward the current subject. */
  focusPull: number
  /** 0..1 macro atmosphere presence in the closeup beats. */
  macroAtmos: number
  /** 0..1 shield lids lifted, so board components are revealed. */
  shieldLift: number
  /** 0..1 coil LED ring brightness for the Clear finish. */
  coilRing: number
  /** 0..1 phone rotates from upright to flat (teardown). */
  layDown: number
  /** 0..1 layers separate into the stack (teardown). */
  stackSeparate: number
  /** 0..10 continuous layer cursor across the feature run (teardown). */
  layerCursor: number
}

/**
 * Plateau window: eases up from in1 to in2, holds until out1, eases to 0
 * by out2. The descent restores the shell and reseats the explosion.
 */
export function ramplike(p: number, in1: number, in2: number, out1: number, out2: number): number {
  const up = smoothstep((p - in1) / Math.max(1e-5, in2 - in1))
  const down = smoothstep((p - out1) / Math.max(1e-5, out2 - out1))
  return Math.min(up, 1 - down)
}

/**
 * Beat window for one teardown layer (round 01 A3). Full 1 across the
 * layer's own cursor window [index, index + 1], ramping up over `lead`
 * layers before and down over `tail` after. Derived from the continuous
 * layerCursor so beats track the feature run instead of raw progress.
 */
export function layerWindow(cursor: number, index: number, lead: number, tail: number): number {
  const up = smoothstep((cursor - (index - lead)) / Math.max(1e-5, lead))
  const down = smoothstep((cursor - (index + 1)) / Math.max(1e-5, tail))
  return Math.min(up, 1 - down)
}

const STATES: FilmStates = {
  shellGhost: 0,
  shellSplit: 0,
  internalOpacity: 0,
  explodeXray: 0,
  explodeBatt: 0,
  chipFocus: 0,
  chipLift: 0,
  battLift: 0,
  subjectDim: 0,
  cameraFocus: 0,
  optical: 0,
  energy: 0,
  screenOn: 0,
  explodeRadial: 0,
  explodeOptics: 0,
  calloutOpacity: 0,
  sectionCut: 0,
  focusPull: 0,
  macroAtmos: 0,
  shieldLift: 0,
  coilRing: 0,
  layDown: 0,
  stackSeparate: 0,
  layerCursor: 0,
}

/**
 * Deterministic per-progress scalars driving x-ray and internals.
 * Reuses one scratch object: zero allocation per frame.
 */
export function computeFilmStates(p: number): FilmStates {
  STATES.cameraFocus = ramplike(p, 0.635, 0.665, 0.705, 0.73)
  // Teardown cursor first: the silicon beats below derive from it so they
  // track layer 5 (p in [0.395, 0.415]) instead of the retired chip act.
  // Snap float dust to integers: (0.315 - 0.295) / 0.02 is 1.0000000000000009
  // in binary, which would trip the [0, 10] range test by an ulp.
  const rawCursor = (p - 0.295) / 0.02
  const snapped =
    Math.abs(rawCursor - Math.round(rawCursor)) < 1e-9 ? Math.round(rawCursor) : rawCursor
  const cursor = Math.min(10, Math.max(0, snapped))
  STATES.chipLift = layerWindow(cursor, 5, 0.5, 0.5)
  STATES.battLift = ramplike(p, 0.893, 0.91, 0.92, 0.928)
  STATES.optical = ramplike(p, 0.645, 0.675, 0.715, 0.74)
  // Screw spin rides the sandwich opening (round 05 showcase timing).
  STATES.explodeXray = ramplike(p, 0.265, 0.283, 0.495, 0.51)
  STATES.explodeBatt = ramplike(p, 0.885, 0.893, 0.905, 0.918)
  // The teardown no longer ghosts the shell: the sandwich opens wide, so
  // every shell layer shows at full opacity. Only the energy beat x-rays.
  STATES.shellGhost = ramplike(p, 0.875, 0.9, 0.905, 0.925)
  STATES.shellSplit = ramplike(p, 0.29, 0.34, 0.465, 0.5)
  STATES.internalOpacity = Math.min(
    1,
    ramplike(p, 0.262, 0.27, 0.5, 0.512) + ramplike(p, 0.88, 0.9, 0.905, 0.93),
  )
  STATES.chipFocus = layerWindow(cursor, 5, 0.5, 0.5)
  STATES.subjectDim = ramplike(p, 0.893, 0.905, 0.92, 0.928)
  STATES.energy = ramplike(p, 0.885, 0.9, 0.91, 0.93)
  STATES.screenOn = ramplike(p, 0.03, 0.08, 1, 1)
  // Prompt B control plane. Windows overlap their neighbours rather than
  // butting them, so no second-derivative seam at handoffs.
  STATES.explodeRadial = ramplike(p, 0.265, 0.283, 0.495, 0.51)
  STATES.explodeOptics = ramplike(p, 0.6, 0.645, 0.7, 0.725)
  STATES.calloutOpacity = ramplike(p, 0.29, 0.33, 0.47, 0.5)
  STATES.sectionCut = 0
  STATES.focusPull = Math.max(
    ramplike(p, 0.4, 0.425, 0.445, 0.47),
    ramplike(p, 0.655, 0.675, 0.695, 0.715),
  )
  STATES.macroAtmos = Math.max(
    ramplike(p, 0.41, 0.43, 0.45, 0.47),
    ramplike(p, 0.66, 0.68, 0.7, 0.72),
  )
  // Shield reveal runs inside the main explode so the lids come off after
  // the outer layers clear and before reassembly starts. The coil ring
  // follows the energy beat: it is the charging indicator.
  STATES.shieldLift = ramplike(p, 0.315, 0.345, 0.47, 0.5)
  STATES.coilRing = ramplike(p, 0.885, 0.9, 0.91, 0.93)
  // Teardown sequence (Prompt D section 9.1): lay down, separate and hold,
  // ten feature windows, restack and stand. layerCursor is a single
  // continuous float: integer part is the current layer, fraction is local
  // progress. Everything per-layer derives from it and reverses exactly.
  STATES.layDown = ramplike(p, 0.25, 0.265, 0.5, 0.52)
  // Opens wide (0.265-0.283), holds the overview to 0.295, presents the
  // ten layers (0.295-0.495), closes for the stand-up (0.495-0.51).
  STATES.stackSeparate = ramplike(p, 0.265, 0.283, 0.495, 0.51)
  STATES.layerCursor = cursor
  return STATES
}
