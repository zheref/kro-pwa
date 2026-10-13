import { describe, expect, it } from 'vitest'
import { initialLandingState } from '../LandingFeature'
import { landingStateMocks } from '../LandingMocks'
import {
  withFaqClosed,
  withFaqOpened,
  withNavToggled,
  withSectionViewed,
  withTheme,
  withViewLoaded,
} from '../LandingShifters'

describe('withViewLoaded', () => {
  it('stamps the resolved theme and the hub link on first paint', () => {
    const next = withViewLoaded(initialLandingState, {
      theme: 'dark',
      hubUrl: 'https://app.kro.example',
    })
    expect(next.theme).toBe('dark')
    expect(next.hubUrl).toBe('https://app.kro.example')
  })

  it('leaves the reader position alone — a re-mount mid-page keeps the FAQ and the sections seen', () => {
    const next = withViewLoaded(landingStateMocks.midPage, {
      theme: 'light',
      hubUrl: '/my-day',
    })
    expect(next.faqOpenId).toBe('free')
    expect(next.viewedSectionIds).toEqual(
      landingStateMocks.midPage.viewedSectionIds,
    )
  })

  it('returns a brand-new object and never mutates its input', () => {
    const next = withViewLoaded(initialLandingState, {
      theme: 'dark',
      hubUrl: '/x',
    })
    expect(next).not.toBe(initialLandingState)
    expect(initialLandingState.theme).toBe('light')
  })
})

describe('withSectionViewed', () => {
  it('makes a first-seen section both active and viewed', () => {
    const next = withSectionViewed(initialLandingState, 'the-loop')
    expect(next.activeSectionId).toBe('the-loop')
    expect(next.viewedSectionIds).toEqual(['the-loop'])
  })

  it('never records an id twice — scrolling back up does not re-count a section', () => {
    const once = withSectionViewed(initialLandingState, 'focus')
    const twice = withSectionViewed(once, 'focus')
    expect(twice.viewedSectionIds).toEqual(['focus'])
  })

  it('still moves the active section when the id was already viewed', () => {
    const next = withSectionViewed(landingStateMocks.midPage, 'top')
    expect(next.activeSectionId).toBe('top')
    expect(next.viewedSectionIds).toHaveLength(3)
  })
})

describe('withFaqOpened / withFaqClosed', () => {
  it('opens one entry', () => {
    expect(withFaqOpened(initialLandingState, 'data').faqOpenId).toBe('data')
  })

  it('opening a second entry replaces the first — one open at a time', () => {
    expect(withFaqOpened(landingStateMocks.midPage, 'offline').faqOpenId).toBe(
      'offline',
    )
  })

  it('closing is a no-op when nothing is open', () => {
    expect(withFaqClosed(initialLandingState).faqOpenId).toBeNull()
    expect(withFaqClosed(landingStateMocks.midPage).faqOpenId).toBeNull()
  })
})

describe('withNavToggled', () => {
  it('opens a closed menu', () => {
    expect(withNavToggled(initialLandingState).navOpen).toBe(true)
  })

  it('closes an open menu', () => {
    expect(withNavToggled(landingStateMocks.navOpen).navOpen).toBe(false)
  })

  it('toggling twice returns to the start', () => {
    expect(withNavToggled(withNavToggled(initialLandingState))).toEqual(
      initialLandingState,
    )
  })
})

describe('withTheme', () => {
  it('records the theme the document now shows', () => {
    expect(withTheme(initialLandingState, 'dark').theme).toBe('dark')
  })

  it('is a value no-op when the theme is unchanged', () => {
    expect(withTheme(landingStateMocks.dark, 'dark')).toEqual(
      landingStateMocks.dark,
    )
  })

  it('touches nothing but the theme', () => {
    const next = withTheme(landingStateMocks.midPage, 'dark')
    expect({ ...next, theme: 'light' }).toEqual(landingStateMocks.midPage)
  })
})
