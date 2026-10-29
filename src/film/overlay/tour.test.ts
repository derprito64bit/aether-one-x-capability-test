import { describe, expect, it } from 'vitest'
import { ACTS } from '../timeline.ts'
import {
  FILM_STOPS,
  TOUR_END,
  TOUR_START,
  TOUR_STEP,
  actRestStart,
  nextStop,
  playRate,
  rawCursor,
  stopDurationMs,
} from './tour.ts'

const at = (cursor: number): number => TOUR_START + cursor * TOUR_STEP
const actOf = (p: number): string | undefined =>
  ACTS.find((a) => p >= a.start && p < a.end)?.id ?? (p >= 1 ? 'final' : undefined)

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

describe('film stops', () => {
  it('runs in order through every act, ending on the open fan', () => {
    for (let i = 1; i < FILM_STOPS.length; i++) {
      expect(FILM_STOPS[i] ?? 0).toBeGreaterThan(FILM_STOPS[i - 1] ?? 0)
    }
    const acts = new Set(FILM_STOPS.map(actOf))
    for (const act of ACTS) expect(acts.has(act.id), act.id).toBe(true)
    expect(FILM_STOPS[0]).toBe(0)
    expect(FILM_STOPS[FILM_STOPS.length - 1] ?? 0).toBeGreaterThan(0.99)
  })

  it('stops on every teardown layer mid-hold', () => {
    for (let i = 0; i < 10; i++) {
      expect(
        FILM_STOPS.some((s) => Math.abs(rawCursor(s) - (i + 0.5)) < 1e-9),
        `layer ${i}`,
      ).toBe(true)
    }
  })

  it('carries a gesture to the next stop, either way', () => {
    // Mid-way through an act, scrolling on: the next composed moment.
    const s = nextStop(0.6, 1) ?? 0
    expect(s).toBeGreaterThan(0.6)
    expect(FILM_STOPS).toContain(s)
    // Sitting on a stop never re-targets it.
    const here = FILM_STOPS[5] ?? 0
    expect(nextStop(here, 1)).toBe(FILM_STOPS[6])
    expect(nextStop(here, -1)).toBe(FILM_STOPS[4])
    // Layer to layer.
    expect(rawCursor(nextStop(at(3.5), 1) ?? 0)).toBeCloseTo(4.5, 9)
    expect(rawCursor(nextStop(at(3.5), -1) ?? 0)).toBeCloseTo(2.5, 9)
    // Off the ends: the page takes over.
    expect(nextStop(0.999, 1)).toBeNull()
    expect(nextStop(0, -1)).toBeNull()
  })

  it('plays teardown layers slowly and longer stretches for longer', () => {
    expect(stopDurationMs(at(3.5), at(4.5))).toBe(1800)
    expect(stopDurationMs(0.5, 0.6)).toBeGreaterThan(stopDurationMs(0.5, 0.52))
    expect(stopDurationMs(0, 1)).toBe(3200)
    expect(TOUR_END).toBeCloseTo(0.495, 9)
  })

  it("lands act jumps on each act's first stop", () => {
    for (const act of ACTS) {
      const s = actRestStart(act.id)
      expect(actOf(s), act.id).toBe(act.id)
      expect(FILM_STOPS).toContain(s)
    }
  })
})
