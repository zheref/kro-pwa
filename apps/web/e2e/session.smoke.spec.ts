import { expect, test } from '@playwright/test'

/**
 * The one smoke test that proves the Playwright wiring is real.
 *
 * `/session` is the only fully built surface today and it needs no environment
 * variables, so it is the honest target for a scaffolding test. Feature
 * children add their own specs beside this one.
 */
test.describe('session surface', () => {
  test('serves /session with the intention field and the start control', async ({
    page,
  }) => {
    const response = await page.goto('/session')

    expect(response?.status()).toBe(200)
    await expect(page.getByPlaceholder('Intention')).toBeVisible()
    await expect(page.getByText('Ready to Start?')).toBeVisible()
  })
})
