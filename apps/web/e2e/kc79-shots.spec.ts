import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * The visual evidence for KC-IS-#79, driven through the built app rather than
 * staged (`UZF-26`).
 *
 * The claim being evidenced is one thing: opening the app's bare address now
 * lands on the My Day shell instead of the create-next-app template page. So
 * every case navigates to `/` — never to `/my-day` — and asserts the URL it
 * ended on before it takes the picture.
 *
 * It is **not** part of the E2E gate: `KC79_SHOTS` is unset in a normal run and
 * every case skips. Run it deliberately, against a production build:
 *
 *     KC79_SHOTS=/absolute/path PLAYWRIGHT_PORT=3113 \
 *       pnpm exec playwright test --project=app e2e/kc79-shots.spec.ts
 */
const SHOTS_DIR = process.env.KC79_SHOTS ?? ''

test.skip(SHOTS_DIR === '', 'set KC79_SHOTS to capture')

const VIEWPORTS = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
] as const

const SCHEMES = ['light', 'dark'] as const

const shot = async (
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> => {
  mkdirSync(SHOTS_DIR, { recursive: true })
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png` })
}

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    const suffix = `${viewport.name}-${scheme}`

    test.describe(`${viewport.name} · ${scheme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: scheme,
      })

      test(`the bare address lands on My Day (${suffix})`, async ({ page }) => {
        await page.goto('/')

        // The redirect first, then the surface: a shot of a shell that was
        // reached by typing `/my-day` would evidence nothing.
        await expect(page).toHaveURL(/\/my-day$/)
        await expect(page.getByTestId('do-surface')).toBeVisible()

        await shot(page, `root-lands-on-my-day-${suffix}`)
      })
    })
  }
}
