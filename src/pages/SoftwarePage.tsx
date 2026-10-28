import {
  BellSimpleSlashIcon,
  FileTextIcon,
  HandPointingIcon,
  LightbulbIcon,
  MagicWandIcon,
  ShieldCheckIcon,
  TextAlignLeftIcon,
  WaveformIcon,
  WifiSlashIcon,
} from '../components/icons.tsx'
import type { Icon } from '@phosphor-icons/react'
import { Head } from '../components/head/Head.tsx'
import { CtaBand } from '../components/layout/CtaBand.tsx'
import { PageHero } from '../components/layout/PageHero.tsx'
import { AetherOSPhone } from '../components/PhoneOS/AetherOSPhone.tsx'
import { Reveal } from '../components/ui/Reveal.tsx'
import { StudioStage } from '../components/ui/StudioStage.tsx'
import { AI_CAPABILITIES, PERFORMANCE } from '../data/product.ts'
import { SOFTWARE_PRINCIPLES } from '../data/software.ts'

const PRINCIPLE_ICONS: Icon[] = [ShieldCheckIcon, BellSimpleSlashIcon, HandPointingIcon]
const CAPABILITY_ICONS: Icon[] = [
  TextAlignLeftIcon,
  WaveformIcon,
  MagicWandIcon,
  LightbulbIcon,
  FileTextIcon,
  WifiSlashIcon,
]

/** Software product page: the live simulator, the principles, the on-device list. */
export function SoftwarePage() {
  return (
    <>
      <Head
        title="Software — Aether One X"
        description="Fictional AetherOS. On-device intelligence."
        path="/software"
        image="/og/software.png"
      />
      <PageHero
        kicker="AetherOS 2.0"
        title="Quiet software."
        lede="Open an app, pull down the shade, flip a switch. This phone is a working model of the OS."
      >
        <StudioStage>
          <div className="py-10 md:py-12">
            <AetherOSPhone />
          </div>
        </StudioStage>
      </PageHero>

      <section
        aria-labelledby="principles"
        className="page grid gap-12 pt-28 lg:grid-cols-[1fr_1.2fr] lg:gap-20"
      >
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <h2 id="principles" className="display-lg">
              Built to step aside.
            </h2>
            <p className="lede mt-4">
              Three rules decide what AetherOS does, and more often, what it leaves alone.
            </p>
          </div>
        </Reveal>
        <ul className="grid gap-10">
          {SOFTWARE_PRINCIPLES.map((p, i) => {
            const PrincipleIcon = PRINCIPLE_ICONS[i] ?? ShieldCheckIcon
            return (
              <li key={p.title}>
                <Reveal delayMs={i * 80}>
                  <div className="grid grid-cols-[auto_1fr] gap-5 border-t border-(--color-border-hairline) pt-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-raise) text-(--color-aether-strong) shadow-[0_0_0_1px_var(--color-border-hairline)]">
                      <PrincipleIcon size={24} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="display-md">{p.title}</h3>
                      <p className="mt-2 max-w-[46ch] leading-relaxed text-(--color-dim)">
                        {p.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="on-device" className="page pt-28">
        <Reveal>
          <div className="panel grid gap-10 p-8 md:grid-cols-[1fr_1.3fr] md:p-14">
            <div>
              <h2 id="on-device" className="display-lg">
                Nothing leaves the phone.
              </h2>
              <p className="lede mt-4">
                A {PERFORMANCE.npu.hero.value} {PERFORMANCE.npu.hero.suffix} neural engine runs
                every model locally, including with the radios off.
              </p>
            </div>
            <ul className="flex flex-wrap content-center gap-3">
              {AI_CAPABILITIES.map((cap, i) => {
                const CapIcon = CAPABILITY_ICONS[i] ?? LightbulbIcon
                return (
                  <li
                    key={cap}
                    className="flex min-h-12 items-center gap-2.5 rounded-full bg-(--color-raise) px-4 text-[15px] shadow-[0_0_0_1px_var(--color-border-hairline)]"
                  >
                    <CapIcon
                      size={18}
                      className="text-(--color-aether-strong)"
                      aria-hidden="true"
                    />
                    {cap}
                  </li>
                )
              })}
            </ul>
          </div>
        </Reveal>
      </section>
      <CtaBand />
    </>
  )
}
