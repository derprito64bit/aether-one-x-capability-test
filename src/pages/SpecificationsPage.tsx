import { Head } from '../components/head/Head.tsx'
import { ProductJsonLd } from '../components/head/ProductJsonLd.tsx'
import { CtaBand } from '../components/layout/CtaBand.tsx'
import { PageHero } from '../components/layout/PageHero.tsx'
import { StatStrip } from '../components/ui/StatStrip.tsx'
import {
  BATTERY,
  CAMERA_LENSES,
  CONCEPT_NOTICE,
  DIMENSIONS,
  DISPLAY,
  SPEC_CATEGORIES,
} from '../data/product.ts'
import { formatNumber } from '../lib/format.ts'

/**
 * Specifications page: four headline figures, then every category in a
 * label column + definition grid (one divider per category, not per row).
 */
export function SpecificationsPage() {
  return (
    <>
      <Head
        title="Specifications — Aether One X"
        description="Every fictional spec, expanded."
        path="/specifications"
        image="/og/specifications.png"
      />
      <ProductJsonLd />
      <PageHero
        kicker="Specifications"
        title="Nothing hidden."
        lede="Every category, fully expanded. All values are illustrative."
      />
      <section aria-label="Headline specifications" className="page pt-10">
        <StatStrip
          label="Headline specifications"
          stats={[
            { value: DISPLAY.size.replace(' in', ''), unit: 'in', label: 'LTPO OLED display' },
            {
              value: String(CAMERA_LENSES[0]?.mp ?? 50),
              unit: 'MP',
              label: 'Main camera, 1/1.3 in sensor',
            },
            { value: formatNumber(BATTERY.capacity), unit: 'mAh', label: 'Silicon-carbon cell' },
            {
              value: String(DIMENSIONS.weightG),
              unit: 'g',
              label: `${DIMENSIONS.thicknessMm} mm thin`,
            },
          ]}
        />
      </section>
      <div className="page pt-20">
        {SPEC_CATEGORIES.map((category) => (
          <section
            key={category.label}
            aria-label={category.label}
            className="grid gap-6 border-t border-(--color-border-hairline) py-10 md:grid-cols-[13rem_1fr] md:gap-10"
          >
            <h2 className="text-xl font-semibold tracking-[-0.02em] md:sticky md:top-24 md:self-start">
              {category.label}
            </h2>
            <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {category.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-sm text-(--color-dim)">{row.label}</dt>
                  <dd className="mt-1 text-[17px] leading-snug">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="border-t border-(--color-border-hairline) pt-8 text-sm text-(--color-dim)">
          {CONCEPT_NOTICE}
        </p>
      </div>
      <CtaBand />
    </>
  )
}
