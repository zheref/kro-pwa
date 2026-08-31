/**
 * The settings feature's canned `State` variants (`RC-31`, `UZF-18`).
 *
 * Every story and every render test consumes these rather than building state
 * inline, so the two can never describe different worlds. Each is built from
 * `settingsSlice.getInitialState()` and from the **schema's own defaults**, not
 * from a hand-typed value table — a mock that disagreed with
 * `SettingOptions.ts` would make a green suite prove nothing.
 */
import { type SettingValue, allSettingOptions } from '@kro/core'
import { settingsSlice } from './SettingsFeature'
import { SettingsExceptions } from './SettingsException'
import { SettingsSectionId } from './SettingsSection'
import type { SettingsState } from './SettingsState'

const base: SettingsState = settingsSlice.getInitialState()

/** Every declared option at its declared default — the first-launch snapshot. */
export const defaultSettingValues: Readonly<
  Record<string, SettingValue | null>
> = Object.fromEntries(
  allSettingOptions.map((option) => [option.key, option.defaultValue]),
)

/**
 * The default snapshot with a few keys changed.
 *
 * A function rather than an inline spread so the result keeps the *record*
 * type: an object literal spread narrows to the keys it names, and a consumer
 * indexing it by a variable key would then have to cast.
 */
const withValues = (
  overrides: Readonly<Record<string, SettingValue | null>>,
): Readonly<Record<string, SettingValue | null>> => ({
  ...defaultSettingValues,
  ...overrides,
})

const loaded: SettingsState = {
  ...base,
  load: { kind: 'loaded' },
  values: defaultSettingValues,
  google: { ...base.google, isEnabled: true, connection: { kind: 'disconnected' } },
}

export const SettingsMocks = {
  /** Before the snapshot has been asked for. */
  idle: base,

  /** The snapshot is being read. */
  loading: { ...base, load: { kind: 'loading' } } satisfies SettingsState,

  /** Loaded, on the hub, Google configured but not connected. */
  loaded,

  /** The store could not be read; defaults show and the form stays editable. */
  loadFailed: {
    ...base,
    load: {
      kind: 'failed',
      exception: SettingsExceptions.preferencesUnavailable('quota exceeded'),
    },
    values: defaultSettingValues,
  } satisfies SettingsState,

  /** The General pane, open. */
  generalPane: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.general },
  } satisfies SettingsState,

  /**
   * The General pane with the end time before the start — canon's inline
   * warning, with both values persisting exactly as entered.
   */
  generalPaneInvalidHours: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.general },
    values: withValues({
      'general.workingHoursStart': 18 * 60,
      'general.workingHoursEnd': 9 * 60,
    }),
  } satisfies SettingsState,

  /** The Session pane, tuned away from every default. */
  sessionPaneTuned: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.sessionPreferences },
    values: withValues({
      'session.defaultDuration': 45,
      'session.defaultBreakDuration': 10,
      'session.enableStopwatch': false,
      'session.autoStartBreak': true,
      'session.soundOnEnd': false,
    }),
  } satisfies SettingsState,

  /** Integrations, with Google offering a first connection. */
  integrationsDisconnected: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
  } satisfies SettingsState,

  /**
   * Integrations on a deployment with no Google client — the honest state the
   * epic's `unconfigured` env produces.
   */
  integrationsUnconfigured: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
    google: {
      ...loaded.google,
      connection: {
        kind: 'unconfigured',
        missing: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
    },
  } satisfies SettingsState,

  /** Integrations with a live grant. */
  integrationsConnected: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
    google: { ...loaded.google, connection: { kind: 'connected' } },
  } satisfies SettingsState,

  /** A grant that stopped working — KC-IS-#33's fourth state. */
  integrationsNeedsReconnect: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
    google: { ...loaded.google, connection: { kind: 'needsReconnect' } },
  } satisfies SettingsState,

  /** A connect attempt in flight — canon's `isConnecting` spinner. */
  integrationsBusy: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
    google: { ...loaded.google, isBusy: true },
  } satisfies SettingsState,

  /** The disconnect call failed; the grant is untouched and the row says so. */
  integrationsFailed: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.integrations },
    google: {
      ...loaded.google,
      connection: { kind: 'connected' },
      exception: SettingsExceptions.integrationUnavailable('502'),
    },
  } satisfies SettingsState,

  /** The Profile pane. */
  profilePane: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.profile },
  } satisfies SettingsState,

  /** The Subscription pane — canon's row with no flow. */
  subscriptionPane: {
    ...loaded,
    pane: { kind: 'section', section: SettingsSectionId.subscription },
  } satisfies SettingsState,

  /** The auth surface, opened from the profile popover. */
  authPresented: {
    ...loaded,
    authPresentation: { kind: 'presented', origin: 'profilePopover' },
  } satisfies SettingsState,
} as const
