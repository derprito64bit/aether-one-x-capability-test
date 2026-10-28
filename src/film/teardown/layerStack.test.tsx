import { advance } from '@react-three/fiber'
import { createElement, createRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneConfigProvider } from '../../components/PhoneViewer/PhoneConfig.tsx'
import { PhoneModel } from '../../components/PhoneViewer/PhoneModel.tsx'
import { forEachWorldVertex, mountScene } from '../../components/PhoneViewer/sceneHarness.ts'
import { createInternalsMaterials } from '../internals/internalsMaterials.ts'
import { Internals, type InternalsControl } from '../internals/Internals.tsx'
import { featureAnchorBridge } from '../overlay/callouts.ts'
import { computeFilmStates } from '../states.ts'
import { LAYER_GAP, LAYER_GAP_COMPACT, PART_LAYER, layerOffset, peelLocal } from './layers.ts'
import {
  CAMERA_SLIDE,
  dampTeardownScalars,
  driveShellLayers,
  type ShellGroups,
  type TeardownScalars,
} from './transform.ts'

/**
 * Teardown stack integrity on the real mounted device and the real drivers
 * (round 04 audit). Each frame mirrors the film: the director (useFrame
 * priority -1, so first) damps the shared teardown scalars, writes the
 * control plane, and drives the shell groups (driveShellLayers); then
 * Internals' own useFrame runs (via R3F advance) on that same control.
 * Fed computeFilmStates(p) across the whole teardown span, both snapped
 * (reduced motion) and damped at realistic scroll speeds, forward and
 * reverse, at both layer gaps.
 *
 * History this guards: the layer order was inverted (the glass swept down
 * through the whole phone); a front-first stagger drove the inner rear
 * layers through the rear panel; the camera layer turned edge-on through
 * its neighbours; act lifts piled up on damped positions; per-group damping
 * let neighbours lag by different amounts and invert; and the internals
 * interleaved (haptic inside the cell, chamber inside the cans, coax runs
 * standing 112mm tall through the stack).
 */
type ShellKey = keyof ShellGroups
const SHELL_LAYER: Record<ShellKey, number> = { glass: 0, display: 1, frame: 2, module: 8, back: 9 }
const CAMERA_HOUSINGS = new Set([
  'camera-module',
  'lens-main',
  'lens-ultra',
  'lens-mid',
  'lens-periscope',
  'sensor-stack',
  'tof-module',
])
/** Exemption gates, on the shared separation (see exempt). */
const FRAME_GATE = 0.6
const HOUSING_GATE = 0.2

interface Piece {
  layer: number
  label: string
  group: THREE.Object3D
  meshes: THREE.Mesh[]
}

interface MeshBoxes {
  mesh: THREE.Mesh
  boxes: THREE.Box3[]
  opening: { halfW: number; halfH: number; r: number } | null
}

const refs = {
  frame: createRef<THREE.Group>(),
  back: createRef<THREE.Group>(),
  glass: createRef<THREE.Group>(),
  display: createRef<THREE.Group>(),
  module: createRef<THREE.Group>(),
} as unknown as Record<ShellKey, MutableRefObject<THREE.Group | null>>

const control: { current: InternalsControl } = {
  current: {
    opacity: 1,
    explode: 0,
    explodeBatt: 0,
    explodeRadial: 0,
    chipFocus: 0,
    chipLift: 0,
    battLift: 0,
    subjectDim: 0,
    energy: 0,
    shieldLift: 0,
    coilRing: 0,
    stackSeparate: 0,
    layerCursor: 0,
    featureCursor: 0,
    teardownGap: LAYER_GAP,
    reducedMotion: true,
  },
}

const td: TeardownScalars = { sep: 0, cursor: 0, ready: false }
const pieces: Piece[] = []
let root: THREE.Object3D | null = null
let unmount: () => Promise<void> = async () => {}
let clock = 0
const moduleWorld = new THREE.Vector3()
const housingWorld = new THREE.Vector3()

function meshesUnder(group: THREE.Object3D, stopAt: ReadonlyArray<THREE.Object3D>): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  const walk = (o: THREE.Object3D): void => {
    if (o !== group && stopAt.includes(o)) return
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh)
    for (const child of o.children) walk(child)
  }
  walk(group)
  return out
}

