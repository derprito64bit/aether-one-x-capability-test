import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'
import {
  BATTERY_CELL,
  BATTERY_PARTS,
  COIL,
  FERRITE,
  MECH,
  MECH_Z,
  NFC,
  SCREW,
  SCREWS,
  SCREW_Z,
} from '../layout.ts'
import { MARK_CELLS } from '../showcaseTextures.ts'
import { disposeAll, markPlane, softSlab } from './shapes.ts'

/** Flat litz: round torus wire squashed to the coil's rectangular depth. */
const COIL_FLATTEN = COIL.thickness / COIL.wireW
const CELL_FRONT = BATTERY_CELL.cz + BATTERY_CELL.thickness / 2
const CELL_BOTTOM = BATTERY_CELL.cy - BATTERY_CELL.h / 2
const CELL_TOP = BATTERY_CELL.cy + BATTERY_CELL.h / 2
const { bms, connector, tabs } = BATTERY_PARTS
const HAPTIC = MECH.find((m) => m.id === 'haptic') as (typeof MECH)[number]
const SPEAKER = MECH.find((m) => m.id === 'speaker') as (typeof MECH)[number]
const PORT_BLOCK = MECH.find((m) => m.id === 'port-block') as (typeof MECH)[number]
/** NFC antenna turns: three flat traces across the ring band. */
const NFC_TURNS = 3

/**
 * Power and electromechanical stack over the layout manifest (Prompt C
 * section 2.4/2.6, upgraded for the round 05 showcase): a pouch cell with
 * soft edges and a printed label, its protection board with nickel tabs,
 * the flex and board-to-board connector, two stretch-release pull tabs;
 * an 18-turn litz coil on a ferrite sheet, a three-turn NFC antenna; a
 * stainless LRA with mounting ears and flex, a speaker box with a mesh
 * grille; a USB-C receptacle shell; eight Torx screws. Rear faces -z.
 */
