import { describe, expect, it } from 'vitest'
import {
  initialLandingState,
  landingSlice,
  onSectionViewed,
  onViewLoaded,
  userDidCloseFaq,
  userDidFollowNavLink,
  userDidOpenFaq,
  userDidOpenNav,
  userDidRequestPlatform,
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

  describe('userDidOpenNav', () => {
    it('opens a closed menu', () => {
      expect(reduce(initialLandingState, userDidOpenNav()).navOpen).toBe(true)
    })
    it('leaves an open menu open — opening twice is not a close', () => {
      expect(reduce(landingStateMocks.navOpen, userDidOpenNav()).navOpen).toBe(
        true,
      )
    })
    it('leaves the active section alone', () => {
      expect(
        reduce(landingStateMocks.navOpen, userDidOpenNav()).activeSectionId,
      ).toBe('focus')
    })
  })

  describe('userDidFollowNavLink', () => {
    it('closes an open menu after a link is followed', () => {
      expect(
        reduce(landingStateMocks.navOpen, userDidFollowNavLink()).navOpen,
      ).toBe(false)
    })
    it('is a no-op when the menu was already closed (a desktop link tap)', () => {
      expect(reduce(landingStateMocks.midPage, userDidFollowNavLink())).toEqual(
        landingStateMocks.midPage,
      )
    })
    it('leaves the viewed sections alone', () => {
      expect(
        reduce(landingStateMocks.navOpen, userDidFollowNavLink())
          .viewedSectionIds,
      ).toEqual(landingStateMocks.navOpen.viewedSectionIds)
    })
  })

  describe('userDidRequestPlatform', () => {
    it('first ask — records the platform as request 1', () => {
      expect(
        reduce(initialLandingState, userDidRequestPlatform({ platform: 'ios' }))
          .platformRequest,
      ).toEqual({ platform: 'ios', seq: 1 })
    })
    it('asking for the same platform again is a new request', () => {
      expect(
        reduce(
          landingStateMocks.platformRequested,
          userDidRequestPlatform({ platform: 'macos' }),
        ).platformRequest,
      ).toEqual({ platform: 'macos', seq: 3 })
    })
    it('a different platform replaces the earlier ask', () => {
      expect(
        reduce(
          landingStateMocks.platformRequested,
          userDidRequestPlatform({ platform: 'android' }),
        ).platformRequest,
      ).toEqual({ platform: 'android', seq: 3 })
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
