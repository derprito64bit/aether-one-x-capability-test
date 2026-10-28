import { advance } from '@react-three/fiber'
import { createElement, createRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneConfigProvider } from '../../components/PhoneViewer/PhoneConfig.tsx'
import { PhoneModel } from '../../components/PhoneViewer/PhoneModel.tsx'
import { forEachWorldVertex, mountScene } from '../../components/PhoneViewer/sceneHarness.ts'
import { createInternalsMaterials } from '../internals/internalsMaterials.ts'
import { Internals, type InternalsControl } from '../internals/Internals.tsx'
import {
  DEFAULT_SLOT_LANDSCAPE,
  DEFAULT_SLOT_PORTRAIT,
  showcaseBridge,
} from '../overlay/callouts.ts'
import { computeFilmStates } from '../states.ts'
import { dieLiftFor, writeShowcaseBridge } from './bridgeWriter.ts'
import { LAYER_GAP, LAYER_GAP_COMPACT, PART_LAYER, layerOffset, peelLocal } from './layers.ts'
import {
  composeLayerPose,
  computeShowcaseState,
  createLayerPoses,
  createRigCamera,
  createShowcaseState,
  resolveSlot,
  slideDirection,
  solvePresentPose,
  solveShowcaseRig,
  tourCursorAt,
} from './showcase.ts'
import { SHOWCASE_LAYERS } from './showcaseLayers.ts'
import { heroAt, rigCamera } from './showcaseTestKit.ts'
import {
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
// The camera bump nests in the rear panel group and rides it (round 05).
const SHELL_LAYER: Record<ShellKey, number> = { glass: 0, display: 1, frame: 2, module: 9, back: 9 }
/** Gaps to sweep (deduplicated: both are wide in the showcase). */
const GAPS = [...new Set([LAYER_GAP, LAYER_GAP_COMPACT])]
/** Landscape and phone aspects the director frames for. */
const WIDE = 1.6
const PHONE = 390 / 844
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
    poses: createLayerPoses(),
    showcaseLayer: -1,
    showcaseFocus: 0,
    dieLift: 0,
    layerAlpha: new Float32Array(11).fill(1),
    teardownGap: LAYER_GAP,
    reducedMotion: true,
  },
}

const td: TeardownScalars = { sep: 0, tour: -3, cursor: 0, ready: false }
const show = createShowcaseState()
const rig = createRigCamera()
const poses = createLayerPoses()
const present = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }
const slideDir = new THREE.Vector3(1, 0, 0)
const slot = { x0: 0, x1: 0, y0: 0, y1: 0 }
let hero = new THREE.Matrix4()
let flex: THREE.Object3D | null = null
const pieces: Piece[] = []
let root: THREE.Object3D | null = null
let unmount: () => Promise<void> = async () => {}
let clock = 0

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

/**
 * One film frame at progress p, mirroring the director: damp the shared
 * scalars, derive the showcase state, frame the rig through the sampled
 * hero pose, compose all ten layer poses (slot, slide, flight), drive the
 * shell, publish the bridge; then Internals' own useFrame. The scene root
 * stays at identity, so world space here is the hero's local space (the
 * collision checks stay axis-aligned); projections apply `hero` first.
 */
function frame(p: number, gap: number, reduced: boolean, delta = 1 / 60, aspect = WIDE): void {
  const st = computeFilmStates(p)
  dampTeardownScalars(td, st.stackSeparate, tourCursorAt(p), delta, reduced)
  computeShowcaseState(show, td.tour, td.sep)
  hero = heroAt(p)
  solveShowcaseRig(rig, hero, td.sep, gap, aspect, show)
  const moving = show.layer >= 0 && (show.slide > 0 || show.fly > 0)
  if (moving) {
    solvePresentPose(
      present,
      SHOWCASE_LAYERS[show.layer]!,
      rig,
      hero,
      0.5,
      resolveSlot(slot, aspect),
    )
    slideDirection(slideDir, rig, hero)
  }
  for (let i = 0; i < 10; i++) {
    const mine = moving && i === show.layer
    composeLayerPose(
      poses[i]!,
      i,
      td.sep,
      gap,
      mine ? show.slide : 0,
      mine ? show.fly : 0,
      mine ? present : null,
      slideDir,
    )
  }
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
  c.poses = poses
  c.showcaseLayer = show.layer
  c.showcaseFocus = show.focus
  c.dieLift = dieLiftFor(show)
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
    driveShellLayers(shell, poses)
  } else {
    for (const g of Object.values(shell)) {
      g?.position.set(0, 0, 0)
      g?.rotation.set(0, 0, 0)
    }
  }
  flex ??= refs.display.current?.getObjectByName('display-flex') ?? null
  if (flex !== null) flex.rotation.x = Math.PI * (1 - (show.layer === 1 ? show.fly : 0))
  clock += delta
  advance(clock)
  root?.updateMatrixWorld(true)
  writeShowcaseBridge(show, poses, hero, rig.pos, c.dieLift, clock * 1000)
}

