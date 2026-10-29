import { describe, expect, it } from 'vitest'
import { easeInOutCubic, pageSettleTarget, settleDuration } from './settle.ts'

const VH = 900
// A tall film runway, then a buy deck, then a short band.
const PAGE = [
  { top: 0, height: 28000 },
  { top: 28000, height: 1400 },
  { top: 29400, height: 500 },
]

describe('page settle', () => {
  it('brings the next section in once it shows in the upper 85%', () => {
    expect(pageSettleTarget(PAGE, 28000 - VH * 0.45, VH, 1)).toBe(28000)
    expect(pageSettleTarget(PAGE, 28000 - VH * 0.8, VH, 1)).toBe(28000)
    // Barely peeking at the very bottom: leave the reader alone.
    expect(pageSettleTarget(PAGE, 28000 - VH * 0.92, VH, 1)).toBeNull()
  })

  it('takes the reader back when they scroll up into the previous section', () => {
    // The runway (taller than a screen) ends at the viewport bottom.
    expect(pageSettleTarget(PAGE, 28000 - VH * 0.5, VH, -1)).toBe(28000 - VH)
    // The buy deck is taller than a screen too: its end comes back.
    expect(pageSettleTarget(PAGE, 29400 - VH * 0.6, VH, -1)).toBe(29400 - VH)
    // A short previous section comes back whole, from its top.
    const short = [
      { top: 0, height: 1000 },
      { top: 1000, height: 500 },
      { top: 1500, height: 2000 },
    ]
    expect(pageSettleTarget(short, 1500 - VH * 0.6, VH, -1)).toBe(1000)
  })

  it('never moves a reader in the middle of a long section', () => {
    expect(pageSettleTarget(PAGE, 12000, VH, 1)).toBeNull()
    expect(pageSettleTarget(PAGE, 12000, VH, -1)).toBeNull()
    expect(pageSettleTarget(PAGE, 28000, VH, 1)).toBeNull()
  })
})

describe('settle motion', () => {
  it('eases in and out', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 9)
    expect(easeInOutCubic(0.05)).toBeLessThan(0.01)
  })

  it('takes longer for longer moves, within bounds', () => {
    expect(settleDuration(50, VH)).toBeGreaterThanOrEqual(600)
    expect(settleDuration(VH, VH)).toBeGreaterThan(settleDuration(VH / 4, VH))
    expect(settleDuration(10 * VH, VH)).toBe(1500)
  })
})
