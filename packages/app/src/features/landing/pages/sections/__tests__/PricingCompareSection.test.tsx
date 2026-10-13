import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { pricingComparison } from '../../../LandingCopy'
import * as stories from '../PricingCompareSection.stories'

afterEach(cleanup)

const rowOf = (feature: string) =>
  screen.getByRole('rowheader', { name: feature }).closest('tr') as HTMLElement

describe('PricingCompareSection (mirrors PricingCompareSection.stories)', () => {
  it('Desktop — one captioned table with Free and Plus as its columns, every feature a row', () => {
    render(stories.Desktop.render())
    const table = screen.getByRole('table', {
      name: 'What Free and Plus include',
    })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Feature', 'Free', 'Plus'])
    const features = pricingComparison.flatMap((group) => group.rows)
    expect(table.querySelectorAll('th[scope="row"]')).toHaveLength(
      features.length,
    )
  })

  it('Dark — a shipped feature is included on both; the AI is Planned on Plus, not on Free', () => {
    render(stories.Dark.render())
    const myDay = rowOf('My Day')
    expect(
      [...myDay.querySelectorAll('td')].map((td) => td.textContent),
    ).toEqual(['✓Included', '✓Included'])
    const plan = rowOf('Plan my day')
    expect(
      [...plan.querySelectorAll('td')].map((td) => td.textContent),
    ).toEqual(['—Not included', 'Planned'])
  })

  it('Phone — the table scrolls inside its own frame, and groups name their part of the product', () => {
    const { container } = render(stories.Phone.render())
    expect(
      container.querySelector('table')?.parentElement?.className,
    ).toContain('overflow-x-auto')
    const groups = [...container.querySelectorAll('th[scope="rowgroup"]')].map(
      (th) => th.textContent,
    )
    expect(groups).toEqual(pricingComparison.map((group) => group.title))
  })
})
