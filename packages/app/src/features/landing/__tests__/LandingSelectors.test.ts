import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { landingStateMocks } from '../LandingMocks'
import type { LandingState } from '../LandingFeature'
import {
  selectActiveSectionId,
  selectFaqOpenId,
  selectHubUrl,
  selectIsNavOpen,
  selectPlatformRequest,
  selectTheme,
  selectViewedCount,
} from '../LandingSelectors'

/** Only the slice a Selector reads is built; nothing here is a real store. */
const rootWith = (landing: LandingState): RootState =>
  ({ landing }) as unknown as RootState

describe('landing selectors', () => {
  describe('selectActiveSectionId', () => {
    it('is null before anything has been seen', () => {
      expect(
        selectActiveSectionId(rootWith(landingStateMocks.initial)),
      ).toBeNull()
    })
    it('names the section in view mid-page', () => {
      expect(selectActiveSectionId(rootWith(landingStateMocks.midPage))).toBe(
        'platforms',
      )
    })
    it('follows the menu state fixture', () => {
      expect(selectActiveSectionId(rootWith(landingStateMocks.navOpen))).toBe(
        'focus',
      )
    })
  })

  describe('selectFaqOpenId', () => {
    it('is null with every entry closed', () => {
      expect(selectFaqOpenId(rootWith(landingStateMocks.initial))).toBeNull()
    })
    it('names the open entry', () => {
      expect(selectFaqOpenId(rootWith(landingStateMocks.midPage))).toBe('free')
    })
    it('is unaffected by the theme', () => {
      expect(selectFaqOpenId(rootWith(landingStateMocks.dark))).toBeNull()
    })
  })

  describe('selectIsNavOpen', () => {
    it('is false on first paint', () => {
      expect(selectIsNavOpen(rootWith(landingStateMocks.initial))).toBe(false)
    })
    it('is true with the menu open', () => {
      expect(selectIsNavOpen(rootWith(landingStateMocks.navOpen))).toBe(true)
    })
    it('is false mid-page', () => {
      expect(selectIsNavOpen(rootWith(landingStateMocks.midPage))).toBe(false)
    })
  })

  describe('selectTheme', () => {
    it('defaults to light', () => {
      expect(selectTheme(rootWith(landingStateMocks.initial))).toBe('light')
    })
    it('reads dark', () => {
      expect(selectTheme(rootWith(landingStateMocks.dark))).toBe('dark')
    })
    it('is memoised on an unchanged slice', () => {
      const root = rootWith(landingStateMocks.dark)
      expect(selectTheme(root)).toBe(selectTheme(root))
    })
  })

  describe('selectHubUrl', () => {
    it('is the default hub route first', () => {
      expect(selectHubUrl(rootWith(landingStateMocks.initial))).toBe('/my-day')
    })
    it('is the other origin when the shell gave one', () => {
      expect(selectHubUrl(rootWith(landingStateMocks.dark))).toBe(
        'https://app.kro.example',
      )
    })
    it('is stable mid-page', () => {
      expect(selectHubUrl(rootWith(landingStateMocks.midPage))).toBe('/my-day')
    })
  })

  describe('selectViewedCount', () => {
    it('is zero for a fresh visit', () => {
      expect(selectViewedCount(rootWith(landingStateMocks.initial))).toBe(0)
    })
    it('counts the distinct sections seen', () => {
      expect(selectViewedCount(rootWith(landingStateMocks.midPage))).toBe(3)
    })
    it('counts two for the menu fixture', () => {
      expect(selectViewedCount(rootWith(landingStateMocks.navOpen))).toBe(2)
    })
  })

  describe('selectPlatformRequest', () => {
    it('is null before the visitor asks for anything', () => {
      expect(
        selectPlatformRequest(rootWith(landingStateMocks.initial)),
      ).toBeNull()
    })
    it('names the latest platform with its request count', () => {
      expect(
        selectPlatformRequest(rootWith(landingStateMocks.platformRequested)),
      ).toEqual({ platform: 'macos', seq: 2 })
    })
    it('is not disturbed by the menu or theme fixtures', () => {
      expect(selectPlatformRequest(rootWith(landingStateMocks.dark))).toBeNull()
    })
  })
})
