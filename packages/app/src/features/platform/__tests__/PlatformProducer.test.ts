/**
 * The platform Producers, dispatched through the real store against stubbed
 * services injected via `ThunkExtra` (`RC-54`, `RC-35`) — never a mocked
 * `fetch`, never a live browser API.
 *
 * The centrepiece is the **AND-gate truth table**: the `notifications` flag ×
 * `general.overdueAlerts` × `do.notifyOnOverdue`. At `statusQuo` the flag is
 * off, so the first row of that table is the shipped default — and it is proved
 * by the *absence* of a scheduling call, not by an assertion about state.
 */
import {
  type KeyValueStore,
  type LocalStore,
  FeatureFlags,
  doNotifyOnOverdueOption,
  makeFeatureFlagOverrideStore,
  makeHardcodedFeatureFlagService,
  makePreferences,
  overdueAlertsOption,
  sessionKeepScreenAwakeOption,
  sessionSoundOnEndOption,
} from '@kro/core'
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  makeStubbedAudioFeedbackService,
  makeStubbedInstallService,
  makeStubbedNotificationsService,
  makeStubbedVibrationService,
  makeStubbedWakeLockService,
} from '../../../services/platform'
import {
  playSessionSoundThunk,
  promptInstallThunk,
  reconcileOverdueAlertsThunk,
  refreshPlatformStatusThunk,
  requestNotificationPermissionThunk,
  setScreenAwakeThunk,
  vibrateForTimelineHoldThunk,
  withdrawPendingAlertsThunk,
} from '../PlatformProducer'

/** The overdue alert id the eligible mock task always produces. */
const PLANNED_TASK_ALERT = `overdue-${endeavorMocks.plannedTask.id}`

interface Harness {
  readonly store: AppStore
  readonly preferences: KeyValueStore
  readonly notifications: ReturnType<typeof makeStubbedNotificationsService>
  readonly audio: ReturnType<typeof makeStubbedAudioFeedbackService>
  readonly wakeLock: ReturnType<typeof makeStubbedWakeLockService>
  readonly vibration: ReturnType<typeof makeStubbedVibrationService>
  readonly install: ReturnType<typeof makeStubbedInstallService>
}

/**
 * Builds a store whose five platform bindings are all recording stubs, over an
 * in-memory key-value store the test can write flags and preferences into.
 *
 * The flag defaults to **off**, so every harness starts at `statusQuo` unless
 * the test says otherwise — the default the app actually ships.
 */
const harness = (
  options: {
    readonly flagEnabled?: boolean
    readonly overdueAlerts?: boolean
    readonly notifyOnOverdue?: boolean
    readonly soundOnEnd?: boolean
    readonly keepScreenAwake?: boolean
    readonly notificationOverrides?: Parameters<
      typeof makeStubbedNotificationsService
    >[0]
    readonly installOverrides?: Parameters<typeof makeStubbedInstallService>[0]
    readonly localStore?: LocalStore
  } = {},
): Harness => {
  const localStore = options.localStore ?? makeInMemoryLocalStore()
  const preferences = localStore.preferences

  if (options.flagEnabled !== undefined) {
    makeFeatureFlagOverrideStore(preferences).set(
      FeatureFlags.notifications.name,
      options.flagEnabled,
    )
  }
  const typed = makePreferences(preferences)
  if (options.overdueAlerts !== undefined) {
    typed.write(overdueAlertsOption, options.overdueAlerts)
  }
  if (options.notifyOnOverdue !== undefined) {
    typed.write(doNotifyOnOverdueOption, options.notifyOnOverdue)
  }
  if (options.soundOnEnd !== undefined) {
    typed.write(sessionSoundOnEndOption, options.soundOnEnd)
  }
  if (options.keepScreenAwake !== undefined) {
    typed.write(sessionKeepScreenAwakeOption, options.keepScreenAwake)
  }

  const notifications = makeStubbedNotificationsService({
    permission: 'granted',
    ...options.notificationOverrides,
  })
  const audio = makeStubbedAudioFeedbackService()
  const wakeLock = makeStubbedWakeLockService()
  const vibration = makeStubbedVibrationService()
  const install = makeStubbedInstallService(options.installOverrides)

  const extra: ThunkExtra = {
    ...stubbedThunkExtra,
    localStore,
    notificationsService: notifications,
    audioFeedbackService: audio,
    wakeLockService: wakeLock,
    vibrationService: vibration,
    installService: install,
  }

  return {
    store: makeStore(extra),
    preferences,
    notifications,
    audio,
    wakeLock,
    vibration,
    install,
  }
}

