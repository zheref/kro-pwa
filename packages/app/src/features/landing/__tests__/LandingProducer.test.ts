import { afterEach, describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import type { AnalyticsService, ThunkExtra } from '../../../library/store'
import { makeRecordingAnalyticsService } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { readStoredAppearance } from '../../settings/applyStoredAppearance'
import { onSectionViewed } from '../LandingFeature'
import {
  onSectionEnteredThunk,
  trackLandingEventThunk,
  userDidTapCtaThunk,
  userDidToggleThemeThunk,
  userDidVotePlatformThunk,
} from '../LandingProducer'

const throwingAnalytics: AnalyticsService = {
  track: () => {
    throw new Error('blocked by an extension')
  },
  identify: () => undefined,
}

const storeWith = (overrides: Partial<ThunkExtra> = {}) => {
  const analytics = makeRecordingAnalyticsService()
  const store = makeStore({
    ...stubbedThunkExtra,
    analyticsService: analytics,
    localStore: makeInMemoryLocalStore(),
    ...overrides,
  })
  return { store, analytics }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('trackLandingEventThunk', () => {
  it('forwards the catalogued event and its props to analytics', async () => {
    const { store, analytics } = storeWith()
    const result = await store.dispatch(
      trackLandingEventThunk({ name: 'page_view', props: { path: '/' } }),
    )
    expect(result.payload).toEqual({ ok: true, value: undefined })
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'page_view', props: { path: '/' } },
    ])
  })

  it('an event with no props is recorded with null props', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(trackLandingEventThunk({ name: 'nav_open' }))
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'nav_open', props: null },
    ])
  })

  it('analytics that throws resolves an analyticsUnavailable err — it never rejects', async () => {
    const { store } = storeWith({ analyticsService: throwingAnalytics })
    const result = await store.dispatch(
      trackLandingEventThunk({ name: 'page_view' }),
    )
    expect(result.type).toBe('landing/onEventTrackedCompleted/fulfilled')
    expect(result.payload).toMatchObject({
      ok: false,
      error: { kind: 'analyticsUnavailable' },
    })
  })
})

describe('userDidTapCtaThunk', () => {
  it('a hub tap is cta_open_web with its placement', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(
      userDidTapCtaThunk({ placement: 'hero', target: 'hub' }),
    )
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'cta_open_web', props: { placement: 'hero' } },
    ])
  })

  it('an early-access tap is cta_early_access with its placement', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(
      userDidTapCtaThunk({ placement: 'final', target: 'early-access' }),
    )
    expect(analytics.calls).toEqual([
      {
        kind: 'track',
        event: 'cta_early_access',
        props: { placement: 'final' },
      },
    ])
  })

  it('failing analytics is an err, not a throw', async () => {
    const { store } = storeWith({ analyticsService: throwingAnalytics })
    const result = await store.dispatch(
      userDidTapCtaThunk({ placement: 'nav', target: 'hub' }),
    )
    expect(result.payload).toMatchObject({ ok: false })
  })
})

describe('onSectionEnteredThunk', () => {
  it('tracks section_view the first time a section is seen', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(onSectionEnteredThunk({ id: 'the-loop' }))
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'section_view', props: { section: 'the-loop' } },
    ])
  })

  it('does not track a section already viewed — once per id', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(onSectionEnteredThunk({ id: 'focus' }))
    store.dispatch(onSectionViewed({ id: 'focus' }))
    await store.dispatch(onSectionEnteredThunk({ id: 'focus' }))
    expect(analytics.calls).toHaveLength(1)
  })

  it('tracks a different section even after another was viewed', async () => {
    const { store, analytics } = storeWith()
    store.dispatch(onSectionViewed({ id: 'focus' }))
    await store.dispatch(onSectionEnteredThunk({ id: 'privacy' }))
    expect(analytics.calls.map((c) => c.kind === 'track' && c.props)).toEqual([
      { section: 'privacy' },
    ])
  })
})

describe('userDidToggleThemeThunk', () => {
  it('persists the Appearance preference, paints it, tracks it and resolves the new theme', async () => {
    const localStore = makeInMemoryLocalStore()
    const { store, analytics } = storeWith({ localStore })
    const result = await store.dispatch(userDidToggleThemeThunk())
    expect(result.payload).toEqual({ ok: true, value: 'dark' })
    expect(store.getState().landing.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(readStoredAppearance(localStore).theme).toBe('dark')
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'theme_toggle', props: { theme: 'dark' } },
    ])
  })

  it('a second toggle goes back to light', async () => {
    const { store } = storeWith()
    await store.dispatch(userDidToggleThemeThunk())
    const second = await store.dispatch(userDidToggleThemeThunk())
    expect(second.payload).toEqual({ ok: true, value: 'light' })
    expect(store.getState().landing.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('storage that throws resolves themeUnavailable and leaves the toggle where it was', async () => {
    const base = makeInMemoryLocalStore()
    const localStore = {
      ...base,
      preferences: {
        ...base.preferences,
        set: () => {
          throw new Error('storage full')
        },
      },
    }
    const { store, analytics } = storeWith({ localStore })
    const result = await store.dispatch(userDidToggleThemeThunk())
    expect(result.payload).toMatchObject({
      ok: false,
      error: { kind: 'themeUnavailable' },
    })
    expect(store.getState().landing.theme).toBe('light')
    expect(analytics.calls).toEqual([])
  })

  it('a lost analytics event does not fail the toggle', async () => {
    const { store } = storeWith({ analyticsService: throwingAnalytics })
    const result = await store.dispatch(userDidToggleThemeThunk())
    expect(result.payload).toEqual({ ok: true, value: 'dark' })
  })
})

describe('userDidVotePlatformThunk', () => {
  it('records a platform_vote for the chosen platform', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(userDidVotePlatformThunk({ platform: 'android' }))
    expect(analytics.calls).toEqual([
      { kind: 'track', event: 'platform_vote', props: { platform: 'android' } },
    ])
  })

  it('two votes are two events — a vote is not deduped', async () => {
    const { store, analytics } = storeWith()
    await store.dispatch(userDidVotePlatformThunk({ platform: 'windows' }))
    await store.dispatch(userDidVotePlatformThunk({ platform: 'windows' }))
    expect(analytics.calls).toHaveLength(2)
  })

  it('failing analytics is an err, not a throw', async () => {
    const { store } = storeWith({ analyticsService: throwingAnalytics })
    const result = await store.dispatch(
      userDidVotePlatformThunk({ platform: 'windows' }),
    )
    expect(result.payload).toMatchObject({
      ok: false,
      error: { kind: 'analyticsUnavailable' },
    })
  })
})