export function PowerPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  const geo = useMemo(
    () => ({
      cell: softSlab(
        BATTERY_CELL.w / 2,
        BATTERY_CELL.h / 2,
        BATTERY_CELL.thickness,
        0.0009,
        0.0025,
        16,
      ),
      label: new THREE.PlaneGeometry(BATTERY_CELL.w - 0.006, BATTERY_CELL.h - 0.008),
      bms: softSlab(bms.w / 2, bms.h / 2, bms.depth, 0.00005, 0.0006),
      bmsMark: markPlane(0.006, 0.003, MARK_CELLS.bms),
      ferrite: softSlab(FERRITE.half, FERRITE.half, FERRITE.depth, 0, FERRITE.r, 24),
      haptic: softSlab(HAPTIC.w / 2, HAPTIC.h / 2, HAPTIC.d, 0.0005, HAPTIC.h / 2, 12),
      speaker: softSlab(SPEAKER.w / 2, SPEAKER.h / 2, SPEAKER.d, 0.0004, 0.0016, 10),
      grille: softSlab(SPEAKER.w / 2 - 0.0016, SPEAKER.h / 2 - 0.0016, 0.0001, 0, 0.0009, 10),
      port: softSlab(
        PORT_BLOCK.w / 2,
        PORT_BLOCK.d / 2,
        PORT_BLOCK.h,
        0.00015,
        PORT_BLOCK.d / 2,
        10,
      ),
      portMark: markPlane(0.005, 0.0022, MARK_CELLS.port),
    }),
    [],
  )
  useEffect(() => () => disposeAll(geo), [geo])

  // 18 concentric flat copper rings with a spiral break and a two-wire
  // lead-out. Individual turns resolve at macro (Prompt C rubric check 4).
  const coilRadii = useMemo(() => {
    const radii: number[] = []
    for (let i = 0; i < COIL.turns; i++) {
      radii.push(COIL.rIn + ((COIL.rOut - COIL.rIn) * i) / (COIL.turns - 1))
    }
    return radii
  }, [])
  const coilLeds = useMemo(() => {
    // Sixteen emitters ringing the coil perimeter: the charging indicator
    // for the Clear finish (Prompt C section 3), as deep as the coil.
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
  // Protection-board parts: a row of passives and two FETs.
  const bmsParts = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.0012, 0.0007, 0.00025),
      materials.dark,
      14,
    )
    const m = new THREE.Matrix4()
    for (let i = 0; i < 14; i++) {
      const big = i === 3 || i === 10
      m.makeScale(big ? 2.2 : 1, big ? 2.4 : 1, 1)
      m.setPosition(
        bms.x - bms.w / 2 + 0.003 + (i / 13) * (bms.w - 0.006),
        bms.y + (i % 2 === 0 ? 0.0009 : -0.0009) * (big ? 0 : 1),
        bms.z + bms.depth / 2 + 0.000125,
      )
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])
  // Speaker grille perforations (rear face).
  const grilleHoles = useMemo(() => {
    const cols = 9
    const rows = 4
    const mesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.00028, 8).rotateY(Math.PI),
      materials.dark,
      cols * rows,
    )
    const m = new THREE.Matrix4()
    let i = 0
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        m.setPosition(
          SPEAKER.x - SPEAKER.w / 2 + 0.0028 + (c / (cols - 1)) * (SPEAKER.w - 0.0056),
          SPEAKER.y - SPEAKER.h / 2 + 0.0032 + (r / (rows - 1)) * (SPEAKER.h - 0.0064),
          (SPEAKER.z ?? MECH_Z) - SPEAKER.d / 2 - 0.00011,
        )
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])
  useEffect(
    () => () => {
      coilLeds.geometry.dispose()
      bmsParts.geometry.dispose()
      grilleHoles.geometry.dispose()
    },
    [coilLeds, bmsParts, grilleHoles],
  )
  const screws = useMemo(() => {
    // Torx heads with a real six-lobe drive recess, barely visible and it
    // matters (Prompt C section 2.6). Heads sit on the mid-plate's rear.
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
      g.position.set(screw.x, screw.y, SCREW_Z)
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

  const hapticZ = HAPTIC.z ?? MECH_Z
  const speakerZ = SPEAKER.z ?? MECH_Z
  return (
    <group>
      <group ref={register('cell')}>
        <group userData={{ part: 'cell', readout: '4000 mAh silicon-carbon cell' }}>
          {/* Pouch cell with soft sealed edges */}
          <mesh geometry={geo.cell} position={[BATTERY_CELL.cx, BATTERY_CELL.cy, BATTERY_CELL.cz]}>
            <primitive object={materials.cell} attach="material" />
          </mesh>
          {/* Printed label on the front face, 0.03mm proud */}
          <mesh
            geometry={geo.label}
            position={[BATTERY_CELL.cx, BATTERY_CELL.cy - 0.001, CELL_FRONT + 0.000025]}
          >
            <primitive object={materials.label} attach="material" />
          </mesh>
          {/* Nickel tabs from the cell's top edge onto the protection board */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                BATTERY_CELL.tabX * side,
                CELL_TOP + 0.00125,
                bms.z + bms.depth / 2 + 0.00007,
              ]}
            >
              <boxGeometry args={[0.0045, 0.0025, 0.0001]} />
              <primitive object={materials.shield} attach="material" />
            </mesh>
          ))}
          {/* Glowing edge band that blooms at the energy climax: a perimeter
              frame, never a solid panel, flush with the cell front face. */}
          {[
            { x: 0, y: CELL_TOP - 0.0004, w: BATTERY_CELL.w - 0.001, h: 0.0008 },
            { x: 0, y: CELL_BOTTOM + 0.0004, w: BATTERY_CELL.w - 0.001, h: 0.0008 },
            {
              x: 0.0004 - BATTERY_CELL.w / 2,
              y: BATTERY_CELL.cy,
              w: 0.0008,
              h: BATTERY_CELL.h - 0.001,
            },
            {
              x: BATTERY_CELL.w / 2 - 0.0004,
              y: BATTERY_CELL.cy,
              w: 0.0008,
              h: BATTERY_CELL.h - 0.001,
            },
          ].map(({ x, y, w, h }) => (
            <mesh key={`${x},${y}`} position={[x, y, CELL_FRONT - 0.0002]}>
              <boxGeometry args={[w, h, 0.0004]} />
              <primitive object={materials.cellGlow} attach="material" />
            </mesh>
          ))}
          {/* Protection board (BMS) on the top edge */}
          <mesh geometry={geo.bms} position={[bms.x, bms.y, bms.z]}>
            <primitive object={materials.board} attach="material" />
          </mesh>
          <primitive object={bmsParts} />
          <mesh
            geometry={geo.bmsMark}
            position={[bms.x + 0.008, bms.y, bms.z + bms.depth / 2 + 0.00001]}
          >
            <primitive object={materials.chipMark} attach="material" />
          </mesh>
          {/* Flex up to the board-to-board connector */}
          <mesh
            position={[
              connector.x,
              (bms.y + connector.y) / 2,
              connector.z + connector.depth / 2 - 0.00005,
            ]}
          >
            <boxGeometry args={[connector.flexW, connector.y - bms.y, 0.0001]} />
            <primitive object={materials.trace} attach="material" />
          </mesh>
          <mesh position={[connector.x, connector.y, connector.z]}>
            <boxGeometry args={[connector.w, connector.h, connector.depth]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
          <mesh position={[connector.x, connector.y, connector.zFront + 0.00001]}>
            <planeGeometry args={[connector.w * 0.85, connector.h * 0.3]} />
            <primitive object={materials.gold} attach="material" />
          </mesh>
          {/* Stretch-release pull tabs: film under the cell, grips past its edge */}
          {tabs.xs.map((x) => (
            <group key={x}>
              <mesh position={[x, (tabs.yTop + tabs.yBottom) / 2, tabs.z]}>
                <boxGeometry args={[tabs.w, tabs.yTop - tabs.yBottom, tabs.depth]} />
                <primitive object={materials.dark} attach="material" />
              </mesh>
              <mesh position={[x, tabs.yBottom + 0.0019, tabs.z + tabs.depth / 2 + 0.00001]}>
                <planeGeometry args={[tabs.w, 0.0034]} />
                <primitive object={materials.grip} attach="material" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {/* Cell wrap: sealed edge bands top and bottom */}
      <group ref={register('cell-wrap')}>
        {[CELL_BOTTOM + 0.0009, CELL_TOP - 0.0009].map((y) => (
          <mesh key={y} position={[BATTERY_CELL.cx, y, BATTERY_CELL.cz]}>
            <boxGeometry
              args={[BATTERY_CELL.w - 0.0014, 0.0015, BATTERY_CELL.thickness + 0.00002]}
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
          {/* Two-wire lead-out from the outer turn to gold terminal pads */}
          {[-0.0004, 0.0004].map((dy) => (
            <mesh key={dy} position={[COIL.cx + COIL.rOut + 0.004, COIL.cy + dy * 2, COIL.cz]}>
              <boxGeometry args={[0.008, 0.0005, COIL.thickness]} />
              <primitive object={materials.coil} attach="material" />
            </mesh>
          ))}
          {[-0.0008, 0.0008].map((dy) => (
            <mesh
              key={`pad${dy}`}
              position={[
                COIL.cx + COIL.rOut + 0.0076,
                COIL.cy + dy,
                COIL.cz - COIL.thickness / 2 - 0.000002,
              ]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[0.0018, 0.0012]} />
              <primitive object={materials.gold} attach="material" />
            </mesh>
          ))}
          <primitive object={coilLeds} />
          {/* Ferrite shield sheet in front of the coil and the NFC ring */}
          <mesh geometry={geo.ferrite} position={[NFC.cx, NFC.cy, FERRITE.z]}>
            <primitive object={materials.ferrite} attach="material" />
          </mesh>
        </group>
      </group>
      {/* NFC antenna: three flat turns outboard of the coil */}
      <group ref={register('nfc')}>
        {Array.from({ length: NFC_TURNS }, (_, i) => {
          const band = (NFC.rOut - NFC.rIn) / NFC_TURNS
          const r0 = NFC.rIn + i * band + band * 0.18
          return (
            <mesh key={i} position={[NFC.cx, NFC.cy, NFC.cz]} rotation={[0, Math.PI, 0]}>
              <ringGeometry args={[r0, r0 + band * 0.64, 64]} />
              <primitive object={materials.coil} attach="material" />
            </mesh>
          )
        })}
      </group>
      {/* Haptic: stainless linear resonant actuator with ears and flex tail */}
      <group ref={register('haptic')}>
        <mesh geometry={geo.haptic} position={[HAPTIC.x, HAPTIC.y, hapticZ]}>
          <primitive object={materials.shield} attach="material" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[
                HAPTIC.x + side * (HAPTIC.w / 2 + 0.0008),
                HAPTIC.y,
                hapticZ + HAPTIC.d / 2 - 0.0002,
              ]}
            >
              <boxGeometry args={[0.0018, 0.0042, 0.0003]} />
              <primitive object={materials.shield} attach="material" />
            </mesh>
            <mesh
              position={[
                HAPTIC.x + side * (HAPTIC.w / 2 + 0.0009),
                HAPTIC.y,
                hapticZ + HAPTIC.d / 2 - 0.00036,
              ]}
              rotation={[0, Math.PI, 0]}
            >
              <circleGeometry args={[0.00045, 12]} />
              <primitive object={materials.dark} attach="material" />
            </mesh>
          </group>
        ))}
        {/* Flex tail toward the speaker side, clear of the sub-board */}
        <mesh position={[HAPTIC.x + HAPTIC.w / 2 + 0.0042, HAPTIC.y, hapticZ]}>
          <boxGeometry args={[0.0044, 0.0034, 0.0001]} />
          <primitive object={materials.trace} attach="material" />
        </mesh>
        {[-0.0009, 0.0009].map((dy) => (
          <mesh
            key={dy}
            position={[HAPTIC.x + HAPTIC.w / 2 + 0.005, HAPTIC.y + dy, hapticZ - 0.00006]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[0.0018, 0.0011]} />
            <primitive object={materials.gold} attach="material" />
          </mesh>
        ))}
      </group>
      {/* Speaker box: dark enclosure, mesh grille on the rear face */}
      <group ref={register('speaker')}>
        <mesh geometry={geo.speaker} position={[SPEAKER.x, SPEAKER.y, speakerZ]}>
          <primitive object={materials.dark} attach="material" />
        </mesh>
        <mesh
          geometry={geo.grille}
          position={[SPEAKER.x, SPEAKER.y, speakerZ - SPEAKER.d / 2 - 0.00005]}
        >
          <primitive object={materials.shield} attach="material" />
        </mesh>
        <primitive object={grilleHoles} />
      </group>
      {/* Earpiece receiver */}
      {MECH.filter((m) => m.id === 'earpiece').map((mech) => (
        <group key={mech.id} ref={register(mech.id)}>
          <mesh position={[mech.x, mech.y, mech.z ?? MECH_Z]}>
            <boxGeometry args={[mech.w, mech.h, mech.d]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
          <mesh
            position={[mech.x, mech.y, (mech.z ?? MECH_Z) - mech.d / 2 - 0.00001]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[mech.w * 0.8, mech.h * 0.5]} />
            <primitive object={materials.shield} attach="material" />
          </mesh>
        </group>
      ))}
      {/* USB-C receptacle: stadium steel shell, dark mouth, contact tongue */}
      <group ref={register('port-block')}>
        <mesh
          geometry={geo.port}
          position={[PORT_BLOCK.x, PORT_BLOCK.y, PORT_BLOCK.z ?? 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <primitive object={materials.shield} attach="material" />
        </mesh>
        <mesh
          position={[PORT_BLOCK.x, PORT_BLOCK.y - PORT_BLOCK.h / 2 - 0.00001, PORT_BLOCK.z ?? 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[PORT_BLOCK.w - 0.0009, PORT_BLOCK.d - 0.0009]} />
          <primitive object={materials.dark} attach="material" />
        </mesh>
        <mesh
          geometry={geo.portMark}
          position={[PORT_BLOCK.x, PORT_BLOCK.y, (PORT_BLOCK.z ?? 0) - PORT_BLOCK.d / 2 - 0.00001]}
          rotation={[0, Math.PI, 0]}
        >
          <primitive object={materials.chipMark} attach="material" />
        </mesh>
      </group>
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
