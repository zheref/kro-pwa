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

// PNG masters are scratch output (gitignored); convert to WebP (quality 82, via
// sharp, resized to 1600 px wide) into `public/landing/web/` — only the WebP is
// served or committed.
const OUT_DIR = join(__dirname, '..', '.landing-captures')

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
  /** Capture the whole viewport (the story is the app, no gallery frame). */
  readonly fullViewport?: boolean
  /** Scroll the tallest scroller this far (0–1) before the picture. */
  readonly scrollTo?: number
}

const DESKTOP = { width: 1440, height: 900 } as const

// Both web scenes are the real app shell around My Day (`MainShellPage` over a
// seeded in-memory store): the story fills the viewport, so the shell measures
// the browser itself and picks the sidebar shell. The default palette
// (indigo->grape, `kroPalette: purple`) is the one a first-time visitor sees.
// Light is the product's default scheme and the hero shot; dark is the second
// scheme the Do chapter shows, so the page proves both.
const MY_DAY_STORY = 'shell-app-shell-live-my-day--my-day-in-the-shell'

const SCENES: readonly Scene[] = [
  {
    name: 'web-my-day-desktop-light',
    story: MY_DAY_STORY,
    idiom: 'desktop',
    scheme: 'light',
    viewport: DESKTOP,
    fullViewport: true,
  },
  {
    name: 'web-my-day-desktop-dark',
    story: MY_DAY_STORY,
    idiom: 'desktop',
    scheme: 'dark',
    viewport: DESKTOP,
    fullViewport: true,
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
    const base =
      process.env.PLAYWRIGHT_STORYBOOK_URL ??
      `http://localhost:${process.env.PLAYWRIGHT_STORYBOOK_PORT ?? 6007}`
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
    if (scene.fullViewport) {
      await page.screenshot({ path: join(OUT_DIR, `${scene.name}.png`) })
      await context.close()
      return
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
