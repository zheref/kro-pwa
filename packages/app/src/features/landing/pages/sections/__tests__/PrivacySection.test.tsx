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

  it('Dark — says the never-sent promise and the anonymous-visit card', () => {
    render(stories.Dark.render())
    expect(screen.getByText('We never send what you write')).toBeTruthy()
    expect(
      screen.getByText(
        "Counts, timings, the page you are on and your browser's size and language — never the words you write.",
      ),
    ).toBeTruthy()
    expect(screen.getByText('A visit is not a person')).toBeTruthy()
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
