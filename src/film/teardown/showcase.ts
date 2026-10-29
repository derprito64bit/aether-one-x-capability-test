import * as THREE from 'three'
import { smoothstep } from '../key.ts'
import { layerOffset, peelLocal } from './layers.ts'
import { SHOWCASE_LAYERS, type ShowcaseLayerDef } from './showcaseLayers.ts'
import {
  DEFAULT_SLOT_LANDSCAPE,
  DEFAULT_SLOT_PORTRAIT,
  showcaseBridge,
} from '../overlay/callouts.ts'

/**
 * Teardown showcase (round 05): the sandwich opens wide, holds an overview
 * of all ten layers, then presents one layer at a time. Each layer slides
 * out of its slot like a card (in its own plane, so it never crosses a
 * neighbour), then flies to a hero pose framed large beside the copy while
 * every other layer dims; it holds, flies back, and slides home before the
 * next one leaves. Everything here is a pure function of the damped
 * teardown scalars (separation and the unclamped tour cursor), the hero
 * transform, and the viewport aspect. Zero allocation: module scratch.
 *
 * Tour cursor u = (p - 0.295) / 0.02, unclamped: u < 0 is the overview,
 * layer i owns u in [i, i + 1), and d = u - i runs its beat (round 06,
 * slower and smoother than the round 05 pop-out):
 *   arrive 0 -> 0.30: slide out of the footprint over 0 -> 0.14, then the
 *     flight (overlapped, 0.10 -> 0.30) on a gentle arc to the hero pose;
 *   hold 0.30 -> 0.70;
 *   leave 0.70 -> 1: the exact mirror.
 * Every ramp is smootherstep (6t^5 - 15t^4 + 10t^3): zero velocity and
 * zero acceleration at both ends, so nothing pops in or out.
 */
export const SHOWCASE_TIMING = {
  /** Stack separation ramps (p): open wide, then close for the stand-up. */
  openStart: 0.265,
  openEnd: 0.283,
  closeStart: 0.495,
  closeEnd: 0.51,
  /** Tour cursor origin and span per layer (p); e2e cards sit at d = 0.25. */
  tourStart: 0.295,
  layerSpan: 0.02,
} as const

/** Opacity factor every other layer dims to while one is presented. */
export const SHOWCASE_DIM = 0.15

const smooth = smoothstep

