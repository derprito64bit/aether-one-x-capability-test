import { useMemo } from 'react'
import * as THREE from 'three'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'
import { BOARD_PARTS, SOC_STACK } from '../layout.ts'

const SOC = BOARD_PARTS[0] as { x: number; y: number; w: number; h: number }
// Stack rear to front: die (rear, lifts toward the viewer), BGA balls,
// substrate flush on the board rear face.
const SUBSTRATE_Z = SOC_STACK.substrateZ
const BGA_Z = SOC_STACK.bgaZ
const DIE_Z = SOC_STACK.dieZ

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
    // Land-side decoupling caps: four per edge on the substrate border,
    // outboard of the ball array (they used to ring the package 4.5mm off
    // its edge, which read as debris once the package was framed large).
    const geo = new THREE.BoxGeometry(0.001, 0.0005, 0.0004)
    const mesh = new THREE.InstancedMesh(geo, materials.dark, 16)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const one = new THREE.Vector3(1, 1, 1)
    const pos = new THREE.Vector3()
    let i = 0
    for (let edge = 0; edge < 4; edge++) {
      const horizontal = edge < 2
      const sign = edge % 2 === 0 ? 1 : -1
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), horizontal ? 0 : Math.PI / 2)
      for (let k = 0; k < 4; k++) {
        const along = -0.0045 + k * 0.003
        pos.set(
          SOC.x + (horizontal ? along : sign * SOC_STACK.capInset),
          SOC.y + (horizontal ? sign * SOC_STACK.capInset : along),
          SUBSTRATE_Z - 0.0004 - 0.0002,
        )
        m.compose(pos, q, one)
        mesh.setMatrixAt(i++, m)
      }
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
        <mesh
          position={[SOC.x, SOC.y, DIE_Z - 0.000365]}
          rotation={[0, Math.PI, 0]}
          renderOrder={2}
        >
          <planeGeometry args={[0.009, 0.009]} />
          <primitive object={materials.dieMark} attach="material" />
        </mesh>
        {/* Floorplan detail on the die rear face, under the marking */}
        <mesh
          position={[SOC.x, SOC.y, DIE_Z - 0.000355]}
          rotation={[0, Math.PI, 0]}
          renderOrder={1}
        >
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
