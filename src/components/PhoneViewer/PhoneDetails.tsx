import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  ANTENNA_BAND,
  BUTTON_POCKET,
  CHAMFER,
  EARPIECE,
  GLASS_FRONT_Z,
  GRILLE_SLOT,
  MIC_R,
  MIC_X,
  PORT,
  PUNCH,
  SPEAKER_XS,
  SX,
  SY,
} from './phoneDimensions.ts'
import { createRoundedRectGeometry, createRoundedRectRingGeometry } from './phoneGeometry.ts'
import type { PhoneMaterialSet } from './phoneMaterials.ts'

/**
 * Surface hardware convention: the frame and glass are opaque solids, so
 * nothing can be cut into them. Every opening is a dark face seated a few
 * hundredths of a millimetre proud of the surface it sits on, with its
 * depth running into the body, never out of it. (Before, the port, mics,
 * and top slot poked up to 1.7mm out of the edges while the speaker
 * slots, antenna bands, SIM tray, and power-key grooves sat inside the
 * solid and never rendered.)
 */
const PROUD = 0.00001

/** Turns an XY-authored plate (depth on z) to lie on the bottom face, depth on -y. */
function onBottomFace(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.rotateX(Math.PI / 2)
}

/** Turns an XY-authored plate (depth on z) to lie on the +x rail, depth on +x. */
function onRightRail(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.rotateY(Math.PI / 2)
}

