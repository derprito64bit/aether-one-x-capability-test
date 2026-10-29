import { useLayoutEffect } from 'react'
import { Head } from '../components/head/Head.tsx'
import { BuyDeck } from '../components/Configurator/BuyDeck.tsx'
import { Film } from '../film/Film.tsx'
import { Scrubber } from '../film/Scrubber.tsx'

/** Home route: the product film plus the closing configurator deck. */
export function HomePage() {
  // The home page is a dark room (index.html themes the first load before
  // paint; this covers arriving by client-side navigation and leaving).
  useLayoutEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    root.dataset.theme = 'dark'
    meta?.setAttribute('content', '#07080b')
    return () => {
      delete root.dataset.theme
      root.style.background = ''
      meta?.setAttribute('content', '#f2f0eb')
    }
  }, [])
  return (
    <>
      <Head
        title="Aether One X — Power, without the noise."
        description="A fictional flagship. Scroll-driven 3D film, honest specs, no third-party requests."
        path="/"
      />
      <Film />
      <BuyDeck />
      {import.meta.env.DEV ? <Scrubber /> : null}
    </>
  )
}
