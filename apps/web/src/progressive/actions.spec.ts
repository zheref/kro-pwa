/**
 * The push Server Actions, called directly with no HTTP server and no Next.js
 * request runtime (`RC-43`) — three cases each, asserting on the returned
 * `Result`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendPushNotification, subscribeUser, unsubscribeUser } from './actions'
import { resetPushSubscriptions } from './pushSubscriptions'

const sendNotification = vi.fn()
const setVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}))

const subscription = {
  endpoint: 'https://push.example/1',
  keys: { p256dh: 'p', auth: 'a' },
} as never

beforeEach(() => {
  resetPushSubscriptions()
  sendNotification.mockReset()
  setVapidDetails.mockReset()
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key-fixture'
  process.env.VAPID_PRIVATE_KEY = 'secret-fixture'
})

afterEach(() => {
  // `delete`, not `= undefined`: assigning `undefined` to a `process.env` slot
  // stores the *string* "undefined", which is truthy and would make the
  // not-configured path unreachable.
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
})

describe('subscribeUser', () => {
  it('accepts a device subscription', async () => {
    const result = await subscribeUser(subscription)
    expect(result.ok).toBe(true)
  })

  it('replaces an earlier subscription rather than keeping both', async () => {
    await subscribeUser(subscription)
    await subscribeUser({ ...(subscription as object) } as never)

    expect(await unsubscribeUser()).toEqual({ ok: true, value: true })
    expect((await unsubscribeUser()).ok).toBe(false)
  })

  it('makes a later delivery possible', async () => {
    await subscribeUser(subscription)
    sendNotification.mockResolvedValue(undefined)

    const result = await sendPushNotification({ title: 'Overdue', body: 'x' })

    expect(result.ok).toBe(true)
  })
})

describe('unsubscribeUser', () => {
  it('drops a registered subscription', async () => {
    await subscribeUser(subscription)
    expect((await unsubscribeUser()).ok).toBe(true)
  })

  it('reports noSubscription rather than pretending it removed one', async () => {
    const result = await unsubscribeUser()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('noSubscription')
  })

  it('leaves nothing behind for a later delivery', async () => {
    await subscribeUser(subscription)
    await unsubscribeUser()

    const result = await sendPushNotification({ title: 'Overdue', body: 'x' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('noSubscription')
  })
})

describe('sendPushNotification', () => {
  it('delivers the payload the service worker knows how to display', async () => {
    await subscribeUser(subscription)
    sendNotification.mockResolvedValue(undefined)

    await sendPushNotification({
      title: 'Overdue',
      body: '"Pay Mortgage" is now overdue.',
      tag: 'overdue-endeavor-1',
    })

    expect(JSON.parse(sendNotification.mock.calls[0]?.[1] as string)).toEqual({
      title: 'Overdue',
      body: '"Pay Mortgage" is now overdue.',
      tag: 'overdue-endeavor-1',
    })
  })

  it('reports deliveryFailed when the push service refuses', async () => {
    await subscribeUser(subscription)
    sendNotification.mockRejectedValue(new Error('410 Gone'))

    const result = await sendPushNotification({ title: 'Overdue', body: 'x' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('deliveryFailed')
      expect(result.error.message).toContain('410 Gone')
    }
  })

  it('reports noSubscription when no device has registered', async () => {
    const result = await sendPushNotification({ title: 'Overdue', body: 'x' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('noSubscription')
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('never throws — every failure is a Result the caller can render', async () => {
    await subscribeUser(subscription)
    sendNotification.mockRejectedValue('a bare string, not an Error')

    await expect(
      sendPushNotification({ title: 'Overdue', body: 'x' }),
    ).resolves.toMatchObject({ ok: false })
  })

  it('reports notConfigured on a deployment with no VAPID keys', async () => {
    // A fresh module registry, because configuration is memoised after the
    // first successful call — the same memo that stops every delivery paying
    // for `setVapidDetails`.
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY

    const fresh = await import('./actions')
    const result = await fresh.sendPushNotification({
      title: 'Overdue',
      body: 'x',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('notConfigured')
  })
})
