import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { INTERNALS_KEYS, type InternalsMaterialSet } from './internalsMaterials.ts'
import { EXPLODE_PARTS, partProgress } from './explode.ts'
import { PART_LAYER, TEARDOWN_LAYERS, peelLocal } from '../teardown/layers.ts'
import { applyLayerTransform, cameraFeature } from '../teardown/transform.ts'
import { calloutBridge, featureAnchorBridge } from '../overlay/callouts.ts'
import { BoardPart } from './parts/board.tsx'
import { OpticsPart } from './parts/optics.tsx'
import { featureCalloutPart } from '../chapters.ts'
import { PowerPart } from './parts/power.tsx'
import type { PartRegister } from './parts/register.ts'
import { SiliconPart } from './parts/silicon.tsx'

/** Mutable per-frame control plane. Written by the director, read here. No React renders. */
export interface InternalsControl {
  opacity: number
  explode: number
  explodeBatt: number
  explodeRadial: number
  chipFocus: number
  chipLift: number
  battLift: number
  subjectDim: number
  energy: number
  /** Shield lids lifted on their own window, revealing components. */
  shieldLift: number
  /** Coil LED ring brightness for the Clear finish. */
  coilRing: number
  /** Teardown stack separation 0..1 (Prompt D). Overrides explode vectors. */
  stackSeparate: number
  /** Teardown continuous layer cursor 0..10 (Prompt D), damped: drives motion. */
  layerCursor: number
  /** Undamped layer cursor from progress: drives the featured part and pointer. */
  featureCursor: number
  /** Teardown layer gap in meters (compact on narrow viewports). */
  teardownGap: number
  /** Reduced motion: envelopes snap binary instead of travelling. */
  reducedMotion: boolean
}

interface InternalsProps {
  materials: InternalsMaterialSet
  control: MutableRefObject<InternalsControl>
}

/** Fallback for a part id missing from the layer map (never in practice). */
const FALLBACK_LAYER = TEARDOWN_LAYERS[5] as (typeof TEARDOWN_LAYERS)[number]

/** Shared goal extras for applyLayerTransform: zero allocation per frame. */
const EXTRAS = { feature: 0, liftZ: 0 }

/**
 * Teardown-mode act lift for a part, added to its layer goal: the die
 * rises rearward through the silicon beat, the shield lids lift on their
 * own window (straight off the board; no tilt, which swung the lids about
 * the body origin by ~10mm).
 */
function teardownLift(partId: string, chipLift: number, lidW: number): number {
  if (partId === 'die') return -chipLift * 0.004
  if (partId === 'shield-lid') return -lidW * 0.005
  return 0
}

/** Adds dz to every group registered under an id (legacy x-ray lifts). */
function bumpZ(targets: THREE.Group[] | undefined, dz: number): void {
  if (targets === undefined || dz === 0) return
  for (let i = 0; i < targets.length; i++) {
    const g = targets[i]
    if (g !== undefined) g.position.z += dz
  }
}

/** Spins each child of a registered part group about its own z axis. */
function spinChildren(group: THREE.Group, angle: number): void {
  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i]
    if (child !== undefined) child.rotation.z = angle
  }
}

/**
 * X-ray hardware stack. In the teardown every part rides its layer slot for
 * the director's shared damped scalars (separation, cursor), plus the act
 * lifts on the goal: shield lids on their own window, the die through the
 * silicon beat. Outside it parts sit assembled (the old radial fan-out and
 * tumble are retired). Screw spin is explode x 2PI about each screw's own
 * axis, never an accumulating angle, so the reverse scrub retraces exactly.
 */
