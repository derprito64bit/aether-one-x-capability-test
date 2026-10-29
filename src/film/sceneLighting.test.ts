import { describe, expect, it } from 'vitest'
import { ACTS } from './timeline.ts'
import { ACT_SCENE, DARK_SCENES } from './backdrop/scenes.ts'
import { SCENE_LIGHT, blendSceneLight, createSceneLight } from './sceneLighting.ts'

describe('section-scene lighting', () => {
  const out = createSceneLight()

  it('leaves the studio rig untouched in the light rooms', () => {
    for (const act of ACTS) {
      const scene = ACT_SCENE[act.id]
      if (DARK_SCENES.has(scene)) continue
      const mid = (act.start + act.end) / 2
      blendSceneLight(mid, out)
      expect(out.studio, act.id).toBe(1)
      expect(out.env, act.id).toBe(1)
      expect(out.exposure, act.id).toBe(1)
      expect(out.key.intensity + out.rimL.intensity + out.rimR.intensity, act.id).toBe(0)
    }
  })

  it('dims the studio rig and lights the phone in every dark room', () => {
    for (const act of ACTS) {
      if (!DARK_SCENES.has(ACT_SCENE[act.id])) continue
      blendSceneLight((act.start + act.end) / 2, out)
      expect(out.studio, act.id).toBeLessThan(0.6)
      expect(out.rimR.intensity, act.id).toBeGreaterThan(2)
    }
  })

  it('lights the projector room from the beam corner, upper left', () => {
    blendSceneLight(0.6, out)
    expect(out.key.dir.x).toBeLessThan(-0.5)
    expect(out.key.dir.y).toBeGreaterThan(0.4)
    expect(out.rimR.dir.x).toBeGreaterThan(0.5)
  })

  it('colours the spectrum rims cyan left and magenta right', () => {
    blendSceneLight(0.78, out)
    expect(out.rimL.color.b).toBeGreaterThan(out.rimL.color.r)
    expect(out.rimR.color.r).toBeGreaterThan(out.rimR.color.g)
    expect(SCENE_LIGHT.spectrum.rimL.color).toBe('#39d0ff')
    expect(SCENE_LIGHT.spectrum.rimR.color).toBe('#ff4fb4')
  })

  it('crossfades without steps, both directions (pure in progress)', () => {
    let prev = blendSceneLight(0, createSceneLight())
    let last = { studio: prev.studio, key: prev.key.intensity, rim: prev.rimR.intensity }
    for (let i = 1; i <= 20000; i++) {
      const p = i / 20000
      prev = blendSceneLight(p, out)
      expect(Math.abs(prev.studio - last.studio), `studio @${p}`).toBeLessThan(0.02)
      expect(Math.abs(prev.key.intensity - last.key), `key @${p}`).toBeLessThan(0.1)
      expect(Math.abs(prev.rimR.intensity - last.rim), `rim @${p}`).toBeLessThan(0.1)
      last = { studio: prev.studio, key: prev.key.intensity, rim: prev.rimR.intensity }
    }
    const a = blendSceneLight(0.7213, createSceneLight())
    const b = blendSceneLight(0.7213, createSceneLight())
    expect(a.rimL.intensity).toBe(b.rimL.intensity)
  })
})
