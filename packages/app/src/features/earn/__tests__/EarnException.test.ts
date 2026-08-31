import { describe, expect, it } from 'vitest'
import { type EarnException, EarnExceptions } from '../EarnException'

describe('EarnExceptions', () => {
  it('marks a blank-title guard recoverable — the user can just type a title', () => {
    const exception = EarnExceptions.blankTitle()
    expect(exception.kind).toBe('blankTitle')
    expect(exception.recoverable).toBe(true)
  })

  it('folds the developer-facing cause into the message, never into the kind', () => {
    const exception = EarnExceptions.catalogLoadFailed('storage is gone')
    expect(exception.kind).toBe('catalogLoadFailed')
    expect(exception.message).toContain('storage is gone')
  })

  it('keeps the three mutation failures apart, because they mean different things', () => {
    expect(EarnExceptions.addRewardFailed('x').kind).toBe('addRewardFailed')
    expect(EarnExceptions.deleteRewardFailed('x').kind).toBe('deleteRewardFailed')
    expect(EarnExceptions.claimRewardFailed('x').kind).toBe('claimRewardFailed')
  })

  it('marks every mutation failure recoverable — a retry can succeed', () => {
    expect(EarnExceptions.addRewardFailed('x').recoverable).toBe(true)
    expect(EarnExceptions.deleteRewardFailed('x').recoverable).toBe(true)
    expect(EarnExceptions.claimRewardFailed('x').recoverable).toBe(true)
  })

  it('offers the generic fallback a defensive rejected arm can land in', () => {
    const exception: EarnException = EarnExceptions.unknown('kaboom')
    expect(exception.kind).toBe('unknown')
    expect(exception.recoverable).toBe(true)
  })

  it('narrows exhaustively on kind — the discriminant is the whole contract', () => {
    const copyFor = (exception: EarnException): string => {
      switch (exception.kind) {
        case 'preferencesLoadFailed':
        case 'catalogLoadFailed':
        case 'blankTitle':
        case 'addRewardFailed':
        case 'deleteRewardFailed':
        case 'claimRewardFailed':
        case 'unknown':
          return exception.kind
      }
    }
    expect(copyFor(EarnExceptions.preferencesLoadFailed('offline'))).toBe(
      'preferencesLoadFailed',
    )
  })
})
