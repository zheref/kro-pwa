import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { landingAssets } from '../../../LandingAssets'
import { loopChapters } from '../../../LandingCopy'
import * as stories from '../LoopSection.stories'

afterEach(cleanup)

describe('LoopSection (mirrors LoopSection.stories)', () => {
  it('Desktop — "A day, resolved." is the h2 and names the section', () => {
    const { container } = render(stories.Desktop.render())
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'A day, resolved.',
    })
    expect(
      container
        .querySelector('section#the-loop')
        ?.getAttribute('aria-labelledby'),
    ).toBe(h2.id)
  })

  it('Dark — five chapters, in order, each an h3', () => {
    render(stories.Dark.render())
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(loopChapters.map((chapter) => chapter.title))
  })

  it('Phone — every chapter image has its catalog alt, lazy-loaded, with a size', () => {
    const { container } = render(stories.Phone.render())
    for (const key of [
      'iosInbox',
      'iosTriagePrioritize',
      'iosPlanTimeline',
      'iosPlanMatrix',
      'webMyDayDesktopDark',
      'iosDoPopulatedLanes',
      'androidEarnCelebrating',
      'iosDayProgress',
    ] as const) {
      expect(
        screen.getByRole('img', { name: landingAssets[key].alt }),
      ).toBeTruthy()
    }
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(8)
    for (const image of images) {
      expect(image.getAttribute('loading')).toBe('lazy')
      expect(image.getAttribute('width')).toBeTruthy()
    }
  })
})

describe('LoopSection copy', () => {
  it('says the canon capture and ring lines, and lists the Triage choices', () => {
    render(stories.Desktop.render())
    expect(
      screen.getByText(/the one place where a thought becomes an endeavor/),
    ).toBeTruthy()
    expect(
      screen.getByText(
        /A closed ring means you’ve finished everything the day asked of you\./,
      ),
    ).toBeTruthy()
    for (const word of ['Prioritize', 'Schedule', 'Delegate', 'Archive']) {
      expect(screen.getByText(word)).toBeTruthy()
    }
  })

  it('shows Do as the real web shell beside the iPhone My Day — one concept on two devices', () => {
    const { container } = render(stories.Desktop.render())
    const sources = [...container.querySelectorAll('img')].map((i) =>
      i.getAttribute('src'),
    )
    expect(sources).toContain(landingAssets.webMyDayDesktopDark.src)
    expect(sources).toContain(landingAssets.iosDoPopulatedLanes.src)
  })

  it('frames the Android Earn shot as an Android phone and the iOS ones as iPhones', () => {
    const { container } = render(stories.Desktop.render())
    const android = screen
      .getByRole('img', { name: landingAssets.androidEarnCelebrating.alt })
      .closest('.kro-device') as HTMLElement
    expect(android.className).toContain('kro-device--android')
    expect(container.querySelectorAll('.kro-device--ios').length).toBe(6)
  })

  it('has the five lanes of Do', () => {
    render(stories.Desktop.render())
    for (const lane of ['Now', 'Overdue', 'Next', 'Later', 'Anytime']) {
      expect(screen.getByText(lane)).toBeTruthy()
    }
  })
})