/** Smootherstep on a clamped input: 6t^5 - 15t^4 + 10t^3. */
export function smoother(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Beat phase windows (fractions of one layer's beat). */
export const BEAT = {
  slideEnd: 0.14,
  flyStart: 0.1,
  flyEnd: 0.3,
  focusIn: 0.2,
  focusFull: 0.32,
} as const

/** Unclamped tour cursor at progress p (clamped to a sane band). */
export function tourCursorAt(p: number): number {
  return Math.min(12, Math.max(-3, (p - SHOWCASE_TIMING.tourStart) / SHOWCASE_TIMING.layerSpan))
}

/**
 * Distance into the beat from its nearer end (arrive from 0, leave from 1),
 * so the leave is the arrive played backwards. 0 outside the beat.
 */
function beatEdge(d: number): number {
  if (d <= 0 || d >= 1) return 0
  return Math.min(d, 1 - d)
}

/** Slide out of the footprint: 0 home, 1 clear, over the first 14%. */
export function layerSlide(d: number): number {
  return smoother(beatEdge(d) / BEAT.slideEnd)
}

/** Flight to the hero pose (and the turn), 10% -> 30% of the beat. */
export function layerFly(d: number): number {
  return smoother((beatEdge(d) - BEAT.flyStart) / (BEAT.flyEnd - BEAT.flyStart))
}

/** Presentation focus: 0 at d = 0.20, 1 from 0.32 to 0.68, 0 by 0.80. */
export function layerFocus(d: number): number {
  const range = BEAT.focusFull - BEAT.focusIn
  return Math.min(
    smoother((d - BEAT.focusIn) / range),
    1 - smoother((d - (1 - BEAT.focusFull)) / range),
  )
}

/** The presented layer's own brightness over its beat (others stay dim). */
export function layerLit(d: number): number {
  return smoother(beatEdge(d) / 0.12)
}

/** Overview hold: after the sandwich opens, before layer 0 arrives. */
export function overviewWeight(u: number, sep: number): number {
  const w = Math.min(smooth((u + 0.62) / 0.17), 1 - smooth(u / 0.12))
  return w * smooth((sep - 0.8) / 0.2)
}

/** How far the tour owns the frame: dims the stack, slides it aside. */
export function tourWeight(u: number): number {
  return Math.min(smoother(u / 0.12), 1 - smoother((u - 9.88) / 0.12))
}

/**
 * Camera travel level along the stack (a layer index, fractional between
 * beats): constant through each hold, easing to the next layer across the
 * whole leave/arrive seam (d 0.7 -> 1.3).
 */
export function cameraLevel(u: number): number {
  const a = u - 0.7
  const k = Math.floor(a)
  const level = k + smoother((a - k) / 0.6)
  return Math.min(9, Math.max(0, level))
}

/** Per-frame showcase state (shared scratch, see computeShowcaseState). */
export interface ShowcaseState {
  u: number
  sep: number
  /** Layer whose beat owns the cursor (0..9), or -1 outside the tour. */
  layer: number
  d: number
  /** Slide (in-plane, out of the footprint) and fly (to the hero pose) 0..1. */
  slide: number
  fly: number
  focus: number
  overview: number
  tour: number
  level: number
  /** Opacity factor per layer (index 0..9), 1 = full. */
  alpha: number[]
  /** Shield lids fade out as the stack opens (they would hide the chips). */
  lidAlpha: number
}

export function createShowcaseState(): ShowcaseState {
  return {
    u: -3,
    sep: 0,
    layer: -1,
    d: 0,
    slide: 0,
    fly: 0,
    focus: 0,
    overview: 0,
    tour: 0,
    level: 0,
    alpha: Array.from({ length: 10 }, () => 1),
    lidAlpha: 1,
  }
}

/** Fills `out` from the damped tour cursor and separation. Pure. */
export function computeShowcaseState(out: ShowcaseState, u: number, sep: number): ShowcaseState {
  out.u = u
  out.sep = sep
  const open = smooth((sep - 0.6) / 0.4)
  const layer = u >= 0 && u < 10 && sep > 0.001 ? Math.min(9, Math.floor(u)) : -1
  out.layer = layer
  out.d = layer >= 0 ? u - layer : 0
  // Never present a part while the stack is still (or again) closing.
  out.slide = layer >= 0 ? layerSlide(out.d) * open : 0
  out.fly = layer >= 0 ? layerFly(out.d) * open : 0
  out.focus = layer >= 0 ? layerFocus(out.d) * open : 0
  out.overview = overviewWeight(u, sep)
  out.tour = tourWeight(u) * open
  out.level = cameraLevel(u)
  const lit = layer >= 0 ? layerLit(out.d) : 0
  for (let i = 0; i < 10; i++) {
    const mine = i === layer ? lit : 0
    out.alpha[i] = 1 - (1 - SHOWCASE_DIM) * out.tour * (1 - mine)
  }
  out.lidAlpha = 1 - smooth(sep / 0.35)
  return out
}

/* ------------------------------------------------------------------ */
/* Framing                                                              */
/* ------------------------------------------------------------------ */

/** An NDC rectangle (x right, y up, both -1..1). */
export interface NdcRect {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** Where things go on screen for an aspect (round 05 framing contract). */
export interface ShowcaseFraming {
  /** Overview sandwich: fits inside. */
  overview: NdcRect
  /** Dimmed stack while the tour runs: slid aside, behind the hero. */
  tour: NdcRect
  /**
   * Cap on the presented part's longest projected side, as a share of the
   * viewport height (60% landscape, 42% portrait). The overlay's slot sets
   * the actual fit; this only ever shrinks it.
   */
  capH: number
  fovDeg: number
}

const LANDSCAPE: ShowcaseFraming = {
  // Right of the copy column (it ends ~31% at 1440): x 0.40-0.96 of width.
  overview: { x0: -0.2, x1: 0.92, y0: -0.78, y1: 0.8 },
  tour: { x0: 0.28, x1: 0.98, y0: -0.84, y1: 0.86 },
  capH: 0.6,
  fovDeg: 30,
}

const PORTRAIT: ShowcaseFraming = {
  // Top half only (the layer card starts ~51% down on phones).
  overview: { x0: -0.88, x1: 0.88, y0: 0.06, y1: 0.9 },
  tour: { x0: -0.9, x1: 0.9, y0: 0.04, y1: 0.92 },
  capH: 0.42,
  fovDeg: 34,
}

export function showcaseFraming(aspect: number): ShowcaseFraming {
  return aspect < 1 ? PORTRAIT : LANDSCAPE
}

/** The rig's fixed look direction: ~14 degrees down, a touch to the left. */
export const RIG_VIEW = new THREE.Vector3(-0.0288, -0.2418, -0.97).normalize()
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const RIG_RIGHT = new THREE.Vector3().crossVectors(RIG_VIEW, WORLD_UP).normalize()
const RIG_UP = new THREE.Vector3().crossVectors(RIG_RIGHT, RIG_VIEW).normalize()
const RIG_QUAT = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(RIG_RIGHT, RIG_UP, RIG_VIEW.clone().negate()),
)

/** The showcase camera goal: written by solveShowcaseRig. */
export interface RigCamera {
  pos: THREE.Vector3
  target: THREE.Vector3
  quat: THREE.Quaternion
  fov: number
  aspect: number
}

export function createRigCamera(): RigCamera {
  return {
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    quat: RIG_QUAT.clone(),
    fov: 30,
    aspect: 1,
  }
}

/** Stack footprint half extents in plan (phone-local, proud keys included). */
export const STACK_HALF_X = 0.0392
export const STACK_HALF_Y = 0.0805
/** Layer z reach beyond its slot: front glass top, camera bump rear. */
const STACK_FRONT = 0.0045
const STACK_REAR = 0.0072

const CORNER = new THREE.Vector3()
const CENTER = new THREE.Vector3()
const OFFS: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3())
const SHIFT = new THREE.Vector3()

function fitsAt(D: number, rect: NdcRect, tanV: number, tanH: number): boolean {
  const cx = (rect.x0 + rect.x1) / 2
  const cy = (rect.y0 + rect.y1) / 2
  const X0 = cx * D * tanH
  const Y0 = cy * D * tanV
  for (const o of OFFS) {
    const depth = D + o.dot(RIG_VIEW)
    if (depth <= 0.02) return false
    const nx = (X0 + o.dot(RIG_RIGHT)) / (depth * tanH)
    const ny = (Y0 + o.dot(RIG_UP)) / (depth * tanV)
    if (nx < rect.x0 || nx > rect.x1 || ny < rect.y0 || ny > rect.y1) return false
  }
  return true
}

/**
 * Solves the showcase camera: a fixed look direction, the smallest
 * distance that fits the open stack's box inside the overview rectangle
 * (blended toward the tour rectangle as the tour takes over), then a
 * travel along the stack axis toward the presented layer's slot. `hero` is
 * the hero group's world matrix; the box is its local (phone) space.
 */
export function solveShowcaseRig(
  out: RigCamera,
  hero: THREE.Matrix4,
  sep: number,
  gap: number,
  aspect: number,
  state: Pick<ShowcaseState, 'tour' | 'level'>,
): RigCamera {
  const framing = showcaseFraming(aspect)
  const t = state.tour
  const rect: NdcRect = RECT
  rect.x0 = framing.overview.x0 + (framing.tour.x0 - framing.overview.x0) * t
  rect.x1 = framing.overview.x1 + (framing.tour.x1 - framing.overview.x1) * t
  rect.y0 = framing.overview.y0 + (framing.tour.y0 - framing.overview.y0) * t
  rect.y1 = framing.overview.y1 + (framing.tour.y1 - framing.overview.y1) * t
  const zTop = layerOffset(0, 10, gap, peelLocal(sep, 0)) + STACK_FRONT
  const zBot = layerOffset(9, 10, gap, peelLocal(sep, 9)) - STACK_REAR
  CENTER.set(0, 0, (zTop + zBot) / 2).applyMatrix4(hero)
  for (let k = 0; k < 8; k++) {
    const o = OFFS[k] as THREE.Vector3
    o.set(
      k & 1 ? STACK_HALF_X : -STACK_HALF_X,
      k & 2 ? STACK_HALF_Y : -STACK_HALF_Y,
      k & 4 ? zTop : zBot,
    )
      .applyMatrix4(hero)
      .sub(CENTER)
  }
  const tanV = Math.tan((framing.fovDeg * Math.PI) / 360)
  const tanH = tanV * aspect
  let lo = 0.05
  let hi = 40
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (fitsAt(mid, rect, tanV, tanH)) hi = mid
    else lo = mid
  }
  const D = hi
  const cx = (rect.x0 + rect.x1) / 2
  const cy = (rect.y0 + rect.y1) / 2
  const X0 = cx * D * tanH
  const Y0 = cy * D * tanV
  // Camera travel: ride the stack axis toward the presented layer's slot.
  const level = layerOffset(state.level, 10, gap, peelLocal(sep, Math.round(state.level)))
  const mid = (zTop + zBot) / 2
  CORNER.set(0, 0, mid).applyMatrix4(hero)
  SHIFT.set(0, 0, mid + (level - mid) * 0.35 * t)
    .applyMatrix4(hero)
    .sub(CORNER)
  out.target.copy(CENTER).addScaledVector(RIG_RIGHT, -X0).addScaledVector(RIG_UP, -Y0).add(SHIFT)
  out.pos.copy(out.target).addScaledVector(RIG_VIEW, -D)
  out.quat.copy(RIG_QUAT)
  out.fov = framing.fovDeg
  out.aspect = aspect
  return out
}
const RECT: NdcRect = { x0: 0, x1: 0, y0: 0, y1: 0 }

