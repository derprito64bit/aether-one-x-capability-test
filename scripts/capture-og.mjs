import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

// Social cards (1200x630 PNG; crawlers reject SVG og:image) captured from the
// real site, so every card is the actual 3D product in the actual layout.
// Usage: build, start `vite preview`, then
//   node scripts/capture-og.mjs http://127.0.0.1:4173
// Writes public/og/<route>.png. Re-run after any visual change to a hero.
const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const ROUTES = [
  ['home', '/?t=0.09'],
  ['cameras', '/cameras'],
  ['performance', '/performance'],
  ['display', '/display'],
  ['software', '/software'],
  ['specifications', '/specifications'],
]

mkdirSync('public/og', { recursive: true })
const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
for (const [id, path] of ROUTES) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  // A card is a still: no navigation chrome, no film rail.
  await page.addStyleTag({
    content: 'header, nav[aria-label="Film acts"] { display: none !important; }',
  })
  if (id === 'home') {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      const runway = document.querySelector('[data-testid="film-runway"]')
      if (runway === null) return
      const rect = runway.getBoundingClientRect()
      const top = rect.top + window.scrollY
      window.scrollTo(0, top + 0.09 * (rect.height - window.innerHeight))
    })
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `public/og/${id}.png` })
  console.log(`og ${id}`)
}
await browser.close()
