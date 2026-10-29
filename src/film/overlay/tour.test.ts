import { describe, expect, it } from 'vitest'
import { ACTS } from '../timeline.ts'
import {
  HOLD_IN,
  HOLD_OUT,
  REST_ZONES,
  TOUR_START,
  TOUR_STEP,
  playRate,
  rawCursor,
  restTarget,
} from './tour.ts'

const at = (cursor: number): number => TOUR_START + cursor * TOUR_STEP

describe('teardown tour', () => {
  it('reads the span off the layer cursor', () => {
    expect(TOUR_STEP).toBeCloseTo(0.02, 9)
    expect(TOUR_START).toBeCloseTo(0.295, 9)
    expect(rawCursor(at(3.5))).toBeCloseTo(3.5, 9)
  })

  it('plays four seconds a layer', () => {
    expect(TOUR_STEP / playRate(at(2))).toBeCloseTo(4, 6)
    expect(playRate(0.26)).toBeGreaterThan(playRate(at(2)))
  })
})

describe('film rest map', () => {
  it('lists zones in order, never overlapping', () => {
    for (let i = 1; i < REST_ZONES.length; i++) {
      const a = REST_ZONES[i - 1]
      const b = REST_ZONES[i]
      expect(a?.[1] ?? 0).toBeLessThan(b?.[0] ?? 0)
    }
    expect(REST_ZONES[0]?.[0]).toBe(0)
    expect(REST_ZONES[REST_ZONES.length - 1]?.[1]).toBe(1)
  })

  it('leaves a scroll at rest inside any zone', () => {
    for (const act of ACTS) {
      if (act.id === 'teardown') continue
      expect(restTarget((act.start + act.end) / 2, 1), act.id).toBeNull()
    }
    for (let i = 0; i < 10; i++) {
      expect(restTarget(at(i + 0.5), 1)).toBeNull()
      expect(restTarget(at(i + HOLD_IN + 1e-4), -1)).toBeNull()
      expect(restTarget(at(i + HOLD_OUT - 1e-4), 1)).toBeNull()
    }
    // The e2e card jumps land in holds (d = 0.25 is mid-arrival now, but
    // those jumps are scripted, so they never settle).
    expect(restTarget(0, 1)).toBeNull()
    expect(restTarget(1, -1)).toBeNull()
  })

  it('completes a move between sections in the direction of travel', () => {
    // Just past the settle/approach boundary, scrolling down: into approach.
    const fwd = restTarget(0.156, 1) ?? 0
    expect(fwd).toBeGreaterThan(0.156)
    expect(restTarget(fwd, 1)).toBeNull()
    // Same spot scrolling up: back to the end of settle's zone.
    const back = restTarget(0.156, -1) ?? 1
    expect(back).toBeLessThan(0.155)
    expect(restTarget(back, -1)).toBeNull()
    // Mid-flight in the teardown: turn the page to the next layer.
    expect(rawCursor(restTarget(at(3.85), 1) ?? 0)).toBeGreaterThan(4 + HOLD_IN)
    expect(rawCursor(restTarget(at(3.85), -1) ?? 0)).toBeLessThan(3 + HOLD_OUT)
    // The teardown's opening (lay down, peel, overview) can be scrubbed
    // slowly: no settle mid-peel, in either direction.
    expect(restTarget(0.275, 1)).toBeNull()
    expect(restTarget(0.275, -1)).toBeNull()
    // Leaving the overview toward layer 0 completes into its hold.
    expect(rawCursor(restTarget(at(0.1), 1) ?? 0)).toBeGreaterThan(HOLD_IN)
  })
})
