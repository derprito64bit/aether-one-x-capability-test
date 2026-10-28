import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { LayerDimmer, type DimRoot } from './dimmer.ts'

const shared = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ transparent: true, opacity: 1 })

function rig() {
  const mat = shared()
  const a = new THREE.Group()
  const b = new THREE.Group()
  const ma = new THREE.Mesh(new THREE.BoxGeometry(), mat)
  const mb = new THREE.Mesh(new THREE.BoxGeometry(), mat)
  a.add(ma)
  b.add(mb)
  const roots: DimRoot[] = [
    { object: a, slot: 0 },
    { object: b, slot: 1 },
  ]
  return { mat, a, b, ma, mb, roots }
}

describe('LayerDimmer', () => {
  it('dims one layer of a shared material without touching the other', () => {
    const { mat, ma, mb, roots } = rig()
    const dimmer = new LayerDimmer()
    dimmer.bind(roots)
    dimmer.sync([1, 0.15])
    expect(ma.material).not.toBe(mat)
    expect(mb.material).not.toBe(ma.material)
    expect((ma.material as THREE.Material).opacity).toBe(1)
    expect((mb.material as THREE.Material).opacity).toBeCloseTo(0.15, 6)
    expect((mb.material as THREE.Material).depthWrite).toBe(false)
  })

  it('binds again after dispose (Fast Refresh re-runs the effect)', () => {
    const { mat, ma, mb, roots } = rig()
    const dimmer = new LayerDimmer()
    dimmer.bind(roots)
    dimmer.dispose()
    expect(ma.material).toBe(mat)
    dimmer.bind(roots)
    dimmer.sync([1, 0.15])
    expect(ma.material).not.toBe(mat)
    expect((mb.material as THREE.Material).opacity).toBeCloseTo(0.15, 6)
  })

  it('forgets unmounted meshes and retires clones nothing uses', () => {
    const { mat, b, mb, roots } = rig()
    const dimmer = new LayerDimmer()
    dimmer.bind(roots)
    const clone = mb.material as THREE.Material
    let disposed = false
    clone.addEventListener('dispose', () => {
      disposed = true
    })
    // Layer b's mesh unmounts: forgotten and restored, while layer a still
    // uses the source, so the clone pool stays.
    b.remove(mb)
    dimmer.bind(roots)
    expect(mb.material).toBe(mat)
    expect(disposed).toBe(false)
    // The whole device remounts with new materials: the old clones retire.
    dimmer.bind(rig().roots)
    expect(disposed).toBe(true)
  })
})
