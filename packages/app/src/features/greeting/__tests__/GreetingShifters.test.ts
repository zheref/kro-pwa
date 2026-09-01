import { GreetingExceptions } from '@kro/core'
import { greetingMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { greetingStateMocks } from '../GreetingMocks'
import {
  withException,
  withGreetingLoaded,
  withLoadingStarted,
  withRecipientStamped,
} from '../GreetingShifters'

describe('withRecipientStamped', () => {
  it('names the recipient and starts loading — the surface just mounted', () => {
    const next = withRecipientStamped(greetingStateMocks.idle, 'ada')

    expect(next.recipient).toBe('ada')
    expect(next.load.kind).toBe('loading')
  })

  it('drops a stale exception when a new recipient is named — the user typed a different name', () => {
    const next = withRecipientStamped(greetingStateMocks.failedOffline, 'grace')

    expect(next.load.kind).toBe('loading')
    expect(next.recipient).toBe('grace')
  })

  it('closes a detail left open by the previous recipient rather than showing it over new data', () => {
    const next = withRecipientStamped(
      greetingStateMocks.loadedWithDetailOpen,
      'grace',
    )

    expect(next.detailOpen).toBe(false)
  })

  it('never mutates the state it was given — Shifters are pure', () => {
    const before = greetingStateMocks.idle

    withRecipientStamped(before, 'ada')

    expect(before).toEqual(greetingStateMocks.idle)
  })
})

describe('withLoadingStarted', () => {
  it('moves an idle surface into loading — the first request goes out', () => {
    expect(withLoadingStarted(greetingStateMocks.idle).load.kind).toBe(
      'loading',
    )
  })

  it('clears the exception when the user retries after an error', () => {
    const next = withLoadingStarted(greetingStateMocks.failedOffline)

    expect(next.load.kind).toBe('loading')
  })

  it('leaves the recipient and the detail flag alone — one concern per Shifter', () => {
    const next = withLoadingStarted(greetingStateMocks.loadedWithDetailOpen)

    expect(next.recipient).toBe('ada')
    expect(next.detailOpen).toBe(true)
  })

  it('is a no-op in effect when a request is already in flight', () => {
    expect(withLoadingStarted(greetingStateMocks.loading)).toEqual(
      greetingStateMocks.loading,
    )
  })
})

describe('withGreetingLoaded', () => {
  it('carries the greeting into the loaded arm — the ordinary success', () => {
    const next = withGreetingLoaded(
      greetingStateMocks.loading,
      greetingMocks.typical,
    )

    expect(next.load).toEqual({
      kind: 'loaded',
      greeting: greetingMocks.typical,
    })
  })

  it('replaces a previous greeting when a second load lands', () => {
    const next = withGreetingLoaded(
      greetingStateMocks.loaded,
      greetingMocks.unicode,
    )

    if (next.load.kind !== 'loaded') throw new Error('expected the loaded arm')
    expect(next.load.greeting.recipient).toBe('山田')
  })

  it('recovers from a failed state without a separate "clear the error" step', () => {
    const next = withGreetingLoaded(
      greetingStateMocks.failedOffline,
      greetingMocks.typical,
    )

    expect(next.load.kind).toBe('loaded')
  })
})

describe('withException', () => {
  it('parks the typed exception in the failed arm — the request came back 404', () => {
    const next = withException(
      greetingStateMocks.loading,
      GreetingExceptions.notFound(),
    )

    if (next.load.kind !== 'failed') throw new Error('expected the failed arm')
    expect(next.load.exception.kind).toBe('notFound')
  })

  it('closes an open detail — nothing can be shown on top of a failed load', () => {
    const next = withException(
      greetingStateMocks.loadedWithDetailOpen,
      GreetingExceptions.offline(),
    )

    expect(next.detailOpen).toBe(false)
  })

  it('keeps the recipient so a retry knows what to ask for again', () => {
    const next = withException(
      greetingStateMocks.loading,
      GreetingExceptions.offline(),
    )

    expect(next.recipient).toBe('ada')
  })
})
