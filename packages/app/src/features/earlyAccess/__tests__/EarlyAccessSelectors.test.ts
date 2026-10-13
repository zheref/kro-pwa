import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import type { EarlyAccessState } from '../EarlyAccessFeature'
import { EarlyAccessMocks } from '../EarlyAccessMocks'
import {
  selectCanSubmit,
  selectEmail,
  selectEmailError,
  selectFailureCopy,
  selectFailureIsRetryable,
  selectFailureKind,
  selectHoneypot,
  selectIsSubmitting,
  selectPlatform,
  selectReceipt,
  selectSubmitState,
} from '../EarlyAccessSelectors'

const rootWith = (earlyAccess: EarlyAccessState): RootState =>
  ({ earlyAccess }) as unknown as RootState

describe('selectCanSubmit', () => {
  it('is true for a likely address on an idle form', () => {
    expect(selectCanSubmit(rootWith(EarlyAccessMocks.typing))).toBe(true)
  })
  it('is false for an empty form', () => {
    expect(selectCanSubmit(rootWith(EarlyAccessMocks.idle))).toBe(false)
  })
  it('is false while a request is in flight — no double submit', () => {
    expect(selectCanSubmit(rootWith(EarlyAccessMocks.submitting))).toBe(false)
  })
  it('is false once joined, and false for a half-typed address', () => {
    expect(selectCanSubmit(rootWith(EarlyAccessMocks.joined))).toBe(false)
    expect(selectCanSubmit(rootWith(EarlyAccessMocks.typingInvalid))).toBe(
      false,
    )
  })
  it('ignores surrounding whitespace on a valid address', () => {
    expect(
      selectCanSubmit(
        rootWith({ ...EarlyAccessMocks.typing, email: '  ada@example.com ' }),
      ),
    ).toBe(true)
  })
})

describe('selectSubmitState / selectIsSubmitting', () => {
  it('reads the lifecycle union as-is', () => {
    expect(selectSubmitState(rootWith(EarlyAccessMocks.idle))).toEqual({
      kind: 'idle',
    })
  })
  it('flags submitting', () => {
    expect(selectIsSubmitting(rootWith(EarlyAccessMocks.submitting))).toBe(true)
  })
  it('is not submitting when failed', () => {
    expect(selectIsSubmitting(rootWith(EarlyAccessMocks.failedOffline))).toBe(
      false,
    )
  })
})

describe('selectFailureCopy / kind / retryable', () => {
  it('is null when nothing failed', () => {
    expect(selectFailureCopy(rootWith(EarlyAccessMocks.typing))).toBeNull()
    expect(selectFailureKind(rootWith(EarlyAccessMocks.typing))).toBeNull()
    expect(selectFailureIsRetryable(rootWith(EarlyAccessMocks.typing))).toBe(
      false,
    )
  })
  it('is the offline copy with a retry', () => {
    expect(selectFailureCopy(rootWith(EarlyAccessMocks.failedOffline))).toMatch(
      /offline/i,
    )
    expect(
      selectFailureIsRetryable(rootWith(EarlyAccessMocks.failedOffline)),
    ).toBe(true)
  })
  it('alreadyJoined says so and is NOT retryable', () => {
    const root = rootWith(EarlyAccessMocks.failedAlreadyJoined)
    expect(selectFailureCopy(root)).toMatch(/already on the list/i)
    expect(selectFailureKind(root)).toBe('alreadyJoined')
    expect(selectFailureIsRetryable(root)).toBe(false)
  })
  it('unavailable is retryable', () => {
    expect(
      selectFailureIsRetryable(rootWith(EarlyAccessMocks.failedUnavailable)),
    ).toBe(true)
  })
})

describe('selectReceipt', () => {
  it('is the receipt once joined', () => {
    expect(selectReceipt(rootWith(EarlyAccessMocks.joined))?.id).toBe('ea-0001')
  })
  it('is null while idle', () => {
    expect(selectReceipt(rootWith(EarlyAccessMocks.idle))).toBeNull()
  })
  it('is null when failed', () => {
    expect(selectReceipt(rootWith(EarlyAccessMocks.failedInvalid))).toBeNull()
  })
})

describe('selectEmailError', () => {
  it('is null for an untouched empty field — silence until a submit says otherwise', () => {
    expect(selectEmailError(rootWith(EarlyAccessMocks.idle))).toBeNull()
  })
  it('appears once a not-valid address was left', () => {
    expect(selectEmailError(rootWith(EarlyAccessMocks.typingInvalid))).toMatch(
      /does not look right/i,
    )
  })
  it('does not appear for an invalid address that has not been left yet', () => {
    expect(
      selectEmailError(
        rootWith({ ...EarlyAccessMocks.typingInvalid, emailTouched: false }),
      ),
    ).toBeNull()
  })
  it('appears when the sign-up came back invalidEmail', () => {
    expect(selectEmailError(rootWith(EarlyAccessMocks.failedInvalid))).toMatch(
      /does not look right/i,
    )
  })
  it('is null for a valid address even after leaving the field', () => {
    expect(
      selectEmailError(
        rootWith({ ...EarlyAccessMocks.typing, emailTouched: true }),
      ),
    ).toBeNull()
  })
})

describe('field reads', () => {
  it('selectEmail, selectPlatform and selectHoneypot are O(1) field reads', () => {
    const root = rootWith({ ...EarlyAccessMocks.typing, website: 'bot' })
    expect(selectEmail(root)).toBe('ada@example.com')
    expect(selectPlatform(root)).toBe('macos')
    expect(selectHoneypot(root)).toBe('bot')
  })
  it('default to the empty form', () => {
    const root = rootWith(EarlyAccessMocks.idle)
    expect(selectEmail(root)).toBe('')
    expect(selectPlatform(root)).toBe('ios')
    expect(selectHoneypot(root)).toBe('')
  })
  it('are stable on an unchanged slice', () => {
    const root = rootWith(EarlyAccessMocks.typing)
    expect(selectEmail(root)).toBe(selectEmail(root))
  })
})
