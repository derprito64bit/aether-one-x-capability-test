import { createElement } from 'react'
import * as THREE from 'three'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  LENS_TUNNEL,
  lensElementCap,
  lensSpecs,
  lensTurretProfile,
  MODULE_RISE,
} from './cameraLayout.ts'
import { PhoneConfigProvider } from './PhoneConfig.tsx'
import { PhoneModel } from './PhoneModel.tsx'
import {
  BUTTON_POCKET,
  CERAMIC_FACE_Z,
  COLLAR,
  DIM,
  GLASS_FRONT_Z,
  LENS_COLLAR,
  MODULE,
} from './phoneDimensions.ts'
import { roundedRectSlabGeometry } from './phoneGeometry.ts'
import { forEachWorldVertex, meshBoxes, mountScene, type MeshBox } from './sceneHarness.ts'

/**
 * Whole-device containment, measured on the real mounted PhoneModel (round
 * 04 geometry audit). Each block guards a class of defect that shipped:
 * parts built on the wrong axis (a 38mm seal hoop through the phone, lens
 * collars as 15mm fins, a USB-C rim standing 1.7mm out of the edge),
 * slabs shifted a bevel off centre (the back panel 1.3mm proud, burying
 * the module), and flat faces turned into the phone (culled from view).
 */
const HX = DIM.w / 2
const HY = DIM.h / 2
const HZ = DIM.t / 2
const TOL = 0.00005

let boxes: MeshBox[] = []
let lowBoxes: MeshBox[] = []
let moduleRoot: THREE.Object3D | null = null
let unmounts: Array<() => Promise<void>> = []

function inside(a: THREE.Object3D, root: THREE.Object3D | null): boolean {
  for (let o: THREE.Object3D | null = a; o !== null; o = o.parent) if (o === root) return true
  return false
}

beforeAll(async () => {
  const high = await mountScene(
    createElement(PhoneConfigProvider, null, createElement(PhoneModel, { detail: 'high' })),
  )
  const low = await mountScene(
    createElement(PhoneConfigProvider, null, createElement(PhoneModel, { detail: 'low' })),
  )
  unmounts = [high.unmount, low.unmount]
  boxes = meshBoxes(high.scene)
  lowBoxes = meshBoxes(low.scene)
  for (const scene of [high.scene, low.scene]) {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh && (mesh.material as THREE.Material).name === 'island' && mesh.parent) {
        moduleRoots.push(mesh.parent)
      }
    })
  }
  moduleRoot = moduleRoots[0] ?? null
})

/** CameraAssembly roots (one per mounted scene). */
const moduleRoots: THREE.Object3D[] = []
const inModule = (mesh: THREE.Object3D): boolean => moduleRoots.some((r) => inside(mesh, r))

afterAll(async () => {
  for (const unmount of unmounts) await unmount()
})

describe('device containment (mounted PhoneModel)', () => {
  it('mounts the whole device', () => {
    expect(boxes.length).toBeGreaterThan(100)
    expect(moduleRoot).not.toBeNull()
  })

  it('keeps every shell part inside the body envelope', () => {
    for (const set of [boxes, lowBoxes]) {
      for (const { mesh, material, box } of set) {
        if (inModule(mesh)) continue
        // Button caps (and the power key's grooves on them) stand proud of
        // the right rail by design.
        const onCap = material === 'button' || box.min.x > HX + BUTTON_POCKET.proud / 2
        const xTol = onCap ? BUTTON_POCKET.proud + TOL : TOL
        const label = `${material} ${mesh.geometry.type}`
        expect(box.min.x, label).toBeGreaterThanOrEqual(-HX - TOL)
        expect(box.max.x, label).toBeLessThanOrEqual(HX + xTol)
        expect(box.min.y, label).toBeGreaterThanOrEqual(-HY - TOL)
        expect(box.max.y, label).toBeLessThanOrEqual(HY + TOL)
        expect(box.min.z, label).toBeGreaterThanOrEqual(-HZ - TOL - 0.0002)
        expect(box.max.z, label).toBeLessThanOrEqual(HZ + TOL)
      }
    }
  })

  it('keeps every camera-module part inside the module footprint and height', () => {
    const reach = MODULE.outerR + MODULE.baseFillet + COLLAR.outer.knurlDepth + TOL
    const top = CERAMIC_FACE_Z - MODULE_RISE.lensTop - TOL
    let count = 0
    for (const { mesh, material, box } of [...boxes, ...lowBoxes]) {
      if (!inModule(mesh)) continue
      count++
      const label = `${material} ${mesh.geometry.type}`
      let radius = 0
      forEachWorldVertex(mesh, (v) => {
        radius = Math.max(radius, Math.hypot(v.x - MODULE.cx, v.y - MODULE.cy))
      })
      expect(radius, label).toBeLessThanOrEqual(reach)
      expect(box.min.z, label).toBeGreaterThanOrEqual(top)
      // Nothing in the module reaches past the ceramic face into the opaque
      // panel, where it would render but never be seen.
      expect(box.max.z, label).toBeLessThanOrEqual(CERAMIC_FACE_Z + TOL)
    }
    expect(count).toBeGreaterThan(80)
  })

  it('turns every flat rear face to the rear and every front face forward', () => {
    const n = new THREE.Vector3()
    const nm = new THREE.Matrix3()
    for (const { mesh, material, box } of boxes) {
      const type = mesh.geometry.type
      if (!['RingGeometry', 'CircleGeometry', 'PlaneGeometry', 'ShapeGeometry'].includes(type)) {
        continue
      }
      nm.getNormalMatrix(mesh.matrixWorld)
      n.set(0, 0, 1).applyMatrix3(nm).normalize()
      const label = `${material} ${type}`
      if (box.max.z < CERAMIC_FACE_Z + 0.0002) expect(n.z, label).toBeLessThan(-0.5)
      if (box.min.z > GLASS_FRONT_Z - 0.0002) expect(n.z, label).toBeGreaterThan(0.5)
    }
  })

  it('seats front details on the glass, never standing off it', () => {
    for (const { material, box } of boxes) {
      if (box.min.z < GLASS_FRONT_Z - 0.0004) continue
      expect(box.max.z, material).toBeLessThanOrEqual(GLASS_FRONT_Z + 0.00003)
    }
  })

  it('stacks glass, bezel ink, and display front to back without interpenetration', () => {
    // Measured on the mounted meshes, not the constants that define them.
    const only = (name: string): THREE.Box3 => {
      const found = boxes.filter((b) => b.material === name)
      expect(found, name).toHaveLength(1)
      return (found[0] as MeshBox).box
    }
    const glass = only('screen')
    const bezel = only('bezel')
    const display = only('display')
    expect(glass.max.z).toBeLessThan(HZ)
    expect(bezel.max.z).toBeLessThan(glass.min.z)
    expect(display.max.z).toBeLessThan(bezel.min.z)
    // The ink band covers the panel edge: its opening sits inside the panel.
    expect(display.max.x).toBeGreaterThan(0.036 - 0.0002)
    expect(bezel.max.x).toBeGreaterThan(display.max.x)
  })
})

