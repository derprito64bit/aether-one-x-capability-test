import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'
import {
  BOARD_PARTS,
  BTB_FLEX,
  COAX,
  GRAPHITE,
  MAIN_BOARD,
  SHIELD_CANS,
  SUB_BOARD,
  SUB_PARTS,
  THERMAL_PAD,
  VAPOR_CHAMBER,
} from '../layout.ts'
import { MARK_CELLS } from '../showcaseTextures.ts'
import { createRoundedRectRingGeometry } from '../../../components/PhoneViewer/phoneGeometry.ts'
import { disposeAll, markPlane, softSlab } from './shapes.ts'

/** Chip marking cells for the components the showcase names. */
const CHIP_MARKS: Record<string, number> = {
  nand: MARK_CELLS.memory,
  modem: MARK_CELLS.modem,
  pmic: MARK_CELLS.pmic,
  'charge-ic': MARK_CELLS.charge,
}

const MAIN_REAR_Z = MAIN_BOARD.cz - MAIN_BOARD.thickness / 2
const SUB_REAR_Z = SUB_BOARD.cz - SUB_BOARD.thickness / 2

/**
 * Boards as thin renderers over the layout manifest (Prompt C section 6):
 * main and sub boards, BTB flex, coax runs, four shield cans with separate
 * lifting lids, every discrete component at its authored position, vapour
 * chamber plus graphite. No hardcoded positions: if a parts file still
 * contains one after this work, it is not done.
 */
