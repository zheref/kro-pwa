import { EarlyAccessExceptions } from '@kro/core'
import { earlyAccessMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { initialEarlyAccessState } from '../EarlyAccessFeature'
import { EarlyAccessMocks } from '../EarlyAccessMocks'
import {
  withEmail,
  withEmailTouched,
  withFailed,
  withFailureDismissed,
  withHoneypot,
  withJoined,
  withPlatform,
  withStartedOver,
  withSubmitting,
} from '../EarlyAccessShifters'

describe('withEmail', () => {
  it('records what the visitor typed', () => {
    expect(withEmail(initialEarlyAccessState, 'ada@example.com').email).toBe(
      'ada@example.com',
    )
  })

  it('typing after a retryable failure puts the form back to idle — the visitor is fixing it', () => {
    const next = withEmail(EarlyAccessMocks.failedInvalid, 'ada@example.com')
    expect(next.submit).toEqual({ kind: 'idle' })
  })

  it('typing after alreadyJoined does NOT clear it — that failure is terminal', () => {
    const next = withEmail(
      EarlyAccessMocks.failedAlreadyJoined,
      'other@example.com',
    )
    expect(next.submit.kind).toBe('failed')
  })
})

describe('withEmailTouched', () => {
  it('marks the field as left once', () => {
    expect(withEmailTouched(initialEarlyAccessState).emailTouched).toBe(true)
  })

  it('is idempotent', () => {
    const once = withEmailTouched(initialEarlyAccessState)
    expect(withEmailTouched(once)).toEqual(once)
  })

  it('does not change the address', () => {
    expect(withEmailTouched(EarlyAccessMocks.typing).email).toBe(
      'ada@example.com',
    )
  })
})

describe('withPlatform', () => {
  it('picks a platform', () => {
    expect(withPlatform(initialEarlyAccessState, 'android').platform).toBe(
      'android',
    )
  })

  it('is a value no-op for the platform already picked', () => {
    expect(withPlatform(initialEarlyAccessState, 'ios')).toEqual(
      initialEarlyAccessState,
    )
  })

  it('keeps the typed email', () => {
    expect(withPlatform(EarlyAccessMocks.typing, 'windows').email).toBe(
      'ada@example.com',
    )
  })
})

describe('withHoneypot', () => {
  it('records the honeypot value', () => {
    expect(
      withHoneypot(initialEarlyAccessState, 'https://spam.invalid').website,
    ).toBe('https://spam.invalid')
  })

  it('can be emptied again', () => {
    expect(
      withHoneypot(withHoneypot(initialEarlyAccessState, 'x'), '').website,
    ).toBe('')
  })

  it('never touches the visible fields', () => {
    const next = withHoneypot(EarlyAccessMocks.typing, 'x')
    expect(next.email).toBe(EarlyAccessMocks.typing.email)
    expect(next.platform).toBe(EarlyAccessMocks.typing.platform)
  })
})

describe('withSubmitting', () => {
  it('moves an idle form to submitting', () => {
    expect(withSubmitting(EarlyAccessMocks.typing).submit).toEqual({
      kind: 'submitting',
    })
  })

  it('replaces a failure — a retry is a fresh attempt', () => {
    expect(withSubmitting(EarlyAccessMocks.failedOffline).submit.kind).toBe(
      'submitting',
    )
  })

  it('keeps the email so the form does not blank mid-flight', () => {
    expect(withSubmitting(EarlyAccessMocks.typing).email).toBe(
      'ada@example.com',
    )
  })
})

describe('withJoined', () => {
  it('carries the receipt', () => {
    const next = withJoined(
      EarlyAccessMocks.submitting,
      earlyAccessMocks.typical,
    )
    expect(next.submit).toEqual({
      kind: 'joined',
      receipt: earlyAccessMocks.typical,
    })
  })

  it('works for a receipt with no queue position', () => {
    const next = withJoined(
      EarlyAccessMocks.submitting,
      earlyAccessMocks.noPosition,
    )
    expect(
      next.submit.kind === 'joined' && next.submit.receipt.position,
    ).toBeNull()
  })

  it('cannot be failed at the same time — the union holds one thing', () => {
    const next = withJoined(
      EarlyAccessMocks.failedOffline,
      earlyAccessMocks.typical,
    )
    expect(next.submit.kind).toBe('joined')
  })
})

describe('withFailed', () => {
  it('carries the typed exception', () => {
    const exception = EarlyAccessExceptions.offline()
    expect(withFailed(EarlyAccessMocks.submitting, exception).submit).toEqual({
      kind: 'failed',
      exception,
    })
  })

  it('replaces a prior failure with the newest one', () => {
    const next = withFailed(
      EarlyAccessMocks.failedOffline,
      EarlyAccessExceptions.unavailable(),
    )
    expect(next.submit.kind === 'failed' && next.submit.exception.kind).toBe(
      'unavailable',
    )
  })

  it('keeps the typed address so a retry needs no retyping', () => {
    expect(
      withFailed(EarlyAccessMocks.typing, EarlyAccessExceptions.unknown())
        .email,
    ).toBe('ada@example.com')
  })
})

describe('withFailureDismissed', () => {
  it('returns a failed form to idle', () => {
    expect(withFailureDismissed(EarlyAccessMocks.failedOffline).submit).toEqual(
      { kind: 'idle' },
    )
  })

  it('is a no-op when nothing failed', () => {
    expect(withFailureDismissed(EarlyAccessMocks.typing)).toBe(
      EarlyAccessMocks.typing,
    )
  })

  it('does not dismiss a success', () => {
    expect(withFailureDismissed(EarlyAccessMocks.joined).submit.kind).toBe(
      'joined',
    )
  })
})

describe('withStartedOver', () => {
  it('empties the form after a success', () => {
    const next = withStartedOver(EarlyAccessMocks.joined)
    expect(next.email).toBe('')
    expect(next.submit).toEqual({ kind: 'idle' })
  })

  it('keeps the platform the visitor chose', () => {
    expect(withStartedOver(EarlyAccessMocks.joined).platform).toBe('ios')
    expect(
      withStartedOver({ ...EarlyAccessMocks.joined, platform: 'android' })
        .platform,
    ).toBe('android')
  })

  it('forgets the touched flag, so a fresh form shows no error', () => {
    expect(withStartedOver(EarlyAccessMocks.typingInvalid).emailTouched).toBe(
      false,
    )
  })
})
