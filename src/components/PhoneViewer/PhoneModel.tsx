import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { CameraAssembly } from './CameraAssembly.tsx'
import { usePhoneConfig, type FocusLensId } from './PhoneConfig.tsx'
import {
  BACK_FACE,
  BACK_PANEL,
  BEZEL,
  CERAMIC_FACE_Z,
  CHAMFER,
  CORNER_R,
  DIM,
  DISPLAY_INSET,
  DISPLAY_PANEL,
  FRONT_GLASS,
  GLASS_FRONT_Z,
  PANEL_SPLIT,
} from './phoneDimensions.ts'
import {
  assignRailGroups,
  createBezelGeometry,
  createFrameBodyGeometry,
  createFrameRingGeometry,
  createRearRimGeometry,
  bodyOutlineShape,
  fitPlanarUVs,
  RING_OPENING,
  createLowerPanelGeometry,
  createPanelGapGeometry,
  roundedRectSlabGeometry,
} from './phoneGeometry.ts'
import {
  FINISH_COLORS,
  FINISH_PARAMS,
  RAIL_KEYS,
  createPhoneMaterials,
  type PhoneMaterialSet,
} from './phoneMaterials.ts'
import { EdgeDetails, FrontGlassDetails } from './PhoneDetails.tsx'

interface PhoneModelProps {
  /** Optional per-instance material set (the film passes its own for x-ray). */
  materials?: PhoneMaterialSet
  /** Optional shell sub-groups so a director can part the layers. */
  groups?: Partial<
    Record<'frame' | 'back' | 'glass' | 'display' | 'module', MutableRefObject<THREE.Group | null>>
  >
  /** Animated focus ring on the active lens. The film disables this. */
  animateFocusRing?: boolean
  /**
   * Low drops knurling, the second baffle, ToF internals, the port tongue
   * contacts, and the regulatory text, and halves outline sampling.
   */
  detail?: 'high' | 'low'
  /**
   * Film-only optical separation refs. Keys are `${lens}:${layer}` with
   * layers cover, collar, barrel, element, sensor, plus `knurl`. The film
   * director writes staged offsets; viewers leave them at rest.
   */
  opticsSeparation?: MutableRefObject<Record<string, THREE.Group | null>>
}

/** Ceramic panel inner face: the frame body starts here. */
const PANEL_INNER_Z = BACK_PANEL.z + BACK_PANEL.depth / 2
/** Cover glass sized so its bevelled edge stops 0.01mm inside the ring opening. */
const GLASS_FIT = {
  halfW: RING_OPENING.halfW - CHAMFER.glassMeet - 0.00001,
  halfH: RING_OPENING.halfH - CHAMFER.glassMeet - 0.00001,
  r: RING_OPENING.r - CHAMFER.glassMeet - 0.00001,
}
/** Bezel ink: outer edge 0.01mm inside the opening, band down to the panel. */
const INK_FIT = {
  halfW: RING_OPENING.halfW - 0.00001,
  halfH: RING_OPENING.halfH - 0.00001,
  r: RING_OPENING.r - 0.00001,
  innerR:
    RING_OPENING.r - 0.00001 - Math.min(RING_OPENING.halfW - 0.036, RING_OPENING.halfH - 0.0774),
}

/** Lower split panel: 0.12mm proud of the ceramic, seated 0.05mm into it. */
const LOWER_PANEL_SINK = 0.00005
const LOWER_PANEL_DEPTH = PANEL_SPLIT.step + LOWER_PANEL_SINK

/** Disposes a memoized geometry when it is replaced or its owner unmounts. */
function useDisposeGeometry(geometry: THREE.BufferGeometry): void {
  useEffect(() => () => geometry.dispose(), [geometry])
}

const LENSES: Array<{ key: FocusLensId }> = [
  { key: 'main' },
  { key: 'ultra' },
  { key: 'mid' },
  { key: 'periscope' },
]

/** Procedurally built, finish-reactive phone model. Pure geometry and materials. */
export function PhoneModel({
  materials,
  groups,
  animateFocusRing = true,
  detail = 'high',
  opticsSeparation,
}: PhoneModelProps) {
  const ownMaterials = useMemo(
    () => (materials ? null : createPhoneMaterials(FINISH_PARAMS.obsidian)),
    [materials],
  )
  const set = materials ?? ownMaterials
  if (set === null) return null

  return (
    <PhoneModelInner
      set={set}
      groups={groups}
      animateFocusRing={animateFocusRing}
      detail={detail}
      opticsSeparation={opticsSeparation}
    />
  )
}

