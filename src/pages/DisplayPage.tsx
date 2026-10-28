import { Head } from '../components/head/Head.tsx'
import { CtaBand } from '../components/layout/CtaBand.tsx'
import { PageHero } from '../components/layout/PageHero.tsx'
import { DisplayDemo } from '../components/DisplayDemo/DisplayDemo.tsx'
import { PhoneViewer } from '../components/PhoneViewer/PhoneViewer.tsx'
import { StatStrip } from '../components/ui/StatStrip.tsx'
import { StudioStage } from '../components/ui/StudioStage.tsx'
import { DIMENSIONS, DISPLAY } from '../data/product.ts'
import { formatNumber } from '../lib/format.ts'

/** Display product page: front study, the refresh demo, the panel figures. */
export function DisplayPage() {
  return (
    <>
      <Head
        title="Display — Aether One X"
        description="Fictional 6.7 inch LTPO OLED, 1 to 144 Hz."
        path="/display"
        image="/og/display.png"
      />
      <PageHero
        kicker="Display"
        title="Light, controlled."
        lede={`A ${DISPLAY.size} LTPO OLED that reaches ${formatNumber(DISPLAY.peakNits)} nits in sunlight and idles at ${DISPLAY.refreshMin} Hz when nothing moves.`}
      >
        <StudioStage>
          <PhoneViewer
            pose="front"
            label="Aether One X front display study"
            className="flex h-[420px] items-center justify-center md:h-[560px]"
            canvasClassName="h-[420px] w-full md:h-[560px]"
          />
        </StudioStage>
      </PageHero>
      <DisplayDemo />
      <section aria-label="Panel figures" className="page pt-24">
        <StatStrip
          label="Display figures"
          stats={[
            {
              value: DISPLAY.size.replace(' in', ''),
              unit: 'in',
              label: 'LTPO OLED, edge to edge',
            },
            {
              value: formatNumber(DISPLAY.peakNits),
              unit: 'nits',
              label: 'Peak brightness, outdoors',
            },
            { value: formatNumber(DISPLAY.pwm), unit: 'Hz', label: 'PWM dimming, easier on eyes' },
            {
              value: String(DIMENSIONS.bezelsMm),
              unit: 'mm',
              label: 'Symmetrical bezels on all four sides',
            },
          ]}
        />
        <p className="spec-tech mt-8">
          {DISPLAY.resolution} · {DISPLAY.colorBits}-bit colour · demonstration values
        </p>
      </section>
      <CtaBand />
    </>
  )
}
