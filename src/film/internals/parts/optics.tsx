import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { lensSpecs } from '../../../components/PhoneViewer/cameraLayout.ts'
import { PERISCOPE, TOF } from '../../../components/PhoneViewer/phoneDimensions.ts'
import { CAMERA_INTERNAL } from '../layout.ts'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import { MARK_CELLS } from '../showcaseTextures.ts'
import type { PartRegister } from './register.ts'
import { disposeAll, markPlane, softSlab } from './shapes.ts'

const { cx, cy, cz, r: MODULE_R } = CAMERA_INTERNAL
/** Rear (lens-side) planes: barrel faces stop 0.11mm ahead of the panel. */
const LENS_FACE = cz - 0.0012
const CAN_REAR = cz - 0.0006
const CAN_DEPTH = 0.0016
const TOF_RAD = (TOF.angleDeg * Math.PI) / 180

/** Square voice-coil can side for a lens radius. */
function canSide(r: number): number {
  return r * 2.15
}

/**
 * Internal camera modules (round 05 showcase; they were a dark disc with
 * three holes): a machined carrier ring on the module footprint, one
 * voice-coil can per lens with its black barrel and coated front element,
 * sensor boards behind each can, the folded periscope block with its
 * prism window, and the ToF module with emitter and receiver. Positions
 * line up with the exterior lenses; rear (lens side) faces -z.
 */
export function OpticsPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  const specs = useMemo(() => lensSpecs(), [])
  const geo = useMemo(() => {
    const ring = new THREE.Shape()
    ring.absarc(0, 0, MODULE_R - 0.0009, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, MODULE_R - 0.0033, 0, Math.PI * 2, true)
    ring.holes.push(hole)
    const carrier = new THREE.ExtrudeGeometry(ring, {
      depth: 0.0005,
      bevelEnabled: false,
      curveSegments: 48,
    })
    carrier.translate(0, 0, -0.00025)
    const out: Record<string, THREE.BufferGeometry> = {
      carrier,
      periscope: softSlab(
        PERISCOPE.w / 2 + 0.0021,
        PERISCOPE.h / 2 + 0.0008,
        0.0022,
        0.0002,
        0.0009,
        8,
      ),
      prism: softSlab(
        PERISCOPE.w / 2 - 0.0004,
        PERISCOPE.h / 2 - 0.0005,
        0.00004,
        0,
        PERISCOPE.r * 0.6,
      ),
      tof: softSlab(TOF.window.w / 2 + 0.0006, TOF.window.h / 2 + 0.0005, 0.0012, 0.00015, 0.0009),
      camMark: markPlane(0.0062, 0.0031, MARK_CELLS.cam),
    }
    for (const lens of specs) {
      const side = canSide(lens.r)
      out[`can:${lens.key}`] = softSlab(side / 2, side / 2, CAN_DEPTH, 0.00018, 0.0011, 8)
      out[`board:${lens.key}`] = softSlab(
        side / 2 - 0.0004,
        side / 2 - 0.0004,
        0.0003,
        0.00005,
        0.0006,
      )
    }
    return out
  }, [specs])
  useEffect(() => () => disposeAll(geo), [geo])

  const tofX = cx + TOF.ringR * Math.cos(TOF_RAD)
  const tofY = cy + TOF.ringR * Math.sin(TOF_RAD)
  return (
    <group userData={{ part: 'optics', readout: '135 mm folded periscope' }}>
      {/* Machined carrier ring holding every module on the footprint */}
      <group ref={register('camera-module')}>
        <mesh geometry={geo.carrier} position={[cx, cy, cz + 0.0002]}>
          <primitive object={materials.shield} attach="material" />
        </mesh>
      </group>
      {/* Sensor boards behind each can, plus the module flex */}
      <group ref={register('sensor-stack')}>
        {specs.map((lens) => (
          <mesh
            key={lens.key}
            geometry={geo[`board:${lens.key}`]}
            position={[lens.x, lens.y, CAN_REAR + CAN_DEPTH + 0.00015]}
          >
            <primitive object={materials.board} attach="material" />
          </mesh>
        ))}
        <mesh position={[cx - MODULE_R + 0.002, cy - 0.006, CAN_REAR + CAN_DEPTH + 0.0002]}>
          <boxGeometry args={[0.004, 0.012, 0.0001]} />
          <primitive object={materials.trace} attach="material" />
        </mesh>
      </group>
      {specs.map((lens) => (
        // Seat lives on the meshes, not the group: the teardown driver
        // owns group transforms.
        <group key={lens.key} ref={register(`lens-${lens.key}`)}>
          {/* Voice-coil can */}
          <mesh
            geometry={geo[`can:${lens.key}`]}
            position={[lens.x, lens.y, CAN_REAR + CAN_DEPTH / 2]}
          >
            <primitive object={materials.shield} attach="material" />
          </mesh>
          {/* Black barrel standing out of the can (cylinders run along y) */}
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            position={[lens.x, lens.y, (LENS_FACE + CAN_REAR) / 2]}
          >
            <cylinderGeometry args={[lens.r, lens.r * 1.06, CAN_REAR - LENS_FACE, 32]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
          {/* Coated front element and its retaining ring */}
          <mesh rotation={[0, Math.PI, 0]} position={[lens.x, lens.y, LENS_FACE - 0.00001]}>
            <circleGeometry args={[lens.r * 0.78, 32]} />
            <primitive object={materials.lensGlass} attach="material" />
          </mesh>
          <mesh rotation={[0, Math.PI, 0]} position={[lens.x, lens.y, LENS_FACE - 0.000005]}>
            <ringGeometry args={[lens.r * 0.8, lens.r * 0.96, 32]} />
            <primitive object={materials.housing} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Folded periscope: block, prism window, marking */}
      <group ref={register('lens-periscope')}>
        <mesh geometry={geo.periscope} position={[cx + PERISCOPE.x, cy + PERISCOPE.y, cz]}>
          <primitive object={materials.shield} attach="material" />
        </mesh>
        <mesh geometry={geo.prism} position={[cx + PERISCOPE.x, cy + PERISCOPE.y, cz - 0.00113]}>
          <primitive object={materials.lensGlass} attach="material" />
        </mesh>
        <mesh
          geometry={geo.camMark}
          position={[
            cx + PERISCOPE.x + PERISCOPE.w / 2 - 0.0005,
            cy + PERISCOPE.y - 0.0035,
            cz - 0.0011,
          ]}
          rotation={[0, Math.PI, 0]}
          scale={0.5}
        >
          <primitive object={materials.chipMark} attach="material" />
        </mesh>
      </group>
      {/* ToF module: emitter and receiver under one window */}
      <group ref={register('tof-module')}>
        <mesh geometry={geo.tof} position={[tofX, tofY, cz]} rotation={[0, 0, TOF_RAD]}>
          <primitive object={materials.housing} attach="material" />
        </mesh>
        {[
          { d: TOF.emitter.d, off: -0.0019 },
          { d: TOF.receiver.d, off: 0.0019 },
        ].map(({ d, off }) => (
          <mesh
            key={off}
            position={[
              tofX + off * Math.cos(TOF_RAD),
              tofY + off * Math.sin(TOF_RAD),
              cz - 0.00061,
            ]}
            rotation={[0, Math.PI, 0]}
          >
            <circleGeometry args={[d / 2, 24]} />
            <primitive object={materials.lensGlass} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  )
}
