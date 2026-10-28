import { FINISHES, type FinishId } from '../../data/product.ts'
import { cn } from '../../lib/cn.ts'

interface PhoneFrameProps {
  finish?: FinishId
  face?: 'front' | 'rear'
  label?: string
}

/**
 * Static CSS phone renderer for WebGL failure, context loss, and no-JS.
 * Covers front and rear views so every act has a fallback.
 */
export function PhoneFrame({ finish = 'obsidian', face = 'front', label }: PhoneFrameProps) {
  const meta = FINISHES.find((f) => f.id === finish) ?? FINISHES[0]
  return (
    <div
      role="img"
      aria-label={label ?? `Aether One X in ${meta?.name}, ${face} view (static fallback)`}
      className={cn('phone-frame', face === 'rear' && 'phone-frame--rear')}
      data-finish={finish}
      data-face={face}
    >
      {face === 'front' ? (
        <div className="phone-frame-screen">
          <div className="phone-frame-notch" />
          <div className="phone-frame-wallpaper" />
        </div>
      ) : (
        <div className="phone-frame-back">
          <div className="phone-frame-island">
            <span className="phone-frame-lens phone-frame-lens-a" />
            <span className="phone-frame-lens phone-frame-lens-b" />
            <span className="phone-frame-lens phone-frame-lens-c" />
            <span className="phone-frame-periscope" />
            <span className="phone-frame-medallion" />
          </div>
          <p className="phone-frame-logo">AETHER</p>
        </div>
      )}
      <style>{`
        /* Same proportions as the 3D body (76.8 x 159.6 mm), the same round
           punch-hole and the same cobalt wallpaper as the live screen, so the
           swap from this preview to the 3D canvas never jumps in style. */
        .phone-frame { width: 180px; height: 372px; border-radius: 32px; padding: 6px;
          background: ${meta?.swatch ?? '#0b0b0e'};
          box-shadow: 0 0 0 1px rgba(28,27,25,0.18), inset 0 1px 0 rgba(255,255,255,0.18),
            0 40px 70px -36px rgba(40,30,10,0.55); }
        .phone-frame-screen { position: relative; width: 100%; height: 100%; border-radius: 27px;
          overflow: hidden; background: #0f2c66; }
        .phone-frame-notch { position: absolute; top: 11px; left: 50%; width: 9px; height: 9px;
          border-radius: 999px; transform: translateX(-50%); background: #05070c; z-index: 1;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08); }
        .phone-frame-wallpaper { position: absolute; inset: 0;
          background: radial-gradient(110% 40% at 50% 110%, rgba(255,243,226,0.85), rgba(255,243,226,0) 70%),
            linear-gradient(180deg, #0f2c66 0%, #2a64d6 50%, #7fa6ee 100%); }
        .phone-frame-back { position: relative; width: 100%; height: 100%; border-radius: 27px;
          background: ${meta?.swatch ?? '#0b0b0e'}; }
        /* Circular module, centered: knurled collar, triangle lenses,
           periscope window below, iris medallion at the centre. */
        .phone-frame-island { position: absolute; top: 10px; left: 50%; width: 104px; height: 104px;
          transform: translateX(-50%); border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, rgba(70,80,95,0.9), rgba(0,0,0,0.55) 70%);
          border: 2px solid rgba(200,215,235,0.35);
          box-shadow: 0 0 0 3px rgba(0,0,0,0.4), inset 0 0 0 5px rgba(255,255,255,0.05); }
        .phone-frame-lens { position: absolute; border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, #33507e, #060a12 70%);
          border: 2px solid rgba(200,215,235,0.5); }
        .phone-frame-lens-a { left: 39px; top: 8px; width: 26px; height: 26px; }
        .phone-frame-lens-b { left: 14px; bottom: 16px; width: 21px; height: 21px; }
        .phone-frame-lens-c { right: 14px; bottom: 16px; width: 21px; height: 21px; }
        .phone-frame-periscope { position: absolute; left: 34px; bottom: 6px; width: 36px; height: 12px;
          border-radius: 6px; background: #0a0e16; border: 1px solid rgba(200,215,235,0.35); }
        .phone-frame-medallion { position: absolute; left: 45px; top: 45px; width: 14px; height: 14px;
          border-radius: 999px; background: radial-gradient(circle, #dfe6f0 30%, #6a7688 75%);
          border: 1px solid rgba(255,255,255,0.5); }
        .phone-frame-logo { position: absolute; bottom: 60px; width: 100%; text-align: center;
          font-size: 10px; letter-spacing: 0.5em; color: rgba(240,245,252,0.8); }
      `}</style>
    </div>
  )
}