/* ------------------------------------------------------------------ */
/* Presentation pose                                                    */
/* ------------------------------------------------------------------ */

/** A layer's group transform in hero-local (phone) space. */
export interface LayerPose {
  pos: THREE.Vector3
  quat: THREE.Quaternion
}

export function createLayerPoses(): LayerPose[] {
  return Array.from({ length: 10 }, () => ({
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
  }))
}

const HERO_POS = new THREE.Vector3()
const HERO_QUAT = new THREE.Quaternion()
const HERO_SCALE = new THREE.Vector3()
const HERO_INV = new THREE.Matrix4()
const RAY = new THREE.Vector3()
const P_WORLD = new THREE.Vector3()
const BASIS = new THREE.Matrix4()
const AX_X = new THREE.Vector3()
const AX_Y = new THREE.Vector3()
const AX_Z = new THREE.Vector3()
const Q_TILT = new THREE.Quaternion()
const EULER = new THREE.Euler()
const C_LOCAL = new THREE.Vector3()

/** A screen slot in viewport fractions (x left to right, y top to bottom). */
export interface ViewSlot {
  x0: number
  x1: number
  y0: number
  y1: number
}

/**
 * The slot the presented part fits: the overlay's measured slot once it
 * has published one (it writes on resize only), else the default for the
 * aspect. Zero allocation: fills `out`.
 */
