import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import * as stories from '../PricingIntroSection.stories'

afterEach(cleanup)

describe('PricingIntroSection (mirrors PricingIntroSection.stories)', () => {
  it('Desktop — the page h1 names both plans in one line', () => {
    render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Free is the whole loop. Plus is the part that thinks with you.',
      }),
    ).toBeTruthy()
  })

  it('Dark — says the prices are launch pricing and Plus is not on sale, beside the opening', () => {
    render(stories.Dark.render())
    expect(
      screen.getByText(
        'Launch pricing, subject to change. Plus is not on sale yet.',
      ),
    ).toBeTruthy()
  })

  it('Phone — a region named by its own heading, on the gradient field', () => {
    const { container } = render(stories.Phone.render())
    const section = container.querySelector('section#pricing-top')
    expect(section?.getAttribute('data-tone')).toBe('gradient')
    expect(section?.getAttribute('aria-labelledby')).toBe('pricing-top-title')
    expect(container.querySelector('#pricing-top-title')?.tagName).toBe('H1')
  })
})
