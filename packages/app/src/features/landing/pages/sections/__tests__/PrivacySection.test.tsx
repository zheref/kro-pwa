import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import * as stories from '../PrivacySection.stories'

afterEach(cleanup)

describe('PrivacySection (mirrors PrivacySection.stories)', () => {
  it('Desktop — "Your day stays yours" heads a glass section with three cards', () => {
    const { container } = render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your day stays yours' }),
    ).toBeTruthy()
    expect(
      container.querySelector('section#privacy')?.getAttribute('data-tone'),
    ).toBe('glass')
    expect(container.querySelectorAll('article')).toHaveLength(3)
  })

  it('Dark — says the never-sent promise and the random-identifier card', () => {
    render(stories.Dark.render())
    expect(screen.getByText('We never send what you write')).toBeTruthy()
    expect(
      screen.getByText('Counts and timings only — never the words you write.'),
    ).toBeTruthy()
    expect(screen.getByText('You are a random identifier')).toBeTruthy()
  })

  it('Phone — re-points the secondary ink to the on-glass token for this subtree only', () => {
    const { container } = render(stories.Phone.render())
    const scoped = container.querySelector(
      '[style*="fore-secondary-on-glass"]',
    ) as HTMLElement
    expect(scoped).not.toBeNull()
    expect(scoped.style.getPropertyValue('--kro-color-fore-secondary')).toBe(
      'var(--kro-color-fore-secondary-on-glass)',
    )
  })
})
