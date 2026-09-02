/**
 * The settings slice's derived reads (`RC-5`, `UZF-11`).
 *
 * Every one is `createSelector` over `RootState` and reads nothing but state —
 * no clock, no service. A `useAppSelector` callback in a Page may do an O(1)
 * field read; anything derived is here.
 *
 * Two of these compose across slices, which is exactly what `RC-20` sanctions:
 * the hub's sync footer is `auth`'s `settingsSync` (KC-IS-#31 owns the sync
 * state machine) and the profile row's identity is `auth`'s session. Neither
 * reaches into the other slice's shape — both go through the `auth` feature's
 * own exported Selectors.
 */
import {
  type SettingOption,
  type SettingValue,
  assertNever,
  isWorkingHoursRangeValid,
  settingOptionForKey,
  workingHoursEndOption,
  workingHoursStartOption,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import { selectSettingsSyncState } from '../auth/AuthSelectors'
import type { SettingsException } from './SettingsException'
import { type IntegrationRow, integrationRows } from './SettingsIntegrations'
import {
  type SettingsSection,
  SettingsHubGroup,
  type SettingsSectionId,
  preferencesHubSectionsFor,
  settingsSectionsIn,
} from './SettingsSection'
import type {
  AuthPresentationState,
  GoogleIntegrationState,
  SettingsLoadState,
  SettingsState,
} from './SettingsState'

const slice = (state: RootState): SettingsState => state.settings

export const selectSettingsLoad = createSelector(
  [slice],
  (settings): SettingsLoadState => settings.load,
)

/** Whether the stored values arrived. Strictly `loaded` — not `failed`. */
export const selectIsSettingsLoaded = createSelector(
  [selectSettingsLoad],
  (load) => load.kind === 'loaded',
)

/**
 * Whether the form may be edited — canon's `isLoaded` guard, read for what it
 * is *for*.
 *
 * Canon disables the form until the values arrive, *"so an edit made in the
 * brief pre-load window isn't dropped by the persistence guard and then
 * overwritten by the load"*. The thing being guarded against is **a load still
 * in flight**, so the predicate is "the read has settled", not "the read
 * succeeded".
 *
 * That distinction is load-bearing: canon's own *Load failed* state says the
 * screen *"falls back to defaults and stays fully editable; edits still save"*.
 * Keying the form off `loaded` alone would contradict it — a device whose
 * preference store cannot be read would show every default and let the user
 * change none of them. (Reported by Copilot on KC-PR-#70.)
 */
export const selectIsSettingsEditable = createSelector(
  [selectSettingsLoad],
  (load) => load.kind === 'loaded' || load.kind === 'failed',
)

export const selectSettingsException = createSelector(
  [slice],
  (settings): SettingsException | null =>
    settings.load.kind === 'failed'
      ? settings.load.exception
      : settings.google.exception,
)

/** The copy a banner shows, derived from `kind` — never read from `message`. */
export const selectSettingsErrorCopy = createSelector(
  [selectSettingsException],
  (exception): string | null => {
    if (exception === null) return null
    switch (exception.kind) {
      case 'preferencesUnavailable':
        return 'Your preferences could not be read on this device. Defaults are shown.'
      case 'preferenceRejected':
        return 'That value could not be saved. The previous one is still in effect.'
      case 'integrationUnconfigured':
        return 'Google Calendar is not configured for this deployment.'
      case 'integrationUnavailable':
        return 'The connection could not be changed. Please try again.'
      default:
        return assertNever(exception)
    }
  },
)

/** The whole snapshot. Consumed by `selectSettingValue` and by the panes. */
export const selectSettingValues = createSelector(
  [slice],
  (settings): Readonly<Record<string, SettingValue | null>> => settings.values,
)

/**
 * One option's value for rendering: the snapshot's, or the option's declared
 * default while the snapshot has not arrived.
 *
 * A plain function of the snapshot rather than a selector factory, because a
 * per-option `createSelector` would build one memoized selector per row and
 * defeat the memoization it was meant to provide.
 */
export const settingValueIn = (
  values: Readonly<Record<string, SettingValue | null>>,
  option: SettingOption,
): SettingValue | null =>
  option.key in values ? (values[option.key] ?? null) : option.defaultValue

/**
 * Canon's *"the section warns when the end time is not after the start time"* —
 * strictly after, so an empty day is invalid rather than a zero-length edge
 * case waved through. The rule itself is `@kro/core`'s; this only feeds it the
 * two current values.
 */
export const selectWorkingHoursValid = createSelector(
  [selectSettingValues],
  (values): boolean => {
    const start = settingValueIn(values, workingHoursStartOption)
    const end = settingValueIn(values, workingHoursEndOption)
    if (typeof start !== 'number' || typeof end !== 'number') return true
    return isWorkingHoursRangeValid(start, end)
  },
)

export const selectSettingsPane = createSelector(
  [slice],
  (settings) => settings.pane,
)

/** Which section is open, or `null` for the hub. */
export const selectOpenSection = createSelector(
  [selectSettingsPane],
  (pane): SettingsSectionId | null =>
    pane.kind === 'section' ? pane.section : null,
)

export const selectGoogleIntegration = createSelector(
  [slice],
  (settings): GoogleIntegrationState => settings.google,
)

/** Canon's `IntegrationsFeature.State.items`. */
export const selectIntegrationRows = createSelector(
  [selectGoogleIntegration],
  (google): readonly IntegrationRow[] =>
    integrationRows({
      connection: google.connection,
      isBusy: google.isBusy,
      isGoogleEnabled: google.isEnabled,
    }),
)

export const selectAuthPresentation = createSelector(
  [slice],
  (settings): AuthPresentationState => settings.authPresentation,
)

export const selectIsAuthPresented = createSelector(
  [selectAuthPresentation],
  (presentation) => presentation.kind === 'presented',
)

// ---------------------------------------------------------------------------
// The hub
// ---------------------------------------------------------------------------

/*
 * The hub's three groups: Profile and Account are constants (they derive from
 * the section table and from no state). Preferences is a Selector because
 * Appearance is gated on `appearanceThemes`.
 */

/** Canon's lone top row. The table declares exactly one; `?? …` is unreachable. */
export const profileHubSection: SettingsSection = settingsSectionsIn(
  SettingsHubGroup.profile,
)[0] ?? {
  id: 'profile',
  title: 'Profile',
  glyph: 'person.crop.circle',
  group: SettingsHubGroup.profile,
  settingGroup: null,
}

export const preferencesHubSections: readonly SettingsSection[] =
  preferencesHubSectionsFor(true)

export const selectIsAppearanceThemesEnabled = createSelector(
  [slice],
  (settings): boolean => settings.isAppearanceThemesEnabled,
)

export const selectPreferencesHubSections = createSelector(
  [selectIsAppearanceThemesEnabled],
  preferencesHubSectionsFor,
)

export const accountHubSections: readonly SettingsSection[] =
  settingsSectionsIn(SettingsHubGroup.account)

/**
 * The hub's sync footer — canon's `SettingsHubSyncStatus`, built from the
 * `auth` slice's `settingsSync` state (KC-IS-#31).
 *
 * `null` hides the footer entirely, which is canon's `syncStatus: nil`: before
 * anything has been attempted there is nothing truthful to say.
 */
export interface SettingsSyncFooter {
  readonly title: string
  /** Canon's `isWarning` — the orange tint, paired with its own glyph. */
  readonly isWarning: boolean
  /** Canon's SF Symbol per case. */
  readonly glyph: string
}

export const selectSettingsSyncFooter = createSelector(
  [selectSettingsSyncState],
  (sync): SettingsSyncFooter | null => {
    switch (sync.kind) {
      case 'idle':
        return null
      case 'syncing':
        return {
          title: 'Syncing…',
          isWarning: false,
          glyph: 'arrow.triangle.2.circlepath',
        }
      case 'synced':
        return { title: 'Synced', isWarning: false, glyph: 'checkmark.icloud' }
      case 'offline':
        return {
          title: 'Offline — will sync later',
          isWarning: true,
          glyph: 'icloud.slash',
        }
      case 'signedOut':
        return {
          title: 'Sign in to sync across devices',
          isWarning: false,
          glyph: 'person.crop.circle.badge.questionmark',
        }
      default:
        return assertNever(sync)
    }
  },
)

/** The option a persisted key names, for a Producer's write path. */
export const settingOptionForStorageKey = (key: string): SettingOption | null =>
  settingOptionForKey(key)
