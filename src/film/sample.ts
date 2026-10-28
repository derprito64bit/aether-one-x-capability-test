import * as THREE from 'three'
import { DIM } from '../components/PhoneViewer/phoneDimensions.ts'
import { projectedExtentM, type ProjectedExtents } from '../lib/projected-extent.ts'
import { dollyZoomFov } from '../zoom/zoom.ts'
import { fitFov, macroFloorFov } from './framing.ts'
import { smoothstep, type FilmKey } from './key.ts'
import { layerWindow } from './states.ts'
import { KEYS } from './timeline.ts'

export interface FilmSample {
  /** Camera world position. */
  pos: THREE.Vector3
  /** Camera look-at target. */
  target: THREE.Vector3
  /** Author fallback vertical FOV in degrees. */
  fov: number
  /** Responsive fit share, or null to keep the authored macro FOV. */
  fit: number | null
  /** Upper FOV clamp for this sample. */
  fovMax: number
  /** Phone group pose. */
  rx: number
  ry: number
  rz: number
  scale: number
  px: number
  py: number
  /** Lighting look channels. */
  exposure: number
  glass: number
}

interface Segment {
  a: FilmKey
  b: FilmKey
  t: number
  ia: number
  ib: number
}

/** Last segment index hint: p is near-monotonic, so resume the scan there. */
const SEG_HINT = { index: 1 }

/** Scratch segment for findSegment: zero allocation per frame (round 01 A6). */
const SEG_SCRATCH: Segment = {
  a: undefined as unknown as FilmKey,
  b: undefined as unknown as FilmKey,
  t: 0,
  ia: 0,
  ib: 0,
}

/** Locates the authored segment at progress p with the eased local parameter. */
function findSegment(p: number, out: Segment): Segment {
  const first = KEYS[0]
  if (first === undefined) throw new Error('KEYS must not be empty')
  if (p <= first.at) {
    SEG_HINT.index = 1
    out.a = first
    out.b = first
    out.t = 0
    out.ia = 0
    out.ib = 0
    return out
  }
  // Backward scrub: the hinted segment starts after p, rescan from the top.
  if (SEG_HINT.index > 1) {
    const hinted = KEYS[SEG_HINT.index - 1]
    if (hinted !== undefined && p < hinted.at) SEG_HINT.index = 1
  }
  for (let i = SEG_HINT.index; i < KEYS.length; i++) {
    const b = KEYS[i]
    const a = KEYS[i - 1]
    if (b === undefined || a === undefined) continue
    if (p <= b.at) {
      SEG_HINT.index = i
      const u = (p - a.at) / (b.at - a.at)
      // Ease only where authored: the segment's start key carries it. Every
      // other segment interpolates linearly so keys are passed at speed
      // instead of stalling to a velocity zero (round 01 A5).
      out.a = a
      out.b = b
      out.t = a.ease === 'smooth' ? smoothstep(u) : u
      out.ia = i - 1
      out.ib = i
      return out
    }
  }
  const last = KEYS[KEYS.length - 1]
  if (last === undefined) throw new Error('KEYS must not be empty')
  SEG_HINT.index = KEYS.length
  out.a = last
  out.b = last
  out.t = 0
  out.ia = KEYS.length - 1
  out.ib = KEYS.length - 1
  return out
}

/**
 * Three's CatmullRomCurve3 uses uniform knots, so sampling at raw p lands key
 * i at u = i/(N-1) instead of at its authored at, sliding camera travel
 * against the pose and FOV timelines. Re-clocking onto the author segment
 * clock forces each key to land exactly at its authored progress.
 */
function reclockedCurveParam(seg: Segment): number {
  return (seg.ia + (seg.ib - seg.ia) * seg.t) / (KEYS.length - 1)
}

const POS_PTS = KEYS.map((k) => new THREE.Vector3(...k.camera.pos))
const TGT_PTS = KEYS.map((k) => new THREE.Vector3(...k.camera.target))
/** Position glides looser than aim so the eye leads and settles slightly later. */
const POS_CURVE = new THREE.CatmullRomCurve3(POS_PTS, false, 'catmullrom', 0.32)
const TGT_CURVE = new THREE.CatmullRomCurve3(TGT_PTS, false, 'catmullrom', 0.42)

const OUT: FilmSample = {
  pos: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 0,
  fit: null,
  fovMax: 52,
  rx: 0,
  ry: 0,
  rz: 0,
  scale: 0,
  px: 0,
  py: 0,
  exposure: 1,
  glass: 0.5,
}

