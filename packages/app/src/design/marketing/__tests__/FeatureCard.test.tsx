import { cleanup, render, screen } from '@testing-library/react'
import { Timer } from 'lucide-react'
import { afterEach, describe, expect, it } from 'vitest'
import { FeatureCard } from '../FeatureCard'

afterEach(cleanup)

describe('FeatureCard', () => {
  it('renders an article with an h3 title and its paragraph', () => {
    render(
      <FeatureCard icon={Timer} title="Focus" body="A timer that rests." />,
    )
    expect(screen.getByRole('article')).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Focus' }),
    ).toBeTruthy()
    expect(screen.getByText('A timer that rests.')).toBeTruthy()
  })

  it('hides the icon from assistive tech', () => {
    const { container } = render(
      <FeatureCard icon={Timer} title="Focus" body="b" />,
    )
    expect(
      container
        .querySelector('.kro-feature-card__icon')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('takes its accent from a colour role, defaulting to the live accent', () => {
    const { container, rerender } = render(
      <FeatureCard icon={Timer} title="t" body="b" />,
    )
    const card = container.querySelector('article') as HTMLElement
    expect(card.style.getPropertyValue('--kro-card-accent')).toBe(
      'var(--kro-color-accent)',
    )
    rerender(
      <FeatureCard icon={Timer} title="t" body="b" accentRole="focusGreen" />,
    )
    expect(card.style.getPropertyValue('--kro-card-accent')).toBe(
      'var(--kro-color-focus-green)',
    )
  })

  it('makes the title a link only when given an href', () => {
    const { rerender } = render(
      <FeatureCard icon={Timer} title="Focus" body="b" />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    rerender(<FeatureCard icon={Timer} title="Focus" body="b" href="#focus" />)
    expect(
      screen.getByRole('link', { name: 'Focus' }).getAttribute('href'),
    ).toBe('#focus')
  })
})