export function EdgeDetails({ set, detail }: { set: PhoneMaterialSet; detail: 'high' | 'low' }) {
  const port = useMemo(
    () => ({
      rim: onBottomFace(
        createRoundedRectRingGeometry(
          PORT.w + PORT.rim * 2,
          PORT.h + PORT.rim * 2,
          PORT.r + PORT.rim,
          PORT.w,
          PORT.h,
          PORT.r,
          0.00004,
        ),
      ),
      mouth: onBottomFace(createRoundedRectGeometry(PORT.w, PORT.h, PORT.r, 0.00002)),
    }),
    [],
  )
  useEffect(
    () => () => {
      port.rim.dispose()
      port.mouth.dispose()
    },
    [port],
  )
  const speakerMesh = useMemo(() => {
    // Six asymmetric slots marching right of the port, one instanced mesh.
    // Open face PROUD of the bottom wall, depth into the body.
    const geo = new THREE.BoxGeometry(GRILLE_SLOT.w, GRILLE_SLOT.depth, GRILLE_SLOT.h)
    const mesh = new THREE.InstancedMesh(geo, set.speaker, SPEAKER_XS.length)
    const m = new THREE.Matrix4()
    SPEAKER_XS.forEach((x, i) => {
      m.setPosition(x, -SY - PROUD + GRILLE_SLOT.depth / 2, 0)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [set])
  useEffect(() => () => speakerMesh.geometry.dispose(), [speakerMesh])
  const bandDepth = ANTENNA_BAND.zMax - ANTENNA_BAND.zMin
  const bandZ = (ANTENNA_BAND.zMax + ANTENNA_BAND.zMin) / 2
  return (
    <group>
      <ButtonPocket set={set} y={0.02} height={0.014} power />
      <ButtonPocket set={set} y={0.047} height={0.032} />
      {/* Antenna interruption bands across the rail flat, flush */}
      {/* Right-rail band sits below the power key, never across a button */}
      <Seam set={set} side={1} y={0.0085} depth={bandDepth} z={bandZ} />
      <Seam set={set} side={1} y={-0.024} depth={bandDepth} z={bandZ} />
      <Seam set={set} side={-1} y={0.058} depth={bandDepth} z={bandZ} />
      <Seam set={set} side={-1} y={-0.042} depth={bandDepth} z={bandZ} />
      {/* SIM tray: dark parting outline, tray face in front of it, both
          flush with the left rail */}
      <mesh position={[-SX - PROUD + 0.00005, 0.05, 0]}>
        <boxGeometry args={[0.0001, 0.0065, 0.0017]} />
        <primitive object={set.antenna} attach="material" />
      </mesh>
      <mesh position={[-SX - PROUD * 2 + 0.0002, 0.05, 0]}>
        <boxGeometry args={[0.0004, 0.0062, 0.0014]} />
        <primitive object={set.simTray} attach="material" />
      </mesh>
      {/* Eject pinhole beside the tray, axis into the rail */}
      <mesh position={[-SX - PROUD + 0.0002, 0.0535, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0003, 0.0003, 0.0004, 10]} />
        <primitive object={set.port} attach="material" />
      </mesh>
      {/* USB-C: chamfered rim, dark mouth, tongue, contact glint, layered
          outward from the bottom wall */}
      <mesh geometry={port.rim} position={[0, -SY - PROUD * 2, 0]}>
        <primitive object={set.frameChamfer} attach="material" />
      </mesh>
      <mesh geometry={port.mouth} position={[0, -SY - PROUD, 0]}>
        <primitive object={set.port} attach="material" />
      </mesh>
      {detail === 'high' ? (
        <group>
          <mesh position={[0, -SY - PROUD * 3, 0]}>
            <boxGeometry args={[PORT.tongue.w, PROUD * 2, PORT.tongue.h]} />
            <primitive object={set.portTongue} attach="material" />
          </mesh>
          <mesh position={[0, -SY - PROUD * 4.5, 0]}>
            <boxGeometry args={[0.005, PROUD, 0.0002]} />
            <primitive object={set.portContact} attach="material" />
          </mesh>
        </group>
      ) : null}
      <primitive object={speakerMesh} />
      {/* Primary mic: single hole left of the port, wider than a slot, axis on y */}
      <mesh position={[MIC_X, -SY - PROUD + 0.0006, 0]}>
        <cylinderGeometry args={[MIC_R, MIC_R, 0.0012, 12]} />
        <primitive object={set.speaker} attach="material" />
      </mesh>
      {/* Top rail: secondary mic plus speaker slot, asymmetric */}
      <mesh position={[-0.012, SY + PROUD - 0.0005, 0]}>
        <cylinderGeometry args={[0.00035, 0.00035, 0.001, 10]} />
        <primitive object={set.speaker} attach="material" />
      </mesh>
      <mesh position={[0.014, SY + PROUD - 0.00025, 0]}>
        <boxGeometry args={[0.003, 0.0005, 0.001]} />
        <primitive object={set.speaker} attach="material" />
      </mesh>
    </group>
  )
}

/**
 * Front sensors seated on the cover glass (GLASS_FRONT_Z): every face is
 * flush or a hair proud of the glass. The punch-hole stood 0.23mm proud,
 * its ring faced the back of the phone, and the glint was buried in it.
 */
export function FrontGlassDetails({ set }: { set: PhoneMaterialSet }) {
  const top = GLASS_FRONT_Z + PROUD
  return (
    <group>
      {/* Earpiece slot, half-hidden in the top bezel line */}
      <mesh position={[0, EARPIECE.y, top - 0.00011]}>
        <boxGeometry args={[EARPIECE.w, EARPIECE.h, 0.00022]} />
        <primitive object={set.speaker} attach="material" />
      </mesh>
      {/* Punch-hole: dark well through the glass thickness, 0.15mm ring, offset glint */}
      <mesh position={[0, PUNCH.y, top - 0.000125]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[PUNCH.r, PUNCH.r, 0.00025, 24]} />
        <primitive object={set.port} attach="material" />
      </mesh>
      <mesh position={[0, PUNCH.y, top + PROUD * 0.5]}>
        <ringGeometry args={[PUNCH.r, PUNCH.r + PUNCH.ring, 24]} />
        <primitive object={set.lensCavity} attach="material" />
      </mesh>
      <mesh position={[0.0004, PUNCH.y + 0.0004, top + PROUD]}>
        <circleGeometry args={[0.00028, 12]} />
        <primitive object={set.flashGlass} attach="material" />
      </mesh>
    </group>
  )
}

function ButtonPocket({
  set,
  y,
  height,
  power = false,
}: {
  set: PhoneMaterialSet
  y: number
  height: number
  power?: boolean
}) {
  const T = BUTTON_POCKET.thickness
  const gap = BUTTON_POCKET.gap
  const geometries = useMemo(() => {
    const b = CHAMFER.button
    // Authored in the rail plane (x = across the thickness, y = along the
    // rail) as pills, then turned so depth runs out along +x.
    const pocketW = T + gap * 2
    const pocketH = height + gap * 2
    return {
      pocket: onRightRail(createRoundedRectGeometry(pocketW, pocketH, pocketW / 2, 0.0001)),
      flange: onRightRail(
        createRoundedRectRingGeometry(
          pocketW + 0.0003,
          pocketH + 0.0003,
          (pocketW + 0.0003) / 2,
          pocketW,
          pocketH,
          pocketW / 2,
          0.0001,
        ),
      ),
      cap: onRightRail(
        createRoundedRectGeometry(T - b * 2, height - b * 2, (T - b * 2) / 2, 0.0005 - b * 2, b, b),
      ),
    }
  }, [T, gap, height])
  useEffect(
    () => () => {
      geometries.pocket.dispose()
      geometries.flange.dispose()
      geometries.cap.dispose()
    },
    [geometries],
  )
  return (
    <group position={[SX, y, 0]}>
      {/* Machined pocket: dark gap line, flush with the rail */}
      <mesh geometry={geometries.pocket} position={[PROUD - 0.00005, 0, 0]}>
        <primitive object={set.antenna} attach="material" />
      </mesh>
      <mesh geometry={geometries.flange} position={[PROUD * 0.5 - 0.00005, 0, 0]}>
        <primitive object={set.frameChamfer} attach="material" />
      </mesh>
      {/* Cap outer face lands 0.4mm proud of the rail, seated 0.1mm in */}
      <mesh geometry={geometries.cap} position={[BUTTON_POCKET.proud - 0.00025, 0, 0]}>
        <primitive object={set.button} attach="material" />
      </mesh>
      {/* Power key carries fine grooves on its face the rocker does not */}
      {power
        ? [-0.004, 0, 0.004].map((dy) => (
            <mesh key={dy} position={[BUTTON_POCKET.proud, dy, 0]}>
              <boxGeometry args={[PROUD * 2, 0.00006, T * 0.6]} />
              <primitive object={set.antenna} attach="material" />
            </mesh>
          ))
        : null}
    </group>
  )
}

function Seam({
  set,
  side,
  y,
  depth,
  z,
}: {
  set: PhoneMaterialSet
  side: 1 | -1
  y: number
  depth: number
  z: number
}) {
  // Outer face ANTENNA_BAND.proud past the rail, 0.4mm into it.
  return (
    <mesh position={[side * (SX + ANTENNA_BAND.proud - 0.0002), y, z]}>
      <boxGeometry args={[0.0004, ANTENNA_BAND.w, depth]} />
      <primitive object={set.antenna} attach="material" />
    </mesh>
  )
}
