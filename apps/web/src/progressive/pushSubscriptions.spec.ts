import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentPushSubscription,
  forgetPushSubscription,
  rememberPushSubscription,
  resetPushSubscriptions,
} from './pushSubscriptions'

const subscription = {
  endpoint: 'https://push.example/1',
  keys: { p256dh: 'p', auth: 'a' },
} as never

beforeEach(() => {
  resetPushSubscriptions()
})

describe('pushSubscriptions', () => {
  it('starts with no device registered', () => {
    expect(currentPushSubscription()).toBeNull()
  })

  it('remembers the device that subscribed', () => {
    rememberPushSubscription(subscription)
    expect(currentPushSubscription()).toBe(subscription)
  })

  it('keeps one device, not a list — the documented single-device limit', () => {
    const second = { ...(subscription as object) } as never
    rememberPushSubscription(subscription)
    rememberPushSubscription(second)

    expect(currentPushSubscription()).toBe(second)
  })

  it('reports whether forgetting actually removed anything', () => {
    expect(forgetPushSubscription()).toBe(false)

    rememberPushSubscription(subscription)

    expect(forgetPushSubscription()).toBe(true)
    expect(currentPushSubscription()).toBeNull()
  })

  it("resets, so one suite cannot see another suite's device", () => {
    rememberPushSubscription(subscription)
    resetPushSubscriptions()
    expect(currentPushSubscription()).toBeNull()
  })
})
