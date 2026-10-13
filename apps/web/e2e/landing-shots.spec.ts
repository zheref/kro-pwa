import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * The UZF-26 evidence for the landing page, driven through the built app and
 * recorded as the committed PNGs under `e2e/__screenshots__/landing/` — the
 * capture set `nen/contract.json` → `project.evidence` names and
 * `scripts/pr_screenshots.sh` mirrors to the public kro-assets host.
 *
 * Every scene renders mock data: the page's own copy and the catalogued
 * goldens, and the early-access states are produced by answering
 * `/api/early-access` at the network edge with the wire shapes the stubbed
 * service documents — no real sign-up leaves the machine.
 *
 * Not part of the E2E gate: `LANDING_SHOTS` is unset in a normal run and every
 * case skips. Run it deliberately, against a production build with the
 * landing flag on (the web product's shipping default):
 *
 *     LANDING_SHOTS=1 PLAYWRIGHT_PORT=3113 \
 *       pnpm exec playwright test --project=app e2e/landing-shots.spec.ts
 */
const ENABLED = process.env.LANDING_SHOTS === '1'
const SHOTS_DIR = `${__dirname}/__screenshots__/landing`

test.skip(!ENABLED, 'set LANDING_SHOTS=1 to capture')

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

const SCHEMES = ['light', 'dark'] as const

type Page = import('@playwright/test').Page

const shot = async (page: Page, name: string, fullPage = false) => {
  mkdirSync(SHOTS_DIR, { recursive: true })
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage })
}

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
}

const joinedBody = {
  ok: true,
  value: {
    id: 'ea_mock_1',
    email: 'ada@example.com',
    platform: 'macos',
    position: null,
    joined_at: '2026-10-12T12:00:00.000Z',
  },
}

const alreadyJoinedBody = {
  ok: false,
  error: {
    kind: 'alreadyJoined',
    message: 'That address is already on the list.',
    recoverable: false,
  },
}

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    const suffix = `${viewport.name}-${scheme}`

    test.describe(`${viewport.name} · ${scheme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: scheme,
        contextOptions: { reducedMotion: 'reduce' },
      })

      test(`hero (typical) — ${suffix}`, async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await settle(page)
        await shot(page, `hero-${suffix}`)
      })

      test(`full page (typical) — ${suffix}`, async ({ page }) => {
        await page.goto('/')
        await settle(page)
        await shot(page, `full-page-${suffix}`, true)
      })
    })
  }
}

test.describe('early access · desktop · light', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    contextOptions: { reducedMotion: 'reduce' },
  })

  const openForm = async (page: Page) => {
    await page.goto('/#early-access')
    await settle(page)
    const section = page.locator('#early-access')
    await section.scrollIntoViewIfNeeded()
    return section
  }

  test('idle (empty)', async ({ page }) => {
    const section = await openForm(page)
    await expect(section).toBeVisible()
    await shot(page, 'early-access-empty-desktop-light')
  })

  test('joined (typical)', async ({ page }) => {
    await page.route('**/api/early-access', (route) =>
      route.fulfill({ status: 200, json: joinedBody }),
    )
    const section = await openForm(page)
    await section
      .getByRole('textbox', { name: /email/i })
      .fill('ada@example.com')
    await section.getByRole('button', { name: /early access/i }).click()
    await expect(section.getByText(/on the list/i)).toBeVisible()
    await settle(page)
    await shot(page, 'early-access-joined-desktop-light')
  })

  test('failure (already joined)', async ({ page }) => {
    await page.route('**/api/early-access', (route) =>
      route.fulfill({ status: 409, json: alreadyJoinedBody }),
    )
    const section = await openForm(page)
    await section
      .getByRole('textbox', { name: /email/i })
      .fill('already@example.com')
    await section.getByRole('button', { name: /early access/i }).click()
    await expect(section.getByRole('alert')).toBeVisible()
    await settle(page)
    await shot(page, 'early-access-failure-desktop-light')
  })
})
