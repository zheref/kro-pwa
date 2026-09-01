/**
 * The notification boundary — canon `Kro/Dependencies/SystemNotifications.swift`
 * (`SystemNotificationsClient`), ported operation for operation (`RC-6`,
 * `RC-33`, `RC-59`).
 *
 * Canon's five operations map one-to-one:
 *
 * | canon | here |
 * |---|---|
 * | `requestAuthorization` | `requestPermission` |
 * | `scheduleIdentified(id:title:message:date:)` | `schedule(alert)` |
 * | `cancelPending(ids:)` | `withdraw(identifiers)` |
 * | `pendingIdentifiers()` | `pendingIdentifiers()` |
 * | `trigger(title:message:)` | folded into `schedule` — a `deliverAt` at or before now delivers immediately |
 *
 * plus a synchronous `permissionState()` (canon reads
 * `UNUserNotificationCenter`'s settings the same way) and the two push-
 * subscription operations the web needs and iOS does not.
 *
 * ## The one divergence that matters: there is no OS-persisted alert queue
 *
 * `UNUserNotificationCenter` keeps a pending request alive after the app is
 * killed; the OS fires it. The web has **no shipped equivalent** — the
 * Notification Triggers API never shipped, and `showNotification` fires *now*,
 * not later. So the live binding arms a timer per alert and the queue lives for
 * exactly as long as the document does. Two consequences, both deliberate:
 *
 * - `pendingIdentifiers()` is empty on a cold load. Reconciliation therefore
 *   re-schedules every eligible item on the first item-set change after a
 *   reload. That is *correct* under canon's own model — reconciliation
 *   recomputes the full set from scratch and one alert is keyed per item, so
 *   re-scheduling replaces rather than duplicates (canon relies on exactly the
 *   same identifier-replacement property).
 * - An alert whose due moment passes while the tab is closed is not delivered
 *   by the browser. Canon's "already overdue when first seen still nudges" rule
 *   is honoured on the next load instead: the item is still eligible, its
 *   `deliverAt` is in the past, and `schedule` delivers ASAP.
 *
 * Delivering while the tab is *closed* needs a push from a server, which is why
 * `subscribeToPush` exists — the server half (VAPID key custody, subscription
 * storage) is the issue's declared out-of-scope/G5 decision, so nothing here
 * assumes it.
 *
 * ## Why the live binding is built by a factory
 *
 * `RC-6` forbids a Service holding *module-level* mutable state, because a
 * shared `let` cannot be substituted and leaks between suites. A scheduler must
 * hold its timer handles somewhere; canon puts them in the OS. Here they live
 * in the factory's closure, so every binding gets its own registry and a test
 * builds one with stub timers instead of reaching into a module global. The
 * factory's options are the seams: nothing here touches `window`, `navigator`
 * or `setTimeout` except through them.
 */
import {
  type OverdueAlertReconciliationReport,
  type OverdueAlertReconciliationRequest,
  applyOverdueAlertReconciliation,
  isOverdueAlertId,
} from './OverdueAlertReconciliation'
import fixtures from './notifications.fixtures.json'

/**
 * `Notification.permission` widened with the state the DOM type cannot express:
 * a browser (or a jsdom run) with no `Notification` at all. Canon has no
 * equivalent — iOS always has a notification centre — and collapsing it into
 * `denied` would tell a Settings surface the user refused when they were never
 * asked.
 */
export type NotificationPermissionState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied'

/** One scheduled alert. `id` is the caller's stable identity (canon's `id:`). */
export interface PendingAlert {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly deliverAt: Date
}

/**
 * The subset of `PushSubscription` the server half needs, in the shape
 * `web-push` accepts — `JSON.parse(JSON.stringify(sub))`, not the DOM
 * interface.
 */
export interface PushSubscriptionPayload {
  readonly endpoint: string
  readonly keys: { readonly p256dh: string; readonly auth: string }
}

