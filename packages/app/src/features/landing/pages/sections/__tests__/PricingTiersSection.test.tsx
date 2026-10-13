import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { press } from '../../../__tests__/domHelpers'
import { PricingTiersSection } from '../PricingTiersSection'
import * as stories from '../PricingTiersSection.stories'

afterEach(cleanup)

const card = (name: 'Free' | 'Plus') =>
  screen.getByRole('article', { name }) as HTMLElement

describe('PricingTiersSection (mirrors PricingTiersSection.stories)', () => {
  it('Desktop — two plans, Free at $0 and Plus at $5 a month or $48 a year', () => {
    render(stories.Desktop.render())
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(within(card('Free')).getByText('$0')).toBeTruthy()
    expect(within(card('Plus')).getByText('$5')).toBeTruthy()
    expect(within(card('Plus')).getByText('a month')).toBeTruthy()
    expect(
      within(card('Plus')).getByText('or $48 a year, $4 a month'),
    ).toBeTruthy()
  })

  it('Dark — Free opens the hub it was given; Plus goes to early access because it is not on sale', () => {
    render(stories.Dark.render())
    expect(
      within(card('Free'))
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('https://app.kro.example/my-day')
    expect(
      within(card('Plus'))
        .getByRole('link', { name: 'Get early access' })
        .getAttribute('href'),
    ).toBe('/#early-access')
    expect(within(card('Plus')).getByText('Not on sale yet')).toBeTruthy()
  })

  it('Phone — Plus lists the AI first after Free, and keeps the maker shipping', () => {
    render(stories.Phone.render())
    const items = within(card('Plus'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items[0]).toBe('Everything in Free')
    expect(items).toContain('Plan my day')
    expect(items.at(-1)).toBe('You keep the maker shipping')
  })
})

describe('PricingTiersSection intents', () => {
  it('reports the pricing placement for each door', () => {
    const onOpenHub = vi.fn()
    const onGetEarlyAccess = vi.fn()
    render(
      <PricingTiersSection
        hubUrl="/my-day"
        onOpenHub={onOpenHub}
        onGetEarlyAccess={onGetEarlyAccess}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro for Web' }))
    press(screen.getByRole('link', { name: 'Get early access' }))
    expect(onOpenHub).toHaveBeenCalledWith('pricing')
    expect(onGetEarlyAccess).toHaveBeenCalledWith('pricing')
  })
})
