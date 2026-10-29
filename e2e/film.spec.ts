import { expect, test, type Page } from '@playwright/test'

/**
 * The film runway needs WebGL. Without it (e.g. headless Firefox on the Linux
 * CI runner) the page correctly shows the static story instead, which the
 * fallback test covers, so runway tests skip rather than fail.
 */
async function skipWithoutWebgl(page: Page): Promise<void> {
  const webgl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  })
  test.skip(!webgl, 'needs WebGL: this browser shows the static story (fallback test)')
}

test('film runway renders chapters without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto('/')
  await skipWithoutWebgl(page)
  const runway = page.getByTestId('film-runway')
  await expect(runway).toBeVisible()
  await expect(page.getByTestId('film-chapter')).toBeVisible()
  await expect(page.getByTestId('film-chapter')).toHaveAttribute('data-act', 'arrival')
  expect(errors).toEqual([])
})

test('film ?t= deep link jumps to the teardown act', async ({ page }) => {
  await page.goto('/?t=0.4')
  await skipWithoutWebgl(page)
  const chapter = page.getByTestId('film-chapter')
  await expect(chapter).toBeVisible()
  await expect(chapter).toHaveAttribute('data-act', 'teardown', { timeout: 15000 })
})

test('film static fallback renders every act without WebGL', async ({ page }) => {
  await page.goto('/?nogl=1')
  const fallback = page.getByTestId('film-fallback')
  await expect(fallback).toBeVisible()
  await expect(fallback.getByRole('heading', { level: 2 }).first()).toBeVisible()
})

test('reduced motion tells the teardown in stills (round 01 A7)', async ({ browser }) => {
  // Reduced motion bypasses the WebGL film for the static story, which
  // carries all ten teardown layers with their copy (Film.tsx).
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/?t=0.4')
  const fallback = page.getByTestId('film-fallback')
  await expect(fallback).toBeVisible()
  await expect(page.getByText('Motion is reduced on this device')).toBeVisible()
  await expect(page.locator('[aria-label="Teardown layer silicon"]')).toBeVisible()
  await expect(page.locator('[aria-label="Teardown layer rear-panel"]')).toBeVisible()
  await context.close()
})

test('mid-session reduced-motion toggle swaps to stills (round 03 Part H)', async ({ page }) => {
  await page.goto('/')
  await skipWithoutWebgl(page)
  await expect(page.getByTestId('film-runway')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByTestId('film-fallback')).toBeVisible()
  await expect(page.getByText('Motion is reduced on this device')).toBeVisible()
})

test('teardown copy tracks fast jumps, all ten layers (round 03 Part B)', async ({ page }) => {
  // Software GL on CI is slow; set here (a details-object timeout is ignored).
  test.setTimeout(180000)
  // The B.1 instant-jump table: scripted scroll jumps (fast scroll / deep
  // link / trackpad flick), one row per feature window. AnimatePresence
  // mode="wait" wedged nine of ten under this load; scroll-positioned
  // cards must read correctly with no animation queue to catch up.
  await page.goto('/')
  await skipWithoutWebgl(page)
  await expect(page.getByTestId('film-runway')).toBeVisible()
  const expected: Array<[number, string]> = [
    [0.3, 'cover-glass'],
    [0.32, 'display'],
    [0.34, 'midframe'],
    [0.36, 'battery'],
    [0.38, 'logic-board'],
    [0.4, 'silicon'],
    [0.42, 'thermal'],
    [0.44, 'power-coil'],
    [0.46, 'camera'],
    [0.48, 'rear-panel'],
  ]
  const rows = await page.evaluate(async (want) => {
    const sec = [...document.querySelectorAll('*')].find((e) =>
      (e as HTMLElement).style?.height?.includes('--film-height'),
    ) as HTMLElement
    const top = sec.offsetTop
    const run = sec.offsetHeight - window.innerHeight
    document.documentElement.style.scrollBehavior = 'auto'
    const out: Array<{ p: number; card: string | null }> = []
    for (const [p] of want as Array<[number, string]>) {
      document.scrollingElement!.scrollTop = Math.round(top + p * run)
      // Two-phase settle. SwiftShader renders single-digit fps and the
      // scroll event propagates a frame or two behind the jump: first let
      // the new cursor reach the card loop, then wait until some card is
      // lit, then one more beat so transitional fades resolve to a winner.
      await new Promise((r) => setTimeout(r, 1000))
      await new Promise<void>((resolve) => {
        const t0 = Date.now()
        const poll = () => {
          const anyLit = [...document.querySelectorAll('[data-testid^="teardown-card-"]')].some(
            (c) => Number.parseFloat((c as HTMLElement).style.opacity || '0') > 0.5,
          )
          if (anyLit || Date.now() - t0 > 20000) resolve()
          else setTimeout(poll, 250)
        }
        poll()
      })
      await new Promise((r) => setTimeout(r, 750))
      let best: string | null = null
      let bestO = 0.5
      for (const c of [...document.querySelectorAll('[data-testid^="teardown-card-"]')]) {
        const o = Number.parseFloat((c as HTMLElement).style.opacity || '0')
        if (o > bestO) {
          bestO = o
          best = (c as HTMLElement).dataset.testid!.replace('teardown-card-', '')
        }
      }
      out.push({ p, card: best })
    }
    return out
  }, expected)
  for (let i = 0; i < expected.length; i++) {
    expect(rows[i]?.card, `p=${expected[i]?.[0]}`).toBe(expected[i]?.[1])
  }
})

