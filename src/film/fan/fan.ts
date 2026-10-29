import * as THREE from 'three'
import { FINISHES, type FinishId } from '../../data/product.ts'
import { DIM } from '../../components/PhoneViewer/phoneDimensions.ts'
import { smoother } from '../teardown/showcase.ts'

/**
 * Finish fan (round 07, final act 0.975 -> 1): the phone turns to show its
 * back, then fans out into six phones, one per finish in FINISHES order,
 * like a paper hand fan: a pivot near the bottom, 110 degrees of spread,
 * slight overlap, rear faces to the camera. Card 0 is the hero itself
 * (obsidian); the other five are rear-only shells. The fan is placed in
 * front of the act's goal camera (pure in progress and aspect), framed in
 * the right 60% on desktop and the top half on phones. Zero allocation:
 * module scratch, written into caller-owned outputs.
 */
export const FAN = {
  start: 0.975,
  end: 1,
  /** Act fractions: the hero turns over 0 -> 0.35, the fan opens 0.25 -> 0.6, holds after. */
  turnEnd: 0.35,
  openStart: 0.25,
  openEnd: 0.6,
  spreadDeg: 110,
  /** Pivot, phone-local y (metres): 1.8cm above the bottom edge. */
  pivotY: -0.062,
  /** Each card sits this far (fan-local metres, unscaled) behind the previous. */
  zStep: 0.0045,
} as const

export const FAN_ORDER: readonly FinishId[] = FINISHES.map((f) => f.id)

export interface FanPhase {
  t: number
  turn: number
  open: number
}

/** The act's fan phases at progress p. Pure; fills `out`. */
export function fanPhase(p: number, out: FanPhase): FanPhase {
  const t = Math.min(1, Math.max(0, (p - FAN.start) / (FAN.end - FAN.start)))
  out.t = t
  out.turn = smoother(t / FAN.turnEnd)
  out.open = smoother((t - FAN.openStart) / (FAN.openEnd - FAN.openStart))
  return out
}

/** Card k's fan angle (rad) at an opening: card 0 leftmost, tops spread out. */
export function cardAngle(k: number, open: number): number {
  const step = (FAN.spreadDeg * Math.PI) / 180 / (FAN_ORDER.length - 1)
  return ((FAN_ORDER.length - 1) / 2 - k) * step * open
}

/** The fan's goal camera (world) and lens. */
export interface FanCamera {
  pos: THREE.Vector3
  quat: THREE.Quaternion
  fov: number
  aspect: number
}

/** One card's world pose plus its label anchor. */
export interface FanCard {
  pos: THREE.Vector3
  quat: THREE.Quaternion
  anchor: THREE.Vector3
}

export interface FanLayout {
  cards: FanCard[]
  scale: number
  /** World centre of the fanned set (the spotlight's subject). */
  center: THREE.Vector3
}

export function createFanLayout(): FanLayout {
  return {
    cards: FAN_ORDER.map(() => ({
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      anchor: new THREE.Vector3(),
    })),
    scale: 1,
    center: new THREE.Vector3(),
  }
}

/** Viewport-fraction regions (x left->right, y top->bottom). */
const REGION_WIDE = { x0: 0.42, x1: 0.96, y0: 0.12, y1: 0.88 }
const REGION_TALL = { x0: 0.05, x1: 0.95, y0: 0.06, y1: 0.5 }

const RIGHT = new THREE.Vector3()
const UP = new THREE.Vector3()
const BACK = new THREE.Vector3()
const VIEW = new THREE.Vector3()
const PIVOT = new THREE.Vector3()
const Q_CARD = new THREE.Quaternion()
const Q_FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

/** Fan-local bounding box of the fully open fan (unit scale), computed once. */
const FULL_BOX = (() => {
  const hw = DIM.w / 2
  const hh = DIM.h / 2
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let k = 0; k < FAN_ORDER.length; k++) {
    const a = cardAngle(k, 1)
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (const [x, y] of [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ] as const) {
      // Card-local point relative to the pivot, rotated about it.
      const px = x
      const py = y - FAN.pivotY
      const rx = c * px - s * py
      const ry = s * px + c * py
      minX = Math.min(minX, rx)
      maxX = Math.max(maxX, rx)
      minY = Math.min(minY, ry)
      maxY = Math.max(maxY, ry)
    }
  }
  return { minX, maxX, minY, maxY }
})()

/**
 * Lays out the six cards at an opening, in front of the goal camera: the
 * fully open fan (its bounding box) is centred on the region and sized to
 * fit it, and the opening rotates each card about the shared pivot from
 * that same placement, so the fan grows in place. Rear faces to the
 * camera; each card sits FAN.zStep behind the previous, so the hero (card
 * 0) leads and the others slide out from behind it.
 */
export function solveFan(out: FanLayout, cam: FanCamera, open: number, scale: number): FanLayout {
  const region = cam.aspect < 1 ? REGION_TALL : REGION_WIDE
  const tanV = Math.tan((cam.fov * Math.PI) / 360)
  const tanH = tanV * cam.aspect
  RIGHT.set(1, 0, 0).applyQuaternion(cam.quat)
  UP.set(0, 1, 0).applyQuaternion(cam.quat)
  BACK.set(0, 0, 1).applyQuaternion(cam.quat)
  VIEW.copy(BACK).negate()
  const w = (FULL_BOX.maxX - FULL_BOX.minX) * scale
  const h = (FULL_BOX.maxY - FULL_BOX.minY) * scale
  const allowW = (region.x1 - region.x0) * 2 * 0.94
  const allowH = (region.y1 - region.y0) * 2 * 0.94
  const D = Math.max(w / (allowW * tanH), h / (allowH * tanV))
  const cx = region.x0 + region.x1 - 1
  const cy = 1 - (region.y0 + region.y1)
  const bx = ((FULL_BOX.minX + FULL_BOX.maxX) / 2) * scale
  const by = ((FULL_BOX.minY + FULL_BOX.maxY) / 2) * scale
  PIVOT.copy(cam.pos)
    .addScaledVector(VIEW, D)
    .addScaledVector(RIGHT, cx * D * tanH - bx)
    .addScaledVector(UP, cy * D * tanV - by)
  out.scale = scale
  out.center.copy(PIVOT).addScaledVector(RIGHT, bx).addScaledVector(UP, by)
  for (let k = 0; k < out.cards.length; k++) {
    const card = out.cards[k] as FanCard
    const a = cardAngle(k, open)
    const c = Math.cos(a)
    const s = Math.sin(a)
    const up = -FAN.pivotY * scale
    // Card centre: the pivot-to-centre arm, rotated.
    card.pos
      .copy(PIVOT)
      .addScaledVector(RIGHT, -s * up)
      .addScaledVector(UP, c * up)
      .addScaledVector(BACK, -k * FAN.zStep * scale)
    // Fan plane faces the camera; the phone's back (-z) faces it too.
    card.quat.copy(cam.quat).multiply(Q_CARD.setFromAxisAngle(Z_AXIS, a)).multiply(Q_FLIP)
    // Label anchor: just above the card's top edge, on its axis.
    const reach = (DIM.h / 2 + 0.006) * scale
    card.anchor
      .copy(card.pos)
      .addScaledVector(RIGHT, -s * reach)
      .addScaledVector(UP, c * reach)
  }
  return out
}
