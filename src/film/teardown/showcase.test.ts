import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { computeFilmStates } from '../states.ts'
import { LAYER_GAP } from './layers.ts'
import {
  SHOWCASE_DIM,
  composeLayerPose,
  computeShowcaseState,
  createLayerPoses,
  createRigCamera,
  createShowcaseState,
  layerFocus,
  layerTravel,
  overviewWeight,
  slideDirection,
  solvePresentPose,
  solveShowcaseRig,
  tourCursorAt,
  resolveSlot,
  type ViewSlot,
} from './showcase.ts'
import {
  DEFAULT_SLOT_LANDSCAPE,
  DEFAULT_SLOT_PORTRAIT,
  showcaseBridge,
} from '../overlay/callouts.ts'
import { SHOWCASE_KEYS, SHOWCASE_LAYERS } from './showcaseLayers.ts'
import { heroAt, rigCamera } from './showcaseTestKit.ts'

/** Screen-space box (0..1, y down) of a layer's subject box at a pose. */
function subjectRect(
  index: number,
  pose: { pos: THREE.Vector3; quat: THREE.Quaternion },
  hero: THREE.Matrix4,
  cam: THREE.Camera,
): { x0: number; x1: number; y0: number; y1: number } {
  const def = SHOWCASE_LAYERS[index]!
  const m = new THREE.Matrix4().multiplyMatrices(
    hero,
    new THREE.Matrix4().compose(pose.pos, pose.quat, new THREE.Vector3(1, 1, 1)),
  )
  const r = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }
  for (let k = 0; k < 8; k++) {
    const v = new THREE.Vector3(
      def.center[0] + (k & 1 ? def.half[0] : -def.half[0]),
      def.center[1] + (k & 2 ? def.half[1] : -def.half[1]),
      def.center[2] + (k & 4 ? def.half[2] : -def.half[2]),
    )
      .applyMatrix4(m)
      .project(cam)
    r.x0 = Math.min(r.x0, (v.x + 1) / 2)
    r.x1 = Math.max(r.x1, (v.x + 1) / 2)
    r.y0 = Math.min(r.y0, (1 - v.y) / 2)
    r.y1 = Math.max(r.y1, (1 - v.y) / 2)
  }
  return r
}

describe('showcase timing', () => {
  it('ramps focus 0 at d 0.12, 1 from 0.24 to 0.78, 0 by 0.9', () => {
    expect(layerFocus(0.12)).toBe(0)
    expect(layerFocus(0.24)).toBe(1)
    expect(layerFocus(0.5)).toBe(1)
    expect(layerFocus(0.78)).toBe(1)
    expect(layerFocus(0.9)).toBe(0)
    expect(layerFocus(0.18)).toBeGreaterThan(0)
    expect(layerFocus(0.18)).toBeLessThan(1)
  })

  it('travels out over d 0-0.2, holds to 0.8, returns by 1', () => {
    expect(layerTravel(0)).toBe(0)
    expect(layerTravel(0.1)).toBeCloseTo(0.5, 9)
    expect(layerTravel(0.2)).toBe(1)
    expect(layerTravel(0.8)).toBeCloseTo(1, 9)
    expect(layerTravel(1)).toBe(0)
  })

  it('keeps the e2e card mapping: layer i holds at p = 0.30 + 0.02 i', () => {
    const s = createShowcaseState()
    for (let i = 0; i < 10; i++) {
      computeShowcaseState(s, tourCursorAt(0.3 + 0.02 * i), 1)
      expect(s.layer).toBe(i)
      expect(s.focus).toBe(1)
      expect(s.fly).toBe(1)
    }
  })

  it('holds the overview after the stack opens and before layer 0 arrives', () => {
    expect(computeFilmStates(0.284).stackSeparate).toBe(1)
    for (const p of [0.287, 0.29, 0.295]) {
      expect(overviewWeight(tourCursorAt(p), 1), `p=${p}`).toBe(1)
    }
    expect(overviewWeight(tourCursorAt(0.2975), 1)).toBe(0)
    expect(overviewWeight(tourCursorAt(0.29), 0.5)).toBe(0)
  })

  it('presents one layer at a time and dims every other one', () => {
    const s = createShowcaseState()
    for (let u = -1; u <= 11; u += 0.01) {
      computeShowcaseState(s, u, 1)
      const out = s.layer >= 0 && (s.slide > 0 || s.fly > 0) ? 1 : 0
      expect(out).toBeLessThanOrEqual(1)
      const lit = s.alpha.filter((a) => a > SHOWCASE_DIM + 0.05).length
      if (s.tour > 0.999) expect(lit, `u=${u.toFixed(2)}`).toBeLessThanOrEqual(1)
      if (s.focus > 0) {
        expect(s.alpha[s.layer]).toBe(1)
        for (let i = 0; i < 10; i++) if (i !== s.layer) expect(s.alpha[i]).toBeLessThan(0.2)
      }
    }
  })

  it('names every sub-component key the copy expects', () => {
    // The overlay's contract (round 05 brief), in physical stack order.
    expect(SHOWCASE_KEYS).toEqual([
      'glass.surface',
      'glass.edge',
      'glass.earpiece',
      'display.panel',
      'display.punch',
      'display.flex',
      'display.driver',
      'midframe.rail',
      'midframe.screw',
      'midframe.haptic',
      'midframe.speaker',
      'battery.cell',
      'battery.bms',
      'battery.connector',
      'battery.tabs',
      'board.memory',
      'board.modem',
      'board.pmic',
      'board.port',
      'soc.die',
      'soc.package',
      'soc.bga',
      'soc.caps',
      'thermal.chamber',
      'thermal.graphite',
      'thermal.contact',
      'coil.windings',
      'coil.ferrite',
      'coil.nfc',
      'camera.main',
      'camera.ultra',
      'camera.periscope',
      'camera.tof',
      'rear.finish',
      'rear.window',
      'rear.mark',
    ])
    for (const layer of SHOWCASE_LAYERS) expect(layer.anchors.length).toBeLessThanOrEqual(8)
  })
})

