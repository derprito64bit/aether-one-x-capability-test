/**
 * Aether mark: the circular camera module reduced to a glyph (collar ring,
 * three lenses on a triangle). Original geometry, decorative only.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="7.6" r="2.6" fill="currentColor" />
      <circle cx="8.2" cy="14.2" r="2.1" fill="currentColor" />
      <circle cx="15.8" cy="14.2" r="2.1" fill="currentColor" />
    </svg>
  )
}
