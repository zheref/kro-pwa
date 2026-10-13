import { describe, expect, it, vi } from 'vitest'

/**
 * The pricing route. `redirect()` throws a sentinel Next.js catches upstream,
 * so what is worth asserting is whether the route calls it — the flag decides
 * — and that it contributes no markup of its own (`RC-38`).
 */
const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))
vi.mock('./PricingPageClient', () => ({
  PricingPageClient: () => 'pricing-page-client',
}))
const landingEnabled = vi.fn(() => false)
vi.mock('../landingFlag', () => ({ isLandingEnabled: () => landingEnabled() }))

describe('the pricing route', () => {
  it('mounts the pricing page when the landing flag is on', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(true)
    const { default: PricingRoute } = await import('./page')

    const rendered = PricingRoute()

    expect(redirect).not.toHaveBeenCalled()
    expect(rendered).not.toBeUndefined()
  })

  it('lands on My Day when the flag is off — the same kill switch as the front door', async () => {
    redirect.mockClear()
    landingEnabled.mockReturnValue(false)
    const { default: PricingRoute } = await import('./page')

    PricingRoute()

    expect(redirect).toHaveBeenCalledWith('/my-day')
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it('is titled "Pricing" (the root template adds "· Kro"), described and canonical', async () => {
    const { metadata } = await import('./page')

    expect(metadata.title).toBe('Pricing')
    expect(metadata.description).toContain('Plus is not on sale yet')
    expect(metadata.alternates?.canonical).toBe('/pricing')
  })
})
