import { describe, expect, it } from 'vitest'
import { initialEarlyAccessState } from '../EarlyAccessFeature'
import {
  EarlyAccessMocks,
  earlyAccessFragmentProps,
  makeEarlyAccessStore,
  noopEarlyAccessCallbacks,
} from '../EarlyAccessMocks'

describe('EarlyAccessMocks', () => {
  it('covers every lifecycle kind the form can be in', () => {
    const kinds = new Set(
      Object.values(EarlyAccessMocks).map((state) => state.submit.kind),
    )
    expect([...kinds].sort()).toEqual([
      'failed',
      'idle',
      'joined',
      'submitting',
    ])
  })

  it('covers every EarlyAccessException kind the Service can produce', () => {
    const failed = Object.values(EarlyAccessMocks).flatMap((s) =>
      s.submit.kind === 'failed' ? [s.submit.exception.kind] : [],
    )
    expect(failed.sort()).toEqual([
      'alreadyJoined',
      'invalidEmail',
      'offline',
      'unavailable',
    ])
  })

  it('idle is the slice initial state', () => {
    expect(EarlyAccessMocks.idle).toEqual(initialEarlyAccessState)
  })
})

describe('earlyAccessFragmentProps', () => {
  it('shows the field error for an invalid, left address', () => {
    expect(
      earlyAccessFragmentProps(EarlyAccessMocks.typingInvalid).emailError,
    ).toMatch(/does not look right/i)
  })

  it('carries the failure copy and retryability of a failed state', () => {
    const props = earlyAccessFragmentProps(EarlyAccessMocks.failedAlreadyJoined)
    expect(props.failureCopy).toMatch(/already on the list/i)
    expect(props.failureIsRetryable).toBe(false)
  })

  it('has no error for a clean typing state and wires every callback as a no-op', () => {
    const props = earlyAccessFragmentProps(EarlyAccessMocks.typing)
    expect(props.emailError).toBeNull()
    expect(props.failureCopy).toBeNull()
    expect(
      Object.keys(noopEarlyAccessCallbacks).every(
        (key) => typeof (props as Record<string, unknown>)[key] === 'function',
      ),
    ).toBe(true)
  })
})

describe('makeEarlyAccessStore', () => {
  it('builds the one store with both slices registered and the form idle', () => {
    const { store } = makeEarlyAccessStore()
    expect(store.getState().earlyAccess).toEqual(initialEarlyAccessState)
    expect(store.getState().landing.navOpen).toBe(false)
  })

  it('gives every call its own store, so one story never leaks into the next', () => {
    const first = makeEarlyAccessStore().store
    const second = makeEarlyAccessStore().store
    expect(first).not.toBe(second)
  })

  it('swaps a Service for the double a caller passes and leaves the rest stubbed', async () => {
    const tracked: string[] = []
    const { store } = makeEarlyAccessStore({
      analyticsService: {
        track: (event) => void tracked.push(event),
        identify: () => undefined,
      },
    })
    const { trackLandingEventThunk } = await import(
      '../../landing/LandingProducer'
    )
    await store.dispatch(trackLandingEventThunk({ name: 'nav_open' }))
    expect(tracked).toEqual(['nav_open'])
  })
})