export function Internals({ materials, control }: InternalsProps) {
  const groups = useRef<Record<string, THREE.Group[]>>({})
  const scratch = useRef({ dir: new THREE.Vector3(), box: new THREE.Box3() })
  // One stable callback per id, writing straight into groups.current, each
  // attach returning its own cleanup. The old register built its map
  // inside useMemo and repointed groups.current at it: under StrictMode's
  // double-invoked memo the driver read an empty map, so in dev no part
  // ever moved; and a null detach deleted every group sharing an id.
  const register: PartRegister = useMemo(() => {
    const cache = new Map<string, (g: THREE.Group | null) => (() => void) | undefined>()
    return (id: string) => {
      const cached = cache.get(id)
      if (cached !== undefined) return cached
      const attach = (g: THREE.Group | null): (() => void) | undefined => {
        if (g === null) return undefined
        // Tagged so scene probes and the layer-stack test can find parts.
        g.userData.partId = id
        groups.current[id] = [...(groups.current[id] ?? []), g]
        return () => {
          const next = (groups.current[id] ?? []).filter((x) => x !== g)
          if (next.length === 0) delete groups.current[id]
          else groups.current[id] = next
        }
      }
      cache.set(id, attach)
      return attach
    }
  }, [])

  useFrame(() => {
    const c = control.current
    for (const k of INTERNALS_KEYS) materials[k].opacity = c.opacity
    // Decals stay subordinate: marking low contrast, floorplan a whisper.
    materials.dieMark.opacity = c.opacity * 0.9
    materials.dieFloor.opacity = c.opacity * 0.25
    const visible = c.opacity > 0.01
    // Publish anchors for the HTML callout layer (one ref copy per frame).
    calloutBridge.anchors = groups.current
    const sep = c.stackSeparate
    const teardown = sep > 0.001
    const lidW = Math.min(1, Math.max(0, c.shieldLift))
    const feature = cameraFeature(c.layerCursor)
    for (const part of EXPLODE_PARTS) {
      const targets = groups.current[part.id]
      if (targets === undefined) continue
      // Spin is explode-driven in both modes so screws never unwind.
      const wSpin = partProgress(c.explode, part.delay)
      const layerIndex = PART_LAYER[part.id] ?? 5
      const layer = TEARDOWN_LAYERS[layerIndex] ?? FALLBACK_LAYER
      // Act lifts join the goal in teardown mode: added to the damped
      // position they piled up frame on frame (a frame-rate-dependent
      // 4-11mm sawtooth that drove the die through the thermal layer).
      // Scaled by the layer's own peel: the lift toward the next layer may
      // only use clearance the peel has opened (the lids' window outlasts
      // the restack, and lifted into the chamber as the stack closed).
      EXTRAS.feature = feature
      EXTRAS.liftZ = teardownLift(part.id, c.chipLift, lidW) * peelLocal(sep, layerIndex)
      for (const g of targets) {
        g.visible = visible
        if (teardown) {
          // Exactly on the layer goal for the shared, director-damped
          // scalars: one motion for every layer, so neighbours can never
          // invert. Shared helper with the director driver (round 03 A.6.4).
          applyLayerTransform(g, layer, sep, c.teardownGap, 1, undefined, EXTRAS)
        } else {
          // Assembled. The legacy x-ray fan-out (radial travel and tumble
          // on the explode scalar) is retired: explode only runs inside
          // the teardown span, and with the teardown scalars damped it
          // could fire while the stack was still closed, flinging screws
          // through the board on a fast reverse scroll.
          g.position.set(0, 0, 0)
          g.rotation.set(0, 0, 0)
          g.scale.setScalar(1)
        }
        // Screws spin on their own axis: the seat child sits at the screw,
        // the registered wrapper sits at the body origin (spinning the
        // wrapper swung every screw round the phone on a 39-78mm orbit).
        if (part.spin === true) spinChildren(g, wSpin * Math.PI * 2)
      }
    }
    if (!visible) return

    if (!teardown) {
      // Legacy x-ray mode: positions were set above this frame, so these
      // act lifts add once, never accumulate. The die lifts rearward,
      // revealing balls and substrate.
      bumpZ(groups.current.die, -c.chipLift * 0.004)
      bumpZ(groups.current['shield-lid'], -lidW * 0.005)
      const cellLift = c.explodeBatt * 0.003 + c.battLift * 0.003
      bumpZ(groups.current.cell, cellLift)
      bumpZ(groups.current['cell-wrap'], cellLift)
      bumpZ(groups.current['charge-coil'], c.explodeBatt * 0.0044)
    }

    // Subject dim: surroundings step back while the die or cell owns the frame.
    const dim = 1 - c.subjectDim * 0.55
    materials.board.opacity = c.opacity * dim
    materials.shield.opacity = c.opacity * dim
    materials.housing.opacity = c.opacity * (c.chipFocus > 0.4 ? dim : 1)
    // Featured-layer pop: unique-material parts glow while featured
    // (silicon die, battery band). Shared-material layers pop via position,
    // scale, and the rim accent instead.
    // Featured layer follows scroll progress (the copy's cursor), not the
    // damped motion cursor, so the pointer anchor always names the part
    // the overlay is labelling.
    const featured =
      sep > 0.001 && c.featureCursor > 0.02 && c.featureCursor < 9.99
        ? Math.min(9, Math.floor(c.featureCursor))
        : -1
    materials.die.emissiveIntensity = 0.7 + c.chipFocus * 1.6 + (featured === 5 ? 1.5 : 0)
    materials.cellGlow.opacity = c.opacity
    // Capped at 2.5: the authored 4.9 clipped against the 1.1 battery
    // exposure and bloomed like a video game (Prompt B section 5.3).
    materials.cellGlow.emissiveIntensity =
      1 + c.energy * 1 + c.battLift * 0.5 + (featured === 3 ? 1 : 0)
    // Coil status ring: charging indicator for the Clear finish.
    materials.coilRing.emissiveIntensity = 0.25 + c.coilRing * 2.4
    // Featured-layer anchor for the HTML pointer: the centre of the
    // featured part's own bounds. The group origin is the body origin
    // (parts carry their seats on child meshes), which put the die and
    // chamber leaders 35-41mm off their parts and the turned camera's
    // 46mm off the module, past the phone's far edge.
    const featPartId = featured >= 0 ? featureCalloutPart(featured) : null
    const featGroup = featPartId !== null ? (groups.current[featPartId]?.[0] ?? null) : null
    if (featGroup !== null) {
      featGroup.updateWorldMatrix(true, true)
      const box = scratch.current.box.setFromObject(featGroup)
      box.getCenter(scratch.current.dir)
      featureAnchorBridge.x = scratch.current.dir.x
      featureAnchorBridge.y = scratch.current.dir.y
      featureAnchorBridge.z = scratch.current.dir.z
      box.getSize(scratch.current.dir)
      featureAnchorBridge.radius =
        Math.max(scratch.current.dir.x, scratch.current.dir.y, scratch.current.dir.z) / 2
      // Stack centre: part groups hang off origin-seated groups under the
      // hero-locked internals root, so the parent's world position is it.
      ;(featGroup.parent ?? featGroup).getWorldPosition(scratch.current.dir)
      featureAnchorBridge.sx = scratch.current.dir.x
      featureAnchorBridge.sy = scratch.current.dir.y
      featureAnchorBridge.sz = scratch.current.dir.z
      featureAnchorBridge.partId = featPartId
      featureAnchorBridge.valid = true
    } else {
      featureAnchorBridge.partId = null
      featureAnchorBridge.valid = false
    }
  })

  return (
    <group>
      <BoardPart materials={materials} register={register} />
      <SiliconPart materials={materials} register={register} />
      <PowerPart materials={materials} register={register} />
      <OpticsPart materials={materials} register={register} />
    </group>
  )
}
