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
    const labels = within(card('Plus'))
      .getAllByRole('listitem')
      .map((li) => li.lastElementChild?.textContent)
    expect(labels[0]).toBe('Everything in Free')
    expect(labels).toContain('Plan my day')
    expect(labels.at(-1)).toBe('You keep the maker shipping')
  })

  it('never puts a check beside a feature that is not built — it reads Planned instead', () => {
    render(stories.Desktop.render())
    for (const name of ['Free', 'Plus'] as const) {
      for (const li of within(card(name)).getAllByRole('listitem')) {
        const planned = li.textContent?.startsWith('Planned') ?? false
        expect(li.querySelector('svg') !== null, li.textContent ?? '').toBe(
          !planned,
        )
      }
    }
    const plus = within(card('Plus'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(plus.filter((t) => t?.startsWith('Planned'))).toHaveLength(9)
    const free = within(card('Free'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(free).toContain('PlannedHabits')
    expect(free).toContain('PlannedBlueprints')
    expect(free).toContain('My Day')
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