/**
 * Samples the master timeline at progress p. Reuses one scratch object:
 * zero allocation per frame. Camera rides the Catmull-Rom path; pose, FOV,
 * and look ease between keys.
 */
export function sampleFilm(p: number): FilmSample {
  // One segment lookup per frame (round 01 A6): the curve param derives
  // from the same scratch the pose/FOV blend reads below.
  const { a, b, t } = findSegment(p, SEG_SCRATCH)
  const u = reclockedCurveParam(SEG_SCRATCH)
  POS_CURVE.getPoint(u, OUT.pos)
  TGT_CURVE.getPoint(u, OUT.target)

  OUT.rx = a.pose.rx + (b.pose.rx - a.pose.rx) * t
  OUT.ry = a.pose.ry + (b.pose.ry - a.pose.ry) * t
  OUT.rz = a.pose.rz + (b.pose.rz - a.pose.rz) * t
  OUT.scale = a.pose.scale + (b.pose.scale - a.pose.scale) * t
  OUT.px = a.pose.px + (b.pose.px - a.pose.px) * t
  OUT.py = a.pose.py + (b.pose.py - a.pose.py) * t
  OUT.fov = a.lens.fov + (b.lens.fov - a.lens.fov) * t
  OUT.exposure = a.look.exposure + (b.look.exposure - a.look.exposure) * t
  OUT.glass = a.look.glass + (b.look.glass - a.look.glass) * t

  // Responsive framing owns a segment only when both endpoints carry fit.
  OUT.fit =
    a.lens.fit != null && b.lens.fit != null ? a.lens.fit + (b.lens.fit - a.lens.fit) * t : null
  const aMax = a.lens.fovMax ?? 52
  const bMax = b.lens.fovMax ?? 52
  OUT.fovMax = aMax + (bMax - aMax) * t
  return OUT
}

/** Exposes the authored keys for tests and the dev scrubber. */
export function filmKeys(): readonly FilmKey[] {
  return KEYS
}

/** Caller-owned scratch for filmTargetFov: camera and aim tuples, extents. */
export interface FovScratch {
  cam: [number, number, number]
  tgt: [number, number, number]
  extents: ProjectedExtents
}

/**
 * The FOV the film aims for at a sample: the authored lens, blended toward
 * the responsive fit of the (separated) stack, the narrow-viewport macro
 * floor, and the silicon-beat vertigo. One function for the director (live
 * camera, damped aim) and the continuity test (sampled camera), so the
 * test measures what ships. `stackSep` widens the fit box with the stack;
 * `vertigoCursor` is null under reduced motion. Zero allocation: the
 * caller fills scratch.cam and scratch.tgt.
 */
export function filmTargetFov(
  t: FilmSample,
  p: number,
  aspect: number,
  gap: number,
  stackSep: number,
  distance: number,
  vertigoCursor: number | null,
  scratch: FovScratch,
): number {
  let target = t.fov
  if (t.fit !== null) {
    // Size the fit to the separated stack, not one plate (round 03
    // A.6.2): the box depth grows with the separation, so framing opens
    // as the layers lift and closes as they restack.
    projectedExtentM(
      { w: DIM.w, h: DIM.h, t: DIM.t + 9 * gap * stackSep },
      t.scale,
      t.rx,
      t.ry,
      t.rz,
      scratch.cam,
      scratch.tgt,
      scratch.extents,
    )
    const fitValue = fitFov({
      fit: t.fit,
      distanceM: distance,
      aspect,
      scale: t.scale,
      rxRad: t.rx,
      ryRad: t.ry,
      pxM: t.px,
      maxFovDeg: t.fovMax,
      extents: scratch.extents,
    })
    const w = Math.min(1, Math.max(0, t.fit))
    target = Math.min(t.fovMax, t.fov + (fitValue - t.fov) * w)
  }
  if (aspect < 0.8) {
    const floor = macroFloorFov(p, distance, aspect)
    if (floor > target) target = floor
  }
  // Vertigo once, on the silicon feature: widen the lens while the camera
  // pushes in so the die holds size and the background warps. Derived from
  // the layer cursor, not raw progress, so the beat tracks layer 5.
  if (vertigoCursor !== null) {
    const w = layerWindow(vertigoCursor, 5, 0.5, 0.5)
    if (w > 0) target += (dollyZoomFov(target, w * 0.12, distance) - target) * w
  }
  return target
}