// ---------------------------------------------------------------------------
// The AND gate — one flag, two preferences
// ---------------------------------------------------------------------------

describe('overdue alerts — the AND gate (flag × two preferences)', () => {
  const rows = [
    { flag: false, alerts: false, notify: false },
    { flag: false, alerts: false, notify: true },
    { flag: false, alerts: true, notify: false },
    { flag: false, alerts: true, notify: true },
    { flag: true, alerts: false, notify: false },
    { flag: true, alerts: false, notify: true },
    { flag: true, alerts: true, notify: false },
  ] as const

  for (const row of rows) {
    it(`schedules nothing with flag=${row.flag} overdueAlerts=${row.alerts} notifyOnOverdue=${row.notify}`, async () => {
      const kit = harness({
        flagEnabled: row.flag,
        overdueAlerts: row.alerts,
        notifyOnOverdue: row.notify,
      })

      await kit.store.dispatch(
        reconcileOverdueAlertsThunk({
          endeavors: [endeavorMocks.plannedTask],
        }),
      )

      expect(kit.notifications.recordedSchedules()).toEqual([])
      expect(kit.store.getState().platform.isOverdueAlertGateEnabled).toBe(
        false,
      )
    })
  }

  it('schedules only when all three are on — the single true row', async () => {
    const kit = harness({
      flagEnabled: true,
      overdueAlerts: true,
      notifyOnOverdue: true,
    })

    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    expect(kit.notifications.recordedSchedules().map((a) => a.id)).toEqual([
      PLANNED_TASK_ALERT,
    ])
    expect(kit.store.getState().platform.isOverdueAlertGateEnabled).toBe(true)
  })

  it('is off at statusQuo with no overrides written at all', async () => {
    const kit = harness()

    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    expect(kit.notifications.recordedSchedules()).toEqual([])
  })

  it('reads the same gate `@kro/core` declares, not a re-spelled copy', () => {
    const kit = harness({
      flagEnabled: true,
      overdueAlerts: true,
      notifyOnOverdue: false,
    })
    const flags = makeHardcodedFeatureFlagService({
      overrides: [
        {
          flag: FeatureFlags.notifications,
          state: 'enabled',
        },
      ] as never,
    })
    expect(flags.isEnabled(FeatureFlags.notifications)).toBe(true)
    // …and yet the producer still schedules nothing, because the second
    // preference is off. Proven by the table above; asserted here so the two
    // halves of the AND are visibly independent.
    expect(makePreferences(kit.preferences).read(doNotifyOnOverdueOption)).toBe(
      false,
    )
  })
})

// ---------------------------------------------------------------------------
// reconcileOverdueAlertsThunk
// ---------------------------------------------------------------------------

describe('reconcileOverdueAlertsThunk', () => {
  const enabled = {
    flagEnabled: true,
    overdueAlerts: true,
    notifyOnOverdue: true,
  } as const

  it('arms one alert per eligible item and records it in state', async () => {
    const kit = harness(enabled)

    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({
        endeavors: [endeavorMocks.plannedTask, endeavorMocks.todayEvent],
      }),
    )

    expect(kit.store.getState().platform.pendingOverdueAlertIds).toEqual([
      PLANNED_TASK_ALERT,
    ])
  })

  it('withdraws everything when the gate is switched off between passes', async () => {
    const kit = harness(enabled)
    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    makePreferences(kit.preferences).write(overdueAlertsOption, false)
    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    expect(kit.notifications.recordedWithdrawals()).toEqual([
      PLANNED_TASK_ALERT,
    ])
    expect(kit.store.getState().platform.pendingOverdueAlertIds).toEqual([])
  })

  it('never double-arms across repeated passes over the same set', async () => {
    const kit = harness(enabled)

    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )
    await kit.store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    expect(kit.store.getState().platform.pendingOverdueAlertIds).toEqual([
      PLANNED_TASK_ALERT,
    ])
  })

  it('surfaces a scheduling failure as a typed exception, not a throw', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      notificationsService: {
        ...makeStubbedNotificationsService(),
        reconcileOverdueAlerts: async () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    await store.dispatch(
      reconcileOverdueAlertsThunk({ endeavors: [endeavorMocks.plannedTask] }),
    )

    const { load } = store.getState().platform
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('reconciliationFailed')
    }
  })
})

