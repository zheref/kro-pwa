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

    await RootRoute({})

    expect(redirect).toHaveBeenCalledWith('/my-day')
  })

  it('sends nobody to the retired template page it replaced', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    await RootRoute({})

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalledWith('/')
  })

  it('renders nothing of its own — a passive shell, not a page', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    expect(await RootRoute({})).toBeUndefined()
  })

  it('carries the provider return query through the hop — Supabase appends ?code= to the address it was given', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    await RootRoute({ searchParams: Promise.resolve({ code: 'abc-123' }) })

    expect(redirect).toHaveBeenCalledWith('/my-day?code=abc-123')
  })

  it('keeps every repeated and encoded parameter intact', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    await RootRoute({
      searchParams: Promise.resolve({
        a: ['1', '2'],
        q: 'x y',
        skip: undefined,
      }),
    })

    expect(redirect).toHaveBeenCalledWith('/my-day?a=1&a=2&q=x+y')
  })

  it('adds no stray question mark when the visit carries no query', async () => {
    redirect.mockClear()
    const { default: RootRoute } = await import('./page')

    await RootRoute({ searchParams: Promise.resolve({}) })

    expect(redirect).toHaveBeenCalledWith('/my-day')
  })
})
