/**
 * The notification boundary, both bindings.
 *
 * The live binding is exercised through its injected seams — a fake
 * `Notification`, a fake display surface and a fake timer table — so nothing
 * here touches a real browser API, a real clock or a real service worker
 * (`RC-35`). That is also what makes the two properties canon depends on
 * assertable: *replace, never duplicate*, and *a past due time delivers now*.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  MAX_TIMER_DELAY_MS,
  type NotificationApiLike,
  type NotificationDisplayLike,
  type PendingAlert,
  type PushManagerLike,
  type TimerApiLike,
  makeLiveNotificationsService,
  makeStubbedNotificationsService,
  urlBase64ToUint8Array,
} from '../NotificationsService'

const NOW = new Date(2026, 0, 15, 9, 0, 0).getTime()

const alert = (
  id: string,
  deliverAtMs: number,
  title = 'Overdue',
): PendingAlert => ({
  id,
  title,
  body: `"${id}" is now overdue.`,
  deliverAt: new Date(deliverAtMs),
})

/** A deterministic timer table: nothing fires until the test says so. */
const makeTimers = () => {
  const scheduled = new Map<number, { callback: () => void; delayMs: number }>()
  let nextHandle = 1
  const api: TimerApiLike = {
    set: (callback, delayMs) => {
      const handle = nextHandle++
      scheduled.set(handle, { callback, delayMs })
      return handle
    },
    clear: (handle) => {
      scheduled.delete(handle)
    },
  }
  return {
    api,
    scheduled,
    /** Fires every armed callback once, in insertion order. */
    fireAll: () => {
      for (const [handle, entry] of [...scheduled]) {
        scheduled.delete(handle)
        entry.callback()
      }
    },
    delays: () => [...scheduled.values()].map((entry) => entry.delayMs),
  }
}

const makeDisplay = () => {
  const shown: { title: string; tag: string }[] = []
  const display: NotificationDisplayLike = {
    showNotification: (title, options) => {
      shown.push({ title, tag: options.tag })
    },
  }
  return { display, shown }
}

const permissionApi = (
  permission: string,
  grantsTo = 'granted',
): NotificationApiLike => {
  let current = permission
  return {
    get permission() {
      return current
    },
    requestPermission: async () => {
      current = grantsTo
      return current
    },
  }
}

const liveWith = (
  overrides: Partial<Parameters<typeof makeLiveNotificationsService>[0]> = {},
) => {
  const timers = makeTimers()
  const display = makeDisplay()
  let clock = NOW
  const service = makeLiveNotificationsService({
    notificationApi: permissionApi('granted'),
    resolveDisplay: async () => display.display,
    timers: timers.api,
    now: () => clock,
    ...overrides,
  })
  return {
    service,
    timers,
    display,
    /** Moves the injected clock forward and fires everything armed. */
    advance: (ms: number) => {
      clock += ms
      timers.fireAll()
    },
  }
}

/** Lets the service's own `void`-ed delivery promise settle. */
const settle = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