/** Snap straight to p (reduced motion), resetting the shared scalars. */
function snapTo(p: number, gap = LAYER_GAP, aspect = WIDE): void {
  td.ready = false
  frame(p, gap, true, 1 / 60, aspect)
}

/** Layers whose pose has left their slot (slid or flying). */
function movedLayers(): number[] {
  const out: number[] = []
  for (let i = 0; i < 10; i++) {
    const pose = poses[i]!
    const slot = layerOffset(i, 10, LAYER_GAP, peelLocal(td.sep, i))
    if (
      Math.abs(pose.pos.x) > 1e-9 ||
      Math.abs(pose.pos.y) > 1e-9 ||
      Math.abs(pose.pos.z - slot) > 1e-9 ||
      Math.abs(pose.quat.w - 1) > 1e-12
    ) {
      out.push(i)
    }
  }
  return out
}

/** Screen rect (0..1, y down) of every mesh vertex in the given layers. */
function screenRect(layers: ReadonlyArray<number>, aspect = WIDE): Rect {
  const cam = rigCamera(rig)
  cam.aspect = aspect
  cam.updateProjectionMatrix()
  const r: Rect = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }
  for (const piece of pieces) {
    if (!layers.includes(piece.layer) || piece.label === 'shield-lid') continue
    for (const mesh of piece.meshes) {
      if (!mesh.visible) continue
      forEachWorldVertex(mesh, (v) => {
        const q = v.applyMatrix4(hero).project(cam)
        r.x0 = Math.min(r.x0, (q.x + 1) / 2)
        r.x1 = Math.max(r.x1, (q.x + 1) / 2)
        r.y0 = Math.min(r.y0, (1 - q.y) / 2)
        r.y1 = Math.max(r.y1, (1 - q.y) / 2)
      })
    }
  }
  return r
}

interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** Screen rect (0..1, y down) of a layer's SUBJECT box at its current pose. */
function subjectRect(index: number, aspect = WIDE): Rect {
  const cam = rigCamera(rig)
  cam.aspect = aspect
  cam.updateProjectionMatrix()
  const def = SHOWCASE_LAYERS[index]!
  const pose = poses[index]!
  const r: Rect = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }
  const v = new THREE.Vector3()
  for (let k = 0; k < 8; k++) {
    v.set(
      def.center[0] + (k & 1 ? def.half[0] : -def.half[0]),
      def.center[1] + (k & 2 ? def.half[1] : -def.half[1]),
      def.center[2] + (k & 4 ? def.half[2] : -def.half[2]),
    )
      .applyQuaternion(pose.quat)
      .add(pose.pos)
      .applyMatrix4(hero)
      .project(cam)
    r.x0 = Math.min(r.x0, (v.x + 1) / 2)
    r.x1 = Math.max(r.x1, (v.x + 1) / 2)
    r.y0 = Math.min(r.y0, (1 - v.y) / 2)
    r.y1 = Math.max(r.y1, (1 - v.y) / 2)
  }
  return r
}

