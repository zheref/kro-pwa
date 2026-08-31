/**
 * The settings slice's state transitions (`RC-4`, `UZF-10`) — canon's
 * `SettingsFeature` mutations and `IntegrationsShifters`' four `apply…`
 * functions.
 *
 * Every one is pure: it takes the current state plus explicit arguments and
 * returns a brand-new object. No clock, no randomness, no store read — a
 * timestamp or an id arrives as an argument or not at all.
 */
import type { SettingValue } from '@kro/core'
import type { SettingsException } from './SettingsException'
import type { SettingsSectionId } from './SettingsSection'
import type {
  GoogleConnectionState,
  SettingsState,
} from './SettingsState'

/** The snapshot read started. Clears a previous failure so a retry is clean. */
export const withPreferencesLoading = (state: SettingsState): SettingsState => ({
  ...state,
  load: { kind: 'loading' },
})

/**
 * The snapshot arrived. Replaces `values` wholesale rather than merging: a
 * merge would keep a key the store no longer has, which is how a wiped
 * preference (canon's sign-out clear) survives on screen.
 */
export const withPreferencesLoaded = (
  state: SettingsState,
  values: Readonly<Record<string, SettingValue | null>>,
): SettingsState => ({
  ...state,
  load: { kind: 'loaded' },
  values,
})

export const withPreferencesFailed = (
  state: SettingsState,
  exception: SettingsException,
): SettingsState => ({
  ...state,
  load: { kind: 'failed', exception },
})

/**
 * One option's value changed.
 *
 * Canon's General/Session panes write through a `@Binding` and persist on
 * change; the value the user sees is the value in the form. Here the write goes
 * through a Producer and the *accepted* value comes back here — so a rejected
 * write (a value the option's declared shape refuses) leaves the previous one
 * on screen rather than showing something the store did not take.
 *
 * The end-≤-start case is deliberately **not** a rejection: canon's spec says
 * the values persist as entered and an inline warning appears, so both times
 * are stored and `SettingsSelectors.selectWorkingHoursValid` reports the state.
 */
export const withSettingValue = (
  state: SettingsState,
  key: string,
  value: SettingValue | null,
): SettingsState => ({
  ...state,
  values: { ...state.values, [key]: value },
})

/** The user opened a section from the hub. */
export const withPaneOpened = (
  state: SettingsState,
  section: SettingsSectionId,
): SettingsState => ({
  ...state,
  pane: { kind: 'section', section },
})

/** Back to the hub — canon's `NavigationStack` pop. */
export const withPaneClosed = (state: SettingsState): SettingsState => ({
  ...state,
  pane: { kind: 'hub' },
})

/**
 * The Integrations pane learned what this deployment reports.
 *
 * Clears `isBusy` and the previous exception together: an answer, whatever it
 * says, ends the attempt that asked for it.
 */
export const withGoogleConnection = (
  state: SettingsState,
  connection: GoogleConnectionState,
): SettingsState => ({
  ...state,
  google: { ...state.google, connection, isBusy: false, exception: null },
})

/** Canon's `applyConnectionStarted` — the row spins and the error clears. */
export const withGoogleBusy = (state: SettingsState): SettingsState => ({
  ...state,
  google: { ...state.google, isBusy: true, exception: null },
})

/**
 * Canon's `applyConnectionFailed` — the spinner stops and the error shows. The
 * connection itself is untouched: a failed *attempt* says nothing about the
 * grant that was already there.
 */
export const withGoogleFailed = (
  state: SettingsState,
  exception: SettingsException,
): SettingsState => ({
  ...state,
  google: { ...state.google, isBusy: false, exception },
})

/** The `googleCalendar` flag, resolved at load. */
export const withGoogleEnabled = (
  state: SettingsState,
  isEnabled: boolean,
): SettingsState => ({
  ...state,
  google: { ...state.google, isEnabled },
})

/** The auth surface was asked for, from one of its two entry points. */
export const withAuthPresented = (
  state: SettingsState,
  origin: 'profilePopover' | 'settingsHub',
): SettingsState => ({
  ...state,
  authPresentation: { kind: 'presented', origin },
})

export const withAuthDismissed = (state: SettingsState): SettingsState => ({
  ...state,
  authPresentation: { kind: 'hidden' },
})
