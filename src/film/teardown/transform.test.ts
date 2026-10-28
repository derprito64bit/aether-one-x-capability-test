import { Group } from 'three'
import { describe, expect, it } from 'vitest'
import { LAYER_GAP, TEARDOWN_LAYERS, layerOffset, peelLocal } from './layers.ts'
import { CAMERA_SLIDE, applyLayerTransform, cameraFeature, cameraPhases } from './transform.ts'

/** Shared layer transform (round 03 A.6.4): one helper, both drivers. */
describe('applyLayerTransform', () => {
  it('rests exactly at zero separation', () => {
    for (const index of [0, 5, 9]) {
      const g = new Group()
      g.position.set(0.3, -0.2, 0.1)
      g.rotation.set(1, 2, 3)
      g.scale.setScalar(2)
      applyLayerTransform(g, TEARDOWN_LAYERS[index]!, 0, LAYER_GAP, 1)
      expect(g.position.length()).toBeLessThan(1e-9)
      expect(g.rotation.x).toBe(0)
      expect(g.rotation.y).toBe(0)
      expect(g.rotation.z).toBe(0)
      expect(g.scale.x).toBe(1)
    }
  })

  it('lands on the peel slot at full separation', () => {
    for (let i = 0; i < 10; i++) {
      const g = new Group()
      applyLayerTransform(g, TEARDOWN_LAYERS[i]!, 1, LAYER_GAP, 1)
      expect(g.position.x).toBe(0)
      if (i !== 8) expect(g.position.y).toBe(0)
      expect(g.position.z).toBeCloseTo(layerOffset(i, 10, LAYER_GAP, 1), 12)
    }
  })

  it('honours the module slot override for nested groups', () => {
    const g = new Group()
    applyLayerTransform(g, TEARDOWN_LAYERS[8]!, 1, LAYER_GAP, 1, 0.0123)
    expect(g.position.z).toBeCloseTo(0.0123, 12)
  })

  it('keeps every layer unrotated except the parking camera module', () => {
    for (let i = 0; i < 10; i++) {
      if (i === 8) continue
      const g = new Group()
      applyLayerTransform(g, TEARDOWN_LAYERS[i]!, 0.63, LAYER_GAP, 1)
      expect(g.rotation.x).toBe(0)
      expect(g.rotation.y).toBe(0)
      expect(g.rotation.z).toBe(0)
      expect(g.scale.x).toBe(1)
    }
  })

  it('rides its slot face-down through the peel, turning only in its own beat', () => {
    // Full separation, outside the camera beat: on the slot, unturned.
    const parked = new Group()
    applyLayerTransform(parked, TEARDOWN_LAYERS[8]!, 1, LAYER_GAP, 1)
    expect(parked.rotation.x).toBe(0)
    expect(parked.position.x).toBe(0)
    expect(parked.position.z).toBeCloseTo(layerOffset(8, 10, LAYER_GAP, 1), 12)
    // Mid-peel: never turned (a turn in the stack swept the 47mm module
    // edge-on through its neighbours).
    for (const sep of [0.2, 0.5, 0.8]) {
      const g = new Group()
      applyLayerTransform(g, TEARDOWN_LAYERS[8]!, sep, LAYER_GAP, 1)
      expect(g.rotation.x).toBe(0)
    }
    // In its beat: slid clear of the stack, then lens-up about the pivot.
    const g = new Group()
    applyLayerTransform(g, TEARDOWN_LAYERS[8]!, 1, LAYER_GAP, 1, undefined, {
      feature: cameraFeature(8.5),
    })
    expect(g.rotation.x).toBeCloseTo(Math.PI, 12)
    expect(g.position.x).toBeCloseTo(CAMERA_SLIDE, 12)
    expect(g.position.y).toBeCloseTo(2 * 0.0458, 12)
    expect(g.position.z).toBeCloseTo(layerOffset(8, 10, LAYER_GAP, 1), 12)
    // Slide completes before the turn starts, so it turns clear in plan.
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const ph = cameraPhases(f)
      if (ph.turn > 0) expect(ph.slide).toBe(1)
    }
    const rest = new Group()
    applyLayerTransform(rest, TEARDOWN_LAYERS[8]!, 0, LAYER_GAP, 1)
    expect(rest.rotation.x).toBe(0)
    expect(rest.position.length()).toBeLessThan(1e-9)
  })

  it('adds act lifts to the goal, never to the damped position', () => {
    const layer = TEARDOWN_LAYERS[5]!
    const g = new Group()
    const goal = layerOffset(5, 10, LAYER_GAP, 1) - 0.004
    for (let k = 0; k < 300; k++) {
      applyLayerTransform(g, layer, 1, LAYER_GAP, 0.06, undefined, { liftZ: -0.004 })
    }
    expect(g.position.z).toBeCloseTo(goal, 9)
  })

  it('peels outside-in: both faces lead mid-separation', () => {
    const a = new Group()
    const b = new Group()
    const inner = new Group()
    applyLayerTransform(a, TEARDOWN_LAYERS[0]!, 0.3, LAYER_GAP, 1)
    applyLayerTransform(b, TEARDOWN_LAYERS[9]!, 0.3, LAYER_GAP, 1)
    applyLayerTransform(inner, TEARDOWN_LAYERS[5]!, 0.3, LAYER_GAP, 1)
    expect(a.position.z).toBeGreaterThan(0)
    expect(b.position.z).toBeLessThan(0)
    expect(a.position.z).toBeCloseTo(-b.position.z, 12)
    expect(Math.abs(inner.position.z)).toBeLessThan(Math.abs(b.position.z))
    expect(a.position.z).toBeCloseTo(layerOffset(0, 10, LAYER_GAP, peelLocal(0.3, 0)), 12)
  })

  it('is deterministic and reversible from the same inputs', () => {
    const layer = TEARDOWN_LAYERS[3]!
    const a = new Group()
    const b = new Group()
    applyLayerTransform(a, layer, 0.7, LAYER_GAP, 0.5)
    applyLayerTransform(b, layer, 0.7, LAYER_GAP, 0.5)
    expect(a.position.equals(b.position)).toBe(true)
    expect(a.scale.equals(b.scale)).toBe(true)
  })

  it('snaps past 10mm instead of lag-flinging on flicks (overnight fix)', () => {
    const layer = TEARDOWN_LAYERS[5]!
    // Far from goal with weak damp: lands exactly, no lag pile-up.
    const far = new Group()
    far.position.set(0.5, -0.3, 0.2)
    applyLayerTransform(far, layer, 1, LAYER_GAP, 0.05)
    expect(far.position.z).toBeCloseTo(layerOffset(5, 10, LAYER_GAP, 1), 12)
    // Near goal with weak damp: still glides (no snap, no pop).
    const goal = layerOffset(5, 10, LAYER_GAP, 1)
    const near = new Group()
    near.position.set(0, 0, goal - 0.005)
    applyLayerTransform(near, layer, 1, LAYER_GAP, 0.05)
    expect(near.position.z).toBeGreaterThan(goal - 0.005)
    expect(near.position.z).toBeLessThan(goal)
  })
})
