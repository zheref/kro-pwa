import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const landingPage = vi.fn((_props: { hubUrl?: string }) => (
  <div data-testid="landing-page" />
))
vi.mock('@kro/app', () => ({
  LandingPage: (props: { hubUrl?: string }) => landingPage(props),
}))

describe('LandingPageClient', () => {
  it('mounts the shared landing Page — the one import a client wrapper makes', async () => {
    const { LandingPageClient } = await import('./LandingPageClient')

    render(<LandingPageClient />)

    expect(screen.getByTestId('landing-page')).toBeInTheDocument()
  })

  it('forwards the hub address from the host env — the same-host path on localhost', async () => {
    const { LandingPageClient } = await import('./LandingPageClient')

    render(<LandingPageClient />)

    expect(landingPage).toHaveBeenLastCalledWith({ hubUrl: '/my-day' })
  })

  it('owns no markup of its own beyond the Page it mounts (RC-39)', async () => {
    const { LandingPageClient } = await import('./LandingPageClient')

    const { container } = render(<LandingPageClient />)

    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe(
      'landing-page',
    )
  })
})
