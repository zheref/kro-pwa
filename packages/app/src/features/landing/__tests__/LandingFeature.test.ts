import { describe, expect, it } from 'vitest'
import {
  initialLandingState,
  landingSlice,
  onSectionViewed,
  onThemeApplied,
  onViewLoaded,
  userDidCloseFaq,
  userDidOpenFaq,
  userDidToggleNav,
} from '../LandingFeature'
import { landingStateMocks } from '../LandingMocks'
import { userDidToggleThemeThunk } from '../LandingProducer'
import { LandingExceptions } from '../LandingException'

const reduce = landingSlice.reducer

describe('landing reducers', () => {
  describe('onViewLoaded', () => {
    it('first mount — stamps the theme and the hub link', () => {
      const next = reduce(
        initialLandingState,
        onViewLoaded({ theme: 'dark', hubUrl: 'https://app.kro.example' }),
      )
      expect(next.theme).toBe('dark')
      expect(next.hubUrl).toBe('https://app.kro.example')
    })
    it('keeps the default hub when the page is given the default', () => {
      expect(
        reduce(
          initialLandingState,
          onViewLoaded({ theme: 'light', hubUrl: '/my-day' }),
        ).hubUrl,
      ).toBe('/my-day')
    })
    it('a second load does not clear the sections already seen', () => {
      const next = reduce(
        landingStateMocks.midPage,
        onViewLoaded({ theme: 'light', hubUrl: '/my-day' }),
      )
      expect(next.viewedSectionIds).toHaveLength(3)
    })
  })

  describe('onSectionViewed', () => {
    it('records and activates a section', () => {
      const next = reduce(
        initialLandingState,
        onSectionViewed({ id: 'the-loop' }),
      )
      expect(next.activeSectionId).toBe('the-loop')
      expect(next.viewedSectionIds).toEqual(['the-loop'])
    })
    it('dedupes a repeat view', () => {
      const next = reduce(
        landingStateMocks.midPage,
        onSectionViewed({ id: 'platforms' }),
      )
      expect(next.viewedSectionIds).toHaveLength(3)
    })
    it('moves the active section back when the reader scrolls up', () => {
      expect(
        reduce(landingStateMocks.midPage, onSectionViewed({ id: 'top' }))
          .activeSectionId,
      ).toBe('top')
    })
  })

  describe('FAQ events', () => {
    it('userDidOpenFaq opens an entry', () => {
      expect(
        reduce(initialLandingState, userDidOpenFaq({ id: 'data' })).faqOpenId,
      ).toBe('data')
    })
    it('userDidOpenFaq on another entry swaps the open one', () => {
      expect(
        reduce(landingStateMocks.midPage, userDidOpenFaq({ id: 'todo' }))
          .faqOpenId,
      ).toBe('todo')
    })
    it('userDidCloseFaq with nothing open is a no-op', () => {
      expect(reduce(initialLandingState, userDidCloseFaq())).toEqual(
        initialLandingState,
      )
    })
    it('userDidCloseFaq closes the open entry', () => {
      expect(
        reduce(landingStateMocks.midPage, userDidCloseFaq()).faqOpenId,
      ).toBeNull()
    })
  })

  describe('userDidToggleNav', () => {
    it('opens the menu', () => {
      expect(reduce(initialLandingState, userDidToggleNav()).navOpen).toBe(true)
    })
    it('closes the menu', () => {
      expect(
        reduce(landingStateMocks.navOpen, userDidToggleNav()).navOpen,
      ).toBe(false)
    })
    it('leaves the active section alone', () => {
      expect(
        reduce(landingStateMocks.navOpen, userDidToggleNav()).activeSectionId,
      ).toBe('focus')
    })
  })

  describe('onThemeApplied', () => {
    it('records a theme read elsewhere', () => {
      expect(
        reduce(initialLandingState, onThemeApplied({ theme: 'dark' })).theme,
      ).toBe('dark')
    })
    it('is idempotent', () => {
      expect(
        reduce(landingStateMocks.dark, onThemeApplied({ theme: 'dark' })),
      ).toEqual(landingStateMocks.dark)
    })
    it('can flip back to light', () => {
      expect(
        reduce(landingStateMocks.dark, onThemeApplied({ theme: 'light' }))
          .theme,
      ).toBe('light')
    })
  })
})

describe('landing extraReducers (the toggle Producer)', () => {
  it('a written preference moves the toggle to the new theme', () => {
    const action = userDidToggleThemeThunk.fulfilled(
      { ok: true, value: 'dark' },
      'req',
      undefined,
    )
    expect(reduce(initialLandingState, action).theme).toBe('dark')
  })

  it('a refused write leaves the toggle where it was', () => {
    const action = userDidToggleThemeThunk.fulfilled(
      { ok: false, error: LandingExceptions.themeUnavailable() },
      'req',
      undefined,
    )
    expect(reduce(landingStateMocks.dark, action)).toEqual(
      landingStateMocks.dark,
    )
  })

  it('the defensive rejected arm changes nothing, aborted or not', () => {
    const failed = userDidToggleThemeThunk.rejected(
      new Error('boom'),
      'req',
      undefined,
    )
    const aborted = userDidToggleThemeThunk.rejected(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
      'req',
      undefined,
    )
    expect(reduce(landingStateMocks.dark, failed)).toEqual(
      landingStateMocks.dark,
    )
    expect(reduce(landingStateMocks.dark, aborted)).toEqual(
      landingStateMocks.dark,
    )
  })
})