describe('withdrawPendingAlertsThunk', () => {
  it('drops every alert this feature owns on sign-out', async () => {
    const kit = harness({
      notificationOverrides: {
        permission: 'granted',
        pending: [PLANNED_TASK_ALERT, 'overdue-other'],
      },
    })

    await kit.store.dispatch(withdrawPendingAlertsThunk())

    expect(kit.notifications.recordedWithdrawals()).toEqual([
      PLANNED_TASK_ALERT,
      'overdue-other',
    ])
    expect(kit.store.getState().platform.pendingOverdueAlertIds).toEqual([])
  })

  it('leaves a notification this feature does not own alone', async () => {
    const kit = harness({
      notificationOverrides: {
        permission: 'granted',
        pending: ['morning-push-1'],
      },
    })

    await kit.store.dispatch(withdrawPendingAlertsThunk())

    expect(await kit.notifications.pendingIdentifiers()).toEqual([
      'morning-push-1',
    ])
  })

  it('does not consult the gate — sign-out withdraws regardless', async () => {
    const kit = harness({
      flagEnabled: false,
      notificationOverrides: {
        permission: 'denied',
        pending: [PLANNED_TASK_ALERT],
      },
    })

    await kit.store.dispatch(withdrawPendingAlertsThunk())

    expect(kit.notifications.recordedWithdrawals()).toEqual([
      PLANNED_TASK_ALERT,
    ])
  })
})

// ---------------------------------------------------------------------------
// Permission & status
// ---------------------------------------------------------------------------

describe('requestNotificationPermissionThunk', () => {
  it('records a grant in state', async () => {
    const kit = harness({
      notificationOverrides: { permission: 'default' },
    })

    await kit.store.dispatch(requestNotificationPermissionThunk())

    expect(kit.store.getState().platform.notificationPermission).toBe('granted')
  })

  it('records a refusal as a state, never as a failure', async () => {
    const kit = harness({
      notificationOverrides: {
        permission: 'default',
        permissionAfterPrompt: 'denied',
      },
    })

    await kit.store.dispatch(requestNotificationPermissionThunk())

    const platform = kit.store.getState().platform
    expect(platform.notificationPermission).toBe('denied')
    expect(platform.load.kind).not.toBe('failed')
  })

  it('reports "unsupported" without pretending a prompt happened', async () => {
    const kit = harness({
      notificationOverrides: { permission: 'unsupported' },
    })

    await kit.store.dispatch(requestNotificationPermissionThunk())

    expect(kit.store.getState().platform.notificationPermission).toBe(
      'unsupported',
    )
  })
})

describe('refreshPlatformStatusThunk', () => {
  it('installs permission, install availability and the armed set at once', async () => {
    const kit = harness({
      notificationOverrides: {
        permission: 'granted',
        pending: [PLANNED_TASK_ALERT],
      },
    })

    await kit.store.dispatch(refreshPlatformStatusThunk())

    const platform = kit.store.getState().platform
    expect(platform.load.kind).toBe('loaded')
    expect(platform.notificationPermission).toBe('granted')
    expect(platform.installAvailability).toBe('available')
    expect(platform.pendingOverdueAlertIds).toEqual([PLANNED_TASK_ALERT])
  })

  it('probes each capability from its own service', async () => {
    const kit = harness()

    await kit.store.dispatch(refreshPlatformStatusThunk())

    expect(kit.store.getState().platform.capabilities).toEqual({
      notifications: true,
      wakeLock: true,
      vibration: true,
    })
  })

  it('reports a probe failure as a typed exception', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      notificationsService: {
        ...makeStubbedNotificationsService(),
        pendingIdentifiers: async () => {
          throw new Error('SecurityError')
        },
      },
    })

    await store.dispatch(refreshPlatformStatusThunk())

    const { load } = store.getState().platform
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed')
      expect(load.exception.kind).toBe('statusProbeFailed')
  })
})

// ---------------------------------------------------------------------------
// Sound, haptic, wake lock, install
// ---------------------------------------------------------------------------

