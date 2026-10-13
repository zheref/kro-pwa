import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { pricingFaqEntries } from '../../../LandingCopy'
import * as stories from '../PricingFaqSection.stories'

afterEach(cleanup)

describe('PricingFaqSection (mirrors PricingFaqSection.stories)', () => {
  it('Desktop — every question is answered in the open, in order', () => {
    const { container } = render(stories.Desktop.render())
    expect(
      [...container.querySelectorAll('dt')].map((dt) => dt.textContent),
    ).toEqual(pricingFaqEntries.map((entry) => entry.question))
    expect(container.querySelectorAll('dd')).toHaveLength(
      pricingFaqEntries.length,
    )
  })

  it('Dark — billing says nobody is charged today', () => {
    render(stories.Dark.render())
    expect(screen.getByText(/Nobody is charged today/)).toBeTruthy()
  })

  it('Phone — a region named by its heading, with no accordion to open', () => {
    const { container } = render(stories.Phone.render())
    expect(
      screen.getByRole('region', { name: 'Plainly, before anyone pays.' }),
    ).toBeTruthy()
    expect(container.querySelector('button')).toBeNull()
  })
})
