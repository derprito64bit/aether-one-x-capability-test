import { createElement } from 'react'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { PhoneConfigProvider } from './PhoneConfig.tsx'
import { PhoneModel } from './PhoneModel.tsx'
import { BACK_PANEL, CORNER_R, PANEL_SPLIT } from './phoneDimensions.ts'
import { createLowerPanelGeometry } from './phoneGeometry.ts'
import { mountScene } from './sceneHarness.ts'

/**
 * Triangle budget, Prompt A section 11, measured on the real mounted
 * PhoneModel (round 04): the old hand-written mirror of every constructor
 * drifted from the model whenever a part changed, so it now counts what
 * actually mounts. Instanced meshes count every instance; worst case is a
 * split-panel finish, so the Slate/Ember panel adds a constant on top.
 * Draw calls and texture memory are recorded in docs/device-perf.md.
 */
function tris(geometry: THREE.BufferGeometry): number {
  const index = geometry.index
  return index !== null ? index.count / 3 : geometry.getAttribute('position').count / 3
}

async function measure(
  detail: 'high' | 'low',
): Promise<{ total: number; rows: Array<[string, number]> }> {
  const mounted = await mountScene(
    createElement(PhoneConfigProvider, null, createElement(PhoneModel, { detail })),
  )
  const byMaterial = new Map<string, number>()
  mounted.scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const inst = mesh as THREE.InstancedMesh
    const count = tris(mesh.geometry) * (inst.isInstancedMesh ? inst.count : 1)
    const key = Array.isArray(mesh.material) ? 'frame rails' : mesh.material.name
    byMaterial.set(key, (byMaterial.get(key) ?? 0) + count)
  })
  await mounted.unmount()
  // Worst-case split panel (Slate/Ember, not the default finish): seam
  // box plus the lower panel, same constructor arguments as PhoneModel.
  const lower = createLowerPanelGeometry(
    BACK_PANEL.halfW - 0.0005,
    BACK_PANEL.halfH - 0.0005,
    CORNER_R - 0.0005,
    PANEL_SPLIT.seamY - PANEL_SPLIT.seamWidth / 2,
    PANEL_SPLIT.step + 0.00005,
  )
  byMaterial.set('panel split (worst case)', 12 + tris(lower))
  lower.dispose()
  const rows = [...byMaterial.entries()].sort((a, b) => b[1] - a[1])
  const total = rows.reduce((sum, [, value]) => sum + value, 0)
  return { total, rows }
}

describe('device triangle budget', () => {
  it('holds LOD0 under 120k triangles', async () => {
    const { total, rows } = await measure('high')
    console.log(`LOD0 triangle breakdown (total ${total.toLocaleString()}):`)
    for (const [name, value] of rows.slice(0, 12)) {
      console.log(`  ${name}: ${value.toLocaleString()}`)
    }
    expect(total).toBeLessThan(120_000)
  })

  it('cuts real geometry at LOD1', async () => {
    const high = await measure('high')
    const low = await measure('low')
    console.log(`LOD1 total ${low.total.toLocaleString()} vs LOD0 ${high.total.toLocaleString()}`)
    expect(low.total).toBeLessThan(high.total * 0.85)
    expect(low.total).toBeLessThan(60_000)
  })
})
