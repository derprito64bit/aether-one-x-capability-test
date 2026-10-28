import { Head } from '../components/head/Head.tsx'
import { CtaBand } from '../components/layout/CtaBand.tsx'
import { PageHero } from '../components/layout/PageHero.tsx'
import { SoCPanel } from '../components/SoC/SoCPanel.tsx'
import { Reveal } from '../components/ui/Reveal.tsx'
import { StatStrip } from '../components/ui/StatStrip.tsx'
import { CHIPSET, MEMORY, PERFORMANCE } from '../data/product.ts'

/** Performance page: the A1 Ultra explorer, then the figures that matter. */
export function PerformancePage() {
  return (
    <>
      <Head
        title="Performance — Aether One X"
        description="Fictional A1 Ultra die. CPU, GPU, NPU."
        path="/performance"
        image="/og/performance.png"
      />
      <PageHero
        kicker="Performance"
        title="A1 Ultra."
        lede={`${CHIPSET.cpuCores} CPU cores, ${CHIPSET.gpuCores} GPU cores and a neural engine on one ${CHIPSET.processNm} nm die. Pick a unit to see it on the floor plan.`}
      />
      <SoCPanel />
      <section aria-labelledby="sustained" className="page pt-28">
        <Reveal>
          <h2 id="sustained" className="display-lg max-w-3xl">
            Fast, then fast for longer.
          </h2>
          <p className="lede mt-4">
            A vapour chamber sits directly over the die and spreads heat across the frame, so peak
            clocks hold instead of spiking and fading.
          </p>
        </Reveal>
        <div className="mt-12">
          <StatStrip
            label="A1 Ultra headline figures"
            stats={[
              { value: String(CHIPSET.cpuClockGhZ), unit: 'GHz', label: 'Peak CPU clock' },
              {
                value: String(PERFORMANCE.npu.hero.value),
                unit: PERFORMANCE.npu.hero.suffix,
                label: 'On-device neural engine',
              },
              { value: String(MEMORY.ramGb), unit: 'GB', label: `${MEMORY.type} memory` },
              {
                value: String(PERFORMANCE.gpu.metrics[2]?.value ?? 88),
                unit: '%',
                label: 'GPU thermal headroom under sustained load',
              },
            ]}
          />
        </div>
        <p className="spec-tech mt-8">Demonstration figures for fictional silicon.</p>
      </section>
      <CtaBand />
    </>
  )
}
