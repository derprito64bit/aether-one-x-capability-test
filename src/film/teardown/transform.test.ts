import { Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { LAYER_GAP, layerOffset, peelLocal } from './layers.ts'
import { composeLayerPose, createLayerPoses, type LayerPose } from './showcase.ts'
import {
  SHELL_POSE,
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
  it('snaps on the first frame and under reduced motion', () => {
    const s: TeardownScalars = { sep: 0, tour: -3, cursor: 0, ready: false }
    dampTeardownScalars(s, 1, 4.25, 1 / 60, false)
    expect(s.sep).toBe(1)
    expect(s.tour).toBe(4.25)
    expect(s.cursor).toBe(4.25)
    dampTeardownScalars(s, 0, -1, 1 / 60, true)
    expect(s.tour).toBe(-1)
    expect(s.cursor).toBe(0)
  })

  it('follows smoothly and clamps the copy cursor to the layer run', () => {
    const s: TeardownScalars = { sep: 1, tour: 9.5, cursor: 9.5, ready: true }
    dampTeardownScalars(s, 1, 11, 1 / 60, false)
    expect(s.tour).toBeGreaterThan(9.5)
    expect(s.tour).toBeLessThan(11)
    for (let k = 0; k < 600; k++) dampTeardownScalars(s, 1, 11, 1 / 60, false)
    expect(s.tour).toBe(11)
    expect(s.cursor).toBe(10)
  })
})
