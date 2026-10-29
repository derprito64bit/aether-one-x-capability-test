import type { Group } from 'three'
import { DIM } from '../../components/PhoneViewer/phoneDimensions.ts'
import { LAYER_GAP } from './layers.ts'
import { applyPose, type LayerPose } from './showcase.ts'

/** Shared teardown scalars, damped once per frame for every layer. */
export interface TeardownScalars {
  sep: number
  /** Unclamped tour cursor (showcase.ts): the overview lives below 0. */
  tour: number
  /** The tour cursor clamped to the layer run, 0..10 (overlay copy). */
  cursor: number
  ready: boolean
}

/** Rate at which the shared teardown scalars follow scroll, per second. */
const TEARDOWN_FOLLOW = 5

/**
 * Damps the teardown's shared scalars (separation and tour cursor) toward
 * their progress values once per frame; every layer, shell and internal,
 * then rides pure goals of these same numbers. Each group used to damp its
 * own position at its own rate, so neighbours lagged by different amounts
 * and inverted mid-peel even though their goals never did. Snaps under
 * reduced motion and on the first frame. Zero allocation: writes `state`.
 */
export function dampTeardownScalars(
  state: TeardownScalars,
  sep: number,
  tour: number,
  delta: number,
  reduced: boolean,
): void {
  const k = reduced || !state.ready ? 1 : 1 - Math.exp(-delta * TEARDOWN_FOLLOW)
  state.sep += (sep - state.sep) * k
  state.tour += (tour - state.tour) * k
  if (Math.abs(sep - state.sep) < 1e-5) state.sep = sep
  if (Math.abs(tour - state.tour) < 1e-4) state.tour = tour
  state.cursor = Math.min(10, Math.max(0, state.tour))
  state.ready = true
}

/** PhoneModel shell groups the teardown moves (null while unmounted). */
export type ShellGroups = Record<'frame' | 'back' | 'glass' | 'display' | 'module', Group | null>

/** Shell group to the teardown layer whose pose it rides. */
export const SHELL_POSE: Record<'frame' | 'back' | 'glass' | 'display', number> = {
  glass: 0,
  display: 1,
  frame: 2,
  back: 9,
}

/**
 * Drives every shell group exactly onto its layer pose (showcase.ts
 * composeLayerPose, computed once per frame by the director): the
 * director's shell driver, shared with layerStack.test.tsx so the test
 * exercises the shipped path. The camera bump rides the rear panel it is
 * bonded to (the module group nests in the back group), so it parks at
 * rest relative to it. Zero allocation.
 */
const SHELL_NAMES = ['glass', 'display', 'frame', 'back'] as const

export function driveShellLayers(groups: ShellGroups, poses: readonly LayerPose[]): void {
  for (const name of SHELL_NAMES) {
    const grp = groups[name]
    const pose = poses[SHELL_POSE[name]]
    if (grp !== null && pose !== undefined) applyPose(grp, pose)
  }
  const module = groups.module
  if (module !== null) {
    module.position.set(0, 0, 0)
    module.quaternion.identity()
    module.scale.setScalar(1)
  }
}

type V3 = readonly [number, number, number]

function vsub(a: V3, b: V3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vnorm(v: [number, number, number]): [number, number, number] {
  const m = Math.hypot(v[0], v[1], v[2])
  return m > 1e-12 ? [v[0] / m, v[1] / m, v[2] / m] : [0, 0, 1]
}

function vdot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function vrotX(v: V3, a: number): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]
}

function vrotY(v: V3, a: number): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]
}

export interface StackProjection {
  /** Camera elevation above the target plane, degrees. */
  elevationDeg: number
  /** Stack-axis share wasted into view depth (target < 0.50). */
  intoDepth: number
  /** Stack-axis share on screen-vertical (target > 0.85). */
  onScreenUp: number
  /** Separated stack height on screen, mm. */
  stackHeightMm: number
  /** One plate's vertical extent on screen, mm. */
  plateHeightMm: number
  /** Stack over plate (target > 0.65: the >0.80 bar contradicts the
   * protected 8.5mm gap, whose ceiling is ~0.70 — user ruling 2026-09-22). */
  ratio: number
}

/**
 * How the separated stack projects for a posed device and camera (round
 * 03 Part A acceptance 1-4). Pure math over the sampled timeline: the
 * K.3 probe script as a unit test, no renderer.
 */
export function stackProjection(
  rx: number,
  ry: number,
  scale: number,
  camPos: V3,
  target: V3,
): StackProjection {
  const view = vnorm(vsub(target, camPos))
  const elevationDeg = (Math.asin(Math.min(1, Math.max(-1, -view[1]))) * 180) / Math.PI
  const k = vdot([0, 1, 0], view)
  const up = vnorm([0 - k * view[0], 1 - k * view[1], 0 - k * view[2]])
  const stack = vnorm(vrotY(vrotX([0, 0, 1], rx), ry))
  const long = vnorm(vrotY(vrotX([0, 1, 0], rx), ry))
  const onUp = Math.abs(vdot(stack, up))
  const stackH = 9 * LAYER_GAP * onUp
  const plateH = scale * DIM.h * Math.abs(vdot(long, up))
  return {
    elevationDeg,
    intoDepth: Math.abs(vdot(stack, view)),
    onScreenUp: onUp,
    stackHeightMm: stackH * 1000,
    plateHeightMm: plateH * 1000,
    ratio: plateH > 1e-9 ? stackH / plateH : 0,
  }
}
