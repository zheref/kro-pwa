import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'

/**
 * Landing-page screenshots, harvested from this app's own Storybook stories.
 *
 * Every scene renders the story's MOCK data — nothing real ever reaches a
 * capture. Not part of the normal gate: it skips unless `LANDING_CAPTURES=1`.
 *
 *     LANDING_CAPTURES=1 pnpm exec playwright test --project=kit \
 *       e2e-kit/landing-captures.spec.ts
 */
test.skip(
  process.env.LANDING_CAPTURES !== '1',
  'set LANDING_CAPTURES=1 to capture',
)

const OUT_DIR = join(__dirname, '..', 'public', 'landing', 'web')

type Clip = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

type Scene = {
  readonly name: string
  readonly story: string
  readonly idiom: 'desktop' | 'mobile'
  readonly scheme: 'light' | 'dark'
  readonly viewport: { readonly width: number; readonly height: number }
  /** CSS-pixel region of the canvas; omitted = the story's own frame. */
  readonly clip?: Clip
  /** Scroll the tallest scroller this far (0–1) before the picture. */
  readonly scrollTo?: number
}

const DESKTOP = { width: 1440, height: 900 } as const
const PHONE = { width: 390, height: 844 } as const

// Stories pin their own colour scheme, so the dark My Day is the right-hand
// pane of the story that renders both schemes side by side.
const SCENES: readonly Scene[] = [
  {
    name: 'web-my-day-desktop-light',
    story: 'do-surface--desktop',
    idiom: 'desktop',
    scheme: 'light',
    viewport: DESKTOP,
  },
  {
    name: 'web-my-day-desktop-dark',
    story: 'do-surface--both-schemes',
    idiom: 'desktop',
    scheme: 'dark',
    viewport: DESKTOP,
    clip: { x: 728, y: 0, width: 712, height: 640 },
  },
  {
    name: 'web-plan-timeline-desktop-light',
    story: 'plan-page--busy-day-desktop',
    idiom: 'desktop',
    scheme: 'light',
    viewport: DESKTOP,
    scrollTo: 0.42,
    clip: { x: 0, y: 0, width: 380, height: 768 },
  },
  {
    name: 'web-matrix-desktop-light',
    story: 'plan-priority-matrix--all-four-quadrants',
    idiom: 'desktop',
    scheme: 'light',
    viewport: DESKTOP,
    clip: { x: 0, y: 0, width: 420, height: 580 },
  },
  {
    name: 'web-earn-desktop-light',
    story: 'earn-earnpage--typical',
    idiom: 'desktop',
    scheme: 'light',
    viewport: DESKTOP,
  },
  {
    name: 'web-capture-prompt-desktop-dark',
    story: 'capture-prompt--popover-with-two-suggestions-selected',
    idiom: 'desktop',
    scheme: 'dark',
    viewport: { width: 1000, height: 900 },
    clip: { x: 290, y: 16, width: 696, height: 868 },
  },
  {
    name: 'web-my-day-mobile-light',
    story: 'do-surface--handheld',
    idiom: 'mobile',
    scheme: 'light',
    viewport: PHONE,
  },
  {
    name: 'web-my-day-mobile-dark',
    story: 'do-surface--both-schemes-narrow',
    idiom: 'mobile',
    scheme: 'dark',
    viewport: { width: 900, height: 900 },
    clip: { x: 405, y: 0, width: 390, height: 640 },
  },
  {
    name: 'web-earn-mobile-light',
    story: 'earn-earnfragment--mobile-gear-both-schemes',
    idiom: 'mobile',
    scheme: 'light',
    viewport: { width: 900, height: 900 },
    clip: { x: 0, y: 0, width: 450, height: 640 },
  },
  {
    name: 'web-session-mobile-dark',
    story: 'session-session-sheet--running',
    idiom: 'mobile',
    scheme: 'dark',
    viewport: PHONE,
  },
]

for (const scene of SCENES) {
  test(`capture ${scene.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: scene.viewport,
      deviceScaleFactor: 2,
      colorScheme: scene.scheme,
    })
    const page = await context.newPage()
    const globals = `kroScheme:${scene.scheme};kroIdiom:${scene.idiom}`
    const base = process.env.PLAYWRIGHT_STORYBOOK_URL ?? 'http://localhost:6007'
    await page.goto(
      `${base}/iframe.html?id=${scene.story}&viewMode=story&globals=${globals}`,
    )
    await page.waitForSelector('#storybook-root > *', { state: 'attached' })
    await page.waitForLoadState('networkidle')
    // The Storybook-only kind banner is gallery chrome, not product UI.
    await page.addStyleTag({
      content: '[data-slot=story-kind-banner]{display:none!important}',
    })
    await page.waitForTimeout(300)
    mkdirSync(OUT_DIR, { recursive: true })
    // The story's own frame (stories pin a device-sized frame inside the
    // canvas), so the picture is the product surface and not the gallery
    // backdrop around it.
    if (scene.scrollTo !== undefined) {
      await page.evaluate((fraction) => {
        const scrollers = [
          ...document.querySelectorAll<HTMLElement>('*'),
        ].filter(
          (el) =>
            el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200,
        )
        const tallest = scrollers.sort(
          (l, r) => r.scrollHeight - l.scrollHeight,
        )[0]
        if (tallest) tallest.scrollTop = tallest.scrollHeight * fraction
      }, scene.scrollTo)
      await page.waitForTimeout(200)
    }
    if (scene.clip) {
      await page.screenshot({
        path: join(OUT_DIR, `${scene.name}.png`),
        clip: scene.clip,
      })
      await context.close()
      return
    }
    const frame = page
      .locator(
        '#storybook-root [data-theme] > :not([data-slot=story-kind-banner])',
      )
      .first()
    await frame.screenshot({ path: join(OUT_DIR, `${scene.name}.png`) })
    await context.close()
  })
}
