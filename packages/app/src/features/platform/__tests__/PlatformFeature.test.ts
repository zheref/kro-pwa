/**
 * The slice's `extraReducers` arms, driven through the **real** thunks against
 * stubbed services (`RC-54`) — never by dispatching a lifecycle action by hand.
 *
 * The `.rejected` arms are the one exception: a Producer here never throws, so
 * the only way to reach them is to dispatch the generated action directly, and
 * each gets exactly one defensive test (`RC-26`).
 */
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  makeStubbedInstallService,
  makeStubbedNotificationsService,
  makeStubbedWakeLockService,
} from '../../../services/platform'
import { initialPlatformState, platformSlice } from '../PlatformFeature'
import {
  promptInstallThunk,
  refreshPlatformStatusThunk,
  requestNotificationPermissionThunk,
  setScreenAwakeThunk,
} from '../PlatformProducer'

const storeWith = (
  overrides: Partial<typeof stubbedThunkExtra> = {},
): AppStore =>
  makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore(),
    ...overrides,
  })

describe('platformSlice — initial state', () => {
  it('starts knowing nothing about the device it is running on', () => {
    expect(platformSlice.getInitialState()).toEqual(initialPlatformState)
  })

  it('starts with no alerts armed, because the web has no persisted queue', () => {
    expect(platformSlice.getInitialState().pendingOverdueAlertIds).toEqual([])
  })

  it('starts with the overdue gate closed — the statusQuo default', () => {
    expect(platformSlice.getInitialState().isOverdueAlertGateEnabled).toBe(false)
  })
})

describe('refreshPlatformStatusThunk lifecycle', () => {
  it('moves to loading while the probe is in flight (a cold mount)', () => {
    const store = storeWith()

    store.dispatch({ type: refreshPlatformStatusThunk.pending.type })

    expect(store.getState().platform.load.kind).toBe('loading')
  })

  it('lands loaded with the device\'s answers (permission already granted)', async () => {
    const store = storeWith()

    await store.dispatch(refreshPlatformStatusThunk())

    const platform = store.getState().platform
    expect(platform.load.kind).toBe('loaded')
    expect(platform.notificationPermission).toBe('granted')
  })

  it('lands failed when the probe throws (a locked-down browser)', async () => {
    const store = storeWith({
      notificationsService: {
        ...makeStubbedNotificationsService(),
        pendingIdentifiers: async () => {
          throw new Error('SecurityError')
        },
      },
    })

    await store.dispatch(refreshPlatformStatusThunk())

    expect(store.getState().platform.load.kind).toBe('failed')
  })

  it('degrades a rejected probe to the unknown exception rather than crashing', () => {
    const store = storeWith()

    store.dispatch({
      type: refreshPlatformStatusThunk.rejected.type,
      error: { message: 'serialization boom' },
    })

    const { load } = store.getState().platform
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('unknown')
      expect(load.exception.message).toBe('serialization boom')
    }
  })
})

describe('requestNotificationPermissionThunk lifecycle', () => {
  it('records the grant the user just gave', async () => {
    const store = storeWith({
      notificationsService: makeStubbedNotificationsService({
        permission: 'default',
      }),
    })

    await store.dispatch(requestNotificationPermissionThunk())

    expect(store.getState().platform.notificationPermission).toBe('granted')
  })

  it('records a refusal without moving the lifecycle to failed', async () => {
    const store = storeWith({
      notificationsService: makeStubbedNotificationsService({
        permission: 'default',
        permissionAfterPrompt: 'denied',
      }),
    })

    await store.dispatch(requestNotificationPermissionThunk())

    const platform = store.getState().platform
    expect(platform.notificationPermission).toBe('denied')
    expect(platform.load.kind).toBe('idle')
  })

  it('lands failed when the prompt itself throws', async () => {
    const store = storeWith({
      notificationsService: {
        ...makeStubbedNotificationsService(),
        requestPermission: async () => {
          throw new Error('InvalidStateError')
        },
      },
    })

    await store.dispatch(requestNotificationPermissionThunk())

    const { load } = store.getState().platform
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('permissionRequestFailed')
    }
  })
})

describe('setScreenAwakeThunk lifecycle', () => {
  it('records the hold a running session takes', async () => {
    const store = storeWith()

    await store.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(store.getState().platform.isScreenAwakeRequested).toBe(true)
  })

  it('records the release when the session concludes', async () => {
    const store = storeWith()
    await store.dispatch(setScreenAwakeThunk({ enabled: true }))

    await store.dispatch(setScreenAwakeThunk({ enabled: false }))

    expect(store.getState().platform.isScreenAwakeRequested).toBe(false)
  })

  it('lands failed when the platform throws on the toggle', async () => {
    const store = storeWith({
      wakeLockService: {
        ...makeStubbedWakeLockService(),
        setKeepAwake: async () => {
          throw new Error('NotAllowedError')
        },
      },
    })

    await store.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(store.getState().platform.load.kind).toBe('failed')
  })
})

describe('promptInstallThunk lifecycle', () => {
  it('marks the app installed once the user accepts', async () => {
    const store = storeWith()

    await store.dispatch(promptInstallThunk())

    expect(store.getState().platform.installAvailability).toBe('installed')
  })

  it('returns the affordance to "unknown" on a dismissal', async () => {
    const store = storeWith({
      installService: makeStubbedInstallService({ outcome: 'dismissed' }),
    })

    await store.dispatch(promptInstallThunk())

    expect(store.getState().platform.installAvailability).toBe('unknown')
  })

  it('lands failed when raising the prompt throws', async () => {
    const store = storeWith({
      installService: {
        ...makeStubbedInstallService(),
        prompt: async () => {
          throw new Error('AbortError')
        },
      },
    })

    await store.dispatch(promptInstallThunk())

    const { load } = store.getState().platform
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('installPromptFailed')
    }
  })
})

describe('platformSlice — registration', () => {
  it('is reachable from the store under its own key', () => {
    expect(storeWith().getState().platform).toEqual(initialPlatformState)
  })

  it('does not leak between two stores built from the same manifest', async () => {
    const first = storeWith()
    const second = storeWith()

    await first.dispatch(setScreenAwakeThunk({ enabled: true }))

    expect(first.getState().platform.isScreenAwakeRequested).toBe(true)
    expect(second.getState().platform.isScreenAwakeRequested).toBe(false)
  })

  it('never touches another slice while reconciling', async () => {
    const store = storeWith()
    const before = store.getState().earn

    await store.dispatch(refreshPlatformStatusThunk())

    expect(store.getState().earn).toEqual(before)
    expect(endeavorMocks.plannedTask.id).toBeTruthy()
  })
})
