/**
 * The settings slice's state — canon `SettingsFeature.State` plus
 * `IntegrationsFeature.State`, collapsed into one shape.
 *
 * Canon composes these as a `StackState` of child reducers because iOS pushes a
 * pane per section. There is no navigation stack here: `/adjust` is one route
 * and the open pane is a field, so a deep link and a back step both resolve to
 * the same value rather than to a stack that has to be replayed.
 *
 * ## Four lifecycles, four discriminated fields (`RC-24`, `UZF-9`)
 *
 * - `load` — has the preference snapshot arrived?
 * - `google` — what does this deployment's Google integration report?
 * - `pane` — which section is open, or the hub.
 * - `authPresentation` — is the auth surface up, and in which mode was it
 *   opened?
 *
 * A failed Google read must not blank the preference form, and an open auth
 * sheet must not make the hub think it is loading. Separate fields make that
 * structural rather than careful.
 *
 * ## `values` is a snapshot, not the store
 *
 * The preference store is `extra.localStore.preferences` — a synchronous
 * `KeyValueStore` a Producer reads (`RC-6`: a component never touches a
 * Service). The slice holds the *snapshot* the Producer read, so a Selector can
 * answer "what is `session.defaultDuration` right now" without I/O, and every
 * write goes back out through a Producer. That is the same shape `EarnFeature`
 * uses for its own preference reads.
 *
 * A key absent from `values` means "not loaded yet", never "unset": an unset
 * option resolves to its declared default at read time, which is exactly what
 * `Preferences.read` already does.
 */
import type { SettingValue } from '@kro/core'
import type { SettingsException } from './SettingsException'
import type { SettingsSectionId } from './SettingsSection'

/** The preference snapshot's lifecycle. */
export type SettingsLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: SettingsException }

/**
 * What this deployment's Google integration reports.
 *
 * The four connection states are the Service's (`GoogleCalendarConnection`,
 * KC-IS-#33), re-declared here rather than imported: a feature module may not
 * import from `services/**` (`RC-6`, enforced by
 * `scripts/check-uzf-boundaries.mjs`), which is the same reason `DoFeature`
 * carries `isGoogleCalendarConnected` instead of the Service's type. The
 * Producer translates at the boundary.
 *
 * `unknown` is the pre-read state and is deliberately distinct from
 * `unconfigured`: a hub that rendered "not set up" before asking would tell
 * every user their deployment is broken for one frame.
 */
export type GoogleConnectionState =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'unconfigured'; readonly missing: readonly string[] }
  | { readonly kind: 'disconnected' }
  | { readonly kind: 'connected' }
  | { readonly kind: 'needsReconnect' }

/** The Integrations pane's own lifecycle. */
export interface GoogleIntegrationState {
  readonly connection: GoogleConnectionState
  /** Canon's `IntegrationItem.isConnecting` — a connect or disconnect in flight. */
  readonly isBusy: boolean
  /** The `googleCalendar` feature flag. Off ⇒ canon omits the row entirely. */
  readonly isEnabled: boolean
  readonly exception: SettingsException | null
}

/** Which pane the surface is showing. */
export type SettingsPaneState =
  | { readonly kind: 'hub' }
  | { readonly kind: 'section'; readonly section: SettingsSectionId }

/**
 * Whether the auth surface is presented, and why it was opened.
 *
 * Canon's `MainFeature` owns the `authSheet` presentation; there is no Main
 * slice reachable from here (`RC-20` forbids reaching into one), so the feature
 * that offers the entry points — the profile popover and the hub's signed-out
 * row — owns the presentation. `origin` exists so dismissing returns the user
 * to what they were doing rather than to a fixed place.
 */
export type AuthPresentationState =
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'presented'
      readonly origin: 'profilePopover' | 'settingsHub'
    }

export interface SettingsState {
  readonly load: SettingsLoadState
  /** The stored value per option key. Absent ⇒ not loaded, never "unset". */
  readonly values: Readonly<Record<string, SettingValue | null>>
  readonly pane: SettingsPaneState
  readonly google: GoogleIntegrationState
  /**
   * Whether the Appearance hub row and pane are offered. Seeded true because
   * kro-pwa ships `appearanceThemes` on; `loadSettingsThunk` overwrites it
   * from the registry so a kill-switch override still hides the section.
   */
  readonly isAppearanceThemesEnabled: boolean
  readonly authPresentation: AuthPresentationState
}

export const initialSettingsState: SettingsState = {
  load: { kind: 'idle' },
  values: {},
  pane: { kind: 'hub' },
  google: {
    connection: { kind: 'unknown' },
    isBusy: false,
    isEnabled: false,
    exception: null,
  },
  isAppearanceThemesEnabled: true,
  authPresentation: { kind: 'hidden' },
}

/**
 * Canon's Subscription pane, which has a row and no flow.
 *
 * `SubscriptionView` takes a plan name and an optional renewal date, and its
 * "Manage Subscription" button is wired to nothing — there is no store, no
 * entitlement check and no purchase in KroApple at this tip. Parity is
 * mirroring that honestly, so the plan name is a constant here rather than a
 * field a nonexistent service would fill.
 */
export const SUBSCRIPTION_PLAN_NAME = 'Free'
