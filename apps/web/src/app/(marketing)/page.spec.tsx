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

// The route test is about the decision, not the landing's markup: the wrapper
// is a sentinel element and the flag read is controlled per case.
vi.mock('./LandingPageClient', () => ({
  LandingPageClient: () => 'landing-page-client',
}))
vi.mock('../../contactConfig', () => ({
  contactEmail: () => 'privacy@example.com',
}))
const landingEnabled = vi.fn(() => false)
vi.mock('./landingFlag', () => ({ isLandingEnabled: () => landingEnabled() }))

describe('the root route', () => {
  it('lands a cold visit on My Day while the landing flag is off — the pre-landing behaviour, kept', async () => {
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    await RootRoute({})

    expect(redirect).toHaveBeenCalledWith('/my-day')
  })

  it('mounts the landing on a cold visit when the flag is on — the apex front door', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(true)
    const { default: RootRoute } = await import('./page')

    const rendered = await RootRoute({})

    expect(redirect).not.toHaveBeenCalled()
    expect(rendered).not.toBeUndefined()
  })

  it('still forwards a provider return to My Day when the flag is on — the PKCE exchange outranks the landing', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(true)
    const { default: RootRoute } = await import('./page')

    await RootRoute({ searchParams: Promise.resolve({ code: 'abc-123' }) })

    expect(redirect).toHaveBeenCalledWith('/my-day?code=abc-123')
  })

  it('sends nobody to the retired template page it replaced', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    await RootRoute({})

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalledWith('/')
  })

  it('renders nothing of its own while redirecting — a passive shell, not a page', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    expect(await RootRoute({})).toBeUndefined()
  })

  it('carries the provider return query through the hop — Supabase appends ?code= to the address it was given', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    await RootRoute({ searchParams: Promise.resolve({ code: 'abc-123' }) })

    expect(redirect).toHaveBeenCalledWith('/my-day?code=abc-123')
  })

  it('forwards only the provider return parameters — an arbitrary query never rides through the server tier', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    await RootRoute({
      searchParams: Promise.resolve({
        code: 'c',
        state: 's',
        error: 'access_denied',
        error_description: 'no thanks',
        utm_source: 'x',
        skip: undefined,
      }),
    })

    expect(redirect).toHaveBeenCalledWith(
      '/my-day?code=c&state=s&error=access_denied&error_description=no+thanks',
    )
  })

  it('adds no stray question mark when the visit carries no query', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: RootRoute } = await import('./page')

    await RootRoute({ searchParams: Promise.resolve({}) })

    expect(redirect).toHaveBeenCalledWith('/my-day')
  })

  it('hands the landing the contact address the deployment sets — the notice names it', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(true)
    const { default: RootRoute } = await import('./page')

    const rendered = (await RootRoute({})) as {
      props: { contactEmail: string | null }
    }

    expect(rendered.props.contactEmail).toBe('privacy@example.com')
  })
})