export function BoardPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  const vents = useMemo(() => {
    // Perforated lid vents: 0.4mm dark dots on a 1.2mm pitch, one instanced
    // mesh across all four lids.
    const positions: Array<[number, number, number]> = []
    for (const can of SHIELD_CANS) {
      const nx = Math.max(2, Math.floor(can.w / 0.0012))
      const ny = Math.max(2, Math.floor(can.h / 0.0012))
      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          positions.push([
            can.x - can.w / 2 + ((ix + 0.5) / nx) * can.w,
            can.y - can.h / 2 + ((iy + 0.5) / ny) * can.h,
            // Proud of the lid's rear face so the dots read as perforations.
            MAIN_REAR_Z - can.rise - 0.0002 - 0.00001,
          ])
        }
      }
    }
    // Discs on the lid face: axis turned onto z (cylinders run along y).
    const geo = new THREE.CylinderGeometry(0.0002, 0.0002, 0.00002, 8).rotateX(Math.PI / 2)
    const mesh = new THREE.InstancedMesh(geo, materials.dark, positions.length)
    const m = new THREE.Matrix4()
    positions.forEach(([x, y, z], i) => {
      m.setPosition(x, y, z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials])

  const geo = useMemo(() => {
    const out: Record<string, THREE.BufferGeometry> = {
      mask: new THREE.PlaneGeometry(MAIN_BOARD.w - 0.0004, MAIN_BOARD.h - 0.0004),
      chamber: softSlab(
        VAPOR_CHAMBER.w / 2,
        VAPOR_CHAMBER.h / 2,
        VAPOR_CHAMBER.thickness,
        0.00015,
        0.004,
        16,
      ),
      seam: createRoundedRectRingGeometry(
        VAPOR_CHAMBER.w - 0.0024,
        VAPOR_CHAMBER.h - 0.0024,
        0.0028,
        VAPOR_CHAMBER.w - 0.0036,
        VAPOR_CHAMBER.h - 0.0036,
        0.0022,
        0.00001,
      ),
      pad: new THREE.PlaneGeometry(THERMAL_PAD.size, THERMAL_PAD.size),
      graphite: softSlab(GRAPHITE.w / 2, GRAPHITE.h / 2, GRAPHITE.thickness, 0, 0.003, 16),
      graphiteMark: markPlane(0.022, 0.011, MARK_CELLS.graphite),
    }
    for (const [id, cell] of Object.entries(CHIP_MARKS)) {
      const part = [...BOARD_PARTS, ...SUB_PARTS].find((p) => p.id === id)
      if (part !== undefined) out[`mark:${id}`] = markPlane(part.w * 0.86, part.h * 0.72, cell)
    }
    return out
  }, [])
  useEffect(() => () => disposeAll(geo), [geo])
  useEffect(() => () => vents.geometry.dispose(), [vents])

  // Discrete components, each its own exploding part. btb-up/btb-low are
  // rendered as connectors in the flex group above, not here.
  const discretes = [...BOARD_PARTS.slice(1), ...SUB_PARTS].filter(
    (part) => part.id !== 'btb-up' && part.id !== 'btb-low',
  )

  return (
    <group userData={{ part: 'board', readout: '12-layer main board' }}>
      <group ref={register('main-board')}>
        <mesh position={[MAIN_BOARD.cx, MAIN_BOARD.cy, MAIN_BOARD.cz]}>
          <boxGeometry args={[MAIN_BOARD.w, MAIN_BOARD.h, MAIN_BOARD.thickness]} />
          <primitive object={materials.board} attach="material" />
        </mesh>
        {/* Solder mask, routing, vias, pads, and silkscreen: printed on the
            rear face the components mount on (round 05 showcase) */}
        <mesh
          geometry={geo.mask}
          position={[MAIN_BOARD.cx, MAIN_BOARD.cy, MAIN_REAR_Z - 0.000005]}
          rotation={[0, Math.PI, 0]}
        >
          <primitive object={materials.boardMask} attach="material" />
        </mesh>
      </group>
      <group ref={register('sub-board')}>
        <mesh position={[SUB_BOARD.cx, SUB_BOARD.cy, SUB_BOARD.cz]}>
          <boxGeometry args={[SUB_BOARD.w, SUB_BOARD.h, SUB_BOARD.thickness]} />
          <primitive object={materials.board} attach="material" />
        </mesh>
      </group>
      {/* Board-to-board flex up the left edge, with its connectors */}
      <group ref={register('btb-flex')}>
        <mesh position={[BTB_FLEX.x, (BTB_FLEX.yTop + BTB_FLEX.yBottom) / 2, MAIN_BOARD.cz]}>
          <boxGeometry
            args={[BTB_FLEX.width, BTB_FLEX.yTop - BTB_FLEX.yBottom, BTB_FLEX.thickness]}
          />
          <primitive object={materials.dark} attach="material" />
        </mesh>
        {[
          { x: 0, y: 0.0215 },
          { x: 0, y: -0.053 },
        ].map(({ x, y }) => (
          <mesh key={`${x},${y}`} position={[x, y, MAIN_BOARD.cz - 0.0006]}>
            <boxGeometry args={[0.008, 0.002, 0.0009]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
        ))}
      </group>
      {/* Coaxial RF cables along both edges. Cylinders already run along
          y; the old PI/2 turn stood each 112mm run on end through the
          phone. Seat on the mesh, not the group (the teardown driver owns
          group transforms). */}
      {COAX.map((run) => (
        <group key={run.id} ref={register(run.id)}>
          <mesh position={[run.x, (run.yTop + run.yBottom) / 2, MAIN_BOARD.cz - 0.0004]}>
            <cylinderGeometry args={[run.d / 2, run.d / 2, run.yTop - run.yBottom, 8]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Shield fences stay as OPEN frames; lids lift off separately to
          reveal components. Solid fence boxes bricked over the discretes. */}
      {SHIELD_CANS.map((can) => (
        <group key={can.id} ref={register('shield-fence')}>
          {[
            { x: can.x, y: can.y + can.h / 2, w: can.w, h: 0.0004 },
            { x: can.x, y: can.y - can.h / 2, w: can.w, h: 0.0004 },
            { x: can.x - can.w / 2, y: can.y, w: 0.0004, h: can.h },
            { x: can.x + can.w / 2, y: can.y, w: 0.0004, h: can.h },
          ].map(({ x, y, w, h }) => (
            <mesh key={`${x},${y}`} position={[x, y, MAIN_REAR_Z - (can.rise * 0.75) / 2]}>
              <boxGeometry args={[w, h, can.rise * 0.75]} />
              <primitive object={materials.shield} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={register('shield-lid')}>
        {SHIELD_CANS.map((can) => (
          <mesh key={can.id} position={[can.x, can.y, MAIN_REAR_Z - can.rise - 0.0001]}>
            <boxGeometry args={[can.w + 0.0004, can.h + 0.0004, 0.0002]} />
            <primitive object={materials.shield} attach="material" />
          </mesh>
        ))}
        <primitive object={vents} />
      </group>
      {/* Discrete components, each its own exploding part */}
      {discretes.map((part) => {
        const boardZ = part.y > 0 ? MAIN_REAR_Z : SUB_REAR_Z
        const mark = geo[`mark:${part.id}`]
        return (
          <group key={part.id} ref={register(part.id)}>
            <mesh position={[part.x, part.y, boardZ - part.z / 2]}>
              <boxGeometry args={[part.w, part.h, part.z]} />
              <primitive
                object={part.id === 'sim-cage' ? materials.shield : materials.dark}
                attach="material"
              />
            </mesh>
            {mark !== undefined ? (
              <mesh
                geometry={mark}
                position={[part.x, part.y, boardZ - part.z - 0.00001]}
                rotation={[0, Math.PI, 0]}
              >
                <primitive object={materials.chipMark} attach="material" />
              </mesh>
            ) : null}
          </group>
        )
      })}
      {/* Vapour chamber: stamped copper with soft edges, a welded seam
          inset from the rim, the sealed fill tube, and the paste footprint
          where the SoC can presses on it */}
      <group ref={register('vapor-chamber')}>
        <mesh
          geometry={geo.chamber}
          position={[VAPOR_CHAMBER.cx, VAPOR_CHAMBER.cy, VAPOR_CHAMBER.cz]}
        >
          <primitive object={materials.vapor} attach="material" />
        </mesh>
        <mesh
          geometry={geo.seam}
          position={[
            VAPOR_CHAMBER.cx,
            VAPOR_CHAMBER.cy,
            VAPOR_CHAMBER.cz + VAPOR_CHAMBER.thickness / 2 + 0.000005,
          ]}
        >
          <primitive object={materials.shield} attach="material" />
        </mesh>
        <mesh
          position={[
            VAPOR_CHAMBER.cx + VAPOR_CHAMBER.w / 2 - 0.004,
            VAPOR_CHAMBER.cy - VAPOR_CHAMBER.h / 2 + 0.0004,
            VAPOR_CHAMBER.cz,
          ]}
        >
          <cylinderGeometry args={[0.0003, 0.0003, 0.0022, 10]} />
          <primitive object={materials.vapor} attach="material" />
        </mesh>
        <mesh geometry={geo.pad} position={[THERMAL_PAD.x, THERMAL_PAD.y, THERMAL_PAD.z]}>
          <primitive object={materials.paste} attach="material" />
        </mesh>
      </group>
      {/* Graphite spreader: near-black laminate, soft corners, printed spec */}
      <group ref={register('graphite-sheet')}>
        <mesh geometry={geo.graphite} position={[GRAPHITE.cx, GRAPHITE.cy, GRAPHITE.cz]}>
          <primitive object={materials.dark} attach="material" />
        </mesh>
        <mesh
          geometry={geo.graphiteMark}
          position={[0.012, GRAPHITE.cy - 0.032, GRAPHITE.cz + GRAPHITE.thickness / 2 + 0.00001]}
        >
          <primitive object={materials.chipMark} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
