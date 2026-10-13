import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarketingLayout from './layout'

/**
 * The marketing layout is passive (`RC-41`); what matters is that it mounts
 * the composition root around its children, offers a skip link, and loads
 * Umami only when it is configured.
 *
 * `Providers` is stubbed (its own spec covers it; it needs a router), and so
 * is `next/script`, rendered as a plain element so its props are inspectable.
 */
vi.mock('../providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}))
vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => (
    <script
      data-testid="umami"
      data-src={String(props.src)}
      data-website-id={String(props['data-website-id'])}
      data-auto-track={String(props['data-auto-track'])}
      data-strategy={String(props.strategy)}
    />
  ),
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the marketing layout', () => {
  it('renders the page inside the one composition root', () => {
    render(<MarketingLayout>{<p>landing content</p>}</MarketingLayout>)

    expect(screen.getByTestId('providers')).toContainElement(
      screen.getByText('landing content'),
    )
  })

  it('offers a skip link to the main content', () => {
    render(<MarketingLayout>{<p>landing content</p>}</MarketingLayout>)

    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main')
  })

  it('loads no analytics script without a Umami website id', () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', '')

    render(<MarketingLayout>{<p>landing content</p>}</MarketingLayout>)

    expect(screen.queryByTestId('umami')).toBeNull()
  })

  it('loads Umami Cloud, manual tracking only, when the website id is set', () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123')
    vi.stubEnv('NEXT_PUBLIC_UMAMI_SCRIPT_URL', '')

    render(<MarketingLayout>{<p>landing content</p>}</MarketingLayout>)

    const script = screen.getByTestId('umami')
    expect(script).toHaveAttribute(
      'data-src',
      'https://cloud.umami.is/script.js',
    )
    expect(script).toHaveAttribute('data-website-id', 'site-123')
    expect(script).toHaveAttribute('data-auto-track', 'false')
    expect(script).toHaveAttribute('data-strategy', 'afterInteractive')
  })

  it('uses a self-hosted Umami script when one is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123')
    vi.stubEnv('NEXT_PUBLIC_UMAMI_SCRIPT_URL', 'https://stats.example.com/u.js')

    render(<MarketingLayout>{<p>landing content</p>}</MarketingLayout>)

    expect(screen.getByTestId('umami')).toHaveAttribute(
      'data-src',
      'https://stats.example.com/u.js',
    )
  })
})
