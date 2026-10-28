import * as THREE from 'three'
import { SHOWCASE_PART_SLOTS, showcaseBridge } from '../overlay/callouts.ts'
import { SOC_STACK } from '../internals/layout.ts'
import { RIG_VIEW, type LayerPose, type ShowcaseState } from './showcase.ts'
import { SHOWCASE_LAYERS, type ShowcaseLayerDef } from './showcaseLayers.ts'

const LAYER_M = new THREE.Matrix4()
const WORLD_M = new THREE.Matrix4()
const ONE = new THREE.Vector3(1, 1, 1)
const P = new THREE.Vector3()
const N = new THREE.Vector3()
const TO_CAM = new THREE.Vector3()
const Q = new THREE.Quaternion()
const HERO_Q = new THREE.Quaternion()
const HERO_P = new THREE.Vector3()
const HERO_S = new THREE.Vector3()
const LEFT_LOCAL = new THREE.Vector3()

function layerWorld(hero: THREE.Matrix4, pose: LayerPose): THREE.Matrix4 {
  LAYER_M.compose(pose.pos, pose.quat, ONE)
  return WORLD_M.multiplyMatrices(hero, LAYER_M)
}

/**
 * Publishes the showcase to the overlay (callouts.ts showcaseBridge) every
 * frame, in place: the presented layer, its focus, the overview weight,
 * the presented layer's sub-component anchors (world, on their visible
 * faces, off when turned away from the camera), one left-edge anchor per
 * layer for the overview labels, and the presented layer's world AABB.
 * `hero` is the hero group's world matrix (the internals root copies it);
 * `dieLift` is the silicon die's local lift in meters. Zero allocation.
 */
export function writeShowcaseBridge(
  show: ShowcaseState,
  poses: readonly LayerPose[],
  hero: THREE.Matrix4,
  camPos: THREE.Vector3,
  dieLift: number,
  now: number,
): void {
  const bridge = showcaseBridge
  bridge.layer = show.layer
  bridge.focus = show.focus
  bridge.overview = show.overview
  bridge.stamp = now
  hero.decompose(HERO_P, HERO_Q, HERO_S)
  const layer = show.layer
  const def: ShowcaseLayerDef | undefined = layer >= 0 ? SHOWCASE_LAYERS[layer] : undefined
  const pose = layer >= 0 ? poses[layer] : undefined
  for (let k = 0; k < SHOWCASE_PART_SLOTS; k++) {
    const slot = bridge.parts[k]
    if (slot === undefined) continue
    const anchor = def?.anchors[k]
    if (def === undefined || pose === undefined || anchor === undefined) {
      slot.on = false
      slot.key = ''
      continue
    }
    const m = layerWorld(hero, pose)
    P.set(anchor.at[0], anchor.at[1], anchor.at[2] - (anchor.lift === true ? dieLift : 0))
    P.applyMatrix4(m)
    Q.copy(HERO_Q).multiply(pose.quat)
    N.set(anchor.n[0], anchor.n[1], anchor.n[2]).applyQuaternion(Q)
    TO_CAM.copy(camPos).sub(P)
    slot.key = anchor.key
    slot.x = P.x
    slot.y = P.y
    slot.z = P.z
    slot.on = N.dot(TO_CAM) > 0
  }
  // Overview labels: each layer's edge nearest the copy (screen left).
  const open = show.sep > 0.5
  for (let i = 0; i < 10; i++) {
    const slot = bridge.layers[i]
    const ldef = SHOWCASE_LAYERS[i]
    const lpose = poses[i]
    if (slot === undefined || ldef === undefined || lpose === undefined) continue
    slot.key = ldef.id
    Q.copy(HERO_Q).multiply(lpose.quat).invert()
    LEFT_LOCAL.copy(RIG_VIEW)
      .cross(THREE.Object3D.DEFAULT_UP)
      .normalize()
      .negate()
      .applyQuaternion(Q)
    const alongX = Math.abs(LEFT_LOCAL.x) >= Math.abs(LEFT_LOCAL.y)
    P.set(
      ldef.center[0] + (alongX ? Math.sign(LEFT_LOCAL.x) * ldef.half[0] : 0),
      ldef.center[1] + (alongX ? 0 : Math.sign(LEFT_LOCAL.y) * ldef.half[1]),
      ldef.center[2],
    ).applyMatrix4(layerWorld(hero, lpose))
    slot.x = P.x
    slot.y = P.y
    slot.z = P.z
    slot.on = open
  }
  // Presented layer's world AABB (its subject box at the current pose).
  const b = bridge.bounds
  if (def === undefined || pose === undefined) {
    b.on = false
    return
  }
  const m = layerWorld(hero, pose)
  b.minX = b.minY = b.minZ = Number.POSITIVE_INFINITY
  b.maxX = b.maxY = b.maxZ = Number.NEGATIVE_INFINITY
  for (let k = 0; k < 8; k++) {
    P.set(
      def.center[0] + (k & 1 ? def.half[0] : -def.half[0]),
      def.center[1] + (k & 2 ? def.half[1] : -def.half[1]),
      def.center[2] + (k & 4 ? def.half[2] : -def.half[2]),
    ).applyMatrix4(m)
    b.minX = Math.min(b.minX, P.x)
    b.minY = Math.min(b.minY, P.y)
    b.minZ = Math.min(b.minZ, P.z)
    b.maxX = Math.max(b.maxX, P.x)
    b.maxY = Math.max(b.maxY, P.y)
    b.maxZ = Math.max(b.maxZ, P.z)
  }
  b.on = true
}

/** Die lift (m, along the silicon layer's -z) for a silicon focus. */
export function dieLiftFor(show: ShowcaseState): number {
  return show.layer === 5 ? show.focus * SOC_STACK.dieLift : 0
}