export interface NotificationsService {
  /** The current permission, read synchronously. Never prompts. */
  permissionState(): NotificationPermissionState
  /** Prompts if the state is `default`; resolves the resulting state. */
  requestPermission(): Promise<NotificationPermissionState>
  /** The identifiers of alerts armed and not yet delivered. */
  pendingIdentifiers(): Promise<readonly string[]>
  /**
   * Arms one alert. Arming a second alert under an identifier that is already
   * armed **replaces** it — the property canon leans on so re-checking an item
   * never produces a duplicate.
   */
  schedule(alert: PendingAlert): Promise<void>
  /** Disarms the named alerts. An unknown identifier is a no-op. */
  withdraw(identifiers: readonly string[]): Promise<void>
  /**
   * Recomputes the **full** pending overdue-alert set from `endeavors` and
   * applies the resulting diff — the operation `docs/Features/Notifications.md`
   * calls *reconciliation*. The decision itself is the pure
   * `reconcileOverdueAlerts` engine; this operation is the half that touches
   * the world, so a caller never has to hold both.
   */
  reconcileOverdueAlerts(
    request: OverdueAlertReconciliationRequest,
  ): Promise<OverdueAlertReconciliationReport>
  /**
   * Withdraws **every** pending overdue alert regardless of eligibility — the
   * sign-out path (canon's `produceClearOverdueNotificationsEffect`). Returns
   * what it withdrew. Alerts this feature does not own are left alone.
   */
  withdrawAllOverdueAlerts(): Promise<readonly string[]>
  /** Subscribes this device to web push, or `null` when unsupported. */
  subscribeToPush(
    applicationServerKey: string,
  ): Promise<PushSubscriptionPayload | null>
  /** Drops the push subscription. `false` when there was nothing to drop. */
  unsubscribeFromPush(): Promise<boolean>
}

// ---------------------------------------------------------------------------
// Seams — the browser surfaces the live binding is allowed to touch
// ---------------------------------------------------------------------------

/** `Notification`, narrowed to the two members this service reads. */
export interface NotificationApiLike {
  readonly permission: string
  requestPermission(): Promise<string>
}

/** What actually puts a notification on screen. */
export interface NotificationDisplayLike {
  showNotification(
    title: string,
    options: {
      readonly body: string
      readonly tag: string
      readonly icon?: string
    },
  ): Promise<void> | void
}

/** The push-manager surface, narrowed to what a subscription needs. */
export interface PushManagerLike {
  getSubscription(): Promise<PushSubscriptionLike | null>
  subscribe(options: {
    userVisibleOnly: boolean
    applicationServerKey: Uint8Array
  }): Promise<PushSubscriptionLike>
}

export interface PushSubscriptionLike {
  toJSON(): unknown
  unsubscribe(): Promise<boolean>
}

/** `setTimeout`/`clearTimeout`, injected so a suite owns the clock. */
export interface TimerApiLike {
  set(callback: () => void, delayMs: number): number
  clear(handle: number): void
}

export interface LiveNotificationsServiceOptions {
  readonly notificationApi?: NotificationApiLike | null
  /** Resolves the display surface — the service-worker registration in production. */
  readonly resolveDisplay?: () => Promise<NotificationDisplayLike | null>
  readonly resolvePushManager?: () => Promise<PushManagerLike | null>
  readonly timers?: TimerApiLike
  readonly now?: () => number
  /** The icon every delivered alert carries. */
  readonly icon?: string
}

/** The icon shipped at `apps/web/public/icons/Kro192.png`. */
export const NOTIFICATION_ICON_PATH = '/icons/Kro192.png'

