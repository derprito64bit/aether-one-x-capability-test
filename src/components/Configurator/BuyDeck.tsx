import { CheckIcon, InfoIcon } from '../icons.tsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DEFAULT_STORAGE_GB, FINISHES, STORAGE_OPTIONS } from '../../data/product.ts'
import { formatPrice } from '../../lib/format.ts'
import { PhoneConfigProvider, usePhoneConfig } from '../PhoneViewer/PhoneConfig.tsx'
import { PhoneViewer } from '../PhoneViewer/PhoneViewer.tsx'

const SPRING = { type: 'spring', stiffness: 520, damping: 38 } as const

/**
 * Closing configurator deck. Finish and capacity lerp the live 3D materials
 * through shared config; the summary carries the price and the one
 * purchase action.
 */
export function BuyDeck() {
  return (
    <PhoneConfigProvider>
      <BuyDeckInner />
    </PhoneConfigProvider>
  )
}

function BuyDeckInner() {
  const { finish, setFinish } = usePhoneConfig()
  const [storageGb, setStorageGb] = useStateGb()
  const [asks, setAsks] = useState(0)
  const reduced = useReducedMotion()
  const option = STORAGE_OPTIONS.find((s) => s.gb === storageGb) ?? STORAGE_OPTIONS[1]
  const active = FINISHES.find((f) => f.id === finish) ?? FINISHES[0]
  if (option === undefined || active === undefined) return null

  return (
    <section
      id="buy"
      tabIndex={-1}
      aria-label="Configure your Aether One X"
      className="page pt-24 focus-visible:outline-none md:pt-32"
    >
      <div className="max-w-2xl">
        <h2 className="display-lg">Make it yours.</h2>
        <p className="lede mt-4">
          Pick a finish and a capacity. The phone updates as you choose, so what you pick is what
          you see.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        {/* Stage: sticky on desktop so the phone stays beside every choice. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 55% at 50% 42%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%), linear-gradient(180deg, #f3f1ec 0%, #e6e2d9 100%)',
              }}
            />
            <div className="relative">
              <PhoneViewer
                pose="hero"
                label={`Aether One X in ${active.name}`}
                sharedConfig
                className="flex h-[440px] items-center justify-center md:h-[600px]"
                canvasClassName="h-[440px] w-full md:h-[600px]"
              />
            </div>
            <p className="relative px-6 pb-5 text-sm text-(--color-dim)">
              {active.name}, {option.label}.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel p-6 md:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-semibold tracking-[-0.02em]">Finish</h3>
              <p className="text-sm text-(--color-dim)">{FINISHES.length} options</p>
            </div>
            <div role="group" aria-label="Choose a finish" className="mt-5 flex flex-wrap gap-3">
              {FINISHES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFinish(f.id)}
                  aria-pressed={finish === f.id}
                  aria-label={f.name}
                  title={`${f.name}: ${f.tagline}`}
                  data-testid={`finish-${f.id}`}
                  data-active={finish === f.id}
                  className="relative flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 active:scale-95"
                >
                  {finish === f.id ? (
                    <motion.span
                      layoutId={reduced ? undefined : 'finish-ring'}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full ring-2 ring-(--color-ink)"
                      transition={SPRING}
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="h-11 w-11 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-5px_12px_rgba(0,0,0,0.28)]"
                    style={{ background: f.swatch }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-5 min-h-[4.5rem]" aria-live="polite">
              <p className="font-medium" data-testid="finish-name">
                {active.name}: {active.tagline}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-(--color-dim)">
                {active.description}
              </p>
            </div>
          </div>

          <div className="panel p-6 md:p-8">
            <h3 className="text-lg font-semibold tracking-[-0.02em]">Capacity</h3>
            <div role="group" aria-label="Choose a capacity" className="mt-5 grid gap-2.5">
              {STORAGE_OPTIONS.map((s) => {
                const on = storageGb === s.gb
                return (
                  <button
                    key={s.gb}
                    type="button"
                    onClick={() => setStorageGb(s.gb)}
                    aria-pressed={on}
                    data-testid={`capacity-${s.gb}`}
                    data-active={on}
                    className="relative flex min-h-14 items-center justify-between rounded-2xl px-5 text-left transition-colors duration-200 hover:bg-(--color-raise)"
                  >
                    {on ? (
                      <motion.span
                        layoutId={reduced ? undefined : 'capacity-card'}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl bg-(--color-raise) shadow-[0_0_0_1.5px_var(--color-ink)]"
                        transition={SPRING}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl shadow-[0_0_0_1px_var(--color-border-hairline)]"
                      />
                    )}
                    <span className="relative flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                          on
                            ? 'bg-(--color-ink) text-(--color-ink-inverse)'
                            : 'shadow-[inset_0_0_0_1.5px_var(--color-border-strong)]'
                        }`}
                      >
                        {on ? <CheckIcon size={12} weight="bold" /> : null}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </span>
                    <span className="relative text-(--color-dim) tabular-nums">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="panel p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-(--color-dim)">Your Aether One X</p>
                <p className="mt-1 font-medium">
                  {active.name}, {option.label}
                </p>
              </div>
              <p
                className="spec-num relative overflow-hidden text-4xl md:text-5xl"
                data-testid="buy-price"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={option.price}
                    className="inline-block"
                    initial={reduced ? { opacity: 0 } : { y: '60%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { y: '-60%', opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {formatPrice(option.price)}
                  </motion.span>
                </AnimatePresence>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary flex-1 sm:flex-none sm:px-8"
                onClick={() => setAsks((n) => n + 1)}
              >
                Buy
              </button>
              <Link to="/specifications" className="btn btn-quiet flex-1 sm:flex-none">
                Full specs
              </Link>
            </div>
            {/* The live region is mounted from the start so the notice is
                announced reliably; each press remounts its text (keyed by
                the press count) so repeat presses announce again. */}
            <div role="status" aria-live="polite">
              <AnimatePresence initial={false} mode="popLayout">
                {asks > 0 ? (
                  <motion.p
                    key={asks}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="flex gap-2 overflow-hidden pt-4 text-sm leading-relaxed text-(--color-dim)"
                  >
                    <InfoIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Aether One X is a concept, so nothing ships. Your {active.name.toLowerCase()}{' '}
                    {option.label} build is noted in spirit.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-xs text-(--color-faint)">
            Prices and specifications are illustrative demonstration values.
          </p>
        </div>
      </div>
    </section>
  )
}

function useStateGb(): [number, (gb: number) => void] {
  const [gb, setGb] = useState<number>(DEFAULT_STORAGE_GB)
  return [
    gb,
    (next: number) => {
      if (STORAGE_OPTIONS.some((s) => s.gb === next)) setGb(next)
    },
  ]
}
