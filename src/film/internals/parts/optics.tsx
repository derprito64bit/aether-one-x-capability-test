import { lensSpecs } from '../../../components/PhoneViewer/cameraLayout.ts'
import { PERISCOPE, TOF } from '../../../components/PhoneViewer/phoneDimensions.ts'
import { CAMERA_INTERNAL } from '../layout.ts'
import type { InternalsMaterialSet } from '../internalsMaterials.ts'
import type { PartRegister } from './register.ts'

/**
 * Internal camera housings over the layout manifest (Prompt C section 6):
 * one main housing block matching the A2 module footprint, three round lens
 * barrels on the triangle, the periscope block below, and the ToF module as
 * its own exploding part. Positions line up with the exterior lenses the
 * viewer just saw, or the exploded view will not read.
 */
export function OpticsPart({
  materials,
  register,
}: {
  materials: InternalsMaterialSet
  register: PartRegister
}) {
  const specs = lensSpecs()
  const { cx, cy, cz, r } = CAMERA_INTERNAL
  return (
    <group userData={{ part: 'optics', readout: '135 mm folded periscope' }}>
      {/* Main housing: an open carrier ring on the module footprint, not a
        solid plate — the shell module (collar, lenses, medallion) shows
        through the middle during the tour instead of hiding behind a
        black disc. */}
      <group ref={register('camera-module')}>
        <mesh position={[cx, cy, cz]}>
          <ringGeometry args={[0.012, r * 0.92, 48]} />
          <primitive object={materials.housing} attach="material" />
        </mesh>
      </group>
      {/* Sensor stack: a puck on the module axis (cylinders run along y
          by default; unturned it was a 26mm saucer standing on edge). */}
      <group ref={register('sensor-stack')}>
        <mesh position={[cx, cy, cz + 0.0014]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0131, 0.0131, 0.0012, 48]} />
          <primitive object={materials.housing} attach="material" />
        </mesh>
      </group>
      {specs.map((lens) => (
        // Seat lives on the meshes, not the group: the teardown driver
        // owns group positions (slot + lens-up turn), so a seat on the
        // group would be overwritten and every barrel would collapse to
        // the phone origin.
        <group key={lens.key} ref={register(`lens-${lens.key}`)}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[lens.x, lens.y, cz]}>
            <cylinderGeometry args={[lens.r, lens.r * 1.1, 0.0024, 24]} />
            <primitive object={materials.housing} attach="material" />
          </mesh>
          {/* Dark lens cup on the barrel's rear face, facing the module
              glass (a circle lies in XY; the old PI/2 turn stood it on
              edge as a horizontal fin through the barrel). */}
          <mesh rotation={[0, Math.PI, 0]} position={[lens.x, lens.y, cz - 0.0012 - 0.00002]}>
            <circleGeometry args={[lens.r * 0.7, 24]} />
            <primitive object={materials.dark} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Periscope block below the triangle, matching the exterior window */}
      <group ref={register('lens-periscope')}>
        <mesh position={[cx + PERISCOPE.x, cy + PERISCOPE.y, cz]}>
          <boxGeometry args={[PERISCOPE.w, PERISCOPE.h, 0.0026]} />
          <primitive object={materials.housing} attach="material" />
        </mesh>
      </group>
      {/* ToF module behind its window, separating on its own delay */}
      <group ref={register('tof-module')}>
        <mesh
          rotation={[0, 0, (TOF.angleDeg * Math.PI) / 180]}
          position={[
            cx + TOF.ringR * Math.cos((TOF.angleDeg * Math.PI) / 180),
            cy + TOF.ringR * Math.sin((TOF.angleDeg * Math.PI) / 180),
            cz,
          ]}
        >
          <boxGeometry args={[TOF.window.w, TOF.window.h, 0.0012]} />
          <primitive object={materials.housing} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
