import { describe, expect, it } from 'vitest'
import { batteryFitWeight, portraitWeight } from './portrait.ts'

describe('portrait placement weight', () => {
  it('applies wherever the phone poses', () => {
    for (const p of [0.02, 0.05, 0.12, 0.2, 0.56, 0.78, 0.865, 0.94, 0.962, 0.99]) {
      expect(portraitWeight(p), `p=${p}`).toBe(1)
    }
  })

  it('leaves the teardown, the camera macro dive and the battery x-ray to their own framing', () => {
    for (const p of [0.26, 0.3, 0.4, 0.5, 0.62, 0.68, 0.71, 0.9, 0.92]) {
      expect(portraitWeight(p), `p=${p}`).toBe(0)
    }
  })

  it('eases across every edge (no steps, pure in progress)', () => {
    let prev = portraitWeight(0)
    let prevCell = batteryFitWeight(0)
    for (let i = 1; i <= 10000; i++) {
      const w = portraitWeight(i / 10000)
      const cell = batteryFitWeight(i / 10000)
      expect(Math.abs(w - prev)).toBeLessThan(0.02)
      expect(Math.abs(cell - prevCell)).toBeLessThan(0.02)
      prev = w
      prevCell = cell
    }
  })

  it('fits the battery cell only while the x-ray shows', () => {
    for (const p of [0.9, 0.91, 0.92]) expect(batteryFitWeight(p), `p=${p}`).toBe(1)
    for (const p of [0.86, 0.88, 0.94, 0.96]) expect(batteryFitWeight(p), `p=${p}`).toBe(0)
  })
})
