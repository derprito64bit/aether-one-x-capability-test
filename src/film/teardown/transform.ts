import type { Group, Quaternion, Vector3 } from 'three'
import { DIM, MODULE } from '../../components/PhoneViewer/phoneDimensions.ts'
import { LAYER_GAP, TEARDOWN_LAYERS, layerOffset, peelLocal, type TeardownLayer } from './layers.ts'

/**
 * Module pivot in phone-local xy: the lens-up turn rotates about the
 * module center, not the group origin (which would swing the 47mm disc
 * 92mm down the stack).
 */
const MODULE_PIVOT_Y = MODULE.cy

/**
 * Lateral travel that carries the featured camera layer clear of the
 * stack in plan before it turns: module reach (24.2mm with the fillet)
 * plus the stack half-width with the proud keys (38.8mm), plus 10mm of
 * visual clearance so the turning module reads as beside the stack.
 */
export const CAMERA_SLIDE = 0.076

/** Portrait teardown: aim this far lower per unit separation (m). */
export const PORTRAIT_TEARDOWN_DROP = 0.055

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function smooth(t: number): number {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/** Camera beat window on the layer cursor: in over 8.0-8.45, out over 8.55-9.0. */
export const CAMERA_BEAT = { inStart: 8, inEnd: 8.45, outStart: 8.55, outEnd: 9 } as const

/**
 * Camera feature progress from the continuous layer cursor: 0 outside its
 * beat, 1 at its centre. Both ramps sit inside the camera beat (cursor 8
 * to 9), so the slide and turn play under the camera copy, never under the
 * coil or rear-panel beats, and each ramp spans 0.45 cursor (about 146px
 * of desktop scroll; it was 0.3 cursor, outside the beat, which one wheel
 * notch skipped). Pure function of the cursor it is given.
 */
export function cameraFeature(cursor: number): number {
  const b = CAMERA_BEAT
  return Math.min(
    smooth((cursor - b.inStart) / (b.inEnd - b.inStart)),
    1 - smooth((cursor - b.outStart) / (b.outEnd - b.outStart)),
  )
}

/** Shared teardown scalars, damped once per frame for every layer. */
export interface TeardownScalars {
  sep: number
  cursor: number
  ready: boolean
}

/** Rate at which the shared teardown scalars follow scroll, per second. */
const TEARDOWN_FOLLOW = 7

/**
 * Damps the teardown's shared scalars (separation and layer cursor) toward
 * their progress values once per frame; every layer, shell and internal,
 * then rides pure goals of these same two numbers. Each group used to damp
 * its own position at its own weight rate and snap on its own past 10mm,
 * so neighbours lagged by different amounts and inverted mid-peel even
 * though their goals never did. Snaps under reduced motion and on the
 * first frame. Zero allocation: writes into `state`.
 */
export function dampTeardownScalars(
  state: TeardownScalars,
  sep: number,
  cursor: number,
  delta: number,
  reduced: boolean,
): void {
  const k = reduced || !state.ready ? 1 : 1 - Math.exp(-delta * TEARDOWN_FOLLOW)
  state.sep += (sep - state.sep) * k
  state.cursor += (cursor - state.cursor) * k
  if (Math.abs(sep - state.sep) < 1e-5) state.sep = sep
  if (Math.abs(cursor - state.cursor) < 1e-4) state.cursor = cursor
  state.ready = true
}

/** Scratch for cameraPhases: zero allocation on the frame path. */
const PHASES = { slide: 0, rise: 0, turn: 0 }

/**
 * The featured camera layer's three moves, in order and never together:
 * slide out of the stack's footprint, bring the bonded module up to the
 * housings, then turn lens-up toward the tour camera. Because the turn
 * only starts once the layer is clear in plan, the 47mm disc never sweeps
 * edge-on through the board, silicon, thermal, or rear panel (it used to
 * turn in place during the peel). Returns a shared scratch object.
 */
export function cameraPhases(feature: number): Readonly<typeof PHASES> {
  const f = clamp01(feature)
  PHASES.slide = smooth(f / 0.34)
  PHASES.rise = smooth((f - 0.33) / 0.34)
  PHASES.turn = smooth((f - 0.66) / 0.34)
  return PHASES
}

/**
 * Slot of the shell camera module, which nests inside the rear panel
 * group. Through the peel it stays bonded to the panel it sits on (0,
 * relative), so it never crosses the panel; during the camera beat it
 * rises to the housings' slot (slot 8 minus slot 9) once the layer is out
 * of the stack, so housings and module turn about one shared pivot as a
 * single rigid assembly.
 */
export function cameraModuleSlot(sep: number, gap: number, feature: number): number {
  const rel =
    layerOffset(8, 10, gap, peelLocal(sep, 8)) - layerOffset(9, 10, gap, peelLocal(sep, 9))
  return rel * cameraPhases(feature).rise
}

/** Optional goal terms for applyLayerTransform. */
export interface LayerExtras {
  /** Camera feature progress 0..1 (cameraFeature); ignored by other layers. */
  feature?: number
  /** Extra z on the goal (die and shield-lid lifts), never on the position. */
  liftZ?: number
}

/**
 * One teardown layer's slot transform (sandwich rewrite). The layer rides
 * its peel-staggered slot offset and nothing else: position converges on
 * the slot, rotation stays zero, scale stays one. Both drivers (the
 * FilmDirector's shell groups via driveShellLayers, and Internals' parts)
 * share this helper, so layer bugs cannot survive review in only one.
 *
 * Sole exception: the camera layer, whose decorated face points away from
 * the tour camera. During its own beat it slides clear of the stack and
 * turns lens-up about the module center (cameraPhases); everywhere else it
 * rides its slot face-down like any other layer.
 *
 * `slotZ` overrides the slot for nested groups (the shell module, see
 * cameraModuleSlot). `extras.liftZ` adds to the goal: act lifts must never
 * be added to the damped position, or they pile up frame on frame.
 *
 * Both teardown drivers pass damp 1: the smoothing lives in the shared
 * scalars (dampTeardownScalars), so every layer sits exactly on its goal.
 * The damp parameter and its 10mm snap remain only for a caller that
 * eases one group on its own.
 */
export function applyLayerTransform(
  group: Group,
  layer: TeardownLayer,
  sep: number,
  gap: number,
  damp: number,
  slotZ?: number,
  extras?: LayerExtras,
): void {
  const local = peelLocal(sep, layer.index)
  const off = (slotZ ?? layerOffset(layer.index, 10, gap, local)) + (extras?.liftZ ?? 0)
  let gx = 0
  let gy = 0
  let gz = off
  let turn = 0
  if (layer.id === 'camera') {
    const phases = cameraPhases(extras?.feature ?? 0)
    gx = CAMERA_SLIDE * phases.slide
    turn = Math.PI * phases.turn
    const c = Math.cos(turn)
    const s = Math.sin(turn)
    // Turn about the pivot, then carry the slot: the module stays on its
    // slot upside-down instead of swinging to the mirrored slot.
    gy = MODULE_PIVOT_Y * (1 - c)
    gz = off - MODULE_PIVOT_Y * s
  }
  const dx = gx - group.position.x
  const dy = gy - group.position.y
  const dz = gz - group.position.z
  const travel = Math.hypot(dx, dy, dz)
  const d = travel > 0.01 ? 1 : damp
  group.position.x += dx * d
  group.position.y += dy * d
  group.position.z += dz * d
  group.rotation.set(turn, 0, 0)
  group.scale.setScalar(1)
}

/** PhoneModel shell groups the teardown moves (null while unmounted). */
export type ShellGroups = Record<'frame' | 'back' | 'glass' | 'display' | 'module', Group | null>

const SHELL_EXTRAS: { feature: number; liftZ: number } = { feature: 0, liftZ: 0 }

/**
 * Drives every shell group exactly onto its teardown goal for the shared
 * (already damped, see dampTeardownScalars) separation and cursor: the
 * director's per-frame shell driver, shared with layerStack.test.tsx so
 * the test exercises the shipped code path. Zero allocation.
 */
export function driveShellLayers(
  groups: ShellGroups,
  sep: number,
  gap: number,
  cursor: number,
): void {
  const feature = cameraFeature(cursor)
  SHELL_EXTRAS.feature = feature
  for (const layer of TEARDOWN_LAYERS) {
    for (const name of layer.shell) {
      const grp = groups[name]
      if (grp === null) continue
      const slot = name === 'module' ? cameraModuleSlot(sep, gap, feature) : undefined
      applyLayerTransform(grp, layer, sep, gap, 1, slot, SHELL_EXTRAS)
    }
  }
}

/** A world-space aim offset (m), added to the camera's look-at point. */
export interface AimOffset {
  x: number
  y: number
  z: number
}

/**
 * The teardown's aim offset goal, every term summed: the tour drift toward
 * the featured layer's slot (never upward on portrait), the follow of the
 * camera layer's slide, and the portrait drop that lifts the stack clear
 * of the copy card (no act gate: it decays with the separation itself).
 * The director damps one persistent offset toward this goal
 * (dampAimOffset); added raw, each term stepped the frame in one frame at
 * every layer boundary and at the act edges. Zero allocation.
 */
export function teardownAimGoal(
  out: AimOffset,
  inTeardown: boolean,
  featured: number,
  sep: number,
  cursor: number,
  gap: number,
  aspect: number,
  heroQuaternion: Quaternion,
  heroScale: number,
  scratch: Vector3,
): AimOffset {
  const portrait = aspect < 0.8
  out.x = 0
  out.y = 0
  out.z = 0
  if (inTeardown && featured >= 0 && sep > 0.001) {
    // Phone-local +z maps to screen-up in the flat lay, so the slot offset
    // applies straight to y at half gain.
    const drift = 0.5 * layerOffset(featured, 10, gap, peelLocal(sep, featured))
    out.y += portrait ? Math.min(0, drift) : drift
  }
  if (inTeardown) {
    const slide = CAMERA_SLIDE * cameraPhases(cameraFeature(cursor)).slide
    if (slide > 0) {
      // Fully on narrow viewports, where the slide would leave the frame.
      const gain = portrait ? 1 : 0.5
      scratch
        .set(slide, 0, 0)
        .applyQuaternion(heroQuaternion)
        .multiplyScalar(heroScale * gain)
      out.x += scratch.x
      out.y += scratch.y
      out.z += scratch.z
    }
  }
  if (portrait) out.y -= PORTRAIT_TEARDOWN_DROP * sep
  return out
}

/**
 * Damps the persistent aim offset toward its goal with the look damp `k`
 * (1 snaps: reduced motion, or the first frame).
 */
export function dampAimOffset(
  state: AimOffset & { ready: boolean },
  goal: AimOffset,
  k: number,
): void {
  const f = state.ready ? k : 1
  state.x += (goal.x - state.x) * f
  state.y += (goal.y - state.y) * f
  state.z += (goal.z - state.z) * f
  state.ready = true
}

type V3 = readonly [number, number, number]

function vsub(a: V3, b: V3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vnorm(v: [number, number, number]): [number, number, number] {
  const m = Math.hypot(v[0], v[1], v[2])
  return m > 1e-12 ? [v[0] / m, v[1] / m, v[2] / m] : [0, 0, 1]
}

function vdot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function vrotX(v: V3, a: number): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]
}

