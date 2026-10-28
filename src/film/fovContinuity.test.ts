import { describe, expect, it } from 'vitest'
import { filmTargetFov, sampleFilm, type FovScratch } from './sample.ts'
import { computeFilmStates } from './states.ts'
import { LAYER_GAP, LAYER_GAP_COMPACT } from './teardown/layers.ts'

/**
 * The film's target FOV must be continuous in progress through the
 * approach and teardown: a step means a zoom that plays on the clock
 * after the scroll stops, and a settled frame that depends on scroll
 * direction (round 04: the 0.25 approach key carried no fit, so the
 * target jumped 24 to 30 degrees at p 0.26 and 21 to 22 at 0.24).
 */
function fovAt(p: number, aspect: number, gap: number, scratch: FovScratch): number {
  const t = sampleFilm(p)
  const st = computeFilmStates(p)
  scratch.cam[0] = t.pos.x
  scratch.cam[1] = t.pos.y
  scratch.cam[2] = t.pos.z
  scratch.tgt[0] = t.target.x
  scratch.tgt[1] = t.target.y
  scratch.tgt[2] = t.target.z
  const distance = t.pos.distanceTo(t.target)
  return filmTargetFov(t, p, aspect, gap, st.stackSeparate, distance, st.layerCursor, scratch)
}

describe('film target FOV continuity', () => {
  it('never steps more than half a degree across the approach and teardown', () => {
    const scratch: FovScratch = {
      cam: [0, 0, 1],
      tgt: [0, 0, 0],
      extents: { horizontalM: 0, verticalM: 0 },
    }
    // Landscape and square. Portrait adds framing.ts's narrow-viewport
    // macro floor, a deliberate on/off window over the feature run.
    for (const [aspect, gap] of [
      [1440 / 900, LAYER_GAP],
      [1280 / 960, LAYER_GAP],
      [1, LAYER_GAP_COMPACT],
    ] as const) {
      const steps: string[] = []
      let prev = fovAt(0.24, aspect, gap, scratch)
      for (let k = 1; k <= 2800; k++) {
        const p = 0.24 + k * 0.0001
        const fov = fovAt(p, aspect, gap, scratch)
        if (Math.abs(fov - prev) > 0.5) {
          steps.push(
            `aspect ${aspect.toFixed(2)} p=${p.toFixed(4)}: ${prev.toFixed(2)} -> ${fov.toFixed(2)}`,
          )
        }
        prev = fov
      }
      expect(steps).toEqual([])
    }
  })
})
