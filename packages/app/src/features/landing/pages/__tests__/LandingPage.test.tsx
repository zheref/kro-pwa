import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installFakeObserver } from '../../../../design/marketing/__tests__/testEnv'
import { StoreProvider } from '../../../../library/StoreProvider'
import { press } from '../../__tests__/domHelpers'
import { LANDING_OBSERVED_IDS } from '../../LandingSections'
import { makeRecordedStore } from '../../../earlyAccess/__tests__/recordedStore'
import { LandingPage } from '../LandingPage'
import * as stories from '../LandingPage.stories'

const mount = (hubUrl?: string) => {
  const { store, services } = makeRecordedStore()
  const view = render(
    <StoreProvider store={store}>
      <LandingPage {...(hubUrl === undefined ? {} : { hubUrl })} />
    </StoreProvider>,
  )
  return { ...view, store, services }
}

const events = (services: ReturnType<typeof makeRecordedStore>['services']) =>
  services.analytics.calls.map((c) =>
    c.kind === 'track' ? c.event : 'identify',
  )

beforeEach(() => document.documentElement.removeAttribute('data-theme'))
afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
})

describe('LandingPage (mirrors LandingPage.stories)', () => {
  it('Default — renders the whole page: one h1 and the real early-access form inside its section', () => {
    render(stories.Default.render())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const form = document.querySelector('section#early-access form')
    expect(form).not.toBeNull()
  })

  it('DarkOtherHub — every Open Kro door goes to the hub it was given', () => {
    render(stories.DarkOtherHub.render())
    const doors = screen.getAllByRole('link', { name: /^Open Kro/ })
    expect(doors.length).toBeGreaterThanOrEqual(3)
    for (const door of doors)
      expect(door.getAttribute('href')).toBe('https://app.kro.example/my-day')
  })

  it('PhoneFaqOpen — the FAQ entry the slice holds open is expanded', () => {
    render(stories.PhoneFaqOpen.render())
    expect(
      screen
        .getByRole('button', { name: 'Does it work offline?' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
  })
})

describe('LandingPage wiring', () => {
  it('uses /my-day when no hub is given, and counts one page_view', () => {
    const { services } = mount()
    expect(
      screen
        .getAllByRole('link', { name: 'Open Kro' })[0]
        ?.getAttribute('href'),
    ).toBe('/my-day')
    expect(events(services).filter((e) => e === 'page_view')).toHaveLength(1)
  })

  it('opening the hub from the hero is tracked with its placement', async () => {
    const { services } = mount()
    await act(async () =>
      press(
        screen.getAllByRole('link', { name: 'Open Kro for Web' })[0] as Element,
      ),
    )
    expect(services.analytics.calls).toContainEqual({
      kind: 'track',
      event: 'cta_open_web',
      props: { placement: 'hero' },
    })
  })

  it('voting for Android records the vote and pre-selects Android in the real form', async () => {
    const { services } = mount()
    await act(async () =>
      press(screen.getByRole('button', { name: 'Vote for Android' })),
    )
    expect(services.analytics.calls).toContainEqual({
      kind: 'track',
      event: 'platform_vote',
      props: { platform: 'android' },
    })
    const android = screen.getByRole('radio', {
      name: 'Android',
    }) as HTMLInputElement
    expect(android.checked).toBe(true)
  })

  it('toggling the theme flips the toggle and paints the document', async () => {
    mount()
    const toggle = screen.getByRole('button', { name: 'Dark mode' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    await act(async () => press(toggle))
    expect(
      screen
        .getByRole('button', { name: 'Dark mode' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('opening a FAQ entry expands it and tracks faq_open once', async () => {
    const { services } = mount()
    await act(async () =>
      press(screen.getByRole('button', { name: 'Is Kro free?' })),
    )
    expect(
      screen
        .getByRole('button', { name: 'Is Kro free?' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      services.analytics.calls.filter(
        (c) => c.kind === 'track' && c.event === 'faq_open',
      ),
    ).toHaveLength(1)
  })

  it("a section crossing the viewport becomes the nav's current link and is counted once", () => {
    const observers = installFakeObserver()
    const { services } = mount()
    const observer = observers.at(-1)
    expect(observer?.observed.map((el) => el.id)).toEqual(LANDING_OBSERVED_IDS)
    const target = document.getElementById('platforms') as Element
    act(() => observer?.fire([{ target, isIntersecting: true }]))
    act(() => observer?.fire([{ target, isIntersecting: true }]))
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.querySelector('[aria-current="location"]')?.textContent).toBe(
      'Platforms',
    )
    expect(events(services).filter((e) => e === 'section_view')).toHaveLength(1)
  })

  it('early access, keyboard only: type the address and submit the form — joined, one request', async () => {
    const { services } = mount()
    const email = screen.getByRole('textbox', { name: /Email address/ })
    fireEvent.change(email, { target: { value: 'ada@example.com' } })
    await act(async () => {
      fireEvent.submit(email.closest('form') as HTMLFormElement)
    })
    expect(services.earlyAccess.calls).toHaveLength(1)
    expect(
      screen.getByRole('heading', { name: "You're on the list for iPhone" }),
    ).toBeTruthy()
    expect(events(services)).toContain('early_access_joined')
  })
})
