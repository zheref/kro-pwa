import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { landingAssets } from '../../../LandingAssets'
import * as stories from '../FocusSection.stories'

afterEach(cleanup)

describe('FocusSection (mirrors FocusSection.stories)', () => {
  it('Desktop — the h2 names a subtle-tone section with four h3 blocks', () => {
    const { container } = render(stories.Desktop.render())
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'Stay with one thing.',
    })
    const section = container.querySelector('section#focus') as HTMLElement
    expect(section.getAttribute('aria-labelledby')).toBe(h2.id)
    expect(section.getAttribute('data-tone')).toBe('subtle')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('Dark — the session phone, the watch and the Live Activity each carry their catalog alt', () => {
    render(stories.Dark.render())
    expect(
      screen.getByRole('img', { name: landingAssets.webSessionMobileDark.alt }),
    ).toBeTruthy()
    expect(
      screen.getByRole('img', { name: landingAssets.watchosFeatured.alt }),
    ).toBeTruthy()
    expect(
      screen.getByRole('img', {
        name: landingAssets.iosLiveActivityRunning.alt,
      }),
    ).toBeTruthy()
  })

  it('Phone — says the Session Pill, the Lock Screen and the wrist line', () => {
    render(stories.Phone.render())
    expect(screen.getByText('The Session Pill')).toBeTruthy()
    expect(screen.getByText('On the Lock Screen')).toBeTruthy()
    expect(
      screen.getByText('The wrist is a mirror, not a second opinion.'),
    ).toBeTruthy()
  })
})
