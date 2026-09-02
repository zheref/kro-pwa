/**
 * The settings Producers, driven through the real thunks against stubbed
 * Services injected via `extra` (`RC-54`, `RC-35`) — never a mocked `fetch`.
 */
import {
  FeatureFlags,
  allSettingOptions,
  appearanceOption,
  appearancePaletteOption,
  disabledAssignment,
  makeHardcodedFeatureFlagService,
  sessionDefaultDurationOption,
  workingHoursEndOption,
} from '@kro/core'
import { afterEach, describe, expect, it } from 'vitest'
import { PALETTE_ATTRIBUTE } from '../../../design/system/tokens/appPalette'
import { THEME_ATTRIBUTE } from '../../../design/system/tokens/readToken'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { GoogleCalendarConnections } from '../../../services/googleCalendar/GoogleCalendarConnection'
import { makeStubbedGoogleCalendarService } from '../../../services/googleCalendar/GoogleCalendarService'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import {
  connectGoogleThunk,
  disconnectGoogleThunk,
  loadGoogleConnectionThunk,
  loadSettingsThunk,
  updateSettingThunk,
} from '../SettingsProducer'

const extraWith = (overrides: Partial<ThunkExtra>): ThunkExtra => ({
  ...stubbedThunkExtra,
  ...overrides,
})

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE)
})

describe('loadSettingsThunk', () => {
  it('reads every declared option, resolving stored values and defaults alike', async () => {
    const store = makeStore(
      extraWith({
        localStore: makeInMemoryLocalStore({
          preferences: { 'kro:session.defaultDuration': 45 },
        }),
      }),
    )

    await store.dispatch(loadSettingsThunk())
    const { values, load } = store.getState().settings

    expect(load).toEqual({ kind: 'loaded' })
    expect(Object.keys(values)).toHaveLength(allSettingOptions.length)
    expect(values['session.defaultDuration']).toBe(45)
    // Untouched keys resolve to the schema's own default, not to undefined.
    expect(values['session.defaultBreakDuration']).toBe(5)
  })

  it('resolves the googleCalendar flag in the same pass — enabled at statusQuo', async () => {
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(loadSettingsThunk())

    expect(store.getState().settings.google.isEnabled).toBe(true)
    expect(store.getState().settings.isAppearanceThemesEnabled).toBe(true)
  })

  it('reports the appearanceThemes flag as off when the registry says so', async () => {
    const store = makeStore(
      extraWith({
        featureFlags: makeHardcodedFeatureFlagService({
          overrides: [disabledAssignment(FeatureFlags.appearanceThemes)],
        }),
      }),
    )

    await store.dispatch(loadSettingsThunk())

    expect(store.getState().settings.isAppearanceThemesEnabled).toBe(false)
  })

  it('reports the googleCalendar flag as off when the registry says so', async () => {
    const store = makeStore(
      extraWith({
        featureFlags: makeHardcodedFeatureFlagService({
          overrides: [disabledAssignment(FeatureFlags.googleCalendar)],
        }),
      }),
    )

    await store.dispatch(loadSettingsThunk())

    expect(store.getState().settings.google.isEnabled).toBe(false)
  })

  it('degrades to a typed failure when the store cannot be read at all', async () => {
    const broken = makeInMemoryLocalStore({})
    const store = makeStore(
      extraWith({
        localStore: {
          ...broken,
          preferences: {
            ...broken.preferences,
            get() {
              throw new Error('storage disabled')
            },
          },
        },
      }),
    )

    await store.dispatch(loadSettingsThunk())
    const { load } = store.getState().settings

    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('preferencesUnavailable')
    }
  })
})

