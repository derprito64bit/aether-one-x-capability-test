import { describe, expect, it } from 'vitest'
import { ACTS } from '../timeline.ts'
import {
  ACT_SCENE,
  SCENE_FADE,
  SCENE_IDS,
  darkWeight,
  figureWeight,
  sceneWeights,
  studioWeight,
} from './scenes.ts'

const out = new Float32Array(SCENE_IDS.length)
const weightOf = (p: number, id: string): number =>
  sceneWeights(p, out)[SCENE_IDS.indexOf(id as never)] ?? 0

describe('section scenes', () => {
  it('weights always sum to one', () => {
    for (let p = 0; p <= 1; p += 0.0007) {
      const sum = sceneWeights(p, out).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 5)
    }
  })

  it('every act sits fully in its own scene mid-act', () => {
    for (const act of ACTS) {
      const mid = (act.start + act.end) / 2
      expect(weightOf(mid, ACT_SCENE[act.id]), act.id).toBeCloseTo(1, 6)
    }
  })

  it('crossfades only around boundaries, continuously', () => {
    let last = studioWeight(0)
    for (let p = 0; p <= 1; p += 0.0002) {
      const w = studioWeight(p)
      expect(Math.abs(w - last)).toBeLessThan(0.06)
      last = w
    }
    // Teardown is studio throughout, the camera act is a dark room.
    expect(studioWeight(0.4)).toBe(1)
    expect(darkWeight(0.6)).toBe(1)
    // Half way across the teardown/camera boundary.
    expect(studioWeight(0.52)).toBeCloseTo(0.5, 5)
    expect(studioWeight(0.52 - SCENE_FADE)).toBe(1)
    expect(studioWeight(0.52 + SCENE_FADE)).toBe(0)
  })

  it('runs dark from the camera to the AI act, light around it', () => {
    expect(darkWeight(0.05)).toBe(0)
    expect(darkWeight(0.4)).toBe(0)
    for (const p of [0.6, 0.78, 0.865, 0.91, 0.94, 0.962]) expect(darkWeight(p)).toBe(1)
    expect(darkWeight(0.99)).toBe(0)
  })
})

describe('figureWeight', () => {
  it('shows figures one at a time, in order, across the act', () => {
    for (let t = 0; t <= 1; t += 0.002) {
      const w = [0, 1, 2].map((k) => figureWeight(t, k, 3))
      expect(w.filter((x) => x > 0).length, `t=${t}`).toBeLessThanOrEqual(1)
    }
    expect(figureWeight(0.15, 0, 3)).toBe(1)
    expect(figureWeight(0.5, 1, 3)).toBe(1)
    expect(figureWeight(0.95, 2, 3)).toBe(1)
    expect(figureWeight(0.4, 0, 1)).toBe(1)
  })
})
