import { describe, expect, it } from 'vitest'
import { calloutReveal, resolveColumn, type ColumnLabel } from './callouts.ts'

const labels = (...ys: number[]): ColumnLabel[] => ys.map((y) => ({ y, h: 40 }))

describe('resolveColumn', () => {
  it('leaves labels with room at their anchor heights', () => {
    const column = labels(300, 100, 500)
    resolveColumn(column, 0, 900, 8)
    expect(column.map((l) => l.y)).toEqual([100, 300, 500])
  })

  it('pushes overlapping labels apart by the gap', () => {
    const column = labels(200, 210, 215)
    resolveColumn(column, 0, 900, 8)
    for (let i = 1; i < column.length; i++) {
      const prev = column[i - 1]
      const cur = column[i]
      expect((cur?.y ?? 0) - ((prev?.y ?? 0) + (prev?.h ?? 0))).toBeGreaterThanOrEqual(8)
    }
    expect(column[0]?.y).toBe(200)
  })

  it('keeps a crowded run inside the bounds', () => {
    const column = labels(860, 870, 880)
    resolveColumn(column, 80, 900, 8)
    const last = column[column.length - 1]
    expect((last?.y ?? 0) + (last?.h ?? 0)).toBeLessThanOrEqual(900)
    expect(column[0]?.y ?? 0).toBeGreaterThanOrEqual(80)
    for (let i = 1; i < column.length; i++) {
      expect(column[i]?.y ?? 0).toBeGreaterThan(column[i - 1]?.y ?? 0)
    }
  })
})

describe('calloutReveal', () => {
  it('staggers labels in order and follows focus out', () => {
    expect(calloutReveal(0.3, 0, 1)).toBe(0)
    expect(calloutReveal(0.5, 0, 1)).toBe(1)
    // The fourth label is still arriving when the first is fully in.
    expect(calloutReveal(0.4, 0, 1)).toBe(1)
    expect(calloutReveal(0.4, 3, 1)).toBe(0)
    // All four are in before the hold ends (0.70).
    expect(calloutReveal(0.58, 3, 1)).toBe(1)
    // Everything leaves with the part.
    expect(calloutReveal(0.6, 0, 0.25)).toBeCloseTo(0.25, 5)
  })
})
