import * as THREE from 'three'
import { SCENE_IDS, sceneWeights, type SceneId } from './backdrop/scenes.ts'

/**
 * Per-room lighting (round 06, section scenes; every room dark since
 * round 07). The spot rooms (the 3D studio, titanium, glass) light the
 * phone from the spotlight above with cool rims. The other dark rooms dim
 * the studio rig and light the phone like the room behind it: a projector key from the beam's corner, coloured rims for the
 * spectrum, data, charge, and neural rooms. Room lights are directional and
 * camera-relative (their direction is authored in camera space, x right, y
 * up, z toward the viewer), so the projector key always comes from the
 * upper-left of the frame wherever the camera orbits. Pure function of
 * progress via sceneWeights: no damping, exact on reverse scrub.
 */
export interface RoomLight {
  color: string
  intensity: number
  /** Camera-space direction from the subject toward the light. */
  dir: readonly [number, number, number]
}

export interface SceneLight {
  /** Multiplier on the studio rig (key, fill, rim, accent, ambient). */
  studio: number
  /**
   * Overhead spotlight (a real SpotLight above the subject, inverse-square
   * falloff, soft penumbra), candela-like. Only the spot rooms use it.
   */
  spot: number
  /** scene.environmentIntensity: a black room must not reflect a studio. */
  env: number
  /** Exposure multiplier on top of the act's. */
  exposure: number
  key: RoomLight
  rimL: RoomLight
  rimR: RoomLight
}

const OFF: RoomLight = { color: '#ffffff', intensity: 0, dir: [0, 0, 1] }

/**
 * Round 07: the studio is a dark room with a spotlight, and the titanium
 * and glass rooms are dark too. A strong top key from the spot's
 * direction, cool rims to lift the silhouette off black, and a trimmed
 * studio rig so the obsidian faces still read.
 */
const SPOT_ROOM: SceneLight = {
  studio: 0.28,
  spot: 3,
  env: 0.3,
  exposure: 1,
  key: { color: '#f2f5ff', intensity: 1.5, dir: [0.12, 1, 0.38] },
  rimL: { color: '#9ec2ff', intensity: 2.8, dir: [-1, 0.2, -0.3] },
  rimR: { color: '#d4e2ff', intensity: 4, dir: [1, 0.25, -0.25] },
}

export const SCENE_LIGHT: Readonly<Record<SceneId, SceneLight>> = {
  studio: SPOT_ROOM,
  titanium: SPOT_ROOM,
  glass: SPOT_ROOM,
  // Camera act: the HTML beam comes from off-frame upper left (about x
  // -0.25w, y -0.2h). Strong cool-white key from there, a crisp rim on
  // the right edge, deep falloff everywhere else.
  projector: {
    studio: 0.14,
    spot: 0,
    env: 0.34,
    exposure: 1,
    key: { color: '#eef4ff', intensity: 6, dir: [-1.25, 0.95, 0.6] },
    rimL: OFF,
    rimR: { color: '#ffffff', intensity: 5.5, dir: [1, 0.2, -0.15] },
  },
  // Display act: cyan from the left, magenta from the right, a soft
  // neutral key so the screen still reads.
  spectrum: {
    studio: 0.35,
    spot: 0,
    env: 0.35,
    exposure: 1,
    key: { color: '#ffffff', intensity: 0.9, dir: [0.2, 0.55, 1] },
    rimL: { color: '#39d0ff', intensity: 7, dir: [-1, 0.15, -0.1] },
    rimR: { color: '#ff4fb4', intensity: 7, dir: [1, 0.15, -0.1] },
  },
  data: {
    studio: 0.3,
    spot: 0,
    env: 0.35,
    exposure: 1,
    key: { color: '#dfe8ff', intensity: 1.4, dir: [-0.6, 0.8, 0.8] },
    rimL: { color: '#4f7cff', intensity: 3.5, dir: [-1, 0.2, -0.1] },
    rimR: { color: '#4f7cff', intensity: 6, dir: [1, 0.2, -0.1] },
  },
  // Battery act: the x-ray close-up of the internals must stay legible,
  // so more of the studio rig survives here.
  charge: {
    studio: 0.5,
    spot: 0,
    env: 0.4,
    exposure: 1,
    key: { color: '#e8fff2', intensity: 1.4, dir: [-0.6, 0.8, 0.8] },
    rimL: { color: '#3ee08f', intensity: 3.5, dir: [-1, 0.2, -0.1] },
    rimR: { color: '#3ee08f', intensity: 5.5, dir: [1, 0.2, -0.1] },
  },
  os: {
    studio: 0.35,
    spot: 0,
    env: 0.4,
    exposure: 1,
    key: { color: '#eef3ff', intensity: 1.8, dir: [-0.5, 0.7, 0.9] },
    rimL: { color: '#dfe8ff', intensity: 2.6, dir: [-1, 0.2, -0.1] },
    rimR: { color: '#dfe8ff', intensity: 3.2, dir: [1, 0.2, -0.1] },
  },
  neural: {
    studio: 0.3,
    spot: 0,
    env: 0.35,
    exposure: 1,
    key: { color: '#e6ecff', intensity: 1.4, dir: [-0.6, 0.8, 0.8] },
    rimL: { color: '#4d7dff', intensity: 3.5, dir: [-1, 0.2, -0.1] },
    rimR: { color: '#4d7dff', intensity: 6, dir: [1, 0.2, -0.1] },
  },
}