export function resolveSlot(out: ViewSlot, aspect: number): ViewSlot {
  const live = showcaseBridge.slot
  const src = live.set ? live : aspect < 1 ? DEFAULT_SLOT_PORTRAIT : DEFAULT_SLOT_LANDSCAPE
  out.x0 = src.x0
  out.x1 = src.x1
  out.y0 = src.y0
  out.y1 = src.y1
  return out
}

/** Projected subject box of a posed layer, in NDC (scratch result). */
const FIT = { x0: 0, x1: 0, y0: 0, y1: 0 }
const CORNER_W = new THREE.Vector3()

function projectSubject(
  def: ShowcaseLayerDef,
  pose: LayerPose,
  hero: THREE.Matrix4,
  cam: RigCamera,
  tanV: number,
  tanH: number,
): typeof FIT {
  FIT.x0 = FIT.y0 = Number.POSITIVE_INFINITY
  FIT.x1 = FIT.y1 = Number.NEGATIVE_INFINITY
  for (let k = 0; k < 8; k++) {
    CORNER_W.set(
      def.center[0] + (k & 1 ? def.half[0] : -def.half[0]),
      def.center[1] + (k & 2 ? def.half[1] : -def.half[1]),
      def.center[2] + (k & 4 ? def.half[2] : -def.half[2]),
    )
      .applyQuaternion(pose.quat)
      .add(pose.pos)
      .applyMatrix4(hero)
      .sub(cam.pos)
    const depth = Math.max(1e-4, CORNER_W.dot(RIG_VIEW))
    const nx = CORNER_W.dot(RIG_RIGHT) / (depth * tanH)
    const ny = CORNER_W.dot(RIG_UP) / (depth * tanV)
    FIT.x0 = Math.min(FIT.x0, nx)
    FIT.x1 = Math.max(FIT.x1, nx)
    FIT.y0 = Math.min(FIT.y0, ny)
    FIT.y1 = Math.max(FIT.y1, ny)
  }
  return FIT
}

