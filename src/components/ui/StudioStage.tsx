import type { ReactNode } from 'react'

/**
 * Product-photography backdrop for a 3D study: a lit porcelain sweep with a
 * soft floor shadow, framed as a panel. Purely presentational.
 */
export function StudioStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`panel relative overflow-hidden ${className ?? ''}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 52% at 50% 40%, rgba(255,255,255,0.95), rgba(255,255,255,0) 72%), radial-gradient(40% 9% at 50% 88%, rgba(60,50,30,0.16), rgba(60,50,30,0) 100%), linear-gradient(180deg, #f4f2ed 0%, #e4e0d6 100%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
