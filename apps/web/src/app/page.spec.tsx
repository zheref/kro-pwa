import { describe, expect, it, vi } from 'vitest'

/**
 * The front door.
 *
 * `redirect()` throws a sentinel Next.js catches upstream, so what is worth
 * asserting is that the route *calls* it with the landing destination product
 * canon names — and that it contributes no markup of its own (`RC-38`).
 */
const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

describe('the root route', () => {
  it('lands a cold visit on My Day, the destination canon flags initial', async () => {
    const { default: RootRoute } = await import('./page')

    RootRoute()

    expect(redirect).toHaveBeenCalledWith('/my-day')
  })

  it('sends nobody to the retired template page it replaced', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    RootRoute()

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalledWith('/')
  })

  it('renders nothing of its own — a passive shell, not a page', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    expect(RootRoute()).toBeUndefined()
  })
})
