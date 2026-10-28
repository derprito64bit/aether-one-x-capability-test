import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AdaptiveDpr } from '../components/PhoneViewer/PhoneCanvas.tsx'
import { PhoneConfigProvider } from '../components/PhoneViewer/PhoneConfig.tsx'
import { PhoneModel } from '../components/PhoneViewer/PhoneModel.tsx'
import { StudioEnvironment } from '../components/PhoneViewer/phoneEnvironment.ts'
import {
  FINISH_PARAMS,
  createPhoneMaterials,
  type PhoneMaterialSet,
} from '../components/PhoneViewer/phoneMaterials.ts'
import { FilmDirector, type FilmRefs } from './FilmDirector.tsx'
import { Internals, type InternalsControl } from './internals/Internals.tsx'
import {
  createInternalsMaterials,
  disposeInternalsMaterials,
} from './internals/internalsMaterials.ts'
import { LiveScreen, useScreenRefs } from './LiveScreen.tsx'
import { Stage } from './stage/Stage.tsx'
import { LAYER_GAP } from './teardown/layers.ts'
import { createLayerPoses } from './teardown/showcase.ts'
import { ShowcaseDimmer } from './teardown/ShowcaseDimmer.tsx'
import { calloutBridge } from './overlay/callouts.ts'
import type { MotionValue } from 'motion/react'

interface FilmSceneProps {
  progress: MotionValue<number>
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
  label: string
}

/**
 * Film stage contents. Owns the film material set (x-ray isolation from
 * product viewers), the internals registry, the live screen texture, and
 * every ref the director writes. Explicit color: ACES Filmic tone mapping
 * on the Canvas, sRGB-authored colors converted once at creation.
 */
