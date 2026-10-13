import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LandingNav } from '../LandingNav'
import * as stories from '../LandingNav.stories'

afterEach(cleanup)

describe('LandingNav (mirrors LandingNav.stories)', () => {
  it('Desktop — brand, the five section links, an active mark and the Open Kro pill', () => {
    render(stories.Desktop.render())
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    for (const name of [
      'The loop',
      'Sessions',
      'Platforms',
      'Privacy',
      'FAQ',
    ]) {
      expect(nav.textContent).toContain(name)
    }
    expect(
      screen
        .getByRole('link', { name: 'The loop' })
        .getAttribute('aria-current'),
    ).toBe('location')
    expect(
      screen.getByRole('link', { name: 'FAQ' }).hasAttribute('aria-current'),
    ).toBe(false)
    expect(
      screen.getByRole('link', { name: 'Open Kro' }).getAttribute('href'),
    ).toBe('/my-day')
    expect(screen.getByRole('link', { name: 'Kro' }).getAttribute('href')).toBe(
      '#top',
    )
  })

  it('Dark — the theme toggle reflects the theme prop (pressed means dark is on)', () => {
    render(stories.Dark.render())
    expect(
      screen
        .getByRole('button', { name: 'Dark mode' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('Phone — the menu button is present and the brand mark is decorative', () => {
    const { container } = render(stories.Phone.render())
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
    const mark = container.querySelector('img') as HTMLImageElement
    expect(mark.getAttribute('alt')).toBe('')
    expect(mark.getAttribute('src')).toBe('/landing/brand/kro-mark-192.png')
    expect(mark.width).toBe(28)
  })
})

describe('LandingNav intents', () => {
  const props = () => ({
    activeId: null,
    theme: 'light' as const,
    hubUrl: 'https://app.kro.example',
    onToggleTheme: vi.fn(),
    onOpenHub: vi.fn(),
    onNavigate: vi.fn(),
    onOpenMenu: vi.fn(),
  })

  it('pressing Open Kro reports the nav placement hand-off and leads to the hub URL it was given', () => {
    const p = props()
    render(<LandingNav {...p} />)
    const cta = screen.getByRole('link', { name: 'Open Kro' })
    expect(cta.getAttribute('href')).toBe('https://app.kro.example')
    press(cta)
    expect(p.onOpenHub).toHaveBeenCalledTimes(1)
  })

  it('toggling the theme and following a link are reported', () => {
    const p = props()
    render(<LandingNav {...p} />)
    press(screen.getByRole('button', { name: 'Dark mode' }))
    press(screen.getByRole('link', { name: 'Platforms' }))
    expect(p.onToggleTheme).toHaveBeenCalledTimes(1)
    expect(p.onNavigate).toHaveBeenCalledWith('#platforms')
  })

  it('pressing the menu button reports the menu opening', () => {
    const p = props()
    render(<LandingNav {...p} />)
    press(screen.getByRole('button', { name: 'Open menu' }))
    expect(p.onOpenMenu).toHaveBeenCalledTimes(1)
  })
})