/** One blended room light: colour, intensity, camera-space direction. */
export interface BlendedRoomLight {
  color: THREE.Color
  intensity: number
  dir: THREE.Vector3
}

export interface BlendedSceneLight {
  studio: number
  spot: number
  env: number
  exposure: number
  key: BlendedRoomLight
  rimL: BlendedRoomLight
  rimR: BlendedRoomLight
}

function roomLight(): BlendedRoomLight {
  return { color: new THREE.Color(1, 1, 1), intensity: 0, dir: new THREE.Vector3(0, 0, 1) }
}

export function createSceneLight(): BlendedSceneLight {
  return {
    studio: 1,
    spot: 0,
    env: 1,
    exposure: 1,
    key: roomLight(),
    rimL: roomLight(),
    rimR: roomLight(),
  }
}

const WEIGHTS = new Float32Array(SCENE_IDS.length)
const TMP = new THREE.Color()
/** Parsed colours per scene and slot, built once (no per-frame parsing). */
const PARSED = SCENE_IDS.map((id) => {
  const s = SCENE_LIGHT[id]
  return {
    key: new THREE.Color(s.key.color),
    rimL: new THREE.Color(s.rimL.color),
    rimR: new THREE.Color(s.rimR.color),
  }
})

function blendSlot(out: BlendedRoomLight, slot: 'key' | 'rimL' | 'rimR'): void {
  out.intensity = 0
  out.color.setRGB(0, 0, 0)
  out.dir.set(0, 0, 0)
  for (let i = 0; i < SCENE_IDS.length; i++) {
    const w = WEIGHTS[i] ?? 0
    if (w <= 0) continue
    const light = SCENE_LIGHT[SCENE_IDS[i] as SceneId][slot]
    const amount = w * light.intensity
    if (amount <= 0) continue
    out.intensity += amount
    TMP.copy((PARSED[i] as (typeof PARSED)[number])[slot]).multiplyScalar(amount)
    out.color.add(TMP)
    out.dir.x += light.dir[0] * amount
    out.dir.y += light.dir[1] * amount
    out.dir.z += light.dir[2] * amount
  }
  if (out.intensity > 0) out.color.multiplyScalar(1 / out.intensity)
  else out.color.setRGB(1, 1, 1)
  if (out.dir.lengthSq() < 1e-12) out.dir.set(0, 0, 1)
  else out.dir.normalize()
}

/** Blends the room lighting for progress p into `out`. Zero allocation. */
export function blendSceneLight(p: number, out: BlendedSceneLight): BlendedSceneLight {
  sceneWeights(p, WEIGHTS)
  out.studio = 0
  out.spot = 0
  out.env = 0
  out.exposure = 0
  for (let i = 0; i < SCENE_IDS.length; i++) {
    const w = WEIGHTS[i] ?? 0
    const s = SCENE_LIGHT[SCENE_IDS[i] as SceneId]
    out.studio += w * s.studio
    out.spot += w * s.spot
    out.env += w * s.env
    out.exposure += w * s.exposure
  }
  blendSlot(out.key, 'key')
  blendSlot(out.rimL, 'rimL')
  blendSlot(out.rimR, 'rimR')
  return out
}
