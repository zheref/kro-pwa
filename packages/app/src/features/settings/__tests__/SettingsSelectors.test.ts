/**
 * The settings Selectors, against a hand-built root state — never a live store
 * (`RC-55`).
 *
 * The root is composed from `makeStore(stubbedThunkExtra).getState()` plus the
 * two feature mock sets this suite actually asserts on. That is deliberately
 * not a hand-assembled object literal of twelve `initial…State` values: this
 * feature's Selectors compose across `settings` and `auth`, and a literal would
 * have to be edited by every future slice registration for a suite that says
 * nothing about them. The store is built once, read once, and never dispatched
 * to — so nothing here depends on reducer behaviour.
 */
import { workingHoursEndOption, workingHoursStartOption } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { AuthMocks } from '../../auth/AuthMocks'
import type { AuthState } from '../../auth/AuthState'
import {
  type RootState,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { SettingsExceptions } from '../SettingsException'
import { SettingsMocks, defaultSettingValues } from '../SettingsMocks'
import { IntegrationAction, IntegrationId } from '../SettingsIntegrations'
import { SettingsSectionId } from '../SettingsSection'
import {
  accountHubSections,
  preferencesHubSections,
  profileHubSection,
  selectIntegrationRows,
  selectIsAppearanceThemesEnabled,
  selectIsSettingsEditable,
  selectIsSettingsLoaded,
  selectOpenSection,
  selectPreferencesHubSections,
  selectSettingValues,
  selectSettingsErrorCopy,
  selectSettingsSyncFooter,
  selectWorkingHoursValid,
  settingValueIn,
} from '../SettingsSelectors'
import type { SettingsState } from '../SettingsState'

const emptyRoot: RootState = makeStore(stubbedThunkExtra).getState()

const rootWith = (
  settings: SettingsState,
  auth: AuthState = AuthMocks.signedOut,
): RootState => ({
  ...emptyRoot,
  auth,
  settings,
})

describe('the load lifecycle', () => {
  it('reports not-loaded before the snapshot is asked for', () => {
    expect(selectIsSettingsLoaded(rootWith(SettingsMocks.idle))).toBe(false)
  })

  it('reports not-loaded while the read is in flight', () => {
    expect(selectIsSettingsLoaded(rootWith(SettingsMocks.loading))).toBe(false)
  })

  it('reports loaded once the values arrive', () => {
    expect(selectIsSettingsLoaded(rootWith(SettingsMocks.loaded))).toBe(true)
  })

  it('reports not-loaded when the read failed — the values never arrived', () => {
    expect(selectIsSettingsLoaded(rootWith(SettingsMocks.loadFailed))).toBe(
      false,
    )
  })
})

describe('whether the form may be edited', () => {
  it('locks the form before anything has been read', () => {
    expect(selectIsSettingsEditable(rootWith(SettingsMocks.idle))).toBe(false)
  })

  it('locks it while a read is in flight — canon own pre-load guard', () => {
    expect(selectIsSettingsEditable(rootWith(SettingsMocks.loading))).toBe(
      false,
    )
  })

  it('unlocks it once the values arrive', () => {
    expect(selectIsSettingsEditable(rootWith(SettingsMocks.loaded))).toBe(true)
  })

  it('unlocks it when the read FAILED — canon: defaults show and edits still save', () => {
    // The guard exists to stop an in-flight load overwriting an edit. A failed
    // load is not in flight, so there is nothing left to overwrite.
    expect(selectIsSettingsEditable(rootWith(SettingsMocks.loadFailed))).toBe(
      true,
    )
  })
})

describe('the failure copy is derived from the kind', () => {
  it('tells the user defaults are showing when the store cannot be read', () => {
    expect(selectSettingsErrorCopy(rootWith(SettingsMocks.loadFailed))).toBe(
      'Your preferences could not be read on this device. Defaults are shown.',
    )
  })

  it('reports an integration failure without repeating the transport message', () => {
    const copy = selectSettingsErrorCopy(
      rootWith(SettingsMocks.integrationsFailed),
    )

    expect(copy).toBe('The connection could not be changed. Please try again.')
    expect(copy).not.toContain('502')
  })

  it('says nothing when nothing has failed', () => {
    expect(selectSettingsErrorCopy(rootWith(SettingsMocks.loaded))).toBeNull()
  })

  it('names the deployment for an unconfigured integration', () => {
    const settings: SettingsState = {
      ...SettingsMocks.loaded,
      google: {
        ...SettingsMocks.loaded.google,
        exception: SettingsExceptions.integrationUnconfigured(''),
      },
    }

    expect(selectSettingsErrorCopy(rootWith(settings))).toContain(
      'not configured for this deployment',
    )
  })
})

describe('reading one option value', () => {
  it('answers the snapshot value when the key is present', () => {
    const values = selectSettingValues(rootWith(SettingsMocks.sessionPaneTuned))
    expect(values['session.defaultDuration']).toBe(45)
  })

  it('falls back to the declared default when the key is absent', () => {
    expect(settingValueIn({}, workingHoursStartOption)).toBe(9 * 60)
  })

  it('answers null for a stored null rather than substituting the default', () => {
    expect(
      settingValueIn(
        { 'general.timezone': null },
        {
          ...workingHoursStartOption,
          key: 'general.timezone',
        },
      ),
    ).toBeNull()
  })
})

describe('the working-hours warning', () => {
  it('is silent on the defaults — 09:00 to 17:00', () => {
    expect(selectWorkingHoursValid(rootWith(SettingsMocks.loaded))).toBe(true)
  })

  it('warns when the end is before the start, with both values persisting', () => {
    const root = rootWith(SettingsMocks.generalPaneInvalidHours)

    expect(selectWorkingHoursValid(root)).toBe(false)
    expect(selectSettingValues(root)['general.workingHoursStart']).toBe(18 * 60)
    expect(selectSettingValues(root)['general.workingHoursEnd']).toBe(9 * 60)
  })

  it('warns on an empty day — canon rule is "not after", not "before"', () => {
    const settings: SettingsState = {
      ...SettingsMocks.loaded,
      values: {
        ...defaultSettingValues,
        [workingHoursStartOption.key]: 9 * 60,
        [workingHoursEndOption.key]: 9 * 60,
      },
    }

    expect(selectWorkingHoursValid(rootWith(settings))).toBe(false)
  })

  it('stays silent while the snapshot has not arrived', () => {
    expect(selectWorkingHoursValid(rootWith(SettingsMocks.idle))).toBe(true)
  })
})

describe('the open pane', () => {
  it('is null on the hub', () => {
    expect(selectOpenSection(rootWith(SettingsMocks.loaded))).toBeNull()
  })

  it('names the General pane when it is open', () => {
    expect(selectOpenSection(rootWith(SettingsMocks.generalPane))).toBe(
      SettingsSectionId.general,
    )
  })

  it('names the Integrations pane when it is open', () => {
    expect(
      selectOpenSection(rootWith(SettingsMocks.integrationsDisconnected)),
    ).toBe(SettingsSectionId.integrations)
  })
})

describe('the integration rows', () => {
  it('offers Connect on a configured, unconnected deployment', () => {
    const rows = selectIntegrationRows(
      rootWith(SettingsMocks.integrationsDisconnected),
    )

    expect(rows.find((row) => row.id === IntegrationId.google)?.action).toBe(
      IntegrationAction.connect,
    )
  })

  it('offers nothing pressable on an unconfigured deployment', () => {
    const rows = selectIntegrationRows(
      rootWith(SettingsMocks.integrationsUnconfigured),
    )

    expect(rows.find((row) => row.id === IntegrationId.google)?.action).toBe(
      IntegrationAction.unavailable,
    )
  })

  it('offers Disconnect on a live grant', () => {
    const rows = selectIntegrationRows(
      rootWith(SettingsMocks.integrationsConnected),
    )

    expect(rows.find((row) => row.id === IntegrationId.google)?.action).toBe(
      IntegrationAction.disconnect,
    )
  })
})

describe('the hub sync footer, composed from the auth slice', () => {
  it('hides itself before anything has been attempted', () => {
    expect(
      selectSettingsSyncFooter(
        rootWith(SettingsMocks.loaded, AuthMocks.signedIn),
      ),
    ).toBeNull()
  })

  it('reports a successful sync without a warning tint', () => {
    const footer = selectSettingsSyncFooter(
      rootWith(SettingsMocks.loaded, AuthMocks.settingsSynced),
    )

    expect(footer?.title).toBe('Synced')
    expect(footer?.isWarning).toBe(false)
  })

  it('warns, in canon words, when the last attempt had no connection', () => {
    const footer = selectSettingsSyncFooter(
      rootWith(SettingsMocks.loaded, AuthMocks.settingsOffline),
    )

    expect(footer?.title).toBe('Offline — will sync later')
    expect(footer?.isWarning).toBe(true)
  })

  it('prompts rather than warns when signed out', () => {
    const footer = selectSettingsSyncFooter(
      rootWith(SettingsMocks.loaded, AuthMocks.signedOutWithPendingIntents),
    )

    expect(footer?.title).toBe('Sign in to sync across devices')
    expect(footer?.isWarning).toBe(false)
  })
})

describe('the hub groups', () => {
  it('exposes one profile row', () => {
    expect(profileHubSection.id).toBe(SettingsSectionId.profile)
  })

  it('exposes the six preference rows, Appearance after General', () => {
    expect(preferencesHubSections.map((section) => section.id)).toEqual([
      SettingsSectionId.general,
      SettingsSectionId.appearance,
      SettingsSectionId.planPreferences,
      SettingsSectionId.doPreferences,
      SettingsSectionId.earnPreferences,
      SettingsSectionId.sessionPreferences,
    ])
  })

  it('exposes the two account rows', () => {
    expect(accountHubSections.map((section) => section.id)).toEqual([
      SettingsSectionId.integrations,
      SettingsSectionId.subscription,
    ])
  })
})

describe('Appearance gating', () => {
  it('reports the flag from state', () => {
    expect(
      selectIsAppearanceThemesEnabled(rootWith(SettingsMocks.loaded)),
    ).toBe(true)
  })

  it('lists Appearance on the hub while the flag is on', () => {
    expect(
      selectPreferencesHubSections(rootWith(SettingsMocks.loaded)).map(
        (section) => section.id,
      ),
    ).toContain(SettingsSectionId.appearance)
  })

  it('hides Appearance when the flag is off', () => {
    const off: SettingsState = {
      ...SettingsMocks.loaded,
      isAppearanceThemesEnabled: false,
    }

    expect(
      selectPreferencesHubSections(rootWith(off)).map((section) => section.id),
    ).not.toContain(SettingsSectionId.appearance)
  })
})
