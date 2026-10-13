/**
 * The landing page's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Every one reads only `extra` (analytics, and — for the theme — the local
 * preference store), is named as an event (`landing/on…Completed`), and
 * resolves a `Result` instead of throwing. Analytics is counts and timings
 * only: no payload here ever carries what a visitor typed.
 */
import {
  type Result,
  appearanceOption,
  err,
  makePreferences,
  ok,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, ThunkExtra } from '../../library/store'
import type { AnalyticsEventName, AnalyticsProps } from '../../library/store'
import { applyStoredAppearance } from '../../library/storedAppearance'
import type { LandingTheme } from './LandingFeature'
import { type LandingException, LandingExceptions } from './LandingException'

type LandingThunkConfig = { extra: ThunkExtra; state: RootState }

/** Where a call to action sits on the page, for the `placement` prop. */
export type CtaPlacement = 'nav' | 'hero' | 'platforms' | 'final' | 'success'

/** What a call to action opens. */
export type CtaTarget = 'hub' | 'early-access'

/**
 * Track one catalogued event. The analytics Service never throws by contract;
 * the `try` is the Producer's own guarantee that this thunk cannot.
 */
export const trackLandingEventThunk = createAsyncThunk<
  Result<void, LandingException>,
  { name: AnalyticsEventName; props?: AnalyticsProps },
  LandingThunkConfig
>('landing/onEventTrackedCompleted', async ({ name, props }, { extra }) => {
  try {
    extra.analyticsService.track(name, props)
    return ok(undefined)
  } catch {
    return err(LandingExceptions.analyticsUnavailable())
  }
})

/** A call to action was pressed: `cta_open_web` or `cta_early_access`. */
export const userDidTapCtaThunk = createAsyncThunk<
  Result<void, LandingException>,
  { placement: CtaPlacement; target: CtaTarget },
  LandingThunkConfig
>('landing/onCtaTappedCompleted', async ({ placement, target }, { extra }) => {
  try {
    extra.analyticsService.track(
      target === 'hub' ? 'cta_open_web' : 'cta_early_access',
      { placement },
    )
    return ok(undefined)
  } catch {
    return err(LandingExceptions.analyticsUnavailable())
  }
})

/**
 * A section scrolled into view: `section_view`, once per section. The dedupe
 * is a narrow, named read of the ids already viewed — which is why a caller
 * dispatches this BEFORE `onSectionViewed` for the same id.
 */
export const onSectionEnteredThunk = createAsyncThunk<
  Result<void, LandingException>,
  { id: string },
  LandingThunkConfig
>('landing/onSectionEnteredCompleted', async ({ id }, { extra, getState }) => {
  if (getState().landing.viewedSectionIds.includes(id)) return ok(undefined)
  try {
    extra.analyticsService.track('section_view', { section: id })
    return ok(undefined)
  } catch {
    return err(LandingExceptions.analyticsUnavailable())
  }
})

/**
 * The light/dark toggle. It writes the SAME preference the Appearance pane
 * writes (`general.appearance`) and paints it through `applyStoredAppearance`,
 * so the root's AppearanceSync — the app's one theme writer — sees an ordinary
 * preference change and never fights the page. The opposite of the theme the
 * toggle currently shows is a narrow, named read of this slice.
 */
export const userDidToggleThemeThunk = createAsyncThunk<
  Result<LandingTheme, LandingException>,
  void,
  LandingThunkConfig
>('landing/onThemeToggleCompleted', async (_argument, { extra, getState }) => {
  const next: LandingTheme =
    getState().landing.theme === 'dark' ? 'light' : 'dark'
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    if (!preferences.write(appearanceOption, next)) {
      return err(LandingExceptions.themeUnavailable())
    }
    applyStoredAppearance(extra.localStore)
  } catch {
    return err(LandingExceptions.themeUnavailable())
  }
  try {
    extra.analyticsService.track('theme_toggle', { theme: next })
  } catch {
    // The theme already changed; a lost event is not a failed toggle.
  }
  return ok(next)
})

/** A visitor voted for a platform that is not available yet: `platform_vote`. */
export const userDidVotePlatformThunk = createAsyncThunk<
  Result<void, LandingException>,
  { platform: string },
  LandingThunkConfig
>('landing/onPlatformVoteCompleted', async ({ platform }, { extra }) => {
  try {
    extra.analyticsService.track('platform_vote', { platform })
    return ok(undefined)
  } catch {
    return err(LandingExceptions.analyticsUnavailable())
  }
})
