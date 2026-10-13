/**
 * The web product's shipping overrides — what Kro for Web turns on beyond
 * canon's `statusQuoSet` (`UZF-22`). One list, read by two consumers:
 * `packages/app`'s `liveThunkExtra` (the running app's flag Provider) and
 * `apps/web`'s root route, which decides between the landing page and the
 * `/my-day` redirect before a client store exists. Keeping the list here, in
 * the platform-free tier, is what lets a Server Component read the same
 * registry the app runs on without importing the live services.
 *
 * Each override is a product call recorded beside the flag it moves; the
 * flag stays the kill switch. `statusQuoSet` is the baseline every build starts
 * from, so a flag absent from this list keeps canon's state.
 */
import { FeatureFlags } from './FeatureFlag'
import {
  type FeatureFlagAssignment,
  enabledAssignment,
} from './FeatureFlagAssignment'
import {
  type FeatureFlagService,
  type FeatureFlagServiceOptions,
  makeHardcodedFeatureFlagService,
} from './FeatureFlagService'

/**
 * `appearanceThemes` ships **enabled** even though `statusQuoSet` keeps it
 * disabled (Apple's dark launch): Adjust is asked to offer Appearance, so the
 * web extras turn the flag on as a product override.
 */
export const webShippingAppearanceOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.appearanceThemes)

/**
 * `supabaseHosting` — Kro Cloud — ships **enabled**. `statusQuoSet` keeps it
 * disabled because Apple's rollout is remote-flagged; the web has no remote
 * flag service yet and its whole account story (sign in, then see your
 * endeavors) is the cloud, so a signed-in user on a build with the gate shut
 * would sign in to nothing. A build with no Kro Cloud project configured is
 * still local-only: the sync service reports `unavailable` on its own.
 */
export const webShippingSupabaseHostingOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.supabaseHosting)

/**
 * `detailPaneInbox` — the web-only Inbox segment of the trailing pane — ships
 * **enabled** while `statusQuoSet` keeps it off as greenfield. The maintainer
 * asked for captures to land in the pane Inbox; the flag stays the kill switch.
 */
export const webShippingDetailPaneInboxOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.detailPaneInbox)

/**
 * `captureSuggestions` — the web-only suggestions pane above the desktop
 * capture prompt — ships **enabled** while `statusQuoSet` keeps it off as
 * greenfield. The flag stays the kill switch.
 */
export const webShippingCaptureSuggestionsOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.captureSuggestions)

/**
 * `keyboardAccelerators` — the prompt's ⌥ chords, keycaps, key hints and
 * Return-walk, and the quick-action button's Return and letters — ships
 * **enabled** while `statusQuoSet` keeps it off as greenfield.
 */
export const webShippingKeyboardAcceleratorsOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.keyboardAccelerators)

/**
 * `landingPage` — the web-only marketing landing page at `/` and its
 * early-access sign-up — ships **enabled** while `statusQuoSet` dark-launches
 * it. The flag stays the kill switch: off, `/` redirects to `/my-day` as
 * before. The stubbed extra keeps the status quo, so a suite sees the landing
 * surface only when it turns the flag on itself.
 */
export const webShippingLandingPageOverride: FeatureFlagAssignment =
  enabledAssignment(FeatureFlags.landingPage)

/** Every web shipping override, in the order they layer over the baseline. */
export const webShippingOverrides: readonly FeatureFlagAssignment[] = [
  webShippingAppearanceOverride,
  webShippingSupabaseHostingOverride,
  webShippingDetailPaneInboxOverride,
  webShippingCaptureSuggestionsOverride,
  webShippingKeyboardAcceleratorsOverride,
  webShippingLandingPageOverride,
]

/**
 * The web product's shipping flag service: canon's `statusQuo` baseline plus
 * `webShippingOverrides`. `options` layers on top (a debug override store, a
 * `developmentActionsEnabled` seat) exactly as `makeHardcodedFeatureFlagService`
 * takes them; `overrides` passed here are appended AFTER the shipping list, so
 * they win.
 */
export const makeWebShippingFeatureFlagService = (
  options: FeatureFlagServiceOptions = {},
): FeatureFlagService =>
  makeHardcodedFeatureFlagService({
    ...options,
    overrides: [...webShippingOverrides, ...(options.overrides ?? [])],
  })
