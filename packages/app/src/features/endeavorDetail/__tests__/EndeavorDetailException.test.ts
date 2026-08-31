/**
 * The typed failure union. Each case is asserted on its `kind` and its
 * `recoverable` flag — the two a surface branches on (`RC-8`).
 */
import { describe, expect, it } from 'vitest'
import {
  EndeavorDetailExceptions,
  detailExceptionMessage,
} from '../EndeavorDetailException'

describe('EndeavorDetailExceptions says whether a retry can help', () => {
  it('marks a failed local save retryable — nothing was written', () => {
    const exception = EndeavorDetailExceptions.localPersistenceFailed('disk full')
    expect(exception.kind).toBe('localPersistenceFailed')
    expect(exception.recoverable).toBe(true)
    expect(exception.message).toContain('disk full')
  })

  it('marks a failed relation write retryable', () => {
    expect(
      EndeavorDetailExceptions.relationSyncFailed('quota').recoverable,
    ).toBe(true)
  })

  it('marks a missing provider adapter NOT retryable — the build cannot do it', () => {
    const exception = EndeavorDetailExceptions.hostAdapterUnavailable(
      'Google Calendar mirroring is not connected yet.',
    )
    expect(exception.kind).toBe('hostAdapterUnavailable')
    expect(exception.recoverable).toBe(false)
  })

  it('marks a vanished endeavor NOT retryable — the lookup would miss again', () => {
    const exception = EndeavorDetailExceptions.endeavorNotFound('ghost')
    expect(exception.recoverable).toBe(false)
    expect(exception.message).toContain('ghost')
  })

  it('carries the defensive fallback for a thunk that genuinely threw', () => {
    expect(EndeavorDetailExceptions.unknown('boom').kind).toBe('unknown')
  })
})

describe('detailExceptionMessage narrows whatever was thrown', () => {
  it('uses an Error’s own message', () => {
    expect(detailExceptionMessage(new Error('disk full'))).toBe('disk full')
  })

  it('stringifies a thrown non-Error', () => {
    expect(detailExceptionMessage(42)).toBe('42')
  })

  it('survives a thrown undefined without crashing the failure path', () => {
    expect(detailExceptionMessage(undefined)).toBe('undefined')
  })
})
