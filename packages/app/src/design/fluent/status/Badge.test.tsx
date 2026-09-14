import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BADGE_COLOR_ROLES,
  Badge,
  CounterBadge,
  badgeFilledForeground,
  badgePaint,
  formatCounterCount,
} from './Badge'

afterEach(cleanup)

describe('Badge', () => {
  it('always prints its children, so colour is never the only signal', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).not.toBeNull()
    expect(
      document
        .querySelector('[data-slot="badge"]')
        ?.getAttribute('data-appearance'),
    ).toBe('filled')
  })

  it('fills with the mapped token and uses onAccent on brand', () => {
    const { container } = render(<Badge color="brand">Live</Badge>)
    const badge = container.querySelector('[data-slot="badge"]') as HTMLElement
    expect(badge.style.backgroundColor).toBe('var(--kro-color-accent)')
    expect(badge.style.color).toBe('var(--kro-color-on-accent)')
    expect(badgeFilledForeground('brand')).toBe('onAccent')
  })

  it('paints a ghost as colour-only and a tint at 16%', () => {
    const { rerender } = render(
      <Badge appearance="ghost" color="danger">
        Failed
      </Badge>,
    )
    let badge = document.querySelector('[data-slot="badge"]') as HTMLElement
    expect(badge.style.backgroundColor).toBe('')
    expect(badge.style.color).toBe('var(--kro-color-banner-danger)')

    rerender(
      <Badge appearance="tint" color="success">
        Done
      </Badge>,
    )
    badge = document.querySelector('[data-slot="badge"]') as HTMLElement
    expect(badge.style.backgroundColor).toContain('16%')
    expect(badge.style.color).toBe('var(--kro-color-focus-green)')
  })

  it('draws outline as a hairline mix, never a fill', () => {
    const { container } = render(
      <Badge appearance="outline" color="warning">
        Late
      </Badge>,
    )
    const badge = container.querySelector('[data-slot="badge"]') as HTMLElement
    expect(badge.style.backgroundColor).toBe('')
    expect(badge.style.boxShadow).toContain('inset')
    expect(badge.style.boxShadow).toContain('--kro-color-badge-orange')
  })

  it('names a non-text child so the colour is not the only carrier', () => {
    render(
      <Badge aria-label="Unread">
        <span>*</span>
      </Badge>,
    )
    const badge = screen.getByRole('img', { name: 'Unread' })
    expect(badge.getAttribute('data-slot')).toBe('badge')
  })

  it('maps every Fluent colour onto a Kro token', () => {
    expect(BADGE_COLOR_ROLES.informative).toBe('cozyBlue')
    expect(BADGE_COLOR_ROLES.severe).toBe('bannerWarning')
    expect(badgePaint('filled', 'subtle').backgroundColor).toBe(
      'var(--kro-color-mist)',
    )
    expect(badgeFilledForeground('subtle')).toBe('charcoal')
    expect(badgeFilledForeground('informative')).toBe('charcoal')
  })
})

describe('CounterBadge', () => {
  it('shows the count and overflows with a plus', () => {
    const { rerender } = render(<CounterBadge count={7} />)
    expect(screen.getByRole('status').textContent).toBe('7')
    expect(formatCounterCount(100)).toBe('99+')

    rerender(<CounterBadge count={120} overflowCount={9} />)
    expect(screen.getByRole('status').textContent).toBe('9+')
  })

  it('renders a dot with a spoken count and no numeral', () => {
    render(<CounterBadge count={3} dot />)
    const badge = screen.getByRole('status', { name: '3' })
    expect(badge.getAttribute('data-slot')).toBe('counter-badge')
    expect(badge.getAttribute('data-dot')).toBe('')
    expect(badge.textContent).toBe('')
  })

  it('treats a non-finite count as empty and stays a status', () => {
    render(<CounterBadge count={Number.NaN} />)
    const badge = screen.getByRole('status')
    expect(badge.textContent).toBe('0')
    expect(badge.getAttribute('data-slot')).toBe('counter-badge')
  })
})
