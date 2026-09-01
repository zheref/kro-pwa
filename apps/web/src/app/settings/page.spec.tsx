import { describe, expect, it, vi } from 'vitest'

/**
 * `/settings` — retired, still resolvable.
 *
 * `redirect()` throws a sentinel Next.js catches upstream, so the assertion is
 * that the route *calls* it with the parity destination, which is the whole
 * behaviour this file has.
 */
const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

describe('the retired /settings address', () => {
  it('sends an old bookmark to the Adjust destination', async () => {
    const { default: SettingsRoute } = await import('./page')

    SettingsRoute()

    expect(redirect).toHaveBeenCalledWith('/adjust')
  })

  it('does not point at itself — a self-redirect would loop forever', async () => {
    redirect.mockClear()
    const { default: SettingsRoute } = await import('./page')

    SettingsRoute()

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalledWith('/settings')
  })

  it('renders nothing of its own — the stub content is gone', async () => {
    redirect.mockClear()
    const { default: SettingsRoute } = await import('./page')

    expect(SettingsRoute()).toBeUndefined()
  })
})
