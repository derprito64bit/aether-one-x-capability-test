import { describe, expect, it } from 'vitest'
import { LOAD_ORDER, LOAD_WEIGHTS, LoadTracker } from './loadTracker.ts'

describe('LoadTracker', () => {
  it('weights cover the whole bar exactly', () => {
    const total = LOAD_ORDER.reduce((sum, s) => sum + LOAD_WEIGHTS[s], 0)
    expect(total).toBeCloseTo(1, 10)
  })

  it('only moves the floor when a real milestone finishes', () => {
    const t = new LoadTracker()
    expect(t.value()).toBe(0)
    expect(t.complete()).toBe(false)
    t.mark('shell')
    expect(t.value()).toBeCloseTo(LOAD_WEIGHTS.shell, 10)
    t.mark('shell')
    expect(t.value()).toBeCloseTo(LOAD_WEIGHTS.shell, 10)
  })

  it('never lets the ceiling fall below the floor, and reaches 1 only when complete', () => {
    const t = new LoadTracker()
    let last = 0
    for (const stage of LOAD_ORDER) {
      expect(t.ceiling()).toBeGreaterThanOrEqual(t.value())
      t.mark(stage)
      expect(t.value()).toBeGreaterThan(last)
      last = t.value()
    }
    expect(t.complete()).toBe(true)
    expect(t.value()).toBeCloseTo(1, 10)
    expect(t.label()).toBe('Ready')
  })

  it('names the first pending milestone, out-of-order marks included', () => {
    const t = new LoadTracker()
    expect(t.label()).toBe('Opening')
    t.mark('engine')
    expect(t.label()).toBe('Opening')
    t.mark('shell')
    t.mark('fonts')
    expect(t.label()).toBe('Starting the renderer')
  })
})