/** Intersection area over the smaller rect's area. */
function overlapShare(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return 0
  const area = (r: Rect): number => (r.x1 - r.x0) * (r.y1 - r.y0)
  return (w * h) / Math.min(area(a), area(b))
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
  // The midframe group must stay between the display and the cell, while
  // all three sit in their slots (a presented layer has left the stack).
  const z = (label: string): number => pieces.find((p) => p.label === label)!.group.position.z
  const moved = movedLayers()
  const seated = !moved.includes(1) && !moved.includes(2) && !moved.includes(3)
  if (
    seated &&
    (z('shell:frame') > z('shell:display') + 1e-9 || z('shell:frame') < z('cell') - 1e-9)
  ) {
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
    // One part at a time: never two layers out of their slots at once.
    const moved = movedLayers()
    if (moved.length > 1) {
      found.set(`two layers out at once ${moved.join(',')} gap=${gap}`, p.toFixed(4))
    }
    // The camera bump stays bonded to the rear panel it nests in.
    const module = refs.module.current as THREE.Group
    if (module.position.lengthSq() > 0 || module.quaternion.w !== 1) {
      found.set(`camera bump left the rear panel gap=${gap}`, p.toFixed(4))
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
    for (const gap of GAPS) sweep(0.25, 0.52, 0.0005, gap, true, found)
    expect([...found].map(([hit, p]) => `${hit} @p=${p}`)).toEqual([])
    snapTo(0.25)
  }, 120_000)

  it('never interpenetrates on the damped path, forward and reverse, at scroll speed', () => {
    // dp per frame at 60fps: ~0.0003 is a steady scroll, 0.001 a fast one.
    const found = new Map<string, string>()
    for (const gap of GAPS) {
      for (const dp of [0.0003, 0.001]) {
        sweep(0.25, 0.52, dp, gap, false, found)
        sweep(0.52, 0.25, dp, gap, false, found)
      }
    }
    expect([...found].map(([hit, p]) => `${hit} @p=${p}`)).toEqual([])
    snapTo(0.25)
  }, 180_000)

  it('holds an overview where no two layers overlap more than 25% on screen', () => {
    for (const aspect of [WIDE, PHONE]) {
      snapTo(0.29, LAYER_GAP, aspect)
      expect(showcaseBridge.overview).toBe(1)
      expect(showcaseBridge.layer).toBe(-1)
      const rects = Array.from({ length: 10 }, (_, i) => screenRect([i], aspect))
      for (let i = 0; i < 10; i++) {
        for (let j = i + 1; j < 10; j++) {
          expect(
            overlapShare(rects[i]!, rects[j]!),
            `${i} x ${j} @${aspect.toFixed(2)}`,
          ).toBeLessThan(0.25)
        }
      }
      const all = screenRect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], aspect)
      if (aspect >= 1) {
        // Right of the copy column, inside the frame.
        expect(all.x0).toBeGreaterThan(0.38)
        expect(all.x1).toBeLessThan(1)
      } else {
        // Top half on phones (the card starts ~51% down).
        expect(all.y1).toBeLessThan(0.52)
        expect(all.x0).toBeGreaterThan(0)
        expect(all.x1).toBeLessThan(1)
      }
      expect(all.y0).toBeGreaterThan(0)
    }
    snapTo(0.25)
  })

  it('fits the presented subject box inside the overlay slot at focus 1', () => {
    // Defaults on both aspects, then one custom narrow slot the overlay
    // might publish (set: true). Within 2% of the viewport, and the part
    // fills its slot on at least one axis (or hits the height cap).
    const narrow = { x0: 0.55, x1: 0.7, y0: 0.2, y1: 0.8 }
    const cases: Array<{ aspect: number; slot: typeof narrow | null; cap: number }> = [
      { aspect: WIDE, slot: null, cap: 0.6 },
      { aspect: PHONE, slot: null, cap: 0.42 },
      { aspect: WIDE, slot: narrow, cap: 0.6 },
    ]
    for (const { aspect, slot, cap } of cases) {
      const target = slot ?? (aspect < 1 ? DEFAULT_SLOT_PORTRAIT : DEFAULT_SLOT_LANDSCAPE)
      if (slot !== null) Object.assign(showcaseBridge.slot, slot, { set: true })
      for (let i = 0; i < 10; i++) {
        snapTo(0.305 + 0.02 * i, LAYER_GAP, aspect)
        expect(showcaseBridge.layer).toBe(i)
        expect(showcaseBridge.focus).toBe(1)
        expect(movedLayers()).toEqual([i])
        const r = subjectRect(i, aspect)
        const tag = `layer ${i} @${aspect.toFixed(2)}${slot !== null ? ' narrow' : ''}`
        const tol = 0.02
        expect(r.x0, `${tag} left`).toBeGreaterThan(target.x0 - tol)
        expect(r.x1, `${tag} right`).toBeLessThan(target.x1 + tol)
        expect(r.y0, `${tag} top`).toBeGreaterThan(target.y0 - tol)
        expect(r.y1, `${tag} bottom`).toBeLessThan(target.y1 + tol)
        // Centred on the slot.
        expect(Math.abs((r.x0 + r.x1 - target.x0 - target.x1) / 2), `${tag} cx`).toBeLessThan(tol)
        expect(Math.abs((r.y0 + r.y1 - target.y0 - target.y1) / 2), `${tag} cy`).toBeLessThan(tol)
        // Longest projected side never past the cap (share of the height).
        const tall = r.y1 - r.y0
        const wide = (r.x1 - r.x0) * aspect
        expect(Math.max(tall, wide), `${tag} cap`).toBeLessThan(cap + tol)
        // And as large as the slot allows on its binding axis.
        const fill = Math.max(
          (r.x1 - r.x0) / Math.min(target.x1 - target.x0, cap / aspect),
          tall / Math.min(target.y1 - target.y0, cap),
        )
        expect(fill, `${tag} fill`).toBeGreaterThan(0.97)
      }
      showcaseBridge.slot.set = false
    }
    snapTo(0.25)
  })

  it('publishes every sub-component anchor on the presented, visible face', () => {
    const cam = (): THREE.PerspectiveCamera => rigCamera(rig)
    for (let i = 0; i < 10; i++) {
      snapTo(0.305 + 0.02 * i)
      const def = SHOWCASE_LAYERS[i]!
      const r = screenRect([i])
      expect(showcaseBridge.bounds.on).toBe(true)
      for (let k = 0; k < 8; k++) {
        const slot = showcaseBridge.parts[k]!
        const anchor = def.anchors[k]
        if (anchor === undefined) {
          expect(slot.on).toBe(false)
          continue
        }
        expect(slot.key).toBe(anchor.key)
        expect(slot.on, anchor.key).toBe(true)
        const q = new THREE.Vector3(slot.x, slot.y, slot.z).project(cam())
        const x = (q.x + 1) / 2
        const y = (1 - q.y) / 2
        // On the part (its projected outline, a hair of slack for edges).
        expect(x, anchor.key).toBeGreaterThan(r.x0 - 0.01)
        expect(x, anchor.key).toBeLessThan(r.x1 + 0.01)
        expect(y, anchor.key).toBeGreaterThan(r.y0 - 0.01)
        expect(y, anchor.key).toBeLessThan(r.y1 + 0.01)
      }
      // The presented layer's world box contains every vertex it renders.
      const b = showcaseBridge.bounds
      const real = new THREE.Box3()
      for (const piece of pieces.filter((x) => x.layer === i && x.label !== 'shield-lid')) {
        for (const mesh of piece.meshes) {
          forEachWorldVertex(mesh, (v) => {
            real.expandByPoint(v.applyMatrix4(hero))
          })
        }
      }
      const slack = 1e-4
      expect(real.min.x, def.id).toBeGreaterThan(b.minX - slack)
      expect(real.max.x, def.id).toBeLessThan(b.maxX + slack)
      expect(real.min.y, def.id).toBeGreaterThan(b.minY - slack)
      expect(real.max.y, def.id).toBeLessThan(b.maxY + slack)
      expect(real.min.z, def.id).toBeGreaterThan(b.minZ - slack)
      expect(real.max.z, def.id).toBeLessThan(b.maxZ + slack)
    }
    for (const slot of showcaseBridge.layers) expect(slot.on).toBe(true)
    snapTo(0.25)
    expect(showcaseBridge.layer).toBe(-1)
    expect(showcaseBridge.bounds.on).toBe(false)
  }, 60_000)

  it('settles on the same pose for the same progress, damped or not (no lift pile-up)', () => {
    const sample = (): number[] =>
      pieces.flatMap((p) => [p.group.position.x, p.group.position.y, p.group.position.z])
    snapTo(0.41) // silicon presented: die lifted off its balls
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
