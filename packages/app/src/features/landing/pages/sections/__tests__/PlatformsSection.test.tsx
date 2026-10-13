import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { landingAssets } from '../../../LandingAssets'
import { PlatformsSection } from '../PlatformsSection'
import * as stories from '../PlatformsSection.stories'

afterEach(cleanup)

const props = () => ({
  hubUrl: 'https://app.kro.example',
  onPickPlatform: vi.fn(),
  onVotePlatform: vi.fn(),
  onOpenHub: vi.fn(),
})

describe('PlatformsSection (mirrors PlatformsSection.stories)', () => {
  it('Desktop — seven platform cards and the canon "vote to get it sooner" line', () => {
    const { container } = render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', { level: 2, name: 'Wherever your day is.' }),
    ).toBeTruthy()
    expect(
      screen.getByText('Available soon — vote to get it sooner.'),
    ).toBeTruthy()
    expect(container.querySelectorAll('article')).toHaveLength(7)
  })

  it('Desktop — every strip figure caps its frame to the column (the Mac window shrinks below 414px instead of clipping)', () => {
    const { container } = render(stories.Desktop.render())
    const figures = [...container.querySelectorAll('figure')]
    expect(figures).toHaveLength(5)
    for (const figure of figures) {
      // A grid figure's auto track would take the frame's fixed width as its
      // minimum; `grid-cols-1` is minmax(0, 1fr), so the track can shrink.
      expect(figure.className).toContain('grid-cols-1')
      expect(figure.className).toContain('max-w-full')
      expect(figure.className).toContain('min-w-0')
    }
  })

  it('Desktop — one real screenshot per platform, each in its own device frame', () => {
    const { container } = render(stories.Desktop.render())
    const frameOf = (key: keyof typeof landingAssets) =>
      screen
        .getByRole('img', { name: landingAssets[key].alt })
        .closest('.kro-device') as HTMLElement
    expect(frameOf('webMyDayDesktopLight').className).toContain(
      'kro-device--mac',
    )
    expect(frameOf('ipadosSidebar').className).toContain('kro-device--tablet')
    expect(frameOf('iosDoPopulatedLanes').className).toContain(
      'kro-device--ios',
    )
    expect(frameOf('androidDayProgress').className).toContain(
      'kro-device--android',
    )
    expect(frameOf('watchosFeatured').className).toContain('kro-device--watch')
    expect(container.querySelectorAll('figcaption')).toHaveLength(5)
  })

  it('Dark — Web is a link to the hub, and only Android and Windows can be voted for', () => {
    render(stories.Dark.render())
    expect(
      screen.getByRole('link', { name: /Web.*Live/ }).getAttribute('href'),
    ).toBe('/my-day')
    expect(
      screen
        .getAllByRole('button', { name: /^Vote for / })
        .map((b) => b.textContent),
    ).toEqual(['Vote for Android', 'Vote for Windows'])
  })

  it('Phone — statuses are stated in words, not colour alone', () => {
    render(stories.Phone.render())
    expect(
      screen.getByRole('button', { name: /iPhone.*TestFlight/ }),
    ).toBeTruthy()
    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByText('Coming soon')).toBeTruthy()
  })
})

describe('PlatformsSection intents', () => {
  it('a vote button reports its platform', () => {
    const p = props()
    render(<PlatformsSection {...p} />)
    press(screen.getByRole('button', { name: 'Vote for Android' }))
    expect(p.onVotePlatform).toHaveBeenCalledWith('android')
  })

  it('a TestFlight badge reports the platform to pre-select', () => {
    const p = props()
    render(<PlatformsSection {...p} />)
    press(screen.getByRole('button', { name: /Apple Watch.*TestFlight/ }))
    expect(p.onPickPlatform).toHaveBeenCalledWith('watchos')
  })

  it('the Web badge opens the hub and reports the platforms placement', () => {
    const p = props()
    render(<PlatformsSection {...p} />)
    const web = screen.getByRole('link', { name: /Web.*Live/ })
    expect(web.getAttribute('href')).toBe('https://app.kro.example')
    press(web)
    expect(p.onOpenHub).toHaveBeenCalledWith('platforms')
  })
})
