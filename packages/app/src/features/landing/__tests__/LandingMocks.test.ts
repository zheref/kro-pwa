import { describe, expect, it } from 'vitest'
import { makeEarlyAccessStore } from '../../earlyAccess/EarlyAccessMocks'
import { initialLandingState } from '../LandingFeature'
import {
  landingStateMocks,
  landingValueProps,
  makeLandingStore,
  noopLandingCallbacks,
} from '../LandingMocks'
import { LANDING_OBSERVED_IDS } from '../LandingSections'

describe('landingStateMocks', () => {
  it('initial is the slice initial state', () => {
    expect(landingStateMocks.initial).toEqual(initialLandingState)
  })

  it('midPage has sections seen that really exist on the page, and one open FAQ', () => {
    for (const id of landingStateMocks.midPage.viewedSectionIds) {
      expect(LANDING_OBSERVED_IDS).toContain(id)
    }
    expect(landingStateMocks.midPage.faqOpenId).not.toBeNull()
  })

  it('navOpen and dark each move exactly the field they are named for', () => {
    expect(landingStateMocks.navOpen.navOpen).toBe(true)
    expect(landingStateMocks.dark.theme).toBe('dark')
    expect(landingStateMocks.dark.navOpen).toBe(false)
  })
})

describe('landingValueProps / noopLandingCallbacks', () => {
  it('reads the four value props from a state', () => {
    expect(landingValueProps(landingStateMocks.midPage)).toEqual({
      activeSectionId: 'platforms',
      faqOpenId: 'free',
      theme: 'light',
      hubUrl: '/my-day',
    })
  })

  it('every callback is callable and returns nothing', () => {
    for (const callback of Object.values(noopLandingCallbacks)) {
      expect((callback as () => unknown)()).toBeUndefined()
    }
  })

  it('makeLandingStore builds on the one makeStore with both slices registered', () => {
    const { store } = makeLandingStore()
    const state = store.getState()
    expect(state.landing).toEqual(initialLandingState)
    expect(state.earlyAccess.submit).toEqual({ kind: 'idle' })
  })

  it('makeLandingStore is the early-access store, so a story of either page shares one helper', () => {
    expect(makeLandingStore).toBe(makeEarlyAccessStore)
  })
})
