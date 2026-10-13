import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { makeRecordedStore } from '../../../earlyAccess/__tests__/recordedStore'
import { press } from '../../__tests__/domHelpers'
import { PricingPage } from '../PricingPage'
import * as stories from '../PricingPage.stories'

const mount = (hubUrl?: string) => {
  const { store, services } = makeRecordedStore()
  const view = render(
    <StoreProvider store={store}>
      <PricingPage {...(hubUrl === undefined ? {} : { hubUrl })} />
    </StoreProvider>,
  )
  return { ...view, store, services }
}

beforeEach(() => document.documentElement.removeAttribute('data-theme'))
afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
})

describe('PricingPage (mirrors PricingPage.stories)', () => {
  it('Default — renders the whole pricing page: one h1, both plans and the table', () => {
    render(stories.Default.render())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('table')).toBeTruthy()
  })

  it('DarkOtherHub — every Open Kro door goes to the hub it was given', () => {
    render(stories.DarkOtherHub.render())
    const doors = screen.getAllByRole('link', { name: /^Open Kro/ })
    expect(doors.length).toBe(3)
    for (const door of doors)
      expect(door.getAttribute('href')).toBe('https://app.kro.example/my-day')
  })

  it('Phone — the menu button is there for the small screen', () => {
    render(stories.Phone.render())
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
  })
})

describe('PricingPage wiring', () => {
  it('uses /my-day when no hub is given, and counts one page_view', () => {
    const { services } = mount()
    expect(
      screen
        .getAllByRole('link', { name: 'Open Kro' })[0]
        ?.getAttribute('href'),
    ).toBe('/my-day')
    expect(
      services.analytics.calls.filter(
        (c) => c.kind === 'track' && c.event === 'page_view',
      ),
    ).toHaveLength(1)
  })

  it('pressing Get early access on Plus is counted with the pricing placement', async () => {
    const { services } = mount()
    await act(async () =>
      press(
        screen.getAllByRole('link', { name: 'Get early access' })[0] as Element,
      ),
    )
    expect(services.analytics.calls).toContainEqual({
      kind: 'track',
      event: 'cta_early_access',
      props: { placement: 'pricing' },
    })
  })

  it('toggling the theme flips the toggle and paints the document, as on the landing', async () => {
    mount()
    await act(async () =>
      press(screen.getByRole('button', { name: 'Dark mode' })),
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
