import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { FinishId } from '../../data/product.ts'
import { PhoneFrame } from '../Phone/PhoneFrame.tsx'
import type { PhonePoseId } from './PhoneScene.tsx'

const PhoneCanvasLazy = lazy(() =>
  import('./PhoneCanvas.tsx').then((m) => ({ default: m.PhoneCanvas })),
)

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  } catch {
    return false
  }
}

function fallbackForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('nogl')
  } catch {
    return false
  }
}

interface PhoneViewerProps {
  pose?: PhonePoseId
  finish?: FinishId
  label: string
  /** Reserve vertical space so canvas mount never shifts layout. */
  className?: string
  /** Canvas box size; must match the reserved space in `className`. */
  canvasClassName?: string
  /** Join an ancestor PhoneConfigProvider instead of minting local state. */
  sharedConfig?: boolean
}

const DEFAULT_CANVAS = 'h-[420px] w-full md:h-[520px]'

/**
 * Lazy 3D phone study. Constructs the WebGL canvas only near the viewport,
 * caps DPR (1.75 desktop, 1.3 mobile), falls back to the static CSS phone on
 * WebGL failure or context loss, and disposes everything on unmount.
 */
export function PhoneViewer({
  pose = 'hero',
  finish = 'obsidian',
  label,
  className,
  canvasClassName = DEFAULT_CANVAS,
  sharedConfig = false,
}: PhoneViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const [contextLost, setContextLost] = useState(false)
  const [canRender] = useState(() => !fallbackForced() && webglAvailable())

  useEffect(() => {
    const el = mountRef.current
    if (el === null || !canRender || nearViewport) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNearViewport(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [canRender, nearViewport])

  useEffect(() => {
    if (!canRender) return
    const onVisibility = () => {
      // R3F keeps rendering while hidden; the canvas unmounts only on route
      // change. Hidden-tab sparing lands with the film director in M5.
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [canRender])

  const face = pose === 'rear' ? 'rear' : 'front'
  const showFallback = !canRender || contextLost
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const dprCap = coarse ? 1.3 : 1.75
  const detail = coarse ? 'low' : 'high'

  return (
    <div
      ref={mountRef}
      className={className ?? 'flex min-h-[420px] items-center justify-center md:min-h-[520px]'}
      data-testid="phone-viewer"
      data-fallback={showFallback ? 'true' : 'false'}
      role="img"
      aria-label={label}
    >
      {showFallback ? (
        <div className="flex flex-col items-center gap-3">
          <PhoneFrame finish={finish} face={face} label={label} />
          {contextLost && (
            <p role="status" className="text-sm text-(--color-dim)">
              3D paused after a graphics reset. Static view shown.
            </p>
          )}
        </div>
      ) : nearViewport ? (
        <Suspense
          fallback={
            // Same static phone as the pre-mount preview: no text flash,
            // no layout jump while the 3D chunk streams in.
            <div
              className={`flex items-center justify-center ${canvasClassName}`}
              role="status"
              aria-label="3D phone loading"
            >
              <PhoneFrame finish={finish} face={face} label={`${label} (loading)`} />
            </div>
          }
        >
          <div className={canvasClassName} data-testid="phone-canvas">
            <PhoneCanvasLazy
              pose={pose}
              label={label}
              dprCap={dprCap}
              detail={detail}
              sharedConfig={sharedConfig}
              onContextLost={() => setContextLost(true)}
            />
          </div>
        </Suspense>
      ) : (
        <div
          className="flex min-h-[420px] items-center justify-center"
          role="status"
          aria-label="3D phone loading"
        >
          <PhoneFrame finish={finish} face={face} label={`${label} (preview)`} />
        </div>
      )}
    </div>
  )
}
