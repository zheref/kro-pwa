/**
 * The session feature's typed failures (`RC-8`).
 *
 * The two guard exceptions carry the most weight: refusing a second session
 * has to be *visible*, so the surface that dispatched a start can tell the
 * refusal from a slow start.
 */
import { describe, expect, it } from 'vitest'
import {
  SessionExceptions,
  sessionExceptionMessage,
} from '../SessionException'

describe('SessionExceptions', () => {
  it('reports a refused second session as unrecoverable, not a retryable blip', () => {
    const exception = SessionExceptions.sessionAlreadyRunning()
    expect(exception.kind).toBe('sessionAlreadyRunning')
    expect(exception.recoverable).toBe(false)
  })

  it('names the one-session refusal in words the user can act on', () => {
    expect(SessionExceptions.sessionAlreadyRunning().message).toContain(
      'already running',
    )
  })

  it('marks a failed anchor write recoverable — the next transition rewrites it', () => {
    const exception = SessionExceptions.anchorWriteFailed('quota exceeded')
    expect(exception.recoverable).toBe(true)
    expect(exception.message).toContain('quota exceeded')
  })

  it('marks a failed recording recoverable, so the claim can be retried', () => {
    expect(
      SessionExceptions.performanceRecordFailed('disk full').recoverable,
    ).toBe(true)
  })

  it('gives every failure a distinct kind — no two collapse into one', () => {
    const kinds = [
      SessionExceptions.preferencesLoadFailed('x').kind,
      SessionExceptions.launchPrepareFailed('x').kind,
      SessionExceptions.anchorReadFailed('x').kind,
      SessionExceptions.anchorWriteFailed('x').kind,
      SessionExceptions.sessionAlreadyRunning().kind,
      SessionExceptions.noRunningSession().kind,
      SessionExceptions.performanceRecordFailed('x').kind,
      SessionExceptions.promotionFailed('x').kind,
      SessionExceptions.markCompleteFailed('x').kind,
      SessionExceptions.unknown('x').kind,
    ]
    expect(new Set(kinds).size).toBe(kinds.length)
  })
})

describe('sessionExceptionMessage', () => {
  it('reads an Error’s own message', () => {
    expect(sessionExceptionMessage(new Error('the store is unavailable'))).toBe(
      'the store is unavailable',
    )
  })

  it('stringifies a thrown non-Error rather than dropping it', () => {
    expect(sessionExceptionMessage('quota exceeded')).toBe('quota exceeded')
  })

  it('survives a thrown null without throwing again', () => {
    expect(sessionExceptionMessage(null)).toBe('null')
  })
})
