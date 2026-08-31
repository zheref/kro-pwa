/**
 * The typed failure union. Each case is asserted on its `kind` and its
 * `recoverable` flag, because those two are what a surface branches on — the
 * message is copy, not control flow (`RC-8`).
 */
import { describe, expect, it } from 'vitest'
import { FindExceptions, findExceptionMessage } from '../FindException'

describe('FindExceptions carries a retryable answer per failure', () => {
  it('marks a failed refresh retryable — the user can pull again', () => {
    const exception = FindExceptions.fetchFailed('offline')
    expect(exception.kind).toBe('fetchFailed')
    expect(exception.recoverable).toBe(true)
    expect(exception.message).toContain('offline')
  })

  it('marks a failed write retryable', () => {
    expect(FindExceptions.operationFailed('disk full').recoverable).toBe(true)
  })

  it('marks a partial bulk operation retryable, naming the reason', () => {
    const exception = FindExceptions.bulkOperationFailed('quota exceeded')
    expect(exception.kind).toBe('bulkOperationFailed')
    expect(exception.message).toContain('quota exceeded')
  })

  it('marks a stale row tap NOT retryable — the same lookup would miss again', () => {
    const exception = FindExceptions.endeavorNotFound('ghost')
    expect(exception.recoverable).toBe(false)
    expect(exception.message).toContain('ghost')
  })

  it('carries the defensive fallback for a thunk that genuinely threw', () => {
    expect(FindExceptions.unknown('boom').kind).toBe('unknown')
  })
})

describe('findExceptionMessage narrows whatever was thrown', () => {
  it('uses an Error’s own message', () => {
    expect(findExceptionMessage(new Error('disk gone'))).toBe('disk gone')
  })

  it('stringifies a thrown non-Error', () => {
    expect(findExceptionMessage('plain string')).toBe('plain string')
  })

  it('survives a thrown null without crashing the failure path', () => {
    expect(findExceptionMessage(null)).toBe('null')
  })
})
