import { useState } from 'react'
import { Glass, type GlassVariant } from '../components/Glass/Glass.tsx'
import { PhoneConfigProvider } from '../components/PhoneViewer/PhoneConfig.tsx'
import { PhoneFrame } from '../components/Phone/PhoneFrame.tsx'
import { PhoneViewer } from '../components/PhoneViewer/PhoneViewer.tsx'
import { AetherOSPhone } from '../components/PhoneOS/AetherOSPhone.tsx'
import { DisplayDemo } from '../components/DisplayDemo/DisplayDemo.tsx'
import { SoCPanel } from '../components/SoC/SoCPanel.tsx'
import { FocalStrip } from '../components/CameraStrip/FocalStrip.tsx'
import { Reveal } from '../components/ui/Reveal.tsx'

const GLASS_VARIANTS: GlassVariant[] = ['chrome', 'panel', 'tooltip', 'control']

/**
 * Dev-only kitchen sink (meta prompt section 8.8): every shared component
 * in its key states on one page. DEV-guarded at the route so it never
 * ships to production.
 */
export function KitchenSinkPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="kicker">Dev · kitchen sink</p>
      <h1 className="spec-num mt-3 text-4xl">Every component, every state.</h1>

      <h2 className="spec-tech mt-12">Glass tiers</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{GLASS_VARIANT_CARDS()}</div>

      <h2 className="spec-tech mt-12">PhoneViewer poses</h2>
      <div className="grid gap-8 md:grid-cols-2">
        {(['hero', 'rear', 'side', 'front'] as const).map((pose) => (
          <PhoneViewer key={pose} pose={pose} label={`Kitchen sink ${pose}`} />
        ))}
      </div>

      <h2 className="spec-tech mt-12">Static fallback (no WebGL)</h2>
      <div className="flex flex-wrap gap-6">
        <PhoneFrame finish="obsidian" face="front" label="Static front" />
        <PhoneFrame finish="ember" face="rear" label="Static rear" />
      </div>

      <h2 className="spec-tech mt-12">Interactive modules</h2>
      <div className="mt-4 grid gap-8">
        <AetherOSPhone />
        <DisplayDemo />
        <SoCPanel />
        <PhoneConfigProvider>
          <FocalStripDemo />
        </PhoneConfigProvider>
        <Reveal delayMs={0}>
          <p className="text-(--color-dim)">Reveal primitive, zero delay.</p>
        </Reveal>
      </div>
    </div>
  )
}

function FocalStripDemo() {
  const [zoom, setZoom] = useState('1x')
  return <FocalStrip zoom={zoom} onZoom={setZoom} />
}

function GLASS_VARIANT_CARDS() {
  return GLASS_VARIANTS.map((variant) => (
    <Glass key={variant} variant={variant} label={`Glass ${variant}`}>
      <p className="p-6 text-sm text-(--color-ink)">Glass variant: {variant}</p>
    </Glass>
  ))
}
