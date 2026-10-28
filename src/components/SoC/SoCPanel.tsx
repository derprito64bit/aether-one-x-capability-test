import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { CHIPSET, PERFORMANCE, type SoCKey } from '../../data/product.ts'
import { formatNumber } from '../../lib/format.ts'
import { useCountUp } from '../../hooks/useCountUp.ts'

const ORDER: SoCKey[] = ['cpu', 'gpu', 'npu']
const EASE = [0.16, 1, 0.3, 1] as const

/** One die block: lit in the accent when its unit is selected. */
function Block({
  on,
  label,
  className,
  children,
}: {
  on: boolean
  label: string
  className: string
  children?: ReactNode
}) {
  return (
    <div
      data-on={on}
      className={`relative flex flex-col justify-between overflow-hidden rounded-md p-1 transition-colors sm:p-2 duration-500 data-[on=false]:bg-white/[0.05] data-[on=true]:bg-[#1a4fb8]/80 data-[on=false]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] data-[on=true]:shadow-[inset_0_0_0_1px_rgba(160,195,255,0.7),0_0_28px_-4px_rgba(71,141,255,0.55)] ${className}`}
    >
      <span className="font-mono text-[9px] tracking-[0.12em] text-white/80 uppercase md:text-[10px]">
        {label}
      </span>
      {children}
    </div>
  )
}

/** A grid of identical core tiles inside a block. */
function Cores({ n, cols }: { n: number; cols: number }) {
  return (
    <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="aspect-square rounded-[3px] bg-white/[0.14]" />
      ))}
    </div>
  )
}

/**
 * Floor plan of the fictional A1 Ultra die (illustrative, not a real
 * layout). Core counts come from CHIPSET so the drawing and the specs
 * cannot disagree. The selected unit lights up; everything else recedes.
 */
function DieDiagram({ unit }: { unit: SoCKey }) {
  return (
    <figure className="relative">
      <div className="relative aspect-square rounded-[var(--radius-panel)] bg-[linear-gradient(145deg,#2b2f37,#15171c_55%,#22252c)] p-3 shadow-[0_0_0_1px_rgba(28,27,25,0.12),0_40px_80px_-40px_rgba(20,20,30,0.7)] md:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className="relative grid h-full grid-cols-12 grid-rows-12 gap-1.5 md:gap-2">
          <Block
            on={unit === 'cpu'}
            label={`CPU · ${CHIPSET.cpuCores} cores`}
            className="col-span-6 row-span-5"
          >
            <Cores n={CHIPSET.cpuCores} cols={4} />
          </Block>
          <Block
            on={unit === 'gpu'}
            label={`GPU · ${CHIPSET.gpuCores} cores`}
            className="col-span-6 row-span-7"
          >
            <Cores n={CHIPSET.gpuCores} cols={7} />
          </Block>
          <Block on={unit === 'npu'} label="Neural engine" className="col-span-6 row-span-4">
            <Cores n={16} cols={8} />
          </Block>
          <Block on={false} label="Media + ISP" className="col-span-6 row-span-2" />
          <Block on={false} label="System cache" className="col-span-12 row-span-2" />
          <Block on={false} label="LPDDR5X" className="col-span-4 row-span-1" />
          <Block on={false} label="I/O" className="col-span-4 row-span-1" />
          <Block on={false} label="LPDDR5X" className="col-span-4 row-span-1" />
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-(--color-dim)">
        {CHIPSET.name}, {CHIPSET.dieAreaMm2} mm² at {CHIPSET.processNm} nm. Illustrative floor plan.
      </figcaption>
    </figure>
  )
}

/** Count-up hero figure, restarted whenever the unit changes. */
function HeroFigure({ value, suffix }: { value: number; suffix: string }) {
  const animated = useCountUp(value, true)
  return (
    <p className="spec-num mt-5 flex items-baseline gap-3 text-[clamp(4rem,8vw,6.5rem)]">
      <span data-testid="soc-hero">
        {formatNumber(Number.isInteger(value) ? Math.round(animated) : animated)}
        <span className="sr-only"> {suffix}</span>
      </span>
      <span aria-hidden="true" className="spec-unit">
        {suffix}
      </span>
    </p>
  )
}

/**
 * A1 Ultra explorer. dataviz applied: each tab is a single series, so one
 * sequential hue (aether) for magnitude and no legend; values are direct
 * labels in ink; marks are thin, end-rounded and anchored at the baseline,
 * with a hairline tick at the scale maximum instead of a filled track.
 */
export function SoCPanel() {
  const [tab, setTab] = useState<SoCKey>('cpu')
  const reduced = useReducedMotion()
  const unit = PERFORMANCE[tab]
  return (
    <section
      aria-label="A1 Ultra performance"
      className="page grid items-start gap-10 pt-10 lg:grid-cols-2 lg:gap-16"
    >
      <DieDiagram unit={tab} />
      <div>
        <div
          role="tablist"
          aria-label="Processor units"
          className="inline-flex rounded-full bg-(--color-sunken) p-1"
        >
          {ORDER.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              aria-controls={`soc-panel-${k}`}
              id={`soc-tab-${k}`}
              onClick={() => setTab(k)}
              data-active={tab === k}
              className="relative min-h-10 rounded-full px-5 text-sm font-medium text-(--color-dim) transition-colors data-[active=true]:text-(--color-ink)"
            >
              {tab === k ? (
                <motion.span
                  layoutId={reduced ? undefined : 'soc-tab'}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-(--color-raise) shadow-[0_1px_2px_rgba(40,30,10,0.12),0_0_0_1px_var(--color-border-hairline)]"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                />
              ) : null}
              <span className="relative">{PERFORMANCE[k].name}</span>
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`soc-panel-${tab}`}
          aria-labelledby={`soc-tab-${tab}`}
          className="mt-4"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <HeroFigure value={unit.hero.value} suffix={unit.hero.suffix} />
              <p className="mt-3 text-lg text-(--color-dim)">{unit.headline}</p>
              <ul className="mt-10 space-y-7">
                {unit.metrics.map((m, i) => {
                  const share = Math.min(1, m.value / m.max)
                  return (
                    <li key={m.label}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm">{m.label}</span>
                        <span
                          className="text-sm text-(--color-dim)"
                          data-testid={`soc-metric-${unit.key}`}
                        >
                          <span className="text-xl font-semibold tracking-[-0.02em] text-(--color-ink) tabular-nums">
                            {m.value.toLocaleString('en-US')}
                          </span>{' '}
                          {m.suffix}
                          <span className="sr-only"> of a possible {m.max}</span>
                        </span>
                      </div>
                      <div
                        role="img"
                        aria-label={`${m.label}: ${m.value} of ${m.max} ${m.suffix}`}
                        className="relative mt-2.5 h-1.5"
                      >
                        <motion.span
                          className="absolute inset-y-0 left-0 rounded-r-[4px] bg-(--color-aether-strong)"
                          style={{ width: `${share * 100}%`, originX: 0 }}
                          initial={reduced ? false : { scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: EASE }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -bottom-1 right-0 w-px bg-(--color-border-strong)"
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="spec-tech mt-8">{unit.footnote}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
