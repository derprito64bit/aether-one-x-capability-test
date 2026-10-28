import { describe, expect, it } from 'vitest'
import { TEARDOWN_LAYERS } from '../teardown/layers.ts'
import { applyScrim, contrastRatio, scrimForStage, stageColors } from './stageColors.ts'

/** Stage colour journey (Prompt D section 8.2): continuous and reversible. */
describe('stageColors', () => {
  it('starts at the arrival base and ends at the final base', () => {
    const start = stageColors(0).base.getHexString()
    const end = stageColors(1).base.getHexString()
    expect(start).toBe('dedad1')
    expect(end).toBe('e1ddd4')
  })

  it('makes the display act the brightest stage in the film', () => {
    const luminance = (hex: string): number => {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const display = luminance(stageColors(0.78).base.getHexString())
    for (const p of [0, 0.1, 0.3, 0.45, 0.6, 0.9, 1]) {
      expect(display).toBeGreaterThan(luminance(stageColors(p).base.getHexString()))
    }
  })

  it('reverses exactly for the reverse scrub', () => {
    for (const p of [0, 0.13, 0.27, 0.4, 0.55, 0.72, 0.86, 0.99, 1]) {
      const a = stageColors(p).base.getHexString()
      const b = stageColors(p).base.getHexString()
      expect(a).toBe(b)
      expect(stageColors(p).top.getHexString()).toBe(stageColors(p).top.getHexString())
    }
  })

  it('clears text contrast at 24 points across the film (Prompt D 11)', () => {
    // Primary text 4.5:1, headline 7:1, over the scrimmed stage.
    for (let i = 0; i < 24; i++) {
      const p = i / 23
      const base = `#${stageColors(p).base.getHexString()}`
      const top = `#${stageColors(p).top.getHexString()}`
      for (const backdrop of [base, top]) {
        const effective = applyScrim(backdrop, scrimForStage(backdrop))
        expect(contrastRatio('#f2f2f4', effective), `ink at p=${p}`).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio('#f2f2f4', effective), `headline at p=${p}`).toBeGreaterThanOrEqual(7)
        expect(contrastRatio('#9c9da7', effective), `dim at p=${p}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('has no step at the teardown boundaries (round 01 A1)', () => {
    // A hard step is two orders of magnitude above any eased slope, so the
    // reference is the worst per-step delta anywhere else on the film.
    const channels = (p: number): number[] => {
      const s = stageColors(p)
      return [s.base.r, s.base.g, s.base.b, s.top.r, s.top.g, s.top.b]
    }
    const inBoundary = (p: number): boolean => (p >= 0.24 && p <= 0.26) || (p >= 0.51 && p <= 0.53)
    const maxStep = (from: number, to: number): number => {
      let prev = channels(from)
      let worst = 0
      for (let p = from + 1e-4; p <= to + 1e-9; p += 1e-4) {
        const cur = channels(p)
        for (let k = 0; k < 6; k++) worst = Math.max(worst, Math.abs(cur[k]! - prev[k]!))
        prev = cur
      }
      return worst
    }
    let reference = 0
    let prev = channels(0)
    for (let i = 1; i <= 10000; i++) {
      const p = i / 10000
      if (inBoundary(p) || inBoundary(p - 1e-4)) {
        prev = channels(p)
        continue
      }
      const cur = channels(p)
      for (let k = 0; k < 6; k++) reference = Math.max(reference, Math.abs(cur[k]! - prev[k]!))
      prev = cur
    }
    expect(maxStep(0.24, 0.26)).toBeLessThanOrEqual(reference)
    expect(maxStep(0.51, 0.53)).toBeLessThanOrEqual(reference)
  })

  it('clears every layer accent 3:1 against its own stage range', () => {
    // Accents light the rim and draw a rule; they never carry text (text
    // wears ink per the dataviz rule), so the technical 3:1 floor applies,
    // not the 4.5 text gate. Accents only appear during teardown.
    for (let i = 0; i <= 20; i++) {
      const p = 0.25 + (i / 20) * 0.27
      const base = `#${stageColors(p).base.getHexString()}`
      const effective = applyScrim(base, scrimForStage(base))
      for (const layer of TEARDOWN_LAYERS) {
        expect(
          contrastRatio(layer.accent, effective),
          `${layer.id} accent at p=${p}`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
