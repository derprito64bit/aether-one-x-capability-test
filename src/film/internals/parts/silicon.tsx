import { useMemo } from 'react'
import * as THREE from 'three'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'
import { BOARD_PARTS, MAIN_BOARD } from '../layout.ts'

const SOC = BOARD_PARTS[0] as { x: number; y: number; w: number; h: number }
const REAR_Z = MAIN_BOARD.cz - MAIN_BOARD.thickness / 2
// Stack rear to front: die (rear, lifts toward the viewer), BGA balls,
// substrate flush on the board rear face.
const SUBSTRATE_Z = REAR_Z - 0.0004
const BGA_Z = REAR_Z - 0.0009
const DIE_Z = REAR_Z - 0.0015

/**
 * A1 Ultra package at its manifest position (Prompt C section 2.2): substrate
 * with routing, instanced BGA ball array revealed on lift, marked die with
 * floorplan detail, decoupling caps. Rear faces -z, so rear-facing decals
 * rotate PI about Y or the back viewer sees nothing.
 */
export function SiliconPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  const bga = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.00035, 8, 8)
    const mesh = new THREE.InstancedMesh(geo, materials.gold, 196)
    const m = new THREE.Matrix4()
    let i = 0
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 14; c++) {
        m.setPosition(SOC.x - 0.0065 + c * 0.001, SOC.y - 0.0065 + r * 0.001, BGA_Z)
        mesh.setMatrixAt(i, m)
        i += 1
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])
  const caps = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.001, 0.0005, 0.0004)
    const mesh = new THREE.InstancedMesh(geo, materials.dark, 12)
    const m = new THREE.Matrix4()
    // Ring radius clears the SoC can's fence walls (at 10.5mm the caps
    // straddled them).
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      m.setPosition(SOC.x + Math.cos(a) * 0.0125, SOC.y + Math.sin(a) * 0.0125, REAR_Z - 0.0002)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])

  return (
    <group userData={{ part: 'die', readout: 'A1 Ultra · 3 nm · 171 mm2' }}>
      <group ref={register('substrate')}>
        <mesh position={[SOC.x, SOC.y, SUBSTRATE_Z]}>
          <boxGeometry args={[0.016, 0.016, 0.0008]} />
          <primitive object={materials.substrate} attach="material" />
        </mesh>
        {/* Additive circuit ring under focus, rear-facing */}
        {/* Inside the 16mm package outline (at 9-10.5mm it ran through
            the shield fence) */}
        <mesh position={[SOC.x, SOC.y, SUBSTRATE_Z - 0.00041]} rotation={[0, Math.PI, 0]}>
          <ringGeometry args={[0.0066, 0.0076, 48]} />
          <primitive object={materials.trace} attach="material" />
        </mesh>
      </group>
      <group ref={register('bga-array')}>
        <primitive object={bga} />
      </group>
      <group ref={register('die')}>
        <mesh position={[SOC.x, SOC.y, DIE_Z]}>
          <boxGeometry args={[0.011, 0.011, 0.0007]} />
          <primitive object={materials.die} attach="material" />
        </mesh>
        {/* Laser marking decal, low contrast, rear-facing */}
        <mesh position={[SOC.x, SOC.y, DIE_Z - 0.00036]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.009, 0.009]} />
          <primitive object={materials.dieMark} attach="material" />
        </mesh>
        {/* Floorplan detail modulating the die rear face */}
        <mesh position={[SOC.x, SOC.y, DIE_Z - 0.00037]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.0105, 0.0105]} />
          <primitive object={materials.dieFloor} attach="material" />
        </mesh>
      </group>
      <group ref={register('decoupling-cluster')}>
        <primitive object={caps} />
      </group>
    </group>
  )
}
