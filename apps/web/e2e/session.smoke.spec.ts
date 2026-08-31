import { expect, test } from '@playwright/test'

/**
 * The one smoke test that proves the Playwright wiring is real.
 *
 * It used to target `/session`, the Chakra surface KC-IS-#22 retired. The
 * honest replacement is `/execute` — the parity Execute destination, which is
 * the same product surface at canon's own name for it, needs no environment
 * variables, and now genuinely runs a session end to end.
 */
test.describe('session surface', () => {
  test('serves /execute with a startable focus session', async ({ page }) => {
    const response = await page.goto('/execute')

    expect(response?.status()).toBe(200)
    await expect(page.getByText('READY')).toBeVisible()
    await expect(page.getByText('Tap to start')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Start session' }),
    ).toBeVisible()
  })

  test('starts the session and keeps the pill on another route', async ({
    page,
  }) => {
    await page.goto('/execute')
    await page.getByRole('button', { name: 'Start session' }).click()
    await expect(page.getByText('Session in progress')).toBeVisible()

    await page.goto('/my-day')

    // The pill is the cross-surface anchor: it survives the navigation and
    // keeps the live time visible beside the FAB.
    await expect(
      page.locator('[data-kro-session-pill-visible="true"]'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Pause session' }),
    ).toBeVisible()
  })
})
