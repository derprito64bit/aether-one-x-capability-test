import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { sampleFilm } from '../sample.ts'
import { SHOTS } from '../shots.ts'
import { computeFilmStates } from '../states.ts'
import { actAt } from '../timeline.ts'
import { LAYER_GAP, LAYER_GAP_COMPACT } from './layers.ts'
import {
  dampAimOffset,
  dampTeardownScalars,
  teardownAimGoal,
  type AimOffset,
  type TeardownScalars,
} from './transform.ts'

/**
 * The teardown aim offset must glide, never step in one frame (round 04):
 * the tour drift used to be added raw, keyed on the floor of the cursor,
 * so the frame jumped ~45px as the tour began, ~10px at every layer
 * boundary, and ~40px at its end; the portrait drop vanished at the act
 * change. Runs the director's per-frame aim math (damped scalars, featured
 * layer from the damped cursor, summed goal, one damped offset) across the
 * teardown at scroll speed, forward and reverse.
 */
const DT = 1 / 60
/**
 * Largest change one 60fps frame may make in the drift and drop terms (m),
 * about 9px on desktop. The aim legitimately moves with the stack (the
 * portrait drop tracks the opening at ~2mm a frame on a fast scroll); a
 * raw step was 13-19mm in a single frame.
 */
const MAX_STEP = 0.0025

interface Run {
  /** Worst per-frame change of the damped aim offset. */
  aim: number
  /** Worst per-frame change of the slide-follow part of the goal. */
  slideGoal: number
}

function run(from: number, to: number, dp: number, aspect: number, withSlide: boolean): Run {
  const gap = aspect < 0.8 ? LAYER_GAP_COMPACT : LAYER_GAP
  const td: TeardownScalars = { sep: 0, cursor: 0, ready: false }
  const aim = { x: 0, y: 0, z: 0, ready: false }
  const goal: AimOffset = { x: 0, y: 0, z: 0 }
  const bare: AimOffset = { x: 0, y: 0, z: 0 }
  const scratch = new THREE.Vector3()
  const euler = new THREE.Euler()
  const quat = new THREE.Quaternion()
  const out: Run = { aim: 0, slideGoal: 0 }
  let prevSlide: [number, number, number] | null = null
  const steps = Math.ceil(Math.abs(to - from) / dp)
  for (let k = 0; k <= steps; k++) {
    const p = from + ((to - from) * k) / steps
    const st = computeFilmStates(p)
    const t = sampleFilm(p)
    const act = actAt(p).id
    const inTeardown = act === 'teardown'
    dampTeardownScalars(td, st.stackSeparate, st.layerCursor, DT, false)
    const featured = td.cursor > 0.02 && td.cursor < 9.99 ? Math.min(9, Math.floor(td.cursor)) : -1
    quat.setFromEuler(euler.set(t.rx, t.ry, t.rz))
    const scale = withSlide ? t.scale : 0
    teardownAimGoal(
      goal,
      inTeardown,
      featured,
      td.sep,
      td.cursor,
      gap,
      aspect,
      quat,
      scale,
      scratch,
    )
    teardownAimGoal(bare, inTeardown, featured, td.sep, td.cursor, gap, aspect, quat, 0, scratch)
    const slide: [number, number, number] = [goal.x - bare.x, goal.y - bare.y, goal.z - bare.z]
    if (prevSlide !== null) {
      out.slideGoal = Math.max(
        out.slideGoal,
        Math.hypot(slide[0] - prevSlide[0], slide[1] - prevSlide[1], slide[2] - prevSlide[2]),
      )
    }
    prevSlide = slide
    const lookDamp = 1 - Math.exp(-DT * (SHOTS[act] ?? SHOTS.arrival).targetDampPerSecond)
    const bx = aim.x
    const by = aim.y
    const bz = aim.z
    dampAimOffset(aim, goal, lookDamp)
    if (k > 0) out.aim = Math.max(out.aim, Math.hypot(aim.x - bx, aim.y - by, aim.z - bz))
  }
  return out
}

describe('teardown aim offset', () => {
  const cases: Array<[number, number]> = []
  for (const aspect of [1440 / 900, 390 / 844]) {
    for (const dp of [0.0003, 0.001]) cases.push([aspect, dp])
  }

  it('never steps the drift or portrait drop, either direction', () => {
    for (const [aspect, dp] of cases) {
      const tag = `aspect ${aspect.toFixed(2)} dp ${dp}`
      expect(run(0.24, 0.53, dp, aspect, false).aim, `fwd ${tag}`).toBeLessThan(MAX_STEP)
      expect(run(0.53, 0.24, dp, aspect, false).aim, `rev ${tag}`).toBeLessThan(MAX_STEP)
    }
  })

  it('follows the camera-layer slide without ever outrunning it', () => {
    for (const [aspect, dp] of cases) {
      for (const [from, to] of [
        [0.24, 0.53],
        [0.53, 0.24],
      ] as const) {
        const r = run(from, to, dp, aspect, true)
        expect(r.aim, `${from}->${to} aspect ${aspect.toFixed(2)} dp ${dp}`).toBeLessThan(
          r.slideGoal + MAX_STEP,
        )
      }
    }
  })

  it('summed raw, the same goal would step the frame (the bug this replaces)', () => {
    // The undamped goal jumps by the half-gap drift as the tour begins.
    const goal: AimOffset = { x: 0, y: 0, z: 0 }
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    const a = teardownAimGoal(goal, true, -1, 1, 0, LAYER_GAP, 1.6, q, 1, v).y
    const b = teardownAimGoal(goal, true, 0, 1, 0.03, LAYER_GAP, 1.6, q, 1, v).y
    expect(Math.abs(b - a)).toBeGreaterThan(MAX_STEP * 7)
  })
})
