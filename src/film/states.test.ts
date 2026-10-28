import { describe, expect, it } from 'vitest'
import { computeFilmStates, layerWindow, ramplike } from './states.ts'

describe('film states', () => {
  it('opens no x-ray window at rest', () => {
    const s = computeFilmStates(0)
    expect(s.shellGhost).toBe(0)
    expect(s.internalOpacity).toBe(0)
    expect(s.explodeXray).toBe(0)
    expect(s.chipFocus).toBe(0)
  })

  it('shows the shell layers solid and the internals in the open sandwich', () => {
    // Round 05 showcase: the stack opens wide, so the shell no longer
    // ghosts in the teardown; only the energy beat x-rays it.
    const s = computeFilmStates(0.33)
    expect(s.shellGhost).toBe(0)
    expect(s.internalOpacity).toBeGreaterThan(0.9)
    expect(s.explodeXray).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.9).shellGhost).toBeGreaterThan(0.9)
  })

  it('restores the shell before the camera act', () => {
    for (const p of [0.52, 0.6, 0.8, 1]) {
      const s = computeFilmStates(p)
      if (p === 1) continue
      expect(s.shellGhost).toBe(0)
    }
    const end = computeFilmStates(1)
    expect(end.internalOpacity).toBe(0)
    expect(end.explodeXray).toBe(0)
  })

  it('focuses the die on the silicon feature, then releases', () => {
    // Layer 5 runs p in [0.395, 0.415]; the retired chip-act window peaked
    // mid-midframe instead (round 01 A3).
    expect(computeFilmStates(0.405).chipFocus).toBeCloseTo(1, 4)
    expect(computeFilmStates(0.405).chipLift).toBeCloseTo(1, 4)
    expect(computeFilmStates(0.37).chipFocus).toBe(0)
    expect(computeFilmStates(0.44).chipFocus).toBe(0)
    expect(computeFilmStates(0.53).chipFocus).toBe(0)
  })

  it('opens a layerWindow across one layer with lead and tail', () => {
    expect(layerWindow(5, 5, 0.5, 0.5)).toBe(1)
    expect(layerWindow(5.5, 5, 0.5, 0.5)).toBe(1)
    expect(layerWindow(4.5, 5, 0.5, 0.5)).toBe(0)
    expect(layerWindow(6.5, 5, 0.5, 0.5)).toBe(0)
    const mid = layerWindow(4.75, 5, 0.5, 0.5)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })

  it('ramps plateaus up, holds, and descends', () => {
    expect(ramplike(0, 0.2, 0.3, 0.7, 0.8)).toBe(0)
    expect(ramplike(0.5, 0.2, 0.3, 0.7, 0.8)).toBe(1)
    expect(ramplike(1, 0.2, 0.3, 0.7, 0.8)).toBe(0)
    const mid = ramplike(0.25, 0.2, 0.3, 0.7, 0.8)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })

  it('keeps every scalar inside [0,1] across the whole film', () => {
    for (let i = 0; i <= 1000; i++) {
      const s = computeFilmStates(i / 1000)
      for (const [name, value] of Object.entries(s)) {
        if (name === 'layerCursor') {
          expect(value, `${name} at p=${i / 1000}`).toBeGreaterThanOrEqual(0)
          expect(value, `${name} at p=${i / 1000}`).toBeLessThanOrEqual(10)
          continue
        }
        expect(value, `${name} at p=${i / 1000}`).toBeGreaterThanOrEqual(0)
        expect(value, `${name} at p=${i / 1000}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('returns every scalar to 0 at the end except screenOn and layerCursor', () => {
    const end = computeFilmStates(1)
    for (const [name, value] of Object.entries(end)) {
      // screenOn stays lit and the cursor parks at the last layer:
      // monotonic journeys, not windows.
      if (name === 'screenOn') expect(value).toBeGreaterThan(0)
      else if (name === 'layerCursor') expect(value).toBe(10)
      else expect(value, name).toBe(0)
    }
  })

  it('opens the optics beat with the camera dive', () => {
    expect(computeFilmStates(0.66).explodeOptics).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.55).explodeOptics).toBe(0)
    expect(computeFilmStates(0.75).explodeOptics).toBe(0)
  })

  it('pulls focus and atmosphere at the macro holds', () => {
    expect(computeFilmStates(0.435).focusPull).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.685).focusPull).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.685).macroAtmos).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.5).focusPull).toBe(0)
  })

  it('shows callouts only inside the exploded diagram', () => {
    expect(computeFilmStates(0.4).calloutOpacity).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.2).calloutOpacity).toBe(0)
    expect(computeFilmStates(0.6).calloutOpacity).toBe(0)
  })

  it('lifts the shield lids inside the main explode window', () => {
    expect(computeFilmStates(0.4).shieldLift).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.3).shieldLift).toBe(0)
    expect(computeFilmStates(0.52).shieldLift).toBe(0)
  })

  it('lights the coil ring with the energy beat', () => {
    expect(computeFilmStates(0.905).coilRing).toBeGreaterThan(0.5)
    expect(computeFilmStates(0.8).coilRing).toBe(0)
    expect(computeFilmStates(0.95).coilRing).toBe(0)
  })
})
