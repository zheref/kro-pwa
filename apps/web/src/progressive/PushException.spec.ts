import { describe, expect, it } from 'vitest'
import { PushExceptions } from './PushException'

describe('PushExceptions', () => {
  it('marks a missing VAPID configuration unrecoverable — no retry will fix it', () => {
    const exception = PushExceptions.notConfigured()
    expect(exception.kind).toBe('notConfigured')
    expect(exception.recoverable).toBe(false)
  })

  it('marks a missing subscription recoverable — subscribing fixes it', () => {
    const exception = PushExceptions.noSubscription()
    expect(exception.kind).toBe('noSubscription')
    expect(exception.recoverable).toBe(true)
  })

  it("keeps the push service's own reason in a delivery failure", () => {
    const exception = PushExceptions.deliveryFailed('410 Gone')
    expect(exception.kind).toBe('deliveryFailed')
    expect(exception.message).toContain('410 Gone')
  })
})
