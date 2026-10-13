import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { press } from '../../__tests__/domHelpers'
import { LANDING_OBSERVED_IDS } from '../../LandingSections'
import {
  landingStateMocks,
  landingValueProps,
  noopLandingCallbacks,
} from '../../LandingMocks'
import { LandingFragment } from '../LandingFragment'
import * as stories from '../LandingFragment.stories'

afterEach(cleanup)

const mount = (story: { render: () => React.ReactElement }) => {
  const view = render(story.render())
  return view.container
}

describe('LandingFragment (mirrors LandingFragment.stories)', () => {
  it('MidPage — one h1, one main#main, a banner, a footer and a primary nav', () => {
    const root = mount(stories.MidPage)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const mains = root.querySelectorAll('main')
    expect(mains).toHaveLength(1)
    expect(mains[0]?.id).toBe('main')
    const header = root.querySelector('header.kro-marketing-nav')
    expect(header).not.toBeNull()
    expect(header?.closest('main')).toBeNull()
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeTruthy()
  })

  it('Dark — every section carries its anchor id in document order and is named by an h2 that exists', () => {
    const root = mount(stories.Dark)
    const ids = [...root.querySelectorAll('main > *')].map((el) => el.id)
    expect(ids.slice().sort()).toEqual([...LANDING_OBSERVED_IDS].sort())
    for (const section of root.querySelectorAll('main > section')) {
      const labelledBy = section.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      const heading = root.querySelector(`#${labelledBy}`)
      expect(heading).not.toBeNull()
      expect(['H1', 'H2']).toContain(heading?.tagName)
    }
  })

  it('Phone — the nav marks the section from the state mock as current', () => {
    mount(stories.Phone)
    const nav = within(screen.getByRole('navigation', { name: 'Primary' }))
    expect(
      nav.getByRole('link', { name: 'Sessions' }).getAttribute('aria-current'),
    ).toBe('location')
  })
})

describe('LandingFragment structure', () => {
  it('has the nine bands in the brief order', () => {
    const root = mount(stories.MidPage)
    expect([...root.querySelectorAll('main > *')].map((el) => el.id)).toEqual([
      'top',
      'the-loop',
      'focus',
      'platforms',
      'federation',
      'privacy',
      'early-access',
      'faq',
      'start',
    ])
  })

  it('every image is named: a real alt, or a framed role=img carrying the alt', () => {
    const root = mount(stories.MidPage)
    for (const image of root.querySelectorAll('img')) {
      const framed = image.closest('[role="img"][aria-label]')
      const alt = image.getAttribute('alt') ?? ''
      const decorativeMark = image.getAttribute('src')?.includes('/brand/')
      expect(framed !== null || alt.length > 10 || decorativeMark).toBe(true)
    }
  })

  it('has no duplicate ids anywhere on the page', () => {
    const root = mount(stories.MidPage)
    const ids = [...root.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renders the early-access slot it is given, and uses no inline hex', () => {
    const { container } = render(
      <LandingFragment
        {...noopLandingCallbacks}
        {...landingValueProps(landingStateMocks.initial)}
        earlyAccess={<p>the form slot</p>}
      />,
    )
    expect(screen.getByText('the form slot')).toBeTruthy()
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/)
  })

  it('routes every intent through its callback with the right placement', () => {
    const calls = {
      ...noopLandingCallbacks,
      onOpenHub: vi.fn(),
      onGetEarlyAccess: vi.fn(),
      onVotePlatform: vi.fn(),
      onToggleTheme: vi.fn(),
    }
    render(
      <LandingFragment
        {...calls}
        {...landingValueProps(landingStateMocks.initial)}
        earlyAccess={null}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro' }))
    const openers = screen.getAllByRole('link', { name: 'Open Kro for Web' })
    press(openers[0] as Element)
    press(openers.at(-1) as Element)
    press(
      screen.getAllByRole('link', { name: 'Get early access' })[0] as Element,
    )
    press(screen.getByRole('button', { name: 'Vote for Windows' }))
    press(screen.getByRole('button', { name: 'Dark mode' }))
    expect(calls.onOpenHub).toHaveBeenCalledWith('nav')
    expect(calls.onOpenHub).toHaveBeenCalledWith('hero')
    expect(calls.onOpenHub).toHaveBeenCalledWith('final')
    expect(calls.onGetEarlyAccess).toHaveBeenCalledWith('hero')
    expect(calls.onVotePlatform).toHaveBeenCalledWith('windows')
    expect(calls.onToggleTheme).toHaveBeenCalledTimes(1)
  })
})