/** World bounds per mesh (one per instance), plus an annulus opening if any. */
function boxesOf(mesh: THREE.Mesh): MeshBoxes {
  mesh.geometry.computeBoundingBox()
  const local = mesh.geometry.boundingBox as THREE.Box3
  const inst = mesh as THREE.InstancedMesh
  const boxes: THREE.Box3[] = []
  const m = new THREE.Matrix4()
  const im = new THREE.Matrix4()
  const count = inst.isInstancedMesh ? inst.count : 1
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  // Small meshes get exact vertex bounds: a turned box overstates spun
  // parts (a spinning screw head's box grows 40%); big ones use the box.
  const exact = pos.count <= 600
  const v = new THREE.Vector3()
  for (let k = 0; k < count; k++) {
    m.copy(mesh.matrixWorld)
    if (inst.isInstancedMesh) {
      inst.getMatrixAt(k, im)
      m.multiply(im)
    }
    if (exact) {
      const b = new THREE.Box3()
      for (let i = 0; i < pos.count; i++)
        b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m))
      boxes.push(b)
    } else {
      boxes.push(local.clone().applyMatrix4(m))
    }
  }
  const opening = (mesh.geometry.userData.annulusOpening ?? null) as MeshBoxes['opening']
  // Openings are authored in phone space; the frame only translates in z.
  const offset = mesh.matrixWorld.elements
  return {
    mesh,
    boxes,
    opening:
      opening !== null && Math.abs(offset[12] ?? 0) < 1e-9 && Math.abs(offset[13] ?? 0) < 1e-9
        ? opening
        : null,
  }
}

function insideRoundedRect(x: number, y: number, o: NonNullable<MeshBoxes['opening']>): boolean {
  const dx = Math.abs(x) - (o.halfW - o.r)
  const dy = Math.abs(y) - (o.halfH - o.r)
  if (Math.abs(x) > o.halfW || Math.abs(y) > o.halfH) return false
  if (dx <= 0 || dy <= 0) return true
  return Math.hypot(dx, dy) <= o.r
}

/**
 * True when every vertex of the mesh sits inside an annulus's opening in
 * plan: an annulus's bounding box covers its hole, so a box test alone
 * would call the glass in the ring's opening a collision.
 */
function inOpening(mesh: THREE.Mesh, o: MeshBoxes['opening']): boolean {
  if (o === null) return false
  let inside = true
  forEachWorldVertex(mesh, (v) => {
    if (inside && !insideRoundedRect(v.x, v.y, o)) inside = false
  })
  return inside
}

const TOL = 0.00002
function overlap(a: THREE.Box3, b: THREE.Box3): boolean {
  return (
    a.min.x < b.max.x - TOL &&
    b.min.x < a.max.x - TOL &&
    a.min.y < b.max.y - TOL &&
    b.min.y < a.max.y - TOL &&
    a.min.z < b.max.z - TOL &&
    b.min.z < a.max.z - TOL
  )
}

/**
 * Physical exceptions, each gated on the pose where it is true:
 * - the frame (midframe) is modelled as a solid body, so internal parts
 *   (never the glass, display, or rear panel) sit inside it until the
 *   stack is half open;
 * - the camera housings mount through the main board, silicon, and
 *   spreaders under the 47mm module until the stack starts to open.
 */
function exempt(a: Piece, b: Piece, sep: number): boolean {
  const frame = a.label === 'shell:frame' ? b : b.label === 'shell:frame' ? a : null
  if (frame !== null) return !frame.label.startsWith('shell:') && sep < FRAME_GATE
  const housing = CAMERA_HOUSINGS.has(a.label) ? b : CAMERA_HOUSINGS.has(b.label) ? a : null
  return housing !== null && housing.layer >= 4 && housing.layer <= 6 && sep < HOUSING_GATE
}

/** One film frame at progress p: director first, then Internals. */
function frame(p: number, gap: number, reduced: boolean, delta = 1 / 60): void {
  const st = computeFilmStates(p)
  dampTeardownScalars(td, st.stackSeparate, st.layerCursor, delta, reduced)
  const c = control.current
  c.opacity = Math.max(0.5, st.internalOpacity)
  c.explode = st.explodeXray
  c.explodeBatt = st.explodeBatt
  c.explodeRadial = st.explodeRadial
  c.chipFocus = st.chipFocus
  c.chipLift = st.chipLift
  c.battLift = st.battLift
  c.shieldLift = st.shieldLift
  c.stackSeparate = td.sep
  c.layerCursor = td.cursor
  c.featureCursor = st.layerCursor
  c.teardownGap = gap
  c.reducedMotion = reduced
  const shell: ShellGroups = {
    frame: refs.frame.current,
    back: refs.back.current,
    glass: refs.glass.current,
    display: refs.display.current,
    module: refs.module.current,
  }
  if (td.sep > 0.001) {
    driveShellLayers(shell, td.sep, gap, td.cursor)
  } else {
    for (const g of Object.values(shell)) {
      g?.position.set(0, 0, 0)
      g?.rotation.set(0, 0, 0)
    }
  }
  clock += delta
  advance(clock)
  root?.updateMatrixWorld(true)
}