/**
 * `setTimeout` stores its delay in a signed 32-bit int: anything larger
 * overflows and fires *immediately*, which for an alert due next month would
 * deliver it now. Long waits are therefore re-armed in ≤24.8-day hops.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647

/**
 * Converts a URL-safe base64 VAPID key into the `Uint8Array`
 * `PushManager.subscribe` requires. Ported unchanged from the retired
 * `apps/web/src/progressive/utils.ts`, minus its dependency on `window.atob`:
 * the decode is done with the ES-standard `atob` binding when present so the
 * helper is testable in any environment.
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index)
  }
  return output
}

const readPermission = (
  api: NotificationApiLike | null | undefined,
): NotificationPermissionState => {
  if (!api) return 'unsupported'
  const value = api.permission
  return value === 'granted' || value === 'denied' || value === 'default'
    ? value
    : 'unsupported'
}

const asPayload = (
  subscription: PushSubscriptionLike,
): PushSubscriptionPayload | null => {
  const json = subscription.toJSON() as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
  }
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (
    typeof endpoint !== 'string' ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string'
  ) {
    return null
  }
  return { endpoint, keys: { p256dh, auth } }
}

/** The browser's own `Notification`, or `null` where there is none. */
const defaultNotificationApi = (): NotificationApiLike | null =>
  typeof Notification === 'undefined'
    ? null
    : {
        get permission() {
          return Notification.permission
        },
        requestPermission: () => Notification.requestPermission(),
      }

const defaultResolveDisplay =
  async (): Promise<NotificationDisplayLike | null> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null
    }
    const registration = await navigator.serviceWorker.ready
    return {
      showNotification: (title, options) =>
        registration.showNotification(title, options),
    }
  }

const defaultResolvePushManager = async (): Promise<PushManagerLike | null> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager as unknown as PushManagerLike
}

const defaultTimers: TimerApiLike = {
  set: (callback, delayMs) =>
    setTimeout(callback, delayMs) as unknown as number,
  clear: (handle) => clearTimeout(handle),
}

/**
 * Builds a live binding over the injected browser seams.
 *
 * The armed-alert registry is per-binding (see the file header): the closure is
 * the Service's own state, never a module-level `let`.
 */
export const makeLiveNotificationsService = (
  options: LiveNotificationsServiceOptions = {},
): NotificationsService => {
  const notificationApi =
    options.notificationApi === undefined
      ? defaultNotificationApi()
      : options.notificationApi
  const resolveDisplay = options.resolveDisplay ?? defaultResolveDisplay
  const resolvePushManager =
    options.resolvePushManager ?? defaultResolvePushManager
  const timers = options.timers ?? defaultTimers
  const now = options.now ?? (() => Date.now())
  const icon = options.icon ?? NOTIFICATION_ICON_PATH

  /** id → the timer handle currently armed for it. */
  const armed = new Map<string, number>()

  const withdrawAll = async (): Promise<readonly string[]> => {
    const owned = [...armed.keys()].filter(isOverdueAlertId)
    for (const id of owned) {
      const handle = armed.get(id)
      if (handle !== undefined) timers.clear(handle)
      armed.delete(id)
    }
    return owned
  }

  const disarm = (id: string): void => {
    const handle = armed.get(id)
    if (handle === undefined) return
    timers.clear(handle)
    armed.delete(id)
  }

  const deliver = async (alert: PendingAlert): Promise<void> => {
    armed.delete(alert.id)
    const display = await resolveDisplay()
    if (!display) return
    await display.showNotification(alert.title, {
      body: alert.body,
      tag: alert.id,
      icon,
    })
  }

  const arm = (alert: PendingAlert): void => {
    const remaining = alert.deliverAt.getTime() - now()
    if (remaining <= 0) {
      void deliver(alert)
      return
    }
    const hop = Math.min(remaining, MAX_TIMER_DELAY_MS)
    armed.set(
      alert.id,
      timers.set(() => {
        armed.delete(alert.id)
        arm(alert)
      }, hop),
    )
  }

  return {
    permissionState: () => readPermission(notificationApi),

    requestPermission: async () => {
      if (!notificationApi) return 'unsupported'
      const current = readPermission(notificationApi)
      if (current !== 'default') return current
      await notificationApi.requestPermission()
      return readPermission(notificationApi)
    },

    pendingIdentifiers: async () => [...armed.keys()],

    schedule: async (alert) => {
      // Replace rather than stack — canon's `scheduleIdentified` contract.
      disarm(alert.id)
      arm(alert)
    },

    withdraw: async (identifiers) => {
      for (const id of identifiers) disarm(id)
    },

    // `this`, not a captured `service` const: a suite that overrides one
    // operation by spreading the binding (`{ ...service, schedule: … }`) must
    // see its override honoured here too. A closure over the original object
    // would silently ignore it, which is the kind of trap that makes a test
    // assert the stub instead of the code.
    reconcileOverdueAlerts(this: NotificationsService, request) {
      return applyOverdueAlertReconciliation(this, request)
    },

    withdrawAllOverdueAlerts: withdrawAll,

    subscribeToPush: async (applicationServerKey) => {
      const manager = await resolvePushManager()
      if (!manager) return null
      const existing = await manager.getSubscription()
      const subscription =
        existing ??
        (await manager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
        }))
      return asPayload(subscription)
    },

    unsubscribeFromPush: async () => {
      const manager = await resolvePushManager()
      if (!manager) return false
      const existing = await manager.getSubscription()
      if (!existing) return false
      return existing.unsubscribe()
    },
  }
}

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

