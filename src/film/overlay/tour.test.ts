import { describe, expect, it } from 'vitest'
import {
  HOLD_IN,
  HOLD_OUT,
  TOUR_START,
  TOUR_STEP,
  holdTarget,
  playRate,
  rawCursor,
} from './tour.ts'

const at = (cursor: number): number => TOUR_START + cursor * TOUR_STEP

describe('teardown tour', () => {
  it('reads the span off the layer cursor', () => {
    expect(TOUR_STEP).toBeCloseTo(0.02, 9)
    expect(TOUR_START).toBeCloseTo(0.295, 9)
    expect(rawCursor(at(3.5))).toBeCloseTo(3.5, 9)
  })

  it('leaves a resting scroll alone inside a hold', () => {
    for (let i = 0; i < 10; i++) {
      expect(holdTarget(at(i + 0.5), 1)).toBeNull()
      expect(holdTarget(at(i + HOLD_IN + 1e-6), -1)).toBeNull()
      expect(holdTarget(at(i + HOLD_OUT - 1e-6), 1)).toBeNull()
    }
    // The e2e fast-jump table lands every layer inside its hold.
    for (let i = 0; i < 10; i++) expect(holdTarget(0.3 + 0.02 * i, 1)).toBeNull()
  })

  it('completes a move in the direction of travel', () => {
    // Arriving at layer 3, scrolling down: settle into its hold.
    expect(rawCursor(holdTarget(at(3.1), 1) ?? 0)).toBeCloseTo(3.28, 6)
    // Leaving layer 3, scrolling down: turn the page to layer 4.
    expect(rawCursor(holdTarget(at(3.9), 1) ?? 0)).toBeCloseTo(4.28, 6)
    // Scrolling up through the same spots goes back instead.
    expect(rawCursor(holdTarget(at(3.9), -1) ?? 0)).toBeCloseTo(3.72, 6)
    expect(rawCursor(holdTarget(at(3.1), -1) ?? 0)).toBeCloseTo(2.72, 6)
  })

  it('never settles outside the tour', () => {
    expect(holdTarget(at(-0.5), 1)).toBeNull()
    expect(holdTarget(at(0.1), -1)).toBeNull()
    expect(holdTarget(at(9.9), 1)).toBeNull()
    expect(holdTarget(at(10.2), -1)).toBeNull()
  })

  it('plays four seconds a layer', () => {
    expect(TOUR_STEP / playRate(at(2))).toBeCloseTo(4, 6)
    expect(playRate(0.26)).toBeGreaterThan(playRate(at(2)))
  })
})
