import { describe, expect, it } from 'vitest'
import { initialEarlyAccessState } from '../EarlyAccessFeature'
import {
  EarlyAccessMocks,
  earlyAccessFragmentProps,
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