function PhoneModelInner({
  set,
  groups,
  animateFocusRing,
  detail,
  opticsSeparation,
}: {
  set: PhoneMaterialSet
  groups: PhoneModelProps['groups']
  animateFocusRing: boolean
  detail: 'high' | 'low'
  opticsSeparation: PhoneModelProps['opticsSeparation']
}) {
  const { finish, focusLens } = usePhoneConfig()
  const smooth = useRef({
    frameColor: FINISH_COLORS.obsidian.frame.clone(),
    backColor: FINISH_COLORS.obsidian.back.clone(),
    islandColor: FINISH_COLORS.obsidian.island.clone(),
    antennaColor: FINISH_COLORS.obsidian.antenna.clone(),
    accentColor: FINISH_COLORS.obsidian.accent.clone(),
    backMetal: FINISH_PARAMS.obsidian.backMetalness,
    backRough: FINISH_PARAMS.obsidian.backRoughness,
    backClear: FINISH_PARAMS.obsidian.backClearcoat,
    frameRough: FINISH_PARAMS.obsidian.frameRoughness,
    frameAniso: FINISH_PARAMS.obsidian.frameAnisotropy,
  })

  const frameBodyGeometry = useMemo(() => {
    // Body stops at the ceramic panel's inner face; the rear rim frames the
    // panel (it used to be solid to the back, with the panel buried in it).
    const geometry = createFrameBodyGeometry(PANEL_INNER_Z, detail === 'low')
    assignRailGroups(geometry)
    return geometry
  }, [detail])
  const frameRimGeometry = useMemo(() => {
    // Rim lid 0.06mm behind the ceramic face (never coplanar with it).
    const geometry = createRearRimGeometry(BACK_FACE + 0.00005, PANEL_INNER_Z, detail === 'low')
    assignRailGroups(geometry)
    return geometry
  }, [detail])
  const frameRingGeometry = useMemo(() => {
    const geometry = createFrameRingGeometry(detail === 'low')
    assignRailGroups(geometry)
    return geometry
  }, [detail])
  const backSlabGeometry = useMemo(
    () =>
      roundedRectSlabGeometry(
        BACK_PANEL.halfW,
        BACK_PANEL.halfH,
        BACK_PANEL.depth,
        BACK_PANEL.bevel,
      ),
    [],
  )
  // Front stack sized to the ring opening, corners matched: the glass and
  // ink used to run 0.9mm under the lid, straight through the ring's
  // opening wall.
  const glassSlabGeometry = useMemo(
    () =>
      roundedRectSlabGeometry(
        GLASS_FIT.halfW,
        GLASS_FIT.halfH,
        FRONT_GLASS.depth,
        CHAMFER.glassMeet,
        GLASS_FIT.r,
      ),
    [],
  )
  // Subpixel veil over the active area with the active area's rounded
  // corners: a square plane's corners ran past the display and into the
  // ring's corners.
  const subpixelGeometry = useMemo(() => {
    const halfW = (DIM.w - BEZEL * 2 - DISPLAY_INSET * 2) / 2
    const halfH = (DIM.h - BEZEL * 2 - DISPLAY_INSET * 2) / 2
    const geometry = new THREE.ShapeGeometry(
      bodyOutlineShape(halfW, halfH, INK_FIT.innerR - (0.036 - halfW), 32),
      8,
    )
    fitPlanarUVs(geometry)
    return geometry
  }, [])
  useDisposeGeometry(subpixelGeometry)
  // Display corners follow the ink opening, so no corner shows past the ink.
  const displaySlabGeometry = useMemo(
    () =>
      roundedRectSlabGeometry(0.036, 0.0774, DISPLAY_PANEL.depth, 0.0001, INK_FIT.innerR - 0.0001),
    [],
  )
  // Bezel ink ring: ring opening outside, active area inside, feathered
  // edge. Corner loops share the opening radius so the ink band is uniform.
  // Renders under the glass slab so the specular passes over unbroken.
  const bezelGeometry = useMemo(
    () => createBezelGeometry(INK_FIT.halfW, INK_FIT.halfH, 0.036, 0.0774, INK_FIT.r),
    [],
  )
  const panelGapTopGeometry = useMemo(() => createPanelGapGeometry(true), [])
  const panelGapBottomGeometry = useMemo(() => createPanelGapGeometry(false), [])
  // Split finishes: proud lower panel following the ceramic outline.
  const lowerPanelGeometry = useMemo(
    () =>
      createLowerPanelGeometry(
        BACK_PANEL.halfW - 0.0005,
        BACK_PANEL.halfH - 0.0005,
        CORNER_R - 0.0005,
        PANEL_SPLIT.seamY - PANEL_SPLIT.seamWidth / 2,
        LOWER_PANEL_DEPTH,
      ),
    [],
  )
  // Each geometry disposes on its own lifecycle: one shared effect would
  // dispose the long-lived slabs too whenever an LOD-keyed one rebuilt.
  useDisposeGeometry(frameBodyGeometry)
  useDisposeGeometry(frameRimGeometry)
  useDisposeGeometry(frameRingGeometry)
  useDisposeGeometry(backSlabGeometry)
  useDisposeGeometry(glassSlabGeometry)
  useDisposeGeometry(displaySlabGeometry)
  useDisposeGeometry(bezelGeometry)
  useDisposeGeometry(panelGapTopGeometry)
  useDisposeGeometry(panelGapBottomGeometry)
  useDisposeGeometry(lowerPanelGeometry)
  const lensRefs = useRef<Partial<Record<FocusLensId, THREE.Group>>>({})
  const focusRef = useRef<{ key: FocusLensId | null; blend: number }>({ key: focusLens, blend: 0 })
  // Rail materials in group order (+X, -X, +Y, -Y) for the split extrusion.
  const rails = useMemo(
    () => RAIL_KEYS.map((name) => set[name]) as unknown as THREE.Material[],
    [set],
  )
  const split = FINISH_PARAMS[finish].panelSplit === true
  // Rear decals sit 0.05mm off whichever panel carries them.
  const rearDecalZ = CERAMIC_FACE_Z - (split ? PANEL_SPLIT.step : 0) - 0.00005

  // Writes into three.js objects per frame without React state. This is the
  // sanctioned R3F hot path: scratch-owned colors, zero allocation.
  // oxlint-disable-next-line react/immutability
  useFrame((state, delta) => {
    const targetColors = FINISH_COLORS[finish]
    const targetParams = FINISH_PARAMS[finish]
    const k = 1 - Math.exp(-delta * 5.5)
    const s = smooth.current
    s.frameColor.lerp(targetColors.frame, k)
    s.backColor.lerp(targetColors.back, k)
    s.islandColor.lerp(targetColors.island, k)
    s.antennaColor.lerp(targetColors.antenna, k)
    s.accentColor.lerp(targetColors.accent, k)
    s.backMetal += (targetParams.backMetalness - s.backMetal) * k
    s.backRough += (targetParams.backRoughness - s.backRough) * k
    s.backClear += (targetParams.backClearcoat - s.backClear) * k
    s.frameRough += (targetParams.frameRoughness - s.frameRough) * k
    s.frameAniso += (targetParams.frameAnisotropy - s.frameAniso) * k

    for (const name of RAIL_KEYS) {
      set[name].color.copy(s.frameColor)
      set[name].roughness = s.frameRough
      set[name].anisotropy = s.frameAniso
    }
    set.frameChamfer.color.copy(s.frameColor)
    set.frameChamfer.roughness = s.frameRough * 0.6
    set.frameChamfer.anisotropy = s.frameAniso
    set.back.color.copy(s.backColor)
    set.back.metalness = s.backMetal
    set.back.roughness = s.backRough
    set.back.clearcoat = s.backClear
    set.island.color.copy(s.islandColor)
    set.antenna.color.copy(s.antennaColor)
    set.focusRing.color.copy(s.accentColor)
    set.focusRing.emissive.copy(s.accentColor)

    // Subpixel hint: RGB stripes fade in only below ~12cm, where they stop
    // aliasing and start reading as a real panel. Zero at normal distance.
    if (detail === 'high') {
      const dist = state.camera.position.length()
      const w = Math.min(1, Math.max(0, (0.12 - dist) / 0.03))
      set.subpixel.opacity += (w * 0.16 - set.subpixel.opacity) * Math.min(1, delta * 8)
    } else {
      set.subpixel.opacity = 0
    }

    const focus = focusRef.current
    if (focus.key !== focusLens) {
      focus.key = focusLens
      focus.blend = 0
    }
    focus.blend = Math.min(1, focus.blend + delta * 6)
    const t = state.clock.elapsedTime
    // Focus treatment is viewer-only: the film is a pure function of
    // scroll, so it never scales or pulses a lens on the clock (the main
    // lens used to breathe 4% larger through the whole film).
    for (const lens of LENSES) {
      const group = lensRefs.current[lens.key]
      if (!group) continue
      const active = animateFocusRing && focus.key === lens.key
      const pulse = active ? Math.sin(t * 2.4) * 0.004 : 0
      group.scale.setScalar(1 + ((active ? 1.04 : 1) - 1) * focus.blend + pulse)
      // The rings share one material, so per-lens visibility picks the
      // active ring; opacity alone lit every ring at once. Index loop:
      // no closure allocation per frame.
      for (let i = 0; i < group.children.length; i++) {
        const child = group.children[i]
        if (child !== undefined && child.name === 'focus-ring') child.visible = active
      }
    }
    if (animateFocusRing) {
      const targetOpacity = 0.55 + Math.sin(t * 3) * 0.12
      set.focusRing.opacity += (targetOpacity * focus.blend - set.focusRing.opacity) * 0.12
    }
  })

  return (
    <group>
      <group ref={groups?.frame}>
        <mesh geometry={frameBodyGeometry} material={rails} castShadow />
        <mesh geometry={frameRimGeometry} material={rails} castShadow />
        <mesh geometry={frameRingGeometry} material={rails} castShadow />
        <EdgeDetails set={set} detail={detail} />
      </group>
      <group ref={groups?.back}>
        <mesh geometry={backSlabGeometry} position={[0, 0, BACK_PANEL.z]}>
          <primitive object={set.back} attach="material" />
        </mesh>
        <group ref={groups?.module}>
          <CameraAssembly
            materials={set}
            lensRefs={lensRefs}
            detail={detail}
            separation={opticsSeparation}
          />
        </group>
        {/* Two-material rear panel (Prompt A2 section 8): recessed groove
            plus a proud textured lower panel. Per finish, not global. */}
        {split ? (
          <group>
            {/* Seam line on the ceramic face along the lower panel's top edge */}
            <mesh position={[0, PANEL_SPLIT.seamY, CERAMIC_FACE_Z - 0.00001]}>
              <boxGeometry args={[DIM.w - 0.004, PANEL_SPLIT.seamWidth, 0.00002]} />
              <primitive object={set.panelSeam} attach="material" />
            </mesh>
            <mesh
              geometry={lowerPanelGeometry}
              position={[0, 0, CERAMIC_FACE_Z + LOWER_PANEL_SINK - LOWER_PANEL_DEPTH / 2]}
            >
              <primitive object={set.panelLower} attach="material" />
            </mesh>
          </group>
        ) : null}
        {/* Wordmark and regulatory print ride whichever panel is under them */}
        <mesh position={[0, -0.065, rearDecalZ]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.016, 0.004]} />
          <primitive object={set.logo} attach="material" />
        </mesh>
        {detail === 'high' ? (
          <mesh position={[0.018, -0.068, rearDecalZ]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.012, 0.0022]} />
            <primitive object={set.regulatory} attach="material" />
          </mesh>
        ) : null}
        {/* 0.12mm frame-to-back gap: dark hairlines top and bottom on the
            ceramic edge, following it rail to rail so the ends never poke
            past the rounded corners. */}
        <mesh geometry={panelGapTopGeometry} position={[0, 0, CERAMIC_FACE_Z - 0.00001]}>
          <primitive object={set.antenna} attach="material" />
        </mesh>
        <mesh geometry={panelGapBottomGeometry} position={[0, 0, CERAMIC_FACE_Z - 0.00001]}>
          <primitive object={set.antenna} attach="material" />
        </mesh>
      </group>
      <group ref={groups?.glass}>
        <mesh geometry={glassSlabGeometry} position={[0, 0, FRONT_GLASS.z]}>
          <primitive object={set.screen} attach="material" />
        </mesh>
        <FrontGlassDetails set={set} />
        {detail === 'high' ? (
          // Macro subpixel veil rides the glass it is drawn on (in the
          // display group it sliced through the glass as the stack
          // opened). Half a hundredth over the glass: under the punch-hole
          // and earpiece faces (0.01mm proud), never coplanar with them.
          <mesh
            geometry={subpixelGeometry}
            position={[0, 0, GLASS_FRONT_Z + 0.000005]}
            renderOrder={2}
          >
            <primitive object={set.subpixel} attach="material" />
          </mesh>
        ) : null}
      </group>
      <group ref={groups?.display}>
        <mesh geometry={bezelGeometry}>
          <primitive object={set.bezel} attach="material" />
        </mesh>
        <mesh geometry={displaySlabGeometry} position={[0, 0, DISPLAY_PANEL.z]}>
          <primitive object={set.display} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