/**
 * Places the subject centre on the ray through NDC (nx, ny) at depth D
 * (along the view axis), facing the camera eye with the hero tilt; writes
 * the group transform (hero-local).
 */
function placePresent(
  out: LayerPose,
  def: ShowcaseLayerDef,
  cam: RigCamera,
  hero: THREE.Matrix4,
  D: number,
  nx: number,
  ny: number,
  drift: number,
  tanV: number,
  tanH: number,
): void {
  RAY.copy(RIG_VIEW)
    .addScaledVector(RIG_RIGHT, nx * tanH)
    .addScaledVector(RIG_UP, ny * tanV)
  P_WORLD.copy(cam.pos).addScaledVector(RAY, D)
  // Face the camera eye exactly (off-axis framing would skew a plane
  // facing down the view axis), upright on the camera's up.
  AX_Z.copy(RAY).normalize().negate()
  AX_Y.copy(RIG_UP).addScaledVector(AX_Z, -RIG_UP.dot(AX_Z)).normalize()
  AX_X.crossVectors(AX_Y, AX_Z)
  BASIS.makeBasis(AX_X, AX_Y, AX_Z)
  out.quat.setFromRotationMatrix(BASIS)
  EULER.set(def.pitch, def.yaw + drift * 0.07, 0, 'YXZ')
  out.quat.multiply(Q_TILT.setFromEuler(EULER))
  if (def.roll !== 0) out.quat.multiply(Q_TILT.setFromAxisAngle(AX_Z.set(0, 0, 1), def.roll))
  if (def.face < 0) out.quat.multiply(Q_TILT.setFromAxisAngle(AX_Y.set(0, 1, 0), Math.PI))
  // Into hero-local: rotation, then the subject centre onto the point.
  out.quat.premultiply(Q_TILT.copy(HERO_QUAT).invert())
  HERO_INV.copy(hero).invert()
  out.pos.copy(P_WORLD).applyMatrix4(HERO_INV)
  C_LOCAL.set(def.center[0], def.center[1], def.center[2]).applyQuaternion(out.quat)
  out.pos.sub(C_LOCAL)
}

/**
 * The hero pose of one layer (its group transform, hero-local) at full
 * presentation. Fit rule (round 05b): the layer's projected SUBJECT box
 * (its 8 corners, tilt and perspective included) is centred on the slot
 * and scaled to fit both the slot's width and height, never taller or
 * wider than `capH` of the viewport height (60% landscape, 42% portrait).
 * Solved iteratively (size scales as 1/distance; the centre is nudged by
 * the projected offset), at the hold's mid drift so the distance holds
 * still while `drift` (0..1 across the hold) turns the part a few degrees.
 * The detailed face looks back at the camera with the layer's 3/4 tilt.
 */
export function solvePresentPose(
  out: LayerPose,
  def: ShowcaseLayerDef,
  cam: RigCamera,
  hero: THREE.Matrix4,
  drift: number,
  slot: ViewSlot,
): LayerPose {
  hero.decompose(HERO_POS, HERO_QUAT, HERO_SCALE)
  const scale = HERO_SCALE.x
  const framing = showcaseFraming(cam.aspect)
  const tanV = Math.tan((cam.fov * Math.PI) / 360)
  const tanH = tanV * cam.aspect
  // Slot in NDC, capped: height share capH, width capH of the height.
  const sx0 = slot.x0 * 2 - 1
  const sx1 = slot.x1 * 2 - 1
  const sy0 = 1 - slot.y1 * 2
  const sy1 = 1 - slot.y0 * 2
  const tx = (sx0 + sx1) / 2
  const ty = (sy0 + sy1) / 2
  const allowY = Math.max(0.02, Math.min(sy1 - sy0, framing.capH * 2))
  const allowX = Math.max(0.02, Math.min(sx1 - sx0, (framing.capH * 2) / cam.aspect))
  // First guess from the box extents, then refine on the projection.
  const swap = Math.abs(Math.sin(def.roll)) > 0.7
  const hv = (swap ? def.half[0] : def.half[1]) * scale
  const hh = (swap ? def.half[1] : def.half[0]) * scale
  let D = Math.max((2 * hv) / (allowY * tanV), (2 * hh) / (allowX * tanH))
  let nx = tx
  let ny = ty
  for (let iter = 0; iter < 5; iter++) {
    placePresent(out, def, cam, hero, D, nx, ny, 0.5, tanV, tanH)
    const r = projectSubject(def, out, hero, cam, tanV, tanH)
    const k = Math.max((r.x1 - r.x0) / allowX, (r.y1 - r.y0) / allowY)
    D *= k
    nx += tx - (r.x0 + r.x1) / 2
    ny += ty - (r.y0 + r.y1) / 2
  }
  placePresent(out, def, cam, hero, D, nx, ny, drift, tanV, tanH)
  return out
}

