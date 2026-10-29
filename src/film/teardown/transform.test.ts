import { Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { LAYER_GAP, layerOffset, peelLocal } from './layers.ts'
import { composeLayerPose, createLayerPoses, type LayerPose } from './showcase.ts'
import {
  SHELL_POSE,
  TOUR_MAX_SPEED,
  dampTeardownScalars,
  driveShellLayers,
  type ShellGroups,
  type TeardownScalars,
} from './transform.ts'

const DIR = new Vector3(1, 0, 0)

function slotPoses(sep: number): LayerPose[] {
  const poses = createLayerPoses()
  poses.forEach((pose, i) => composeLayerPose(pose, i, sep, LAYER_GAP, 0, 0, null, DIR))
  return poses
}

function shell(): ShellGroups {
  return {
    frame: new Group(),
    back: new Group(),
    glass: new Group(),
    display: new Group(),
    module: new Group(),
  }
}

/** Shared slot transform: one pose per layer, both drivers. */
describe('teardown layer poses (slots)', () => {
  it('rests exactly at zero separation', () => {
    for (const pose of slotPoses(0)) {
      expect(pose.pos.length()).toBeLessThan(1e-12)
      expect(pose.quat.w).toBe(1)
    }
  })

  it('lands on the peel slot at full separation, unrotated', () => {
    slotPoses(1).forEach((pose, i) => {
      expect(pose.pos.x).toBe(0)
      expect(pose.pos.y).toBe(0)
      expect(pose.pos.z).toBeCloseTo(layerOffset(i, 10, LAYER_GAP, 1), 12)
      expect(pose.quat.w).toBe(1)
    })
  })

  it('peels outside-in: both faces lead mid-separation', () => {
    const poses = slotPoses(0.3)
    expect(peelLocal(0.3, 0)).toBeGreaterThan(peelLocal(0.3, 4))
    expect(poses[0]!.pos.z).toBeGreaterThan(0)
    expect(poses[9]!.pos.z).toBeLessThan(0)
  })
})

describe('driveShellLayers', () => {
  it('puts every shell group exactly on its layer pose', () => {
    const groups = shell()
    const poses = slotPoses(1)
    driveShellLayers(groups, poses)
    for (const [name, index] of Object.entries(SHELL_POSE)) {
      const g = groups[name as keyof typeof SHELL_POSE] as Group
      expect(g.position.z, name).toBeCloseTo(poses[index]!.pos.z, 12)
    }
  })

  it('keeps the camera bump bonded to the rear panel it nests in', () => {
    const groups = shell()
    groups.module!.position.set(0.1, 0.2, 0.3)
    groups.module!.rotation.set(1, 0, 0)
    driveShellLayers(groups, slotPoses(1))
    expect(groups.module!.position.length()).toBe(0)
    expect(groups.module!.quaternion.w).toBe(1)
  })
})

describe('dampTeardownScalars', () => {
  const dt = 1 / 60
  const run = (s: TeardownScalars, goal: number, seconds: number): void => {
    for (let k = 0; k < Math.round(seconds / dt); k++) dampTeardownScalars(s, 1, goal, dt, false)
  }

  it('caps a one-layer step at 0.75 layers per second, then settles exactly', () => {
    const s: TeardownScalars = { sep: 1, tour: 3.5, cursor: 3.5, ready: true, free: false }
    let prev = s.tour
    for (let k = 0; k < 30; k++) {
      dampTeardownScalars(s, 1, 4.5, dt, false)
      expect(s.tour - prev).toBeLessThanOrEqual(TOUR_MAX_SPEED * dt + 1e-12)
      prev = s.tour
    }
    // Half a second of a one-layer step moves the stack at most 0.375 layers.
    expect(s.tour - 3.5).toBeCloseTo(0.375, 9)
    expect(s.free).toBe(false)
    run(s, 4.5, 6)
    expect(s.tour).toBe(4.5)
    // And back down the same way.
    run(s, 3.5, 6)
    expect(s.tour).toBe(3.5)
  })

  it('lets a long jump or an approach from outside the tour run uncapped', () => {
    // A 6-layer rail jump settles in well under 2 s.
    const jump: TeardownScalars = { sep: 1, tour: 1.5, cursor: 1.5, ready: true, free: false }
    run(jump, 7.5, 1)
    expect(Math.abs(jump.tour - 7.5)).toBeLessThan(0.05)
    run(jump, 7.5, 2)
    expect(jump.tour).toBe(7.5)
    expect(jump.free).toBe(false)
    // From the glass act (tour clamped at -3) to the overview stop (-0.3):
    // arrives within a second, not ~8 s behind.
    const approach: TeardownScalars = { sep: 1, tour: -3, cursor: 0, ready: true, free: false }
    run(approach, -0.3, 1)
    expect(Math.abs(approach.tour + 0.3)).toBeLessThan(0.05)
    // A local step after a long move is capped again.
    run(approach, -0.3, 3)
    const before = approach.tour
    dampTeardownScalars(approach, 1, 0.7, dt, false)
    expect(approach.tour - before).toBeLessThanOrEqual(TOUR_MAX_SPEED * dt + 1e-12)
  })

  it('snaps on the first frame and under reduced motion', () => {
    const s: TeardownScalars = { sep: 0, tour: -3, cursor: 0, ready: false, free: false }
    dampTeardownScalars(s, 1, 4.25, 1 / 60, false)
    expect(s.sep).toBe(1)
    expect(s.tour).toBe(4.25)
    expect(s.cursor).toBe(4.25)
    dampTeardownScalars(s, 0, -1, 1 / 60, true)
    expect(s.tour).toBe(-1)
    expect(s.cursor).toBe(0)
  })

  it('follows smoothly and clamps the copy cursor to the layer run', () => {
    const s: TeardownScalars = { sep: 1, tour: 9.5, cursor: 9.5, ready: true, free: false }
    dampTeardownScalars(s, 1, 11, 1 / 60, false)
    expect(s.tour).toBeGreaterThan(9.5)
    expect(s.tour).toBeLessThan(11)
    for (let k = 0; k < 600; k++) dampTeardownScalars(s, 1, 11, 1 / 60, false)
    expect(s.tour).toBe(11)
    expect(s.cursor).toBe(10)
  })
})
