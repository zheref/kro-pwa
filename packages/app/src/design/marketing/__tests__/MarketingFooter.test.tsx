import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarketingFooter } from '../MarketingFooter'

afterEach(cleanup)

const props = {
  brand: { label: 'Kro', tagline: 'Plan the day.' },
  columns: [
    {
      title: 'Product',
      links: [{ label: 'Features', href: '#features' }],
    },
    {
      title: 'Company',
      links: [
        { label: 'zheref.io', href: 'https://zheref.io', external: true },
      ],
    },
  ],
  legal: '© 2026 Kro',
}

describe('MarketingFooter', () => {
  it('is a contentinfo landmark with a labelled link navigation', () => {
    render(<MarketingFooter {...props} />)
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Product' })).toBeTruthy()
  })

  it('opens external links in a new tab with noopener noreferrer', () => {
    render(<MarketingFooter {...props} />)
    const external = screen.getByRole('link', { name: /zheref\.io/ })
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    expect(external.textContent).toContain('opens in a new tab')
  })

  it('leaves internal links in the same tab', () => {
    render(<MarketingFooter {...props} />)
    const internal = screen.getByRole('link', { name: 'Features' })
    expect(internal.getAttribute('target')).toBeNull()
    expect(internal.getAttribute('rel')).toBeNull()
  })

  it('shows the brand, tagline, legal line and trailing slot', () => {
    render(
      <MarketingFooter
        {...props}
        trailing={<button type="button">Theme</button>}
      />,
    )
    expect(screen.getByText('Plan the day.')).toBeTruthy()
    expect(screen.getByText('© 2026 Kro')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeTruthy()
  })
})