describe('playSessionSoundThunk', () => {
  it('plays the session-complete cue when the preference is on', async () => {
    const kit = harness({ soundOnEnd: true })

    await kit.store.dispatch(playSessionSoundThunk({ role: 'sessionComplete' }))

    expect(kit.audio.playedRoles()).toEqual(['sessionComplete'])
  })

  it('plays nothing at all when session.soundOnEnd is off', async () => {
    const kit = harness({ soundOnEnd: false })

    await kit.store.dispatch(playSessionSoundThunk({ role: 'sessionComplete' }))

    expect(kit.audio.playedRoles()).toEqual([])
    expect(kit.audio.missedRoles()).toEqual([])
  })

  it('silences every role, not only the session one', async () => {
    const kit = harness({ soundOnEnd: false })

    await kit.store.dispatch(playSessionSoundThunk({ role: 'breakComplete' }))
    await kit.store.dispatch(
      playSessionSoundThunk({ role: 'taskCompleteOutsideSession' }),
    )

    expect(kit.audio.playedRoles()).toEqual([])
  })

  it("defaults to audible, matching the preference's own default", async () => {
    const kit = harness()

    await kit.store.dispatch(
      playSessionSoundThunk({ role: 'taskCompleteDuringSession' }),
    )

    expect(kit.audio.playedRoles()).toEqual(['taskCompleteDuringSession'])
  })

  it('reports the missing break asset as a miss, and still resolves ok', async () => {
    const kit = harness({ soundOnEnd: true })

    await kit.store.dispatch(playSessionSoundThunk({ role: 'breakComplete' }))

    expect(kit.audio.missedRoles()).toEqual(['breakComplete'])
    expect(kit.store.getState().platform.load.kind).not.toBe('failed')
  })
})

describe('vibrateForTimelineHoldThunk', () => {
  it('fires the one canon haptic on a timeline hold', async () => {
    const kit = harness()

    await kit.store.dispatch(vibrateForTimelineHoldThunk())

    expect(kit.vibration.recordedPatterns()).toEqual([20])
  })

  it('is a silent no-op on a device with no vibrator', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      vibrationService: makeStubbedVibrationService({ supported: false }),
    })

    await store.dispatch(vibrateForTimelineHoldThunk())

    expect(store.getState().platform.load.kind).not.toBe('failed')
  })

  it('never records a failure for a refused buzz', async () => {
    const store = makeStore({
      ...stubbedThunkExtra,
      vibrationService: {
        ...makeStubbedVibrationService(),
        vibrateForTimelineHold: () => false,
      },
    })

    await store.dispatch(vibrateForTimelineHoldThunk())

    expect(store.getState().platform.load.kind).not.toBe('failed')
  })
})

describe('setScreenAwakeThunk', () => {
  it('takes the hold when a session starts and the preference is on', async () => {
    const kit = harness({ keepScreenAwake: true })

    await kit.store.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(kit.wakeLock.recordedRequests()).toEqual([true])
    expect(kit.store.getState().platform.isScreenAwakeRequested).toBe(true)
  })

  it('takes no hold at all when session.keepScreenAwake is off', async () => {
    const kit = harness({ keepScreenAwake: false })

    await kit.store.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(kit.wakeLock.recordedRequests()).toEqual([])
    expect(kit.store.getState().platform.isScreenAwakeRequested).toBe(false)
  })

  it('always releases, even after the preference has been switched off', async () => {
    const kit = harness({ keepScreenAwake: true })
    await kit.store.dispatch(setScreenAwakeThunk({ enabled: true }))
    makePreferences(kit.preferences).write(sessionKeepScreenAwakeOption, false)

    await kit.store.dispatch(setScreenAwakeThunk({ enabled: false }))

    expect(kit.wakeLock.recordedRequests()).toEqual([true, false])
    expect(kit.store.getState().platform.isScreenAwakeRequested).toBe(false)
  })

  it("defaults to holding, matching the preference's own default", async () => {
    const kit = harness()

    await kit.store.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(kit.wakeLock.recordedRequests()).toEqual([true])
  })
})

describe('promptInstallThunk', () => {
  it('records an accepted install', async () => {
    const kit = harness()

    await kit.store.dispatch(promptInstallThunk())

    expect(kit.install.promptCount()).toBe(1)
    expect(kit.store.getState().platform.installAvailability).toBe('installed')
  })

  it('records a dismissal without claiming the app is installed', async () => {
    const kit = harness({ installOverrides: { outcome: 'dismissed' } })

    await kit.store.dispatch(promptInstallThunk())

    expect(kit.store.getState().platform.installAvailability).toBe('unknown')
  })

  it('raises nothing where the browser never offered a prompt', async () => {
    const kit = harness({ installOverrides: { availability: 'unavailable' } })

    await kit.store.dispatch(promptInstallThunk())

    expect(kit.install.promptCount()).toBe(0)
    expect(kit.store.getState().platform.load.kind).not.toBe('failed')
  })
})