describe('updateSettingThunk', () => {
  it('persists an accepted value and reflects what the store took', async () => {
    const localStore = makeInMemoryLocalStore({})
    const store = makeStore(extraWith({ localStore }))

    await store.dispatch(loadSettingsThunk())
    await store.dispatch(
      updateSettingThunk({ key: sessionDefaultDurationOption.key, value: 45 }),
    )

    expect(store.getState().settings.values['session.defaultDuration']).toBe(45)
    expect(localStore.preferences.get('kro:session.defaultDuration')).toBe(45)
  })

  it('refuses a value the option declared shape cannot hold, and says why', async () => {
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(loadSettingsThunk())
    await store.dispatch(
      // A `timeOfDay` stores minutes from midnight; a string is not one.
      updateSettingThunk({ key: workingHoursEndOption.key, value: 'noon' }),
    )

    const { load, values } = store.getState().settings
    expect(load.kind).toBe('failed')
    // The previous value is still what the form shows.
    expect(values[workingHoursEndOption.key]).toBe(17 * 60)
  })

  it('refuses a key no option declares rather than writing an orphan row', async () => {
    const localStore = makeInMemoryLocalStore({})
    const store = makeStore(extraWith({ localStore }))

    await store.dispatch(
      updateSettingThunk({ key: 'general.notAnOption', value: true }),
    )

    expect(localStore.preferences.get('kro:general.notAnOption')).toBeNull()
    expect(store.getState().settings.load.kind).toBe('failed')
  })

  it('stores an out-of-order working-hours pair — canon persists as entered', async () => {
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(loadSettingsThunk())
    await store.dispatch(
      updateSettingThunk({ key: workingHoursEndOption.key, value: 8 * 60 }),
    )

    expect(store.getState().settings.values[workingHoursEndOption.key]).toBe(
      8 * 60,
    )
    expect(store.getState().settings.load.kind).toBe('loaded')
  })

  it('paints a stored theme onto the document', async () => {
    const localStore = makeInMemoryLocalStore({})
    const store = makeStore(extraWith({ localStore }))

    await store.dispatch(loadSettingsThunk())
    await store.dispatch(
      updateSettingThunk({ key: appearanceOption.key, value: 'dark' }),
    )

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
  })

  it('paints a stored palette onto the document', async () => {
    const localStore = makeInMemoryLocalStore({})
    const store = makeStore(extraWith({ localStore }))

    await store.dispatch(loadSettingsThunk())
    await store.dispatch(
      updateSettingThunk({ key: appearancePaletteOption.key, value: 'red' }),
    )

    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe('red')
  })
})

describe('loadGoogleConnectionThunk', () => {
  it('reports a live grant', async () => {
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.connected(['calendar.events']),
        }),
      }),
    )

    await store.dispatch(loadGoogleConnectionThunk())

    // The scope list is deliberately dropped — the pane never reads it.
    expect(store.getState().settings.google.connection).toEqual({
      kind: 'connected',
    })
  })

  it('reports an unconfigured deployment, keeping what is missing', async () => {
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.unconfigured([
            'GOOGLE_CLIENT_ID',
          ]),
        }),
      }),
    )

    await store.dispatch(loadGoogleConnectionThunk())

    expect(store.getState().settings.google.connection).toEqual({
      kind: 'unconfigured',
      missing: ['GOOGLE_CLIENT_ID'],
    })
  })

  it('degrades to a typed failure when the status call does not complete', async () => {
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          failure: new Error('502'),
        }),
      }),
    )

    await store.dispatch(loadGoogleConnectionThunk())

    expect(store.getState().settings.google.exception?.kind).toBe(
      'integrationUnavailable',
    )
  })
})

describe('connectGoogleThunk', () => {
  it('navigates to the authorization route on a configured deployment', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore(
      extraWith({
        navigation,
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.disconnected(),
        }),
      }),
    )

    await store.dispatch(connectGoogleThunk())

    expect(navigation.calls).toEqual([
      { kind: 'navigate', path: '/api/google/connect' },
    ])
  })

  it('refuses to navigate when the deployment has no Google client', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore(
      extraWith({
        navigation,
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.unconfigured([
            'GOOGLE_CLIENT_ID',
          ]),
        }),
      }),
    )

    await store.dispatch(connectGoogleThunk())

    expect(navigation.calls).toEqual([])
    expect(store.getState().settings.google.exception?.kind).toBe(
      'integrationUnconfigured',
    )
  })

  it('reports a failure rather than navigating when the status call throws', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeStore(
      extraWith({
        navigation,
        googleCalendar: makeStubbedGoogleCalendarService({
          failure: new Error('offline'),
        }),
      }),
    )

    await store.dispatch(connectGoogleThunk())

    expect(navigation.calls).toEqual([])
    expect(store.getState().settings.google.exception?.kind).toBe(
      'integrationUnavailable',
    )
  })
})

describe('disconnectGoogleThunk', () => {
  it('revokes the grant and re-reads the state rather than assuming it', async () => {
    const calls: string[] = []
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          calls,
          connection: GoogleCalendarConnections.connected(),
        }),
      }),
    )

    await store.dispatch(disconnectGoogleThunk())

    expect(calls).toContain('disconnect')
    expect(calls.filter((call) => call === 'connection')).toHaveLength(1)
  })

  it('leaves the working grant on screen when the revoke fails', async () => {
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.connected(),
        }),
      }),
    )
    await store.dispatch(loadGoogleConnectionThunk())

    const failing = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.connected(),
          failure: new Error('502'),
        }),
      }),
    )
    await failing.dispatch(disconnectGoogleThunk())

    expect(failing.getState().settings.google.exception?.kind).toBe(
      'integrationUnavailable',
    )
  })

  it('stops the spinner whatever the outcome', async () => {
    const store = makeStore(
      extraWith({
        googleCalendar: makeStubbedGoogleCalendarService({
          failure: new Error('502'),
        }),
      }),
    )

    await store.dispatch(disconnectGoogleThunk())

    expect(store.getState().settings.google.isBusy).toBe(false)
  })
})
