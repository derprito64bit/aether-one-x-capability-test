import { describe, expect, it } from 'vitest'
import { lensSeat, lensSpecs, moduleCenter } from './cameraLayout.ts'
import {
  COLLAR,
  FLASH_ARC,
  LENSES,
  LENS_RING_R,
  MEDALLION,
  MODULE,
  MODULE_MIC,
  PERISCOPE,
  TOF,
} from './phoneDimensions.ts'

describe('circular module layout', () => {
  it('centers the module on the body axis in the upper third', () => {
    const center = moduleCenter()
    expect(center.x).toBe(0)
    expect(center.y).toBeGreaterThan(0.03)
    expect(center.y).toBeLessThan(0.06)
    // Commanding but housed: under 65% of body width with 10mm top clearance.
    expect(MODULE.outerR * 2).toBeLessThan(0.65 * 0.0768)
    expect(center.y + MODULE.outerR).toBeLessThan(0.0798 - 0.009)
  })

  it('seats every round lens plus collar inside the cover glass', () => {
    const center = moduleCenter()
    expect(lensSpecs()).toHaveLength(LENSES.length)
    for (const spec of lensSpecs()) {
      const dist = Math.hypot(spec.x - center.x, spec.y - center.y)
      expect(dist).toBeCloseTo(LENS_RING_R, 6)
      expect(dist + spec.r + 0.0012).toBeLessThanOrEqual(COLLAR.glass.r)
    }
  })

  it('spaces the triangle apex-up with distinct barrel depths', () => {
    const angles = lensSpecs().map((s) => {
      const seat = lensSeat(LENSES.find((l) => l.key === s.key)?.angleDeg ?? 0)
      return Math.atan2(seat.y - moduleCenter().y, seat.x - moduleCenter().x)
    })
    expect(angles.length).toBe(3)
    const depths = lensSpecs().map((s) => s.barrelDepth)
    expect(new Set(depths).size).toBe(depths.length)
    const ultra = lensSpecs().find((s) => s.key === 'ultra')
    const mid = lensSpecs().find((s) => s.key === 'mid')
    expect(ultra?.barrelDepth).toBeLessThan(mid?.barrelDepth ?? 0)
  })

  it('fits the periscope window inside the cover glass below the triangle', () => {
    const center = moduleCenter()
    const px = center.x + PERISCOPE.x
    const py = center.y + PERISCOPE.y
    expect(py).toBeLessThan(center.y)
    // True corner radius (not center-dist plus corner): every corner must
    // land inside the glass.
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = px + sx * (PERISCOPE.w / 2)
        const cy = py + sy * (PERISCOPE.h / 2)
        expect(Math.hypot(cx - center.x, cy - center.y)).toBeLessThanOrEqual(COLLAR.glass.r)
      }
    }
  })

  it('cuts the flash arc into the step ring band', () => {
    expect(FLASH_ARC.rIn).toBeGreaterThanOrEqual(COLLAR.step.rIn)
    expect(FLASH_ARC.rOut).toBeLessThanOrEqual(COLLAR.step.rOut)
    expect(FLASH_ARC.sweepDeg).toBeGreaterThan(0)
    expect(FLASH_ARC.dies).toBe(2)
  })

  it('places the ToF pair and mic inside the glass as separate windows', () => {
    const center = moduleCenter()
    const tofDist = TOF.ringR + TOF.window.w / 2
    expect(tofDist).toBeLessThanOrEqual(COLLAR.glass.r)
    expect(TOF.emitter.d).not.toBe(TOF.receiver.d)
    const micAngle = (MODULE_MIC.angleDeg * Math.PI) / 180
    const micX = center.x + MODULE_MIC.ringR * Math.cos(micAngle)
    const micY = center.y + MODULE_MIC.ringR * Math.sin(micAngle)
    expect(Math.hypot(micX - center.x, micY - center.y)).toBeLessThanOrEqual(COLLAR.glass.r)
  })

  it('inlays the medallion clear of every optic at the triangle centre', () => {
    const center = moduleCenter()
    for (const spec of lensSpecs()) {
      const dist = Math.hypot(spec.x - center.x, spec.y - center.y)
      expect(dist - spec.r).toBeGreaterThan(MEDALLION.r)
    }
  })

  it('knurls the outer wall with 192 teeth and tunes each coating differently', () => {
    expect(COLLAR.outer.knurlTeeth).toBe(192)
    const hues = lensSpecs().map((s) => s.coatHue)
    expect(new Set(hues).size).toBe(hues.length)
  })
})