function vrotY(v: V3, a: number): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]
}

export interface StackProjection {
  /** Camera elevation above the target plane, degrees. */
  elevationDeg: number
  /** Stack-axis share wasted into view depth (target < 0.50). */
  intoDepth: number
  /** Stack-axis share on screen-vertical (target > 0.85). */
  onScreenUp: number
  /** Separated stack height on screen, mm. */
  stackHeightMm: number
  /** One plate's vertical extent on screen, mm. */
  plateHeightMm: number
  /** Stack over plate (target > 0.65: the >0.80 bar contradicts the
   * protected 8.5mm gap, whose ceiling is ~0.70 — user ruling 2026-09-22). */
  ratio: number
}

/**
 * How the separated stack projects for a posed device and camera (round
 * 03 Part A acceptance 1-4). Pure math over the sampled timeline: the
 * K.3 probe script as a unit test, no renderer.
 */
export function stackProjection(
  rx: number,
  ry: number,
  scale: number,
  camPos: V3,
  target: V3,
): StackProjection {
  const view = vnorm(vsub(target, camPos))
  const elevationDeg = (Math.asin(Math.min(1, Math.max(-1, -view[1]))) * 180) / Math.PI
  const k = vdot([0, 1, 0], view)
  const up = vnorm([0 - k * view[0], 1 - k * view[1], 0 - k * view[2]])
  const stack = vnorm(vrotY(vrotX([0, 0, 1], rx), ry))
  const long = vnorm(vrotY(vrotX([0, 1, 0], rx), ry))
  const onUp = Math.abs(vdot(stack, up))
  const stackH = 9 * LAYER_GAP * onUp
  const plateH = scale * DIM.h * Math.abs(vdot(long, up))
  return {
    elevationDeg,
    intoDepth: Math.abs(vdot(stack, view)),
    onScreenUp: onUp,
    stackHeightMm: stackH * 1000,
    plateHeightMm: plateH * 1000,
    ratio: plateH > 1e-9 ? stackH / plateH : 0,
  }
}
