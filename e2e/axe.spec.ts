import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/cameras', '/performance', '/display', '/software', '/specifications']

for (const route of ROUTES) {
  test(`axe clean on ${route}`, async ({ page }) => {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Let entrance motion settle: axe must judge the steady state, never a
    // mid-crossfade frame (partial opacity reads as low contrast). CSS/WAAPI
    // animations are visible to getAnimations(); Motion's JS-driven entrances
    // (opacity + y) are not, and finish ~1.05 s after the h1 mounts, so hold
    // a fixed settle beyond that too (WebKit on CI lost the old 600 ms race).
    await page.evaluate(() => document.fonts.ready)
    await page
      .waitForFunction(
        () => document.getAnimations().every((a) => a.playState !== 'running'),
        undefined,
        { timeout: 5000 },
      )
      .catch(() => undefined)
    await page.waitForTimeout(1500)
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
  })
}
