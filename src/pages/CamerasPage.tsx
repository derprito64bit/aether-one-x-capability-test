import { useEffect, useState } from 'react'
import { FocalStrip } from '../components/CameraStrip/FocalStrip.tsx'
import { LensSystem } from '../components/CameraStrip/LensSystem.tsx'
import { Head } from '../components/head/Head.tsx'
import { CtaBand } from '../components/layout/CtaBand.tsx'
import { PageHero } from '../components/layout/PageHero.tsx'
import { PhoneConfigProvider, usePhoneConfig } from '../components/PhoneViewer/PhoneConfig.tsx'
import { PhoneViewer } from '../components/PhoneViewer/PhoneViewer.tsx'
import { StudioStage } from '../components/ui/StudioStage.tsx'
import { Reveal } from '../components/ui/Reveal.tsx'

/**
 * The camera study opens in Titanium: on near-black Obsidian the module's
 * collar and lens rings disappear into the body.
 */
function StudyFinish() {
  const { setFinish } = usePhoneConfig()
  useEffect(() => setFinish('titanium'), [setFinish])
  return null
}

/** Cameras page: rear 3D study, the zoom viewfinder, the lens system. */
export function CamerasPage() {
  const [zoom, setZoom] = useState('1x')
  return (
    <>
      <Head
        title="Cameras — Aether One X"
        description="Fictional quad camera. Five focal lengths."
        path="/cameras"
        image="/og/cameras.png"
      />
      <PhoneConfigProvider>
        <StudyFinish />
        <PageHero
          kicker="Cameras"
          title="Every focal length."
          lede="Ultra-wide 14 mm, main 23 mm, mid 50 mm and a 135 mm folded periscope, all inside one circular module."
        >
          <StudioStage>
            <PhoneViewer
              pose="rear"
              label="Aether One X rear camera study"
              sharedConfig
              className="flex h-[420px] items-center justify-center md:h-[560px]"
              canvasClassName="h-[420px] w-full md:h-[560px]"
            />
          </StudioStage>
        </PageHero>
        <section aria-labelledby="zoom-heading" className="page pt-24">
          <Reveal>
            <h2 id="zoom-heading" className="display-lg max-w-3xl">
              From the whole bay to the lamp room.
            </h2>
            <p className="lede mt-4">
              Tap a zoom stop. Each one is the real crop of its lens, and the model above brings the
              matching lens into focus.
            </p>
          </Reveal>
          <div className="mt-10">
            <FocalStrip zoom={zoom} onZoom={setZoom} />
          </div>
        </section>
      </PhoneConfigProvider>
      <LensSystem />
      <CtaBand />
    </>
  )
}
