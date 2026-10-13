import { expect, test } from '@playwright/test'

/**
 * The UZF-26 evidence for the landing page: Playwright assertions against the
 * built app whose golden images are the committed PNGs under
 * `e2e/__screenshots__/landing/` — the capture set `nen/contract.json` →
 * `project.evidence` names and `scripts/pr_screenshots.sh` mirrors to the
 * public kro-assets host. `toHaveScreenshot` compares each scene with its
 * golden (the `app` project's `snapshotPathTemplate`), so a changed surface
 * fails here instead of drifting silently; `--update-snapshots` re-records.
 *
 * Every scene renders mock data: the page's own copy and the catalogued
 * goldens, and the early-access states are produced by answering
 * `/api/early-access` at the network edge with the wire shapes the stubbed
 * service documents — no real sign-up leaves the machine.
 *
 * One scene per user-visible state the landing adds (UZF-26), never an
 * inventory: the hero on both viewports and schemes, each section's opening at
 * desktop (the focus one also shows the active nav underline and Back to top),
 * the open menu and an open question on a phone, and every early-access state.
 *
 * Not part of the E2E gate: `LANDING_SHOTS` is unset in a normal run and every
 * case skips. Run it deliberately, against a production build with the
 * landing flag on (the web product's shipping default):
 *
 *     LANDING_SHOTS=1 PLAYWRIGHT_PORT=3113 \
 *       pnpm exec playwright test --project=app e2e/landing-shots.spec.ts \
 *       [--update-snapshots]
 */
const ENABLED = process.env.LANDING_SHOTS === '1'

test.skip(!ENABLED, 'set LANDING_SHOTS=1 to capture')

type Page = import('@playwright/test').Page

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const

const SCHEMES = ['light', 'dark'] as const

const REDUCED_MOTION = {
  contextOptions: { reducedMotion: 'reduce' as const },
}

const scene = (name: string) => `${name}.png`

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

const unavailableBody = {
  ok: false,
  error: {
    kind: 'unavailable',
    message: 'Early access sign-up is not open on this site yet.',
    recoverable: true,
  },
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const scheme of SCHEMES) {
    const suffix = `${viewportName}-${scheme}`

    test.describe(`hero · ${viewportName} · ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme, ...REDUCED_MOTION })

      test(`hero (typical) — ${suffix}`, async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await settle(page)
        await expect(page).toHaveScreenshot(scene(`hero-${suffix}`))
      })
    })
  }
}

const SECTIONS = [
  'the-loop',
  'focus',
  'platforms',
  'federation',
  'privacy',
  'faq',
] as const

test.describe('sections · desktop · light', () => {
  test.use({
    viewport: VIEWPORTS.desktop,
    colorScheme: 'light',
    ...REDUCED_MOTION,
  })

  for (const id of SECTIONS) {
    test(`${id} (typical) — desktop-light`, async ({ page }) => {
      await page.goto(`/#${id}`)
      await settle(page)
      await expect(page.locator(`#${id}`)).toBeInViewport()
      if (id === 'focus') {
        // Mid-scroll evidence: the bar's active underline and Back to top.
        await expect(
          page.getByRole('button', { name: /back to top/i }),
        ).toBeVisible()
      }
      await expect(page).toHaveScreenshot(scene(`${id}-desktop-light`))
    })
  }
})