/** In-plane direction (hero-local, unit) from the stack toward the camera. */
export function slideDirection(
  out: THREE.Vector3,
  cam: RigCamera,
  hero: THREE.Matrix4,
): THREE.Vector3 {
  HERO_INV.copy(hero).invert()
  out.copy(cam.pos).applyMatrix4(HERO_INV)
  out.z = 0
  if (out.lengthSq() < 1e-12) out.set(1, 0, 0)
  return out.normalize()
}

/**
 * Slide distance that carries a layer's whole bounding sphere clear of the
 * stack footprint along `dir`, so any turn after it is collision-free.
 */
export function slideClearance(def: ShowcaseLayerDef, dir: THREE.Vector3): number {
  const stack = Math.abs(dir.x) * STACK_HALF_X + Math.abs(dir.y) * STACK_HALF_Y
  const radius = Math.hypot(def.half[0], def.half[1], def.half[2])
  const along = def.center[0] * dir.x + def.center[1] * dir.y
  return stack + 0.006 + radius - along
}

const Q_ID = new THREE.Quaternion()
/** Flight arc bow: the midpoint rises this share of the flight distance. */
const ARC_LIFT = 0.2
const C_SLIDE = new THREE.Vector3()
const C_PRESENT = new THREE.Vector3()

/**
 * One layer's group transform (hero-local) for the showcase: its peel slot,
 * plus, while it is the presented layer, the slide out of the footprint
 * (in its own plane) and the flight to `present` (turning only during the
 * flight, about its own subject centre). Pure in its inputs.
 */
export function composeLayerPose(
  out: LayerPose,
  index: number,
  sep: number,
  gap: number,
  slide: number,
  fly: number,
  present: LayerPose | null,
  dir: THREE.Vector3,
): LayerPose {
  const slot = layerOffset(index, 10, gap, peelLocal(sep, index))
  out.pos.set(0, 0, slot)
  out.quat.identity()
  if (present === null || (slide <= 0 && fly <= 0)) return out
  const def = SHOWCASE_LAYERS[index] as ShowcaseLayerDef
  const clear = slideClearance(def, dir)
  C_SLIDE.set(def.center[0], def.center[1], def.center[2] + slot).addScaledVector(
    dir,
    clear * slide,
  )
  if (fly <= 0) {
    out.pos.addScaledVector(dir, clear * slide)
    return out
  }
  C_PRESENT.set(def.center[0], def.center[1], def.center[2])
    .applyQuaternion(present.quat)
    .add(present.pos)
  out.quat.slerpQuaternions(Q_ID, present.quat, fly)
  // A gentle arc, not a straight snap: a quadratic path whose midpoint
  // rises along the stack axis by a fifth of the flight. The bow is pure
  // z (hero-local), so in plan the path stays the straight line between
  // two points outside the footprint, and never re-enters the stack.
  const lift = ARC_LIFT * C_SLIDE.distanceTo(C_PRESENT)
  C_SLIDE.lerp(C_PRESENT, fly)
  C_SLIDE.z += 2 * fly * (1 - fly) * lift
  C_LOCAL.set(def.center[0], def.center[1], def.center[2]).applyQuaternion(out.quat)
  out.pos.copy(C_SLIDE).sub(C_LOCAL)
  return out
}

/** Applies a pose to a group (scale one), plus a local z lift along its own axis. */
export function applyPose(group: THREE.Object3D, pose: LayerPose, liftZ = 0): void {
  group.position.copy(pose.pos)
  if (liftZ !== 0) {
    C_LOCAL.set(0, 0, liftZ).applyQuaternion(pose.quat)
    group.position.add(C_LOCAL)
  }
  group.quaternion.copy(pose.quat)
  group.scale.setScalar(1)
}
