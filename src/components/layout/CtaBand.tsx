import { ArrowRightIcon } from '../icons.tsx'
import { Link } from 'react-router'
import { FINISHES, STORAGE_OPTIONS } from '../../data/product.ts'
import { formatPrice } from '../../lib/format.ts'
import { Reveal } from '../ui/Reveal.tsx'

/** Closing call-to-action band: the six real finishes, one route to the configurator. */
export function CtaBand() {
  const from = STORAGE_OPTIONS[0]?.price ?? 999
  return (
    <section aria-label="Configure your Aether One X" className="page pt-24">
      <Reveal>
        <div className="panel grid items-center gap-10 overflow-hidden p-8 md:grid-cols-[1.2fr_1fr] md:p-14">
          <div>
            <h2 className="display-lg">Make it yours.</h2>
            <p className="lede mt-4">
              {FINISHES.length} finishes, {STORAGE_OPTIONS.length} capacities. From{' '}
              {formatPrice(from)}.
            </p>
            <Link to="/#buy" className="btn btn-primary mt-8">
              Configure yours
              <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <ul aria-label="Available finishes" className="grid grid-cols-3 gap-x-4 gap-y-6">
            {FINISHES.map((f) => (
              <li key={f.id} className="flex flex-col items-center gap-2 text-center">
                <span
                  aria-hidden="true"
                  className="block aspect-square w-full max-w-20 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-6px_14px_rgba(0,0,0,0.28),0_10px_24px_-12px_rgba(40,30,10,0.5)]"
                  style={{ background: f.swatch }}
                />
                <span className="text-sm">{f.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}
