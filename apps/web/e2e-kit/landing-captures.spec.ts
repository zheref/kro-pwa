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

type Scene = {
  readonly name: string
  readonly story: string
  readonly idiom: 'desktop' | 'mobile'
  readonly scheme: 'light' | 'dark'
  readonly viewport: { readonly width: number; readonly height: number }
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
  },
  {
    name: 'web-my-day-desktop-dark',
    story: MY_DAY_STORY,
    idiom: 'desktop',
    scheme: 'dark',
    viewport: DESKTOP,
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
    // The story is the whole app, so the picture is the whole viewport.
    await page.screenshot({ path: join(OUT_DIR, `${scene.name}.png`) })
    await context.close()
  })
}
