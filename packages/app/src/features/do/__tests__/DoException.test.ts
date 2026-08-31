import { describe, expect, it } from 'vitest'
import { type DoException, DoExceptions } from '../DoException'

describe('DoExceptions', () => {
  it('marks a failed refresh recoverable, so the surface can offer a retry', () => {
    const exception = DoExceptions.fetchFailed('the store is unavailable')
    expect(exception.kind).toBe('fetchFailed')
    expect(exception.recoverable).toBe(true)
  })

  it('marks a stale card key unrecoverable — retrying cannot find it either', () => {
    expect(DoExceptions.endeavorNotFound('gone').recoverable).toBe(false)
  })

  it('keeps the two Clear Expired failures apart, because they mean different things', () => {
    // One says nothing was cleared; the other says everything was cleared but
    // today's occurrences did not come back. The user's next move differs.
    expect(DoExceptions.clearExpiredMutationFailed().kind).toBe(
      'clearExpiredMutationFailed',
    )
    expect(DoExceptions.clearExpiredRefreshFailed().kind).toBe(
      'clearExpiredRefreshFailed',
    )
    expect(DoExceptions.clearExpiredMutationFailed().message).not.toBe(
      DoExceptions.clearExpiredRefreshFailed().message,
    )
  })

  it('carries canon’s own copy rather than the raw cause', () => {
    expect(DoExceptions.clearExpiredMutationFailed().message).toBe(
      "Couldn't clear every expired endeavor.",
    )
  })

  it('folds the developer-facing cause into the message, never into the kind', () => {
    const exception = DoExceptions.preferencesLoadFailed('storage is gone')
    expect(exception.kind).toBe('preferencesLoadFailed')
    expect(exception.message).toContain('storage is gone')
  })

  it('offers the generic fallback a defensive rejected arm can land in', () => {
    const exception: DoException = DoExceptions.unknown('kaboom')
    expect(exception.kind).toBe('unknown')
    expect(exception.recoverable).toBe(true)
  })

  it('narrows exhaustively on kind — the discriminant is the whole contract', () => {
    const copyFor = (exception: DoException): string => {
      switch (exception.kind) {
        case 'preferencesLoadFailed':
        case 'fetchFailed':
        case 'clearExpiredMutationFailed':
        case 'clearExpiredRefreshFailed':
        case 'markCompleteFailed':
        case 'endeavorNotFound':
        case 'unknown':
          return exception.kind
      }
    }
    expect(copyFor(DoExceptions.markCompleteFailed('disk full'))).toBe(
      'markCompleteFailed',
    )
  })
})
