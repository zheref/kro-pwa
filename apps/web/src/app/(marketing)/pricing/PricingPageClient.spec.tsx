import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const pricingPage = vi.fn((_props: { hubUrl?: string }) => (
  <div data-testid="pricing-page" />
))
vi.mock('@kro/app', () => ({
  PricingPage: (props: { hubUrl?: string }) => pricingPage(props),
}))

describe('PricingPageClient', () => {
  it('mounts the shared pricing Page — the one import a client wrapper makes', async () => {
    const { PricingPageClient } = await import('./PricingPageClient')

    render(<PricingPageClient />)

    expect(screen.getByTestId('pricing-page')).toBeInTheDocument()
  })

  it('forwards the hub address from the host env — the same-host path on localhost', async () => {
    const { PricingPageClient } = await import('./PricingPageClient')

    render(<PricingPageClient />)

    expect(pricingPage).toHaveBeenLastCalledWith({ hubUrl: '/my-day' })
  })

  it('owns no markup of its own beyond the Page it mounts (RC-39)', async () => {
    const { PricingPageClient } = await import('./PricingPageClient')

    const { container } = render(<PricingPageClient />)

    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe(
      'pricing-page',
    )
  })
})