test.describe('mobile · light', () => {
  test.use({
    viewport: VIEWPORTS.mobile,
    colorScheme: 'light',
    ...REDUCED_MOTION,
  })

  test('menu open', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    await page.getByRole('button', { name: /menu/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(scene('menu-open-mobile-light'))
  })

  test('faq open (one question)', async ({ page }) => {
    await page.goto('/#faq')
    await settle(page)
    const row = page.locator('#faq').getByRole('button').first()
    await row.click()
    await expect(row).toHaveAttribute('aria-expanded', 'true')
    await settle(page)
    await expect(page).toHaveScreenshot(scene('faq-open-mobile-light'))
  })
})

const openForm = async (page: Page) => {
  await page.goto('/#early-access')
  await settle(page)
  const section = page.locator('#early-access')
  await section.scrollIntoViewIfNeeded()
  await expect(section).toBeVisible()
  return section
}

const emailField = (section: ReturnType<Page['locator']>) =>
  section.getByRole('textbox', { name: /email/i })

const submit = (section: ReturnType<Page['locator']>) =>
  section.getByRole('button', { name: /early access/i })

test.describe('early access · desktop · light', () => {
  test.use({
    viewport: VIEWPORTS.desktop,
    colorScheme: 'light',
    ...REDUCED_MOTION,
  })

  test('idle (empty)', async ({ page }) => {
    await openForm(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-empty-desktop-light'),
    )
  })

  test('typing (invalid address)', async ({ page }) => {
    const section = await openForm(page)
    await emailField(section).fill('not-an-email')
    await emailField(section).press('Tab')
    await expect(section.getByText(/does not look right/i)).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-typing-invalid-desktop-light'),
    )
  })

  test('submitting (loading)', async ({ page }) => {
    // The route is held open so the pending state stays on screen.
    await page.route('**/api/early-access', () => new Promise(() => {}))
    const section = await openForm(page)
    await emailField(section).fill('ada@example.com')
    await submit(section).click()
    // The label turns into the progress label while the request is in flight.
    await expect(
      section.getByRole('button', { name: /joining the list/i }),
    ).toBeDisabled()
    await page.waitForTimeout(400)
    await expect(page).toHaveScreenshot(
      scene('early-access-submitting-desktop-light'),
    )
  })

  test('joined (typical)', async ({ page }) => {
    await page.route('**/api/early-access', (route) =>
      route.fulfill({ status: 200, json: joinedBody }),
    )
    const section = await openForm(page)
    await emailField(section).fill('ada@example.com')
    await submit(section).click()
    await expect(section.getByText(/on the list/i)).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-joined-desktop-light'),
    )
  })

  test('failure (offline)', async ({ page }) => {
    await page.route('**/api/early-access', (route) =>
      route.abort('internetdisconnected'),
    )
    const section = await openForm(page)
    await emailField(section).fill('ada@example.com')
    await submit(section).click()
    await expect(section.getByRole('alert')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-failed-offline-desktop-light'),
    )
  })

  test('failure (not open yet)', async ({ page }) => {
    await page.route('**/api/early-access', (route) =>
      route.fulfill({ status: 503, json: unavailableBody }),
    )
    const section = await openForm(page)
    await emailField(section).fill('ada@example.com')
    await submit(section).click()
    await expect(section.getByRole('alert')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-failed-unavailable-desktop-light'),
    )
  })
})

test.describe('early access · desktop · dark', () => {
  test.use({
    viewport: VIEWPORTS.desktop,
    colorScheme: 'dark',
    ...REDUCED_MOTION,
  })

  test('idle (empty) — dark', async ({ page }) => {
    await openForm(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-empty-desktop-dark'),
    )
  })

  test('typing (invalid address) — dark', async ({ page }) => {
    // The danger text must read on the dark glass (hanten round 2, UX-1).
    const section = await openForm(page)
    await emailField(section).fill('not-an-email')
    await emailField(section).press('Tab')
    await expect(section.getByText(/does not look right/i)).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot(
      scene('early-access-typing-invalid-desktop-dark'),
    )
  })
})

/*
 * The pricing page (`/pricing`): the opening on both schemes at desktop, the
 * phone at light, and the comparison table scrolled into view.
 */
const PRICING_SCENES = [
  {
    name: 'pricing-desktop-light',
    viewport: VIEWPORTS.desktop,
    scheme: 'light',
  },
  { name: 'pricing-desktop-dark', viewport: VIEWPORTS.desktop, scheme: 'dark' },
  { name: 'pricing-mobile-light', viewport: VIEWPORTS.mobile, scheme: 'light' },
] as const

for (const { name, viewport, scheme } of PRICING_SCENES) {
  test.describe(`pricing · ${name}`, () => {
    test.use({ viewport, colorScheme: scheme, ...REDUCED_MOTION })

    test(`pricing (typical) — ${name}`, async ({ page }) => {
      await page.goto('/pricing')
      await expect(page).toHaveURL(/\/pricing$/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Primary' })
          .getByRole('link', { name: 'Pricing' }),
      ).toHaveAttribute('aria-current', 'page')
      await settle(page)
      await expect(page).toHaveScreenshot(scene(name))
    })
  })
}

test.describe('pricing · table · desktop · light', () => {
  test.use({
    viewport: VIEWPORTS.desktop,
    colorScheme: 'light',
    ...REDUCED_MOTION,
  })

  test('comparison table (typical) — desktop-light', async ({ page }) => {
    await page.goto('/pricing#compare')
    await settle(page)
    await expect(page.locator('#compare')).toBeInViewport()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page).toHaveScreenshot(scene('pricing-table-desktop-light'))
  })
})