export interface StubbedNotificationsServiceOptions {
  readonly permission?: NotificationPermissionState
  /** The state a `requestPermission()` prompt resolves to. */
  readonly permissionAfterPrompt?: NotificationPermissionState
  /** Identifiers already armed before the suite starts. */
  readonly pending?: readonly string[]
  readonly pushSubscription?: PushSubscriptionPayload | null
}

/** The stub, plus the recorded traffic a suite asserts on. */
export interface StubbedNotificationsService extends NotificationsService {
  /** Every `schedule` call, in order — duplicates included. */
  recordedSchedules(): readonly PendingAlert[]
  /** Every identifier passed to `withdraw`, flattened, in order. */
  recordedWithdrawals(): readonly string[]
  /** How many times the permission prompt was raised. */
  promptCount(): number
}

const fixturePermission = fixtures.permission as NotificationPermissionState
const fixturePending = fixtures.pendingIdentifiers as readonly string[]
const fixtureSubscription =
  fixtures.pushSubscription as unknown as PushSubscriptionPayload

/**
 * A deterministic in-memory binding backed by `notifications.fixtures.json`.
 * It touches no browser API, so it runs identically under node and jsdom, and
 * it records everything so a suite can prove the *absence* of a call — which is
 * the flag-gated-off acceptance criterion.
 */
export const makeStubbedNotificationsService = (
  options: StubbedNotificationsServiceOptions = {},
): StubbedNotificationsService => {
  let permission = options.permission ?? fixturePermission
  const afterPrompt = options.permissionAfterPrompt ?? 'granted'
  const pending = new Set<string>(options.pending ?? fixturePending)
  const schedules: PendingAlert[] = []
  const withdrawals: string[] = []
  let prompts = 0
  let subscription =
    options.pushSubscription === undefined
      ? fixtureSubscription
      : options.pushSubscription
  let subscribed = false

  return {
    permissionState: () => permission,

    requestPermission: async () => {
      prompts += 1
      if (permission === 'default') permission = afterPrompt
      return permission
    },

    pendingIdentifiers: async () => [...pending],

    schedule: async (alert) => {
      schedules.push(alert)
      pending.add(alert.id)
    },

    withdraw: async (identifiers) => {
      for (const id of identifiers) {
        withdrawals.push(id)
        pending.delete(id)
      }
    },

    // `this` for the same reason the live binding gives above.
    reconcileOverdueAlerts(this: NotificationsService, request) {
      return applyOverdueAlertReconciliation(this, request)
    },

    async withdrawAllOverdueAlerts(this: NotificationsService) {
      const owned = [...pending].filter(isOverdueAlertId)
      await this.withdraw(owned)
      return owned
    },

    subscribeToPush: async () => {
      if (subscription === null) return null
      subscribed = true
      return subscription
    },

    unsubscribeFromPush: async () => {
      if (!subscribed) return false
      subscribed = false
      subscription = null
      return true
    },

    recordedSchedules: () => schedules,
    recordedWithdrawals: () => withdrawals,
    promptCount: () => prompts,
  }
}

/** The default production binding assembled into `liveThunkExtra`. */
export const liveNotificationsService: NotificationsService =
  makeLiveNotificationsService()

/** The default fixture binding assembled into `stubbedThunkExtra`. */
export const stubbedNotificationsService: NotificationsService =
  makeStubbedNotificationsService()
