import * as THREE from 'three'
import { sampleFilm } from '../sample.ts'
import type { RigCamera } from './showcase.ts'

/**
 * Test helpers shared by the showcase tests (not shipped): the sampled
 * hero transform and a projection camera matching the rig.
 */
/** The hero group's world matrix at progress p (sampled teardown pose). */
export function heroAt(p: number): THREE.Matrix4 {
  const t = sampleFilm(p)
  return new THREE.Matrix4().compose(
    new THREE.Vector3(t.px, t.py, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(t.rx, t.ry, t.rz)),
    new THREE.Vector3(t.scale, t.scale, t.scale),
  )
}

/** A projection camera matching the rig. */
export function rigCamera(rig: RigCamera): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(rig.fov, rig.aspect, 0.01, 10)
  cam.position.copy(rig.pos)
  cam.quaternion.copy(rig.quat)
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  return cam
}