export function FilmScene({ progress, parallaxX, parallaxY, label }: FilmSceneProps) {
  const materials = useMemo<PhoneMaterialSet>(
    () => createPhoneMaterials(FINISH_PARAMS.obsidian),
    [],
  )
  const internalsMaterials = useMemo(() => createInternalsMaterials(), [])
  // Internals materials and their canvas maps die with the scene.
  useEffect(() => () => disposeInternalsMaterials(internalsMaterials), [internalsMaterials])
  const screenTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(
      (() => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 512
        return canvas
      })(),
    )
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])

  const hero = useRef<THREE.Group | null>(null)
  const frame = useRef<THREE.Group | null>(null)
  const back = useRef<THREE.Group | null>(null)
  const glass = useRef<THREE.Group | null>(null)
  const display = useRef<THREE.Group | null>(null)
  const module = useRef<THREE.Group | null>(null)
  const internals = useRef<THREE.Group | null>(null)
  const keyLight = useRef<THREE.DirectionalLight | null>(null)
  const fillLight = useRef<THREE.DirectionalLight | null>(null)
  const rimLight = useRef<THREE.DirectionalLight | null>(null)
  const accentLight = useRef<THREE.DirectionalLight | null>(null)
  const internalsControl = useRef<InternalsControl>({
    opacity: 0,
    explode: 0,
    explodeBatt: 0,
    explodeRadial: 0,
    chipFocus: 0,
    chipLift: 0,
    battLift: 0,
    subjectDim: 0,
    energy: 0,
    shieldLift: 0,
    coilRing: 0,
    stackSeparate: 0,
    poses: createLayerPoses(),
    showcaseLayer: -1,
    showcaseFocus: 0,
    dieLift: 0,
    layerAlpha: new Float32Array(11).fill(1),
    teardownGap: LAYER_GAP,
    reducedMotion: false,
  })
  const opticsSeparation = useRef<Record<string, THREE.Group | null>>({})
  // TEMP-DEBUG diagnosis hook. Removed before merge.
  const debugScene = useThree((state) => state.scene)
  const debugCamera = useThree((state) => state.camera)
  useEffect(() => {
    const w = window as unknown as {
      __scene?: THREE.Scene
      __ray?: (x: number, y: number) => string
    }
    w.__scene = debugScene
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    w.__ray = (x, y) => {
      ndc.set(x, y)
      raycaster.setFromCamera(ndc, debugCamera)
      const hits = raycaster.intersectObjects(debugScene.children, true)
      return hits
        .slice(0, 6)
        .map((hit) => {
          const o = hit.object as THREE.Mesh
          if (!o.isMesh) return 'non-mesh'
          const m = o.material as THREE.Material | THREE.Material[]
          const mat = Array.isArray(m)
            ? `array[${o.geometry.groups.map((g) => g.materialIndex).join(',')}]`
            : `${m.type}:${(m as THREE.MeshPhysicalMaterial).color?.getHexString()}:op${(m as THREE.MeshPhysicalMaterial).opacity?.toFixed(2)}:side${(m as THREE.MeshPhysicalMaterial).side}:vis=${o.visible}:dw=${(m as THREE.MeshPhysicalMaterial).depthWrite}`
          return `${o.geometry.type}@${o.position
            .toArray()
            .map((v) => +v.toFixed(4))
            .join(',')} mat=${mat}`
        })
        .join('\n')
    }
  }, [debugScene, debugCamera])
  const screen = useScreenRefs()

  // Bind the live screen texture as the display emissive map once.
  useEffect(() => {
    const previous = materials.display.emissiveMap
    materials.display.emissiveMap = screenTexture
    materials.display.emissiveIntensity = 1
    materials.display.needsUpdate = true
    return () => {
      materials.display.emissiveMap = previous
      materials.display.needsUpdate = true
    }
  }, [materials, screenTexture])

  const refs = useMemo<FilmRefs>(
    () => ({
      hero,
      frame,
      back,
      glass,
      display,
      module,
      internals,
      internalsControl,
      keyLight,
      fillLight,
      rimLight,
      accentLight,
      opticsSeparation,
      screenMode: screen.modeRef,
      screenBrightness: screen.brightnessRef,
      screenTime: screen.timeRef,
      parallaxX,
      parallaxY,
    }),
    [screen.modeRef, screen.brightnessRef, screen.timeRef, parallaxX, parallaxY],
  )

  return (
    <group name={label}>
      <directionalLight ref={keyLight} position={[0.6, 0.9, 1.2]} intensity={2.2} color="#ffffff" />
      <directionalLight
        ref={fillLight}
        position={[-0.9, 0.2, 0.6]}
        intensity={0.7}
        color="#bcd2ff"
      />
      <directionalLight
        ref={rimLight}
        position={[-0.3, -0.6, -1]}
        intensity={1.1}
        color="#7fb4ff"
      />
      {/* Camera-act accent: off-axis high source raking the collar chamfer */}
      <directionalLight
        ref={accentLight}
        position={[0.5, 0.75, -0.35]}
        intensity={0}
        color="#e8f1ff"
      />
      <ambientLight intensity={0.35} color="#dfe8ff" />
      <StudioEnvironment />
      <Stage progress={progress} />
      <group ref={hero}>
        <PhoneConfigProvider>
          <PhoneModel
            materials={materials}
            groups={{ frame, back, glass, display, module }}
            animateFocusRing={false}
            opticsSeparation={opticsSeparation}
          />
        </PhoneConfigProvider>
      </group>
      <group ref={internals}>
        <Internals materials={internalsMaterials} control={internalsControl} />
      </group>
      <LiveScreen
        texture={screenTexture}
        modeRef={screen.modeRef}
        brightnessRef={screen.brightnessRef}
        runningRef={screen.runningRef}
        timeRef={screen.timeRef}
      />
      <AdaptiveDpr cap={1.75} />
      <CalloutBridge />
      <FilmDirector progress={progress} materials={materials} refs={refs} />
      <ShowcaseDimmer refs={refs} />
    </group>
  )
}

/** Feeds the HTML callout layer the live camera it projects anchors with. */
function CalloutBridge() {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    calloutBridge.camera = camera
  })
  return null
}
