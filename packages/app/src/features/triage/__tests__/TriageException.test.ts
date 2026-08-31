import { assertNever } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { type TriageException, TriageExceptions } from '../TriageException'

/** Every case, so adding one without user copy fails the build here first. */
const copyFor = (exception: TriageException): string => {
  switch (exception.kind) {
    case 'sessionLoadFailed':
    case 'endeavorNotFound':
    case 'incompleteDecision':
    case 'localSaveFailed':
    case 'unknown':
      return exception.message
    default:
      return assertNever(exception)
  }
}

describe('TriageExceptions.sessionLoadFailed', () => {
  it('names the surface that could not open, and the underlying reason', () => {
    const exception = TriageExceptions.sessionLoadFailed('IndexedDB is blocked')

    expect(exception.kind).toBe('sessionLoadFailed')
    expect(exception.message).toContain('IndexedDB is blocked')
  })

  it('is recoverable — the user can open Triage again', () => {
    expect(TriageExceptions.sessionLoadFailed('transient').recoverable).toBe(
      true,
    )
  })

  it('survives an empty reason without losing its own copy', () => {
    expect(TriageExceptions.sessionLoadFailed('').message).toContain(
      "Couldn't open Triage",
    )
  })
})

describe('TriageExceptions.endeavorNotFound', () => {
  it('quotes the row id that could not be found', () => {
    expect(TriageExceptions.endeavorNotFound('row-9').message).toContain(
      "'row-9'",
    )
  })

  it('is NOT recoverable — retrying reads the same absence', () => {
    expect(TriageExceptions.endeavorNotFound('row-9').recoverable).toBe(false)
  })

  it('carries its own kind for an exhaustive switch', () => {
    expect(TriageExceptions.endeavorNotFound('row-9').kind).toBe(
      'endeavorNotFound',
    )
  })
})

describe('TriageExceptions.incompleteDecision', () => {
  it('carries the gate’s own reason verbatim, so the copy is stated once', () => {
    const reason = 'Add a scheduled date to complete this triage.'

    expect(TriageExceptions.incompleteDecision(reason).message).toBe(reason)
  })

  it('is recoverable — the user can fill the missing field in', () => {
    expect(TriageExceptions.incompleteDecision('anything').recoverable).toBe(
      true,
    )
  })

  it('carries its own kind', () => {
    expect(TriageExceptions.incompleteDecision('anything').kind).toBe(
      'incompleteDecision',
    )
  })
})

describe('TriageExceptions.localSaveFailed', () => {
  it('is the ONE failure that means the decision was not captured', () => {
    const exception = TriageExceptions.localSaveFailed('QuotaExceededError')

    expect(exception.kind).toBe('localSaveFailed')
    expect(exception.message).toContain('QuotaExceededError')
  })

  it('is recoverable — the user can press Complete again', () => {
    expect(TriageExceptions.localSaveFailed('disk full').recoverable).toBe(true)
  })

  it('names the triage decision, not a generic save', () => {
    expect(TriageExceptions.localSaveFailed('x').message).toContain(
      'triage decision',
    )
  })
})

describe('TriageExceptions.unknown', () => {
  it('is the defensive `.rejected` landing shape', () => {
    expect(TriageExceptions.unknown('boom').kind).toBe('unknown')
  })

  it('carries the raw message through, since nothing else knows what happened', () => {
    expect(TriageExceptions.unknown('boom').message).toBe('boom')
  })

  it('is recoverable, because an unexplained failure may not recur', () => {
    expect(TriageExceptions.unknown('boom').recoverable).toBe(true)
  })
})

describe('the union', () => {
  it('has user copy for every case — an exhaustive switch compiles and runs', () => {
    const all: readonly TriageException[] = [
      TriageExceptions.sessionLoadFailed('a'),
      TriageExceptions.endeavorNotFound('b'),
      TriageExceptions.incompleteDecision('c'),
      TriageExceptions.localSaveFailed('d'),
      TriageExceptions.unknown('e'),
    ]

    for (const exception of all) {
      expect(copyFor(exception).length).toBeGreaterThan(0)
    }
  })

  it('carries NO remote-push case — a failed push is a status, not a failure', () => {
    expect(Object.keys(TriageExceptions)).not.toContain('remotePushFailed')
  })

  it('exposes exactly the five factories the feature needs', () => {
    expect(Object.keys(TriageExceptions).sort()).toEqual([
      'endeavorNotFound',
      'incompleteDecision',
      'localSaveFailed',
      'sessionLoadFailed',
      'unknown',
    ])
  })
})
