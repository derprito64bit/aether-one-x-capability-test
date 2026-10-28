import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { INTERNALS_KEYS, type InternalsMaterialSet } from './internalsMaterials.ts'
import { EXPLODE_PARTS, partProgress } from './explode.ts'
import { PART_LAYER } from '../teardown/layers.ts'
import { applyPose, type LayerPose } from '../teardown/showcase.ts'
import { BoardPart } from './parts/board.tsx'
import { OpticsPart } from './parts/optics.tsx'
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
  /**
   * Teardown layer poses, hero-local, one per layer (showcase.ts), written
   * by the director each frame; every part rides its layer's pose.
   */
  poses: LayerPose[]
  /** Presented showcase layer (0..9) or -1, and its focus 0..1. */
  showcaseLayer: number
  showcaseFocus: number
  /** Silicon die lift along its layer's -z (m), revealing the balls. */
  dieLift: number
  /** Opacity factor per layer (0..9) plus the shield lids (10). */
  layerAlpha: Float32Array
  /** Teardown layer gap in meters. */
  teardownGap: number
  /** Reduced motion: envelopes snap binary instead of travelling. */
  reducedMotion: boolean
}

interface InternalsProps {
  materials: InternalsMaterialSet
  control: MutableRefObject<InternalsControl>
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
 * X-ray hardware stack. In the teardown every part rides its layer's pose
 * (the director composes one per layer from the shared damped scalars:
 * slot, slide-out, flight to the showcase hero pose), plus the die's lift
 * while the silicon is presented. Outside it parts sit assembled. Screw
 * spin is explode x 2PI about each screw's own axis, never an
 * accumulating angle, so the reverse scrub retraces exactly.
 */
export function Internals({ materials, control }: InternalsProps) {
  const groups = useRef<Record<string, THREE.Group[]>>({})
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
    materials.dieFloor.opacity = c.opacity * 0.85
    const visible = c.opacity > 0.01
    const teardown = c.stackSeparate > 0.001
    for (const part of EXPLODE_PARTS) {
      const targets = groups.current[part.id]
      if (targets === undefined) continue
      // Spin is explode-driven in both modes so screws never unwind.
      const wSpin = partProgress(c.explode, part.delay)
      const pose = c.poses[PART_LAYER[part.id] ?? 5]
      // The die lifts off its balls along its own layer's -z while the
      // silicon is presented (the lift joins the pose, never the position).
      const lift = part.id === 'die' ? -c.dieLift : 0
      for (const g of targets) {
        g.visible = visible
        if (teardown && pose !== undefined) {
          // Exactly on the layer pose the director composed for the shared
          // damped scalars: one motion per layer, so neighbours can never
          // invert, and the shell driver shares the same poses.
          applyPose(g, pose, lift)
        } else {
          // Assembled. The legacy x-ray fan-out (radial travel and tumble
          // on the explode scalar) is retired.
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
      // Legacy x-ray mode (energy beat): positions were set above this
      // frame, so these act lifts add once, never accumulate.
      const lidW = Math.min(1, Math.max(0, c.shieldLift))
      bumpZ(groups.current.die, -c.chipLift * 0.004)
      bumpZ(groups.current['shield-lid'], -lidW * 0.005)
      const cellLift = c.explodeBatt * 0.003 + c.battLift * 0.003
      bumpZ(groups.current.cell, cellLift)
      bumpZ(groups.current['cell-wrap'], cellLift)
      bumpZ(groups.current['charge-coil'], c.explodeBatt * 0.0044)
    }

    // Subject dim: surroundings step back while the cell owns the frame.
    const dim = 1 - c.subjectDim * 0.55
    materials.board.opacity = c.opacity * dim
    materials.shield.opacity = c.opacity * dim
    // Presented-layer pop: unique-material parts glow while presented
    // (silicon die, battery band). Every layer also gets the accent light.
    const silicon = c.showcaseLayer === 5 ? c.showcaseFocus : 0
    const battery = c.showcaseLayer === 3 ? c.showcaseFocus : 0
    // A faint cool lift when presented, never a glow: the die stays dark.
    materials.die.emissiveIntensity = 0.18 + silicon * 0.14
    materials.cellGlow.opacity = c.opacity
    // Capped at 2.5: the authored 4.9 clipped against the 1.1 battery
    // exposure and bloomed like a video game (Prompt B section 5.3).
    materials.cellGlow.emissiveIntensity = 1 + c.energy * 1 + c.battLift * 0.5 + battery
    // Coil status ring: charging indicator for the Clear finish.
    materials.coilRing.emissiveIntensity = 0.25 + c.coilRing * 2.4
    // Priority -0.5: after the director (-1) wrote the control plane, and
    // before the showcase dimmer (0) copies material state per layer.
  }, -0.5)

  return (
    <group>
      <BoardPart materials={materials} register={register} />
      <SiliconPart materials={materials} register={register} />
      <PowerPart materials={materials} register={register} />
      <OpticsPart materials={materials} register={register} />
    </group>
  )
}
