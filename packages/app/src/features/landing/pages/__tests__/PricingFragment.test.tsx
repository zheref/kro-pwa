import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { press } from '../../__tests__/domHelpers'
import {
  landingStateMocks,
  noopPricingCallbacks,
  pricingValueProps,
} from '../../LandingMocks'
import {
  LANDING_OBSERVED_IDS,
  PRICING_SECTION_IDS,
} from '../../LandingSections'
import { PricingFragment } from '../PricingFragment'
import * as stories from '../PricingFragment.stories'

afterEach(cleanup)

describe('PricingFragment (mirrors PricingFragment.stories)', () => {
  it('Desktop — one h1, one main#main, the bar with Pricing current, and the footer', () => {
    const { container } = render(stories.Desktop.render())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('main#main')).toHaveLength(1)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(
      'Pricing',
    )
    expect(screen.getByRole('contentinfo')).toBeTruthy()
  })

  it('Dark — the bands sit in order under ids the landing never observes', () => {
    const { container } = render(stories.Dark.render())
    const ids = [...container.querySelectorAll('main > *')].map((el) => el.id)
    expect(ids).toEqual(Object.values(PRICING_SECTION_IDS))
    for (const id of ids) expect(LANDING_OBSERVED_IDS).not.toContain(id)
  })

  it('Phone — the bar and footer lead back to the landing, not to anchors on this page', () => {
    render(stories.Phone.render())
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(
      within(nav).getByRole('link', { name: 'The loop' }).getAttribute('href'),
    ).toBe('/#the-loop')
    expect(screen.getByRole('link', { name: 'Kro' }).getAttribute('href')).toBe(
      '/#top',
    )
    const footer = screen.getByRole('contentinfo')
    expect(
      within(footer)
        .getByRole('link', { name: 'Early access' })
        .getAttribute('href'),
    ).toBe('/#early-access')
  })
})

describe('PricingFragment intents', () => {
  it('the bar door reports nav; the cards and the closing report pricing', () => {
    const onOpenHub = vi.fn()
    const onGetEarlyAccess = vi.fn()
    render(
      <PricingFragment
        {...noopPricingCallbacks}
        {...pricingValueProps(landingStateMocks.initial)}
        onOpenHub={onOpenHub}
        onGetEarlyAccess={onGetEarlyAccess}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro' }))
    for (const link of screen.getAllByRole('link', {
      name: 'Open Kro for Web',
    }))
      press(link)
    for (const link of screen.getAllByRole('link', {
      name: 'Get early access',
    }))
      press(link)
    expect(onOpenHub.mock.calls).toEqual([['nav'], ['pricing'], ['pricing']])
    expect(onGetEarlyAccess.mock.calls).toEqual([['pricing'], ['pricing']])
  })
})
