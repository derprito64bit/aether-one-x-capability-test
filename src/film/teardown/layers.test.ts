import { describe, expect, it } from 'vitest'
import { EXPLODE_PARTS } from '../internals/explode.ts'
import {
  LAYER_GAP,
  TEARDOWN_LAYERS,
  cursorAt,
  layerOffset,
  peelLocal,
  weightDamp,
} from './layers.ts'

/** Teardown manifest (Prompt D section 4): ten layers, honest stack order. */
describe('teardown layers', () => {
  it('lists ten layers front to back with silicon at the midpoint', () => {
    expect(TEARDOWN_LAYERS).toHaveLength(10)
    expect(TEARDOWN_LAYERS.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(TEARDOWN_LAYERS[5]?.id).toBe('silicon')
    expect(TEARDOWN_LAYERS[0]?.id).toBe('cover-glass')
    expect(TEARDOWN_LAYERS[9]?.id).toBe('rear-panel')
  })

  it('covers every explode registry part exactly once', () => {
    const covered = new Set<string>()
    for (const layer of TEARDOWN_LAYERS) {
      for (const part of layer.parts) {
        expect(covered.has(part), `duplicate ${part}`).toBe(false)
        covered.add(part)
      }
    }
    // Registry ids not carried by a layer would never move in teardown.
    const uncovered = EXPLODE_PARTS.map((p) => p.id).filter((id) => !covered.has(id))
    expect(uncovered).toEqual([])
  })

  it('separates symmetrically about the body centre, front layers toward +z', () => {
    // Cover glass lifts toward the front (+z), rear panel drops back: the
    // physical order. The sign was once inverted (glass swept through all).
    expect(layerOffset(0, 10, LAYER_GAP, 1)).toBeCloseTo(4.5 * LAYER_GAP, 9)
    expect(layerOffset(9, 10, LAYER_GAP, 1)).toBeCloseTo(-4.5 * LAYER_GAP, 9)
    expect(layerOffset(0, 10, LAYER_GAP, 1) + layerOffset(9, 10, LAYER_GAP, 1)).toBeCloseTo(0, 9)
    expect(layerOffset(4, 10, LAYER_GAP, 0)).toBeCloseTo(0, 12)
  })

  it('peels outside-in: both faces lead, the middle pair lands last', () => {
    // All parked at sep 0, all landed at sep 1.
    for (let i = 0; i < 10; i++) {
      expect(peelLocal(0, i)).toBe(0)
      expect(peelLocal(1, i)).toBe(1)
    }
    // Mid-peel each face is further along than the layers inside it, and
    // the two halves mirror each other.
    expect(peelLocal(0.3, 0)).toBeGreaterThan(peelLocal(0.3, 4))
    expect(peelLocal(0.3, 9)).toBeGreaterThan(peelLocal(0.3, 5))
    expect(peelLocal(0.3, 0)).toBe(peelLocal(0.3, 9))
    expect(peelLocal(0.3, 4)).toBe(peelLocal(0.3, 5))
    // The middle pair lands exactly at full separation, not before.
    expect(peelLocal(0.99, 4)).toBeLessThan(1)
    expect(peelLocal(1, 4)).toBe(1)
    // Clamps, never NaN: scrubbing past the ends is safe.
    expect(peelLocal(-0.5, 3)).toBe(0)
    expect(peelLocal(1.5, 3)).toBe(1)
  })

  it('moves heavy layers slower than light ones', () => {
    expect(weightDamp('heavy')).toBeLessThan(weightDamp('medium'))
    expect(weightDamp('medium')).toBeLessThan(weightDamp('light'))
  })

  it('sizes every featured subject for the macro floor (round 01 A4)', () => {
    for (const layer of TEARDOWN_LAYERS) {
      expect(layer.featureHalfM, layer.id).toBeGreaterThan(0)
      expect(layer.featureHalfM, layer.id).toBeLessThanOrEqual(0.08)
    }
    const byId = (id: string): number => TEARDOWN_LAYERS.find((l) => l.id === id)?.featureHalfM ?? 0
    // Silicon keeps the old die-sized floor; the board sets the widest.
    expect(byId('silicon')).toBe(0.0125)
    expect(byId('logic-board')).toBeGreaterThan(byId('silicon'))
    expect(byId('cover-glass')).toBe(0.08)
  })

  it('runs the cursor 0 to 10 across the feature run', () => {
    expect(cursorAt(0.29)).toBe(0)
    expect(cursorAt(0.305)).toBeCloseTo(0.5, 2)
    expect(cursorAt(0.495)).toBe(10)
    expect(cursorAt(0.6)).toBe(10)
  })

  it('travels continuously with separation, no jumps (round 01 A7)', () => {
    // No tumble, no overshoot, no binary teleport: every layer moves
    // continuously with sep so scrubbing stays exact in both directions.
    for (let i = 0; i < 10; i++) {
      let prev = -1
      for (let s = 0; s <= 100; s++) {
        const v = peelLocal(s / 100, i)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
        if (prev >= 0) expect(Math.abs(v - prev)).toBeLessThan(0.05)
        prev = v
      }
    }
  })

  it('keeps every accent distinct', () => {
    const accents = TEARDOWN_LAYERS.map((l) => l.accent)
    expect(new Set(accents).size).toBe(accents.length)
  })
})
