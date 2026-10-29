import { describe, expect, it } from 'vitest'
import { scrambleFrame } from './scramble.ts'

describe('scrambleFrame', () => {
  it('ends on the real text and starts fully churned', () => {
    expect(scrambleFrame('50 MP', 1)).toBe('50 MP')
    const first = scrambleFrame('4,000 mAh', 0)
    expect(first).not.toBe('4,000 mAh')
    expect(first).toHaveLength('4,000 mAh'.length)
  })

  it('keeps layout characters fixed so the width never jumps', () => {
    for (let t = 0; t < 1; t += 0.05) {
      const frame = scrambleFrame('2,800 nits', t, 7)
      expect(frame).toHaveLength(10)
      expect(frame[1]).toBe(',')
      expect(frame[5]).toBe(' ')
    }
  })

  it('resolves left to right', () => {
    const text = 'NEURAL ENGINE'
    const lockedAt = (i: number): number => {
      for (let t = 0; t <= 1; t += 0.01) {
        if (scrambleFrame(text, t, 3)[i] === text[i]) {
          let stays = true
          for (let u = t; u <= 1; u += 0.01)
            if (scrambleFrame(text, u, 3)[i] !== text[i]) stays = false
          if (stays) return t
        }
      }
      return 1
    }
    expect(lockedAt(0)).toBeLessThan(lockedAt(12))
  })

  it('is deterministic for a given time and seed', () => {
    expect(scrambleFrame('46 TOPS', 0.4, 5)).toBe(scrambleFrame('46 TOPS', 0.4, 5))
  })
})
