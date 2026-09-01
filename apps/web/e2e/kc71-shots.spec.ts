import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * The visual evidence for KC-IS-#71's three visible items, driven through the
 * built app rather than staged (`UZF-26`).
 *
 * It is **not** part of the E2E gate: `SHOTS_DIR` is unset in a normal run and
 * every case skips. Run it deliberately:
 *
 *     KC71_SHOTS=/absolute/path pnpm exec playwright test --project=app \
 *       e2e/kc71-shots.spec.ts
 */
const SHOTS_DIR = process.env.KC71_SHOTS ?? ''

test.skip(SHOTS_DIR === '', 'set KC71_SHOTS to capture')

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

/** A day with something to complete, seeded the way the app itself seeds. */
const openMyDay = async (page: import('@playwright/test').Page) => {
  await page.goto('/my-day')
  await expect(page.getByTestId('do-surface')).toBeVisible()
}

/**
 * Captures one task through the product's own quick-add flow.
 *
 * A fresh browser has an empty database, so the day has to be created before
 * anything can be completed on it — and creating it the way a person does is
 * what makes the capture below evidence of the built app rather than of a
 * fixture.
 */
const captureTask = async (
  page: import('@playwright/test').Page,
  title: string,
) => {
  await page.getByRole('button', { name: 'Quick action' }).click()
  await page.getByRole('button', { name: 'Quick Add' }).click()
  await page.getByTestId('capture-title').fill(title)
  await page.getByTestId('capture-add').click()

  /*
    The capture routes itself to the Inbox after a short beat, and the row is
    written on the way. Waiting for the Inbox to carry it is what makes the
    write observable — navigating away sooner cancels it, which is how this
    spec first produced an empty day.
  */
  // `toBeAttached`, not `toBeVisible`: the Inbox arrives with a slide, and what
  // is being waited for is the WRITE — the row reaching the surface at all.
  await expect(page.getByTestId('inbox-surface').getByText(title)).toBeAttached(
    { timeout: 15_000 },
  )
  await page.keyboard.press('Escape')

  await page.goto('/my-day')
  await expect(page.getByTestId('do-surface')).toBeVisible()
  await expect(
    page.getByRole('button', { name: title, exact: true }).first(),
  ).toBeVisible()
}

/** Prepares the first card in a lane and presses its Mark complete control. */
const completeFirstCard = async (page: import('@playwright/test').Page) => {
  const card = page.locator('[data-slot="endeavor-card"]').first()
  await expect(card).toBeVisible()
  await card.locator('button').first().click()

  const complete = page
    .locator(
      '[data-slot="endeavor-card-prep-overlay"] button[aria-label="Mark complete"]',
    )
    .first()
  await expect(complete).toBeVisible()
  await complete.click()

  // Canon's completion control opens a small popover first, so a completion can
  // be backdated. `Mark` is the one that completes it at now.
  const mark = page.getByRole('button', { name: 'Mark', exact: true })
  if ((await mark.count()) > 0) await mark.first().click()

  /*
    The toast itself, not the layer: the layer is always mounted — its live
    region has to exist before the first message or nothing is announced — so
    it is the toast inside it that proves the completion was heard.

    And it is waited for at FULL opacity. The toast enters from the trailing
    edge over a spring, mounting at `opacity: 0` with one frame of
    `translateX(24px)` so the browser has a value to transition from; a
    screenshot taken on arrival catches exactly that frame and shows nothing.
  */
  const toast = page.locator('[data-kro-toast]')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveCSS('opacity', '1')
  // A settled slide is `translateX(0)`, which computes as the identity matrix
  // rather than `none`.
  await expect(toast).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
}

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    const suffix = `${viewport.name}-${scheme}`

    test.describe(`${viewport.name} · ${scheme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: scheme,
      })

      test(`the Do FAB draws bolt.fill (${suffix})`, async ({ page }) => {
        await openMyDay(page)
        await shot(page, `do-fab-closed-${suffix}`)

        await page.getByRole('button', { name: 'Quick action' }).click()
        // The rows fan out on a spring, so the row that arrives LAST is what
        // says the menu has settled — a shot on arrival catches four ghosts.
        const clearExpired = page.getByRole('button', { name: 'Clear Expired' })
        await expect(clearExpired).toBeVisible()
        for (const label of [
          'Mark Complete…',
          'Clear Expired',
          'Quick Add',
          'Start Session',
        ]) {
          await expect(page.getByRole('button', { name: label })).toHaveCSS(
            'opacity',
            '1',
          )
        }
        await shot(page, `do-fab-open-${suffix}`)
      })

      test(`the undo toast renders over My Day (${suffix})`, async ({
        page,
      }) => {
        await openMyDay(page)
        await captureTask(page, 'Water the plants')
        await completeFirstCard(page)

        const layer = page.locator('[data-kro-toast-layer]')
        await expect(layer).toHaveAttribute('data-kro-toast-lifted', 'false')
        await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
        await shot(page, `toast-over-my-day-${suffix}`)
      })

      test(`the toast lifts above the session pill (${suffix})`, async ({
        page,
      }) => {
        await page.goto('/execute')
        await page.getByRole('button', { name: 'Start session' }).click()
        await expect(page.getByText('Session in progress')).toBeVisible()

        await openMyDay(page)
        await expect(
          page.locator('[data-kro-session-pill-visible="true"]'),
        ).toBeVisible()

        await captureTask(page, 'Water the plants')
        await expect(
          page.locator('[data-kro-session-pill-visible="true"]'),
        ).toBeVisible()
        await completeFirstCard(page)
        const layer = page.locator('[data-kro-toast-layer]')
        await expect(layer).toHaveAttribute('data-kro-toast-lifted', 'true')
        await shot(page, `toast-lifted-above-pill-${suffix}`)
      })
    })
  }
}

test.describe('the desktop toolbar order', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('puts Inbox before the destination’s own controls', async ({ page }) => {
    await openMyDay(page)
    const toolbar = page.getByTestId('shell-content-toolbar')
    await expect(toolbar).toBeVisible()
    await toolbar.screenshot({
      path: `${SHOTS_DIR}/toolbar-order-desktop-1440x900-light.png`,
    })
  })
})
