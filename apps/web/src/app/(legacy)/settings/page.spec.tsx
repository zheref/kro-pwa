import { describe, expect, it, vi } from 'vitest'

/**
 * The two retired stubs.
 *
 * `redirect()` throws a sentinel Next.js catches upstream, so the assertion is
 * that the page *calls* it with the parity destination — which is the whole
 * behaviour these two files now have.
 */
const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

describe('the retired legacy stubs', () => {
  it('sends /settings to the Adjust destination', async () => {
    const { default: SettingsPage } = await import('./page')

    SettingsPage()

    expect(redirect).toHaveBeenCalledWith('/adjust')
  })

  it('sends /integrations to the same hub — canon has no separate destination', async () => {
    redirect.mockClear()
    const { default: IntegrationsPage } = await import('../integrations/page')

    IntegrationsPage()

    expect(redirect).toHaveBeenCalledWith('/adjust')
  })

  it('renders nothing of its own — the stub content is gone', async () => {
    redirect.mockClear()
    const { default: SettingsPage } = await import('./page')

    expect(SettingsPage()).toBeUndefined()
  })
})
