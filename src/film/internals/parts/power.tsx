import { useMemo } from 'react'
import * as THREE from 'three'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'
import { BATTERY_CELL, COIL, MECH, MECH_Z, NFC, SCREW, SCREWS } from '../layout.ts'

/** Flat litz: round torus wire squashed to the coil's rectangular depth. */
const COIL_FLATTEN = COIL.thickness / COIL.wireW

/**
 * Power and electromechanical stack over the layout manifest (Prompt C
 * section 2.4/2.6): silicon-carbon cell with tabs, two-stage wrap, an
 * 18-turn instanced litz coil with lead-out plus its Clear-finish LED ring,
 * NFC ring, haptic motor with flex tail, speaker, earpiece, port block, and
 * eight Torx screws. Rear faces -z.
 */
export function PowerPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  // 18 concentric flat copper rings with a spiral break and a two-wire
  // lead-out. Individual turns resolve at macro (Prompt C rubric check 4).
  // (One torus geometry per turn: scaling a unit torus would also scale the
  // wire gauge to nothing.)
  const coilRadii = useMemo(() => {
    const radii: number[] = []
    for (let i = 0; i < COIL.turns; i++) {
      radii.push(COIL.rIn + ((COIL.rOut - COIL.rIn) * i) / (COIL.turns - 1))
    }
    return radii
  }, [])
  const coilLeds = useMemo(() => {
    // Sixteen individually-addressable emitters ringing the coil perimeter:
    // the charging indicator for the Clear finish (Prompt C section 3).
    // Flat emitters, as deep as the coil, not 0.8mm beads standing proud.
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.0004, 8, 8).scale(1, 1, COIL.thickness / 0.0008),
      materials.coilRing,
      16,
    )
    const m = new THREE.Matrix4()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      m.setPosition(
        COIL.cx + Math.cos(a) * (COIL.rOut + 0.0012),
        COIL.cy + Math.sin(a) * (COIL.rOut + 0.0012),
        COIL.cz,
      )
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])
  const screws = useMemo(() => {
    // Torx heads with a real six-lobe drive recess, barely visible and it
    // matters (Prompt C section 2.6).
    const group = new THREE.Group()
    const headGeo = new THREE.CylinderGeometry(
      SCREW.headD / 2,
      SCREW.headD / 2,
      SCREW.headDepth,
      16,
    )
    const driveGeo = new THREE.CylinderGeometry(SCREW.driveD / 2, SCREW.driveD / 2, 0.00015, 6)
    SCREWS.forEach((screw, i) => {
      const g = new THREE.Group()
      g.position.set(screw.x, screw.y, -0.0005)
      const head = new THREE.Mesh(headGeo, materials.gold)
      head.rotation.x = Math.PI / 2
      const drive = new THREE.Mesh(driveGeo, materials.dark)
      drive.rotation.x = Math.PI / 2
      drive.position.z = -SCREW.headDepth / 2 - 0.00002
      g.add(head, drive)
      g.userData.screwIndex = i
      group.add(g)
    })
    return group
  }, [materials])

  return (
    <group>
      <group ref={register('cell')}>
        <group userData={{ part: 'cell', readout: '4000 mAh silicon-carbon cell' }}>
          <mesh position={[BATTERY_CELL.cx, BATTERY_CELL.cy, BATTERY_CELL.cz]}>
            <boxGeometry args={[BATTERY_CELL.w, BATTERY_CELL.h, BATTERY_CELL.thickness]} />
            <primitive object={materials.cell} attach="material" />
          </mesh>
          {/* Positive and negative tabs at the top edge */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[BATTERY_CELL.tabX * side, BATTERY_CELL.tabY, BATTERY_CELL.cz]}
            >
              <boxGeometry args={[0.004, 0.003, 0.0006]} />
              <primitive object={materials.gold} attach="material" />
            </mesh>
          ))}
          {/* Glowing edge band that blooms at the energy climax: a perimeter
              frame, never a solid panel (a solid slab bricks over the cell
              face in the x-ray read). Flush with the cell front face; it
              used to stand 0.3mm proud, into the display panel. */}
          {[
            { x: 0, y: BATTERY_CELL.cy + BATTERY_CELL.h / 2, w: BATTERY_CELL.w + 0.001, h: 0.0012 },
            { x: 0, y: BATTERY_CELL.cy - BATTERY_CELL.h / 2, w: BATTERY_CELL.w + 0.001, h: 0.0012 },
            { x: -BATTERY_CELL.w / 2, y: BATTERY_CELL.cy, w: 0.0012, h: BATTERY_CELL.h + 0.001 },
            { x: BATTERY_CELL.w / 2, y: BATTERY_CELL.cy, w: 0.0012, h: BATTERY_CELL.h + 0.001 },
          ].map(({ x, y, w, h }) => (
            <mesh
              key={`${x},${y}`}
              position={[x, y, BATTERY_CELL.cz + BATTERY_CELL.thickness / 2 - 0.0002]}
            >
              <boxGeometry args={[w, h, 0.0004]} />
              <primitive object={materials.cellGlow} attach="material" />
            </mesh>
          ))}
        </group>
      </group>
      {/* Cell wrap peels before the cell lifts: two-stage reveal */}
      <group ref={register('cell-wrap')}>
        {[
          BATTERY_CELL.cy - BATTERY_CELL.h / 2 + 0.001,
          BATTERY_CELL.cy + BATTERY_CELL.h / 2 - 0.001,
        ].map((y) => (
          <mesh key={y} position={[BATTERY_CELL.cx, y, BATTERY_CELL.cz]}>
            <boxGeometry
              args={[BATTERY_CELL.w + 0.0004, 0.002, BATTERY_CELL.thickness + 0.00002]}
            />
            <primitive object={materials.dark} attach="material" />
          </mesh>
        ))}
      </group>
      <group ref={register('charge-coil')}>
        <group userData={{ part: 'coil', readout: '40 W wireless coil' }}>
          {coilRadii.map((r) => (
            <mesh key={r} position={[COIL.cx, COIL.cy, COIL.cz]} scale={[1, 1, COIL_FLATTEN]}>
              <torusGeometry args={[r, COIL.wireW / 2, 6, 72]} />
              <primitive object={materials.coil} attach="material" />
            </mesh>
          ))}
          {/* Two-wire lead-out from the outer turn to the board edge */}
          {[-0.0004, 0.0004].map((dy) => (
            <mesh key={dy} position={[COIL.cx + COIL.rOut + 0.004, COIL.cy + dy, COIL.cz]}>
              <boxGeometry args={[0.008, 0.0005, COIL.thickness]} />
              <primitive object={materials.coil} attach="material" />
            </mesh>
          ))}
          <primitive object={coilLeds} />
        </group>
      </group>
      {/* NFC antenna ring, outboard of the coil */}
      <group ref={register('nfc')}>
        <mesh position={[NFC.cx, NFC.cy, NFC.cz]} rotation={[0, Math.PI, 0]}>
          <ringGeometry args={[NFC.rIn, NFC.rOut, 64]} />
          <primitive object={materials.coil} attach="material" />
        </mesh>
      </group>
      {/* Electromechanics: haptic can with flex tail, speaker, earpiece, port */}
      {MECH.map((mech) => (
        <group key={mech.id} ref={register(mech.id)}>
          <mesh position={[mech.x, mech.y, mech.z ?? MECH_Z]}>
            <boxGeometry args={[mech.w, mech.h, mech.d]} />
            <primitive
              object={mech.id === 'haptic' ? materials.housing : materials.dark}
              attach="material"
            />
          </mesh>
          {mech.id === 'haptic' ? (
            <mesh position={[mech.x + mech.w / 2 + 0.004, mech.y, MECH_Z]}>
              <boxGeometry args={[0.008, 0.003, 0.0002]} />
              <primitive object={materials.trace} attach="material" />
            </mesh>
          ) : null}
        </group>
      ))}
      {/* Midframe fasteners, one group per screw so each spins on its axis */}
      {SCREWS.map((screw, i) => {
        const child = screws.children[i] as THREE.Group | undefined
        if (child === undefined) return null
        return (
          <group key={`${screw.x},${screw.y}`} ref={register(`screw-${i}`)}>
            <primitive object={child} />
          </group>
        )
      })}
    </group>
  )
}
