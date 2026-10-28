import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { AdaptiveDpr } from '../components/PhoneViewer/PhoneCanvas.tsx'
import { FilmScene } from './FilmScene.tsx'
import type { MotionValue } from 'motion/react'

interface FilmCanvasProps {
  progress: MotionValue<number>
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
  onContextLost: () => void
  /** False while the runway is off screen or the tab is hidden: no frames. */
  active: boolean
}

/**
 * Film WebGL canvas. Own lazy chunk with three. Explicit color pipeline:
 * sRGB-authored colors, ACES Filmic tone mapping, per-act exposure. Renders
 * only while the film can be seen; the configurator below has its own
 * canvas, and two full-rate WebGL loops halve everyone's frame budget.
 */
export function FilmCanvas({
  progress,
  parallaxX,
  parallaxY,
  onContextLost,
  active,
}: FilmCanvasProps) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={Math.min(window.devicePixelRatio || 1, 1.75)}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 16, near: 0.01, far: 10, position: [0, 0, 0.96] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault()
            onContextLost()
          },
          false,
        )
      }}
    >
      <color attach="background" args={['#e8e5de']} />
      <AdaptiveDpr cap={1.75} />
      <FilmScene
        progress={progress}
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        label="Aether One X product film"
      />
    </Canvas>
  )
}