/** Snap straight to p (reduced motion), resetting the shared scalars. */
function snapTo(p: number, gap = LAYER_GAP): void {
  td.ready = false
  frame(p, gap, true)
}

beforeAll(async () => {
  const mounted = await mountScene(
    createElement(
      'group',
      null,
      createElement(
        PhoneConfigProvider,
        null,
        createElement(PhoneModel, { groups: refs, animateFocusRing: false }),
      ),
      createElement(Internals, { materials: createInternalsMaterials(), control }),
    ),
  )
  unmount = mounted.unmount
  root = mounted.scene
  const shellGroups = (Object.keys(refs) as ShellKey[]).map((k) => refs[k].current)
  const partGroups: THREE.Object3D[] = []
  mounted.scene.traverse((o) => {
    if (typeof o.userData.partId === 'string') partGroups.push(o)
  })
  const stops = [...shellGroups.filter((g): g is THREE.Group => g !== null), ...partGroups]
  for (const key of Object.keys(refs) as ShellKey[]) {
    const group = refs[key].current
    if (group === null) continue
    pieces.push({
      layer: SHELL_LAYER[key],
      label: `shell:${key}`,
      group,
      meshes: meshesUnder(group, stops),
    })
  }
  for (const group of partGroups) {
    const id = group.userData.partId as string
    pieces.push({
      layer: PART_LAYER[id] ?? -1,
      label: id,
      group,
      meshes: meshesUnder(group, stops),
    })
  }
})

afterAll(async () => {
  await unmount()
})

/** Every interpenetrating cross-layer pair, plus frame-order breaks. */
function violations(): string[] {
  const data = pieces.map((piece) => {
    const meshes = piece.meshes.map(boxesOf)
    const all = new THREE.Box3()
    for (const mb of meshes) for (const b of mb.boxes) all.union(b)
    return { piece, meshes, all }
  })
  const hits: string[] = []
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i]!
      const b = data[j]!
      if (a.piece.layer === b.piece.layer || exempt(a.piece, b.piece, td.sep)) continue
      if (!overlap(a.all, b.all)) continue
      const hit = a.meshes.some((ma) =>
        b.meshes.some((mb) =>
          ma.boxes.some((ba) =>
            mb.boxes.some(
              (bb) =>
                overlap(ba, bb) &&
                !inOpening(mb.mesh, ma.opening) &&
                !inOpening(ma.mesh, mb.opening),
            ),
          ),
        ),
      )
      if (hit)
        hits.push(`${a.piece.label}(L${a.piece.layer}) x ${b.piece.label}(L${b.piece.layer})`)
    }
  }
  // The midframe group must stay between the display and the cell.
  const z = (label: string): number => pieces.find((p) => p.label === label)!.group.position.z
  if (z('shell:frame') > z('shell:display') + 1e-9 || z('shell:frame') < z('cell') - 1e-9) {
    hits.push('shell:frame out of order')
  }
  return hits
}

function sweep(
  from: number,
  to: number,
  dp: number,
  gap: number,
  reduced: boolean,
  found: Map<string, string>,
): void {
  snapTo(from, gap)
  const steps = Math.ceil(Math.abs(to - from) / dp)
  for (let k = 1; k <= steps; k++) {
    const p = from + ((to - from) * k) / steps
    frame(p, gap, reduced)
    // The camera layer is one rigid assembly across two drivers: the
    // shell module (director) and the housings (Internals) must share
    // their slide and turn exactly, every frame.
    const module = refs.module.current as THREE.Group
    const housing = pieces.find((piece) => piece.label === 'camera-module')!.group
    module.getWorldPosition(moduleWorld)
    housing.getWorldPosition(housingWorld)
    if (
      Math.abs(moduleWorld.x - housingWorld.x) > 1e-9 ||
      Math.abs(module.rotation.x - housing.rotation.x) > 1e-9
    ) {
      found.set(
        `camera layer desync gap=${gap} ${reduced ? 'snap' : `damped dp=${dp}`}`,
        p.toFixed(4),
      )
    }
    for (const hit of violations()) {
      const tag = `${hit} gap=${gap} ${reduced ? 'snap' : `damped dp=${dp}`} ${to > from ? 'fwd' : 'rev'}`
      if (!found.has(tag)) found.set(tag, p.toFixed(4))
    }
  }
}

