import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { FINISHES } from '../../data/product.ts'
import { FAN, FAN_ORDER, cardAngle, createFanLayout, fanPhase, solveFan } from './fan.ts'

function cameraAt(aspect: number, fov = 22) {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.01, 10)
  cam.position.set(0, 0.02, 0.58)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  return { cam, fan: { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov, aspect } }
}

describe('finish fan', () => {
  it('fans the six finishes in product order, 110 degrees, card 0 leftmost', () => {
    expect(FAN_ORDER).toEqual(FINISHES.map((f) => f.id))
    expect(cardAngle(0, 1) - cardAngle(5, 1)).toBeCloseTo((110 * Math.PI) / 180, 9)
    expect(cardAngle(0, 1)).toBeGreaterThan(0)
    for (let k = 0; k < 6; k++) expect(cardAngle(k, 0)).toBeCloseTo(0, 12)
  })

  it('turns the hero, then opens, then holds fully fanned for the last 40%', () => {
    const ph = { t: 0, turn: 0, open: 0 }
    const span = FAN.end - FAN.start
    expect(fanPhase(0.97, ph).turn).toBe(0)
    expect(fanPhase(FAN.start + 0.35 * span, ph).turn).toBeCloseTo(1, 9)
    expect(fanPhase(FAN.start + 0.25 * span, ph).open).toBeCloseTo(0, 9)
    for (const t of [0.6, 0.8, 1]) {
      expect(fanPhase(FAN.start + t * span, ph).open, `t=${t}`).toBeCloseTo(1, 9)
    }
    // Pure in progress: the same p gives the same phases.
    expect(fanPhase(0.9861, { t: 0, turn: 0, open: 0 })).toEqual(fanPhase(0.9861, ph))
  })

  it('frames the open fan right of the copy on desktop and in the top half on phones', () => {
    const cases = [
      { aspect: 1.6, region: { x0: 0.4, x1: 0.98, y0: 0.08, y1: 0.92 } },
      { aspect: 390 / 844, region: { x0: 0.02, x1: 0.98, y0: 0.03, y1: 0.52 } },
    ]
    for (const { aspect, region } of cases) {
      const { cam, fan } = cameraAt(aspect)
      const layout = solveFan(createFanLayout(), fan, 1, 1.36)
      const corner = new THREE.Vector3()
      const s = new THREE.Vector3(layout.scale, layout.scale, layout.scale)
      for (const card of layout.cards) {
        const m = new THREE.Matrix4().compose(card.pos, card.quat, s)
        for (const [x, y] of [
          [-0.0384, -0.0798],
          [0.0384, -0.0798],
          [0.0384, 0.0798],
          [-0.0384, 0.0798],
        ] as const) {
          corner.set(x, y, 0).applyMatrix4(m).project(cam)
          const sx = (corner.x + 1) / 2
          const sy = (1 - corner.y) / 2
          expect(sx, `aspect ${aspect}`).toBeGreaterThan(region.x0)
          expect(sx, `aspect ${aspect}`).toBeLessThan(region.x1)
          expect(sy, `aspect ${aspect}`).toBeGreaterThan(region.y0)
          expect(sy, `aspect ${aspect}`).toBeLessThan(region.y1)
        }
      }
    }
  })

  it('shows every back to the camera, each card behind the one before', () => {
    const { fan } = cameraAt(1.6)
    const layout = solveFan(createFanLayout(), fan, 1, 1.36)
    const toCam = new THREE.Vector3()
    const back = new THREE.Vector3()
    const view = new THREE.Vector3(0, 0, -1).applyQuaternion(fan.quat)
    let prevDepth = -Infinity
    layout.cards.forEach((card, k) => {
      back.set(0, 0, -1).applyQuaternion(card.quat)
      toCam.copy(fan.pos).sub(card.pos).normalize()
      expect(back.dot(toCam), `card ${k}`).toBeGreaterThan(0.9)
      const depth = toCam.copy(card.pos).sub(fan.pos).dot(view)
      expect(depth, `card ${k}`).toBeGreaterThan(prevDepth)
      prevDepth = depth
      // The label anchor sits above the card's top edge.
      expect(card.anchor.distanceTo(card.pos)).toBeGreaterThan(0.08 * layout.scale)
    })
  })
})
