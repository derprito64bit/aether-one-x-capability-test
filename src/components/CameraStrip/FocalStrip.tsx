import { motion, useReducedMotion } from 'motion/react'
import { FOCAL_LENGTHS } from '../../data/product.ts'
import { usePhoneConfig, type FocusLensId } from '../PhoneViewer/PhoneConfig.tsx'
import { CoastScene } from './CoastScene.tsx'

const FOCAL_TO_LENS: Record<string, FocusLensId> = {
  '0.5x': 'ultra',
  '1x': 'main',
  '2x': 'mid',
  '5x': 'periscope',
  '10x': 'periscope',
}

/** Equivalent focal length and aperture per zoom stop (demonstration values). */
const OPTICS: Record<string, { mm: number; aperture: string; lens: string }> = {
  '0.5x': { mm: 14, aperture: 'f/2.2', lens: 'Ultra-wide' },
  '1x': { mm: 23, aperture: 'f/1.6', lens: 'Main' },
  '2x': { mm: 50, aperture: 'f/1.9', lens: 'Mid' },
  '5x': { mm: 135, aperture: 'f/3.0', lens: 'Periscope' },
  '10x': { mm: 270, aperture: 'f/3.0', lens: 'Hybrid crop' },
}

/** Zoom-button text the way a camera app prints it. */
function stopLabel(zoom: string, active: boolean): string {
  const n = zoom.replace('x', '')
  return active ? `${n}×` : n
}

/**
 * Zoom viewfinder. One scene, five focal lengths: each stop is a centred
 * crop scaled by its real focal ratio against the 14 mm ultra-wide, so the
 * frame shows what the lens actually does. Selecting a stop also refocuses
 * the matching lens on the 3D model through shared phone config.
 */
export function FocalStrip({ zoom, onZoom }: { zoom: string; onZoom: (zoom: string) => void }) {
  const { focusLens, setFocusLens } = usePhoneConfig()
  const reduced = useReducedMotion()
  const optics = OPTICS[zoom] ?? OPTICS['1x']!
  const scale = optics.mm / 14

  return (
    <div>
      <figure
        data-testid="focal-scene"
        className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-panel)] bg-[#d9dbe0] shadow-[0_0_0_1px_var(--color-border-hairline),0_30px_70px_-40px_rgba(30,30,40,0.55)] md:aspect-[16/10]"
      >
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ scale }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 20 }}
        >
          <CoastScene />
        </motion.div>
        {/* Viewfinder chrome: real camera-app furniture, not decoration. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(10,14,24,0.38))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 md:h-24 md:w-24"
        >
          <span className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#ffe9b0]" />
          <span className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#ffe9b0]" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#ffe9b0]" />
          <span className="absolute right-0 bottom-0 h-4 w-4 border-r-2 border-b-2 border-[#ffe9b0]" />
        </div>
        <figcaption className="pointer-events-none absolute top-4 left-4 flex gap-2 font-mono text-[11px] tracking-[0.08em] text-white uppercase md:top-5 md:left-5">
          <span className="rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
            {optics.mm} mm
          </span>
          <span className="rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
            {optics.aperture}
          </span>
          <span className="hidden rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md sm:inline">
            {optics.lens}
          </span>
        </figcaption>
        <div
          role="group"
          aria-label="Choose a focal length"
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur-md md:bottom-5"
        >
          {FOCAL_LENGTHS.map((f) => {
            const active = f.zoom === zoom
            return (
              <button
                key={f.zoom}
                type="button"
                onClick={() => {
                  const lens = FOCAL_TO_LENS[f.zoom]
                  if (lens !== undefined) setFocusLens(lens)
                  onZoom(f.zoom)
                }}
                aria-pressed={active}
                aria-label={`${f.zoom}, ${f.note}`}
                data-testid={`focal-${f.zoom}`}
                data-active={active}
                className="relative flex h-11 min-w-11 items-center justify-center rounded-full px-2 font-mono text-[13px] font-medium text-white/85 transition-colors hover:text-white data-[active=true]:text-[#ffe9b0]"
              >
                {active ? (
                  <motion.span
                    layoutId={reduced ? undefined : 'zoom-stop'}
                    aria-hidden="true"
                    className="absolute inset-1 rounded-full bg-white/18"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                ) : null}
                <span className="relative">{stopLabel(f.zoom, active)}</span>
              </button>
            )
          })}
        </div>
      </figure>
      <p className="mt-4 text-sm text-(--color-dim)" data-testid="focal-detail">
        Focused lens: {focusLens}. 2x uses the 50 mm mid lens; 10x is a hybrid crop of the 135 mm
        periscope.
      </p>
    </div>
  )
}
