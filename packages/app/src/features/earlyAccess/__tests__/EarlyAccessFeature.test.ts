import { EarlyAccessExceptions } from '@kro/core'
import { earlyAccessMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { selectFailureCopy } from '../EarlyAccessSelectors'
import {
  earlyAccessSlice,
  initialEarlyAccessState,
  onPlatformRequested,
  userDidBlurEmail,
  userDidDismissFailure,
  userDidEditEmail,
  userDidEditHoneypot,
  userDidPickPlatform,
  userDidStartOver,
} from '../EarlyAccessFeature'
import { EarlyAccessMocks } from '../EarlyAccessMocks'
import { joinEarlyAccessThunk } from '../EarlyAccessProducer'

const reduce = earlyAccessSlice.reducer

describe('early-access reducers', () => {
  describe('userDidEditEmail', () => {
    it('records the typed value', () => {
      expect(
        reduce(initialEarlyAccessState, userDidEditEmail({ value: 'a@b.co' }))
          .email,
      ).toBe('a@b.co')
    })
    it('accepts the empty string — clearing the field', () => {
      expect(
        reduce(EarlyAccessMocks.typing, userDidEditEmail({ value: '' })).email,
      ).toBe('')
    })
    it('clears a retryable failure while typing', () => {
      expect(
        reduce(
          EarlyAccessMocks.failedOffline,
          userDidEditEmail({ value: 'x@y.zz' }),
        ).submit.kind,
      ).toBe('idle')
    })
  })

  describe('userDidBlurEmail', () => {
    it('marks the field as left', () => {
      expect(
        reduce(initialEarlyAccessState, userDidBlurEmail()).emailTouched,
      ).toBe(true)
    })
    it('is idempotent', () => {
      const once = reduce(initialEarlyAccessState, userDidBlurEmail())
      expect(reduce(once, userDidBlurEmail())).toEqual(once)
    })
    it('leaves a success alone', () => {
      expect(
        reduce(EarlyAccessMocks.joined, userDidBlurEmail()).submit.kind,
      ).toBe('joined')
    })
  })

  describe('userDidPickPlatform', () => {
    it('picks a platform', () => {
      expect(
        reduce(
          initialEarlyAccessState,
          userDidPickPlatform({ platform: 'watchos' }),
        ).platform,
      ).toBe('watchos')
    })
    it('can be changed again', () => {
      const a = reduce(
        initialEarlyAccessState,
        userDidPickPlatform({ platform: 'web' }),
      )
      expect(
        reduce(a, userDidPickPlatform({ platform: 'windows' })).platform,
      ).toBe('windows')
    })
    it('keeps the email', () => {
      expect(
        reduce(
          EarlyAccessMocks.typing,
          userDidPickPlatform({ platform: 'ipados' }),
        ).email,
      ).toBe('ada@example.com')
    })
  })

  describe('onPlatformRequested', () => {
    it('the landing asked for the Mac — the form picks it', () => {
      expect(
        reduce(
          initialEarlyAccessState,
          onPlatformRequested({ platform: 'macos' }),
        ).platform,
      ).toBe('macos')
    })
    it('replaces a pick the visitor already made (they just voted for another)', () => {
      expect(
        reduce(
          EarlyAccessMocks.typing,
          onPlatformRequested({ platform: 'android' }),
        ).platform,
      ).toBe('android')
    })
    it('keeps the typed address and a failed sign-up as they were', () => {
      const next = reduce(
        EarlyAccessMocks.failedOffline,
        onPlatformRequested({ platform: 'web' }),
      )
      expect(next.email).toBe('ada@example.com')
      expect(next.submit).toEqual(EarlyAccessMocks.failedOffline.submit)
    })
  })

  describe('userDidEditHoneypot', () => {
    it('records the honeypot', () => {
      expect(
        reduce(initialEarlyAccessState, userDidEditHoneypot({ value: 'bot' }))
          .website,
      ).toBe('bot')
    })
    it('can be emptied', () => {
      expect(
        reduce(
          { ...initialEarlyAccessState, website: 'bot' },
          userDidEditHoneypot({ value: '' }),
        ).website,
      ).toBe('')
    })
    it('does not move the lifecycle', () => {
      expect(
        reduce(EarlyAccessMocks.typing, userDidEditHoneypot({ value: 'bot' }))
          .submit,
      ).toEqual({ kind: 'idle' })
    })
  })

  describe('userDidDismissFailure', () => {
    it('returns a failure to idle', () => {
      expect(
        reduce(EarlyAccessMocks.failedUnavailable, userDidDismissFailure())
          .submit.kind,
      ).toBe('idle')
    })
    it('is a no-op when idle', () => {
      expect(reduce(EarlyAccessMocks.typing, userDidDismissFailure())).toEqual(
        EarlyAccessMocks.typing,
      )
    })
    it('keeps what was typed', () => {
      expect(
        reduce(EarlyAccessMocks.failedOffline, userDidDismissFailure()).email,
      ).toBe('ada@example.com')
    })
  })

  describe('userDidStartOver', () => {
    it('resets after a success', () => {
      expect(
        reduce(EarlyAccessMocks.joined, userDidStartOver()).submit.kind,
      ).toBe('idle')
    })
    it('empties the email', () => {
      expect(reduce(EarlyAccessMocks.joined, userDidStartOver()).email).toBe('')
    })
    it('resets after alreadyJoined, the terminal failure', () => {
      expect(
        reduce(EarlyAccessMocks.failedAlreadyJoined, userDidStartOver()).submit
          .kind,
      ).toBe('idle')
    })
  })
})

describe('early-access extraReducers (the join Producer lifecycle)', () => {
  it('pending moves the form to submitting', () => {
    const next = reduce(
      EarlyAccessMocks.typing,
      joinEarlyAccessThunk.pending('req', undefined),
    )
    expect(next.submit).toEqual({ kind: 'submitting' })
  })

  it('fulfilled ok carries the receipt into joined', () => {
    const next = reduce(
      EarlyAccessMocks.submitting,
      joinEarlyAccessThunk.fulfilled(
        { ok: true, value: earlyAccessMocks.typical },
        'req',
        undefined,
      ),
    )
    expect(next.submit).toEqual({
      kind: 'joined',
      receipt: earlyAccessMocks.typical,
    })
  })

  it('fulfilled err carries the exception into failed', () => {
    const error = EarlyAccessExceptions.alreadyJoined()
    const next = reduce(
      EarlyAccessMocks.submitting,
      joinEarlyAccessThunk.fulfilled({ ok: false, error }, 'req', undefined),
    )
    expect(next.submit).toEqual({ kind: 'failed', exception: error })
  })

  it('defensive rejected degrades to the generic unknown failure, never the thrown text', () => {
    const next = reduce(
      EarlyAccessMocks.submitting,
      joinEarlyAccessThunk.rejected(
        new Error('serializer blew up'),
        'req',
        undefined,
      ),
    )
    expect(next.submit).toEqual({
      kind: 'failed',
      exception: EarlyAccessExceptions.unknown(),
    })
  })

  it('a rejected arm with an empty error message shows the same generic copy', () => {
    const next = reduce(
      EarlyAccessMocks.submitting,
      joinEarlyAccessThunk.rejected(new Error(''), 'req', undefined),
    )
    expect(
      selectFailureCopy({ earlyAccess: next } as unknown as RootState),
    ).toBe(EarlyAccessExceptions.unknown().message)
  })

  it('the visitor never sees a thrown message: the copy the selector returns has no trace of it', () => {
    const next = reduce(
      EarlyAccessMocks.submitting,
      joinEarlyAccessThunk.rejected(
        new Error('TypeError: x is not a function at join.ts:42'),
        'req',
        undefined,
      ),
    )
    expect(
      selectFailureCopy({ earlyAccess: next } as unknown as RootState),
    ).not.toMatch(/TypeError|join\.ts/)
  })

  it('rejected by ABORT returns early — cancellation is the one silent exit', () => {
    const aborted = joinEarlyAccessThunk.rejected(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
      'req',
      undefined,
    )
    expect(aborted.meta.aborted).toBe(true)
    expect(reduce(EarlyAccessMocks.submitting, aborted)).toEqual(
      EarlyAccessMocks.submitting,
    )
  })

  it('rejected by a declined condition (a second press) also returns early', () => {
    const declined = joinEarlyAccessThunk.rejected(
      Object.assign(new Error('Declined'), { name: 'ConditionError' }),
      'req',
      undefined,
    )
    expect(declined.meta.condition).toBe(true)
    expect(reduce(EarlyAccessMocks.submitting, declined)).toEqual(
      EarlyAccessMocks.submitting,
    )
  })
})