test('teardown showcase labels the open sandwich, then one part at a time', async ({ page }) => {
  test.setTimeout(180000)
  await page.goto('/')
  await skipWithoutWebgl(page)
  await expect(page.getByTestId('film-runway')).toBeVisible()
  const jump = async (p: number): Promise<void> => {
    await page.evaluate((target) => {
      const sec = [...document.querySelectorAll('*')].find((e) =>
        (e as HTMLElement).style?.height?.includes('--film-height'),
      ) as HTMLElement
      document.documentElement.style.scrollBehavior = 'auto'
      document.scrollingElement!.scrollTop = Math.round(
        sec.offsetTop + target * (sec.offsetHeight - window.innerHeight),
      )
    }, p)
  }
  const lit = (prefix: string): Promise<string[]> =>
    page.evaluate(
      (pre) =>
        [...document.querySelectorAll(`[data-testid^="${pre}"]`)]
          .filter((el) => Number.parseFloat((el as HTMLElement).style.opacity || '0') > 0.5)
          .map((el) => (el as HTMLElement).dataset.testid!.replace(pre, '')),
      prefix,
    )
  // Overview hold: every layer named, no part presented.
  await jump(0.289)
  await expect.poll(() => lit('showcase-layer-'), { timeout: 60000 }).toHaveLength(10)
  expect(await lit('showcase-callout-')).toEqual([])
  // Battery mid-hold: its own sub-components only, and its card.
  await jump(0.295 + 0.02 * 3.6)
  await expect
    .poll(() => lit('showcase-callout-'), { timeout: 60000 })
    .toEqual(['battery.cell', 'battery.bms', 'battery.connector', 'battery.tabs'])
  expect(await lit('teardown-card-')).toEqual(['battery'])
  expect(await lit('showcase-layer-')).toEqual([])
})

test('a scroll resting between sections is carried into the next one', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto('/')
  await skipWithoutWebgl(page)
  await expect(page.getByTestId('film-runway')).toBeVisible()
  const progress = (): Promise<number> =>
    page.evaluate(() => {
      const el = document.querySelector('[data-testid="film-runway"]') as HTMLElement
      const top = el.getBoundingClientRect().top + window.scrollY
      return (window.scrollY - top) / (el.offsetHeight - window.innerHeight)
    })
  // One wheel tick as the browser delivers it: the input event, then the
  // scroll. (Synthetic mouse.wheel does not scroll in every engine's
  // headless build, so the test drives the two halves itself.)
  const wheelTick = (dy: number): Promise<void> =>
    page.evaluate((d) => {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: d }))
      window.scrollBy({ top: d, behavior: 'instant' })
    }, dy)
  // Scripted jump to just past the design/glass boundary (0.155): a move.
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="film-runway"]') as HTMLElement
    document.documentElement.style.scrollBehavior = 'auto'
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top + 0.1565 * (el.offsetHeight - window.innerHeight))
  })
  await page.waitForTimeout(400)
  expect(await progress()).toBeLessThan(0.16)
  // A small real scroll down, then hands off: the film finishes the move.
  await wheelTick(30)
  await expect.poll(progress, { timeout: 15000 }).toBeGreaterThan(0.166)
  expect(await progress()).toBeLessThan(0.175)
  await expect(page.getByTestId('film-chapter')).toHaveAttribute('data-act', 'approach')

  // The film's end hands over to the buy section the same way.
  await page.evaluate(() => {
    const deck = document.getElementById('buy') as HTMLElement
    const top = deck.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top - window.innerHeight * 0.55)
  })
  await page.waitForTimeout(400)
  await wheelTick(30)
  await expect
    .poll(() => page.evaluate(() => document.getElementById('buy')!.getBoundingClientRect().top), {
      timeout: 15000,
    })
    .toBeLessThan(3)
})

test('teardown play auto-scrolls the showcase (overnight watchability)', async ({ page }) => {
  // Software GL on CI is slow; set here (a details-object timeout is ignored).
  test.setTimeout(120000)
  await page.goto('/')
  await skipWithoutWebgl(page)
  await expect(page.getByTestId('film-runway')).toBeVisible()
  await page.getByRole('link', { name: 'Act 4: teardown' }).click()
  await expect(page.getByTestId('film-chapter')).toHaveAttribute('data-act', 'teardown', {
    timeout: 15000,
  })
  const play = page.getByTestId('teardown-play')
  await expect(play).toBeVisible()
  const before = await page.evaluate(() => window.scrollY)
  await play.click()
  await expect(play).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(6000)
  const after = await page.evaluate(() => window.scrollY)
  expect(after).toBeGreaterThan(before + 200)
  await expect(page.getByTestId('film-chapter')).toHaveAttribute('data-act', 'teardown')
  await play.click()
  await expect(play).toHaveAttribute('aria-pressed', 'false')
})