describe('teardown layer stack (mounted device + real drivers)', () => {
  it('assigns every registered part and shell group to a layer', () => {
    expect(pieces.length).toBeGreaterThan(40)
    for (const piece of pieces) expect(piece.layer, piece.label).toBeGreaterThanOrEqual(0)
  })

  it('opens in physical order: cover glass on top, rear panel at the bottom', () => {
    for (let i = 0; i < 9; i++) {
      expect(layerOffset(i, 10, LAYER_GAP, 1)).toBeGreaterThan(layerOffset(i + 1, 10, LAYER_GAP, 1))
    }
  })

  it('opens outside-in: in each half the outer layer never trails the inner one', () => {
    for (let s = 0; s <= 100; s++) {
      for (const [outer, inner] of [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [9, 8],
        [8, 7],
        [7, 6],
        [6, 5],
      ] as const) {
        expect(peelLocal(s / 100, outer)).toBeGreaterThanOrEqual(peelLocal(s / 100, inner))
      }
    }
  })

  it('never interpenetrates across layers on the snapped path (every 0.0005)', () => {
    const found = new Map<string, string>()
    for (const gap of [LAYER_GAP, LAYER_GAP_COMPACT]) sweep(0.25, 0.52, 0.0005, gap, true, found)
    expect([...found].map(([hit, p]) => `${hit} @p=${p}`)).toEqual([])
    snapTo(0.25)
  }, 120_000)

  it('never interpenetrates on the damped path, forward and reverse, at scroll speed', () => {
    // dp per frame at 60fps: ~0.0003 is a steady scroll, 0.001 a fast one.
    const found = new Map<string, string>()
    for (const gap of [LAYER_GAP, LAYER_GAP_COMPACT]) {
      for (const dp of [0.0003, 0.001]) {
        sweep(0.25, 0.52, dp, gap, false, found)
        sweep(0.52, 0.25, dp, gap, false, found)
      }
    }
    expect([...found].map(([hit, p]) => `${hit} @p=${p}`)).toEqual([])
    snapTo(0.25)
  }, 180_000)

  it('carries the featured camera layer clear of the stack and turns it lens-up', () => {
    snapTo(0.465) // cursor 8.5: the middle of the camera beat
    const module = refs.module.current as THREE.Group
    const box = new THREE.Box3().setFromObject(module)
    // Clear of every other layer's footprint (x <= 38.8mm with the keys).
    expect(box.min.x).toBeGreaterThan(0.0388)
    expect(module.rotation.x).toBeCloseTo(Math.PI, 6)
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(CAMERA_SLIDE, 3)
    // The pointer anchors on the module housings, not the group origin.
    expect(featureAnchorBridge.valid).toBe(true)
    expect(featureAnchorBridge.partId).toBe('camera-module')
    expect(featureAnchorBridge.x).toBeCloseTo(CAMERA_SLIDE, 3)
    expect(Math.abs(featureAnchorBridge.y - 0.0458)).toBeLessThan(0.002)
    // Outside its beat (coil and rear-panel beats) it rests in the stack.
    for (const p of [0.45, 0.4795]) {
      snapTo(p)
      expect((refs.module.current as THREE.Group).position.x, `p=${p}`).toBe(0)
    }
    snapTo(0.25)
  })

  it('settles on the same pose for the same progress, damped or not (no lift pile-up)', () => {
    const sample = (): number[] =>
      pieces.flatMap((p) => [p.group.position.x, p.group.position.y, p.group.position.z])
    snapTo(0.41) // silicon beat: die lifted, shield lids lifted
    const goal = sample()
    // Damped frames at the same progress converge on the goal, never
    // ratchet: act lifts on damped positions used to settle into a
    // frame-rate-dependent 4-11mm sawtooth.
    for (let k = 0; k < 400; k++) frame(0.41, LAYER_GAP, false)
    const settled = sample()
    frame(0.41, LAYER_GAP, false)
    const next = sample()
    for (let i = 0; i < goal.length; i++) {
      expect(Math.abs((settled[i] ?? 0) - (goal[i] ?? 0))).toBeLessThan(1e-6)
      expect(Math.abs((next[i] ?? 0) - (settled[i] ?? 0))).toBeLessThan(1e-6)
    }
    snapTo(0.25)
  })
})