describe('slab geometry', () => {
  it('centers every slab on its position and maps UVs over the footprint', () => {
    const geo = roundedRectSlabGeometry(0.036, 0.0774, 0.0011, 0.0003)
    geo.computeBoundingBox()
    const box = geo.boundingBox as THREE.Box3
    expect(box.min.z).toBeCloseTo(-0.00055, 9)
    expect(box.max.z).toBeCloseTo(0.00055, 9)
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute
    let minU = Infinity
    let maxU = -Infinity
    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i), uv.getY(i))
      maxU = Math.max(maxU, uv.getX(i), uv.getY(i))
    }
    expect(minU).toBeCloseTo(0, 6)
    expect(maxU).toBeCloseTo(1, 6)
    geo.dispose()
  })
})

describe('lens turrets', () => {
  it('bottoms every barrel out ahead of the ceramic face', () => {
    for (const spec of lensSpecs()) {
      const { bottomRise } = lensTurretProfile(spec)
      expect(bottomRise, spec.key).toBeGreaterThan(0)
    }
  })

  it('keeps each front element clear of its aperture ring, sensor, and baffles', () => {
    for (const spec of lensSpecs()) {
      const cap = lensElementCap(spec)
      const rim = cap.sphereR * Math.sin(cap.theta)
      const rimDepth = cap.poleDepth + cap.sphereR * (1 - Math.cos(cap.theta))
      expect(rimDepth, spec.key).toBeLessThan(spec.barrelDepth * LENS_TUNNEL.aperture)
      // Rim inside the baffle bore.
      expect(rim, spec.key).toBeLessThan(spec.r * LENS_TUNNEL.baffleR - LENS_TUNNEL.baffleTube)
    }
  })

  it('mounts element, aperture, and sensor in that order down every barrel', () => {
    // Mounted meshes: element (glass cap of radius cap.sphereR), aperture
    // ring (lensCavity, 7 segments), sensor glint, nearest each lens axis.
    for (const spec of lensSpecs()) {
      const cap = lensElementCap(spec)
      const near = boxes.filter(({ box }) => {
        const c = box.getCenter(new THREE.Vector3())
        return Math.hypot(c.x - spec.x, c.y - spec.y) < 0.0005
      })
      const element = near.find(
        ({ mesh }) =>
          mesh.geometry.type === 'SphereGeometry' &&
          Math.abs((mesh.geometry as THREE.SphereGeometry).parameters.radius - cap.sphereR) < 1e-9,
      )
      const aperture = near.find(
        ({ mesh }) =>
          mesh.geometry.type === 'RingGeometry' &&
          (mesh.geometry as THREE.RingGeometry).parameters.thetaSegments === 7,
      )
      const sensor = near.find(({ material }) => material === 'sensorGlint')
      expect(element && aperture && sensor, spec.key).toBeTruthy()
      // Deeper is +z (into the phone).
      expect(element!.box.max.z, spec.key).toBeLessThan(aperture!.box.min.z)
      expect(aperture!.box.max.z, spec.key).toBeLessThan(sensor!.box.min.z)
      expect(sensor!.box.max.z, spec.key).toBeLessThanOrEqual(CERAMIC_FACE_Z)
    }
  })

  it('stands each collar on the cover glass and keeps it inside the glass', () => {
    for (const spec of lensSpecs()) {
      const { collar } = lensTurretProfile(spec)
      expect(collar[0]?.[1]).toBe(MODULE_RISE.glass)
      const reach = Math.hypot(spec.x - MODULE.cx, spec.y - MODULE.cy) + spec.r + LENS_COLLAR.base
      expect(reach, spec.key).toBeLessThanOrEqual(COLLAR.glass.r)
    }
  })
})
