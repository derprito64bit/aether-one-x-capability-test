import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { useReducedTransparency } from '../../hooks/useReducedTransparency.ts'
import {
  buildDisplacementMap,
  detectSvgBackdropFilter,
  resolveGlassTier,
  type GlassProfile,
  type GlassTier,
} from './displacement.ts'

export type GlassVariant = 'chrome' | 'panel' | 'tooltip' | 'control'

const VARIANT_PROFILE: Record<GlassVariant, GlassProfile> = {
  chrome: 'convex',
  panel: 'lip',
  tooltip: 'convex',
  control: 'concave',
}

/** Peak refraction in px per variant. Small on purpose: quality, not novelty. */
const VARIANT_SCALE: Record<GlassVariant, number> = {
  chrome: 14,
  panel: 22,
  tooltip: 8,
  control: 10,
}

let cachedTier: GlassTier | null = null

/** Capability detection, run once at mount and cached. */
export function glassTier(): GlassTier {
  if (cachedTier === null) {
    cachedTier = resolveGlassTier({
      webglTransmission: false,
      svgBackdropFilter: detectSvgBackdropFilter(),
    })
  }
  return cachedTier
}

interface GlassProps {
  variant: GlassVariant
  children: ReactNode
  className?: string
  label?: string
}

/**
 * One liquid-glass primitive. Variants differ by parameter set, never by
 * bespoke CSS. Tier 2 renders SVG-displacement refraction (Chromium);
 * Tier 3 renders the layered fallback (rim, tint, noise, inner edges).
 * Tier 1 lives in the 3D stage on hero surfaces. Text always sits over an
 * opaque scrim so 4.5:1 holds against the worst-case backdrop.
 */
export function Glass({ variant, children, className, label }: GlassProps) {
  const tier = glassTier()
  // Inline displacement would override the reduced-transparency collapse
  // (inline style beats the media query), so it is never set when reduced.
  const reducedTransparency = useReducedTransparency()
  const filterId = useMemo(() => `glass-${variant}`, [variant])
  const map = useMemo(() => {
    if (tier !== 'displacement' || reducedTransparency) return null
    return buildDisplacementMap(96, VARIANT_PROFILE[variant])
  }, [tier, variant, reducedTransparency])

  const style = useMemo<CSSProperties>(() => {
    if (tier === 'displacement' && map !== null) {
      return { backdropFilter: `url(#${filterId}) saturate(var(--glass-saturate))` }
    }
    return {}
  }, [tier, map, filterId])

  return (
    <div
      data-glass={variant}
      data-tier={tier}
      data-testid={`glass-${variant}`}
      aria-label={label}
      className={`glass-surface glass-${variant} ${className ?? ''}`}
      style={style}
    >
      {tier === 'displacement' && map !== null ? (
        <svg width={0} height={0} aria-hidden="true" className="absolute">
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feImage
                href={map.dataUrl}
                x={0}
                y={0}
                width={96}
                height={96}
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={Math.min(VARIANT_SCALE[variant], map.maxDisplacement)}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
      <span className="glass-rim" aria-hidden="true" />
      <div className="glass-content">{children}</div>
      <style>{`
        .glass-surface { position: relative; isolation: isolate;
          background: var(--glass-tint); border-radius: 16px; }
        .glass-content { position: relative; z-index: 1; }
        .glass-rim { position: absolute; inset: 0; border-radius: inherit; z-index: 0;
          pointer-events: none; border: 1px solid var(--glass-rim);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.35); }
        .glass-chrome { border-radius: 999px; }
        .glass-tooltip { border-radius: 999px; }
        /* Milky glass on the porcelain page (panel + chrome); the tooltip
           stays dark so the readout pops over any stage tone. */
        .glass-panel, .glass-chrome { background: rgba(251, 250, 247, 0.74); }
        .glass-chrome { box-shadow: 0 0 0 1px rgba(28, 27, 25, 0.07),
          0 12px 32px -14px rgba(40, 30, 10, 0.28); }
        [data-tier='layered'] .glass-surface, .glass-surface[data-tier='layered'] {
          backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate)); }
        .glass-surface::after { content: ''; position: absolute; inset: 0; border-radius: inherit;
          pointer-events: none; opacity: 0.05; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='64' height='64' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E"); }
        @media (prefers-reduced-transparency: reduce) {
          .glass-surface { background: var(--color-surface); backdrop-filter: none;
            -webkit-backdrop-filter: none; }
        }
        @media (forced-colors: active) {
          .glass-surface { background: Canvas; border: 1px solid ButtonText; }
          .glass-rim { display: none; }
        }
      `}</style>
    </div>
  )
}