describe('showcase framing (slot fit, subject boxes)', () => {
  const s = createShowcaseState()
  const rig = createRigCamera()
  const present = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }
  const dir = new THREE.Vector3()

  function presented(i: number, aspect: number, slot: ViewSlot) {
    const p = 0.305 + 0.02 * i
    const hero = heroAt(p)
    computeShowcaseState(s, tourCursorAt(p), 1)
    solveShowcaseRig(rig, hero, 1, LAYER_GAP, aspect, s)
    solvePresentPose(present, SHOWCASE_LAYERS[i]!, rig, hero, 0.5, slot)
    slideDirection(dir, rig, hero)
    const pose = createLayerPoses()[i]!
    composeLayerPose(pose, i, 1, LAYER_GAP, s.slide, s.fly, present, dir)
    return subjectRect(i, pose, hero, rigCamera(rig))
  }

  it('centres each layer in the slot and fits it, capped at 60% / 42% of the height', () => {
    const slots: Array<[number, ViewSlot, number]> = [
      [1.6, DEFAULT_SLOT_LANDSCAPE, 0.6],
      [1280 / 720, { x0: 0.33, x1: 0.9, y0: 0.12, y1: 0.86 }, 0.6],
      [390 / 844, DEFAULT_SLOT_PORTRAIT, 0.42],
    ]
    for (const [aspect, slot, cap] of slots) {
      for (let i = 0; i < 10; i++) {
        const r = presented(i, aspect, slot)
        const tag = `layer ${i} @${aspect.toFixed(2)}`
        expect(r.x0, tag).toBeGreaterThan(slot.x0 - 0.02)
        expect(r.x1, tag).toBeLessThan(slot.x1 + 0.02)
        expect(r.y0, tag).toBeGreaterThan(slot.y0 - 0.02)
        expect(r.y1, tag).toBeLessThan(slot.y1 + 0.02)
        expect(Math.max(r.y1 - r.y0, (r.x1 - r.x0) * aspect), tag).toBeLessThan(cap + 0.02)
      }
    }
  })

  it('reads the overlay slot once it is set, the defaults before', () => {
    const out = { x0: 0, x1: 0, y0: 0, y1: 0 }
    expect(resolveSlot(out, 1.6)).toEqual(DEFAULT_SLOT_LANDSCAPE)
    expect(resolveSlot(out, 0.5)).toEqual(DEFAULT_SLOT_PORTRAIT)
    Object.assign(showcaseBridge.slot, { x0: 0.3, x1: 0.9, y0: 0.1, y1: 0.9, set: true })
    expect(resolveSlot(out, 1.6)).toEqual({ x0: 0.3, x1: 0.9, y0: 0.1, y1: 0.9 })
    showcaseBridge.slot.set = false
  })
})