describe('liveNotificationsService — permission', () => {
  it('reports "unsupported" where the browser has no Notification API', () => {
    const { service } = liveWith({ notificationApi: null })
    expect(service.permissionState()).toBe('unsupported')
  })

  it('reports the browser\'s own answer once it has one', () => {
    const { service } = liveWith({ notificationApi: permissionApi('denied') })
    expect(service.permissionState()).toBe('denied')
  })

  it('prompts only from "default", and reports what the user chose', async () => {
    const api = permissionApi('default')
    const request = vi.spyOn(api, 'requestPermission')
    const { service } = liveWith({ notificationApi: api })

    expect(await service.requestPermission()).toBe('granted')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('never re-prompts once the user has already refused', async () => {
    const api = permissionApi('denied')
    const request = vi.spyOn(api, 'requestPermission')
    const { service } = liveWith({ notificationApi: api })

    expect(await service.requestPermission()).toBe('denied')
    expect(request).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

describe('liveNotificationsService — schedule', () => {
  it('arms a future alert without showing anything yet', async () => {
    const { service, timers, display } = liveWith()

    await service.schedule(alert('overdue-1', NOW + 60_000))

    expect(display.shown).toEqual([])
    expect(timers.delays()).toEqual([60_000])
    expect(await service.pendingIdentifiers()).toEqual(['overdue-1'])
  })

  it('shows an already-due alert immediately, so a missed item still nudges', async () => {
    const { service, timers, display } = liveWith()

    await service.schedule(alert('overdue-late', NOW - 3_600_000))
    await settle()

    expect(timers.scheduled.size).toBe(0)
    expect(display.shown).toEqual([{ title: 'Overdue', tag: 'overdue-late' }])
  })

  it('replaces rather than stacks when the same id is scheduled twice', async () => {
    const { service, timers } = liveWith()

    await service.schedule(alert('overdue-1', NOW + 60_000))
    await service.schedule(alert('overdue-1', NOW + 120_000))

    expect(timers.scheduled.size).toBe(1)
    expect(timers.delays()).toEqual([120_000])
    expect(await service.pendingIdentifiers()).toEqual(['overdue-1'])
  })

  it('re-arms a very distant alert in hops, never overflowing setTimeout', async () => {
    const { service, timers, advance, display } = liveWith()
    const twoMonths = NOW + MAX_TIMER_DELAY_MS + 5_000

    await service.schedule(alert('overdue-far', twoMonths))
    expect(timers.delays()).toEqual([MAX_TIMER_DELAY_MS])

    advance(MAX_TIMER_DELAY_MS)
    await settle()

    // The first hop expired; the remainder is armed rather than fired early.
    expect(display.shown).toEqual([])
    expect(timers.delays()).toEqual([5_000])
  })

  it('delivers when the armed timer fires at the due moment', async () => {
    const { service, display, advance } = liveWith()

    await service.schedule(alert('overdue-1', NOW + 60_000))
    advance(60_000)
    await settle()

    expect(display.shown).toEqual([{ title: 'Overdue', tag: 'overdue-1' }])
    expect(await service.pendingIdentifiers()).toEqual([])
  })

  it('stays silent where no display surface can be resolved', async () => {
    const { service } = liveWith({ resolveDisplay: async () => null })

    await expect(
      service.schedule(alert('overdue-late', NOW - 1_000)),
    ).resolves.toBeUndefined()
  })
})

describe('liveNotificationsService — withdraw', () => {
  it('disarms the named alert and leaves the others armed', async () => {
    const { service } = liveWith()
    await service.schedule(alert('overdue-1', NOW + 60_000))
    await service.schedule(alert('overdue-2', NOW + 60_000))

    await service.withdraw(['overdue-1'])

    expect(await service.pendingIdentifiers()).toEqual(['overdue-2'])
  })

  it('treats an unknown identifier as a no-op', async () => {
    const { service } = liveWith()
    await service.schedule(alert('overdue-1', NOW + 60_000))

    await service.withdraw(['overdue-nope'])

    expect(await service.pendingIdentifiers()).toEqual(['overdue-1'])
  })

  it('withdrawAll drops only the alerts this feature owns', async () => {
    const { service } = liveWith()
    await service.schedule(alert('overdue-1', NOW + 60_000))
    await service.schedule(alert('morning-push-1', NOW + 60_000))

    expect(await service.withdrawAllOverdueAlerts()).toEqual(['overdue-1'])
    expect(await service.pendingIdentifiers()).toEqual(['morning-push-1'])
  })

  it('never fires an alert that was withdrawn before its moment', async () => {
    const { service, display, advance } = liveWith()
    await service.schedule(alert('overdue-1', NOW + 60_000))

    await service.withdraw(['overdue-1'])
    advance(60_000)
    await settle()

    expect(display.shown).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Push subscription
// ---------------------------------------------------------------------------

describe('liveNotificationsService — push', () => {
  const subscription = {
    toJSON: () => ({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'p', auth: 'a' },
    }),
    unsubscribe: async () => true,
  }

  it('returns null where the browser has no service worker', async () => {
    const { service } = liveWith({ resolvePushManager: async () => null })
    expect(await service.subscribeToPush('BEl0')).toBeNull()
  })

  it('reuses an existing subscription rather than minting a second', async () => {
    const subscribe = vi.fn()
    const manager: PushManagerLike = {
      getSubscription: async () => subscription,
      subscribe: subscribe as unknown as PushManagerLike['subscribe'],
    }
    const { service } = liveWith({ resolvePushManager: async () => manager })

    const payload = await service.subscribeToPush('BEl0')

    expect(subscribe).not.toHaveBeenCalled()
    expect(payload?.endpoint).toBe('https://push.example/1')
  })

  it('subscribes with the decoded VAPID key when there is none yet', async () => {
    const subscribe: PushManagerLike['subscribe'] = vi.fn(
      async (_options: {
        userVisibleOnly: boolean
        applicationServerKey: Uint8Array
      }) => subscription,
    )
    const manager: PushManagerLike = {
      getSubscription: async () => null,
      subscribe,
    }
    const { service } = liveWith({ resolvePushManager: async () => manager })

    await service.subscribeToPush('BEl0')

    const call = vi.mocked(subscribe).mock.calls[0]?.[0]
    expect(call?.userVisibleOnly).toBe(true)
    expect(call?.applicationServerKey).toBeInstanceOf(Uint8Array)
  })

  it('reports false when unsubscribing with nothing subscribed', async () => {
    const manager: PushManagerLike = {
      getSubscription: async () => null,
      subscribe: (async () => subscription) as unknown as PushManagerLike['subscribe'],
    }
    const { service } = liveWith({ resolvePushManager: async () => manager })

    expect(await service.unsubscribeFromPush()).toBe(false)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodes a padded base64 key to its bytes', () => {
    expect([...urlBase64ToUint8Array('QUJD')]).toEqual([65, 66, 67])
  })

  it('re-pads a key the URL-safe encoding stripped', () => {
    expect([...urlBase64ToUint8Array('QUJDRA')]).toEqual([65, 66, 67, 68])
  })

  it('translates the URL-safe alphabet back to standard base64', () => {
    expect(urlBase64ToUint8Array('-_8')).toEqual(
      urlBase64ToUint8Array('+/8'),
    )
  })
})

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

describe('stubbedNotificationsService', () => {
  it('starts from its fixture: granted, with nothing armed', async () => {
    const service = makeStubbedNotificationsService()
    expect(service.permissionState()).toBe('granted')
    expect(await service.pendingIdentifiers()).toEqual([])
  })

  it('records every schedule so a suite can assert on the absence of one', async () => {
    const service = makeStubbedNotificationsService()

    await service.schedule(alert('overdue-1', NOW))

    expect(service.recordedSchedules()).toHaveLength(1)
    expect(service.recordedSchedules()[0]?.id).toBe('overdue-1')
  })

  it('counts prompts and moves only from "default"', async () => {
    const service = makeStubbedNotificationsService({ permission: 'default' })

    expect(await service.requestPermission()).toBe('granted')
    expect(await service.requestPermission()).toBe('granted')
    expect(service.promptCount()).toBe(2)
  })

  it('records withdrawals and drops them from the pending set', async () => {
    const service = makeStubbedNotificationsService({ pending: ['overdue-1'] })

    await service.withdraw(['overdue-1'])

    expect(service.recordedWithdrawals()).toEqual(['overdue-1'])
    expect(await service.pendingIdentifiers()).toEqual([])
  })

  it('hands back the fixture push subscription, then forgets it on unsubscribe', async () => {
    const service = makeStubbedNotificationsService()

    expect((await service.subscribeToPush('BEl0'))?.endpoint).toContain(
      'push.kro.invalid',
    )
    expect(await service.unsubscribeFromPush()).toBe(true)
    expect(await service.subscribeToPush('BEl0')).toBeNull()
  })
})
