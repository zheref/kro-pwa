/** The activity screen's closed exception union and its factory. */
import { describe, expect, it } from 'vitest'
import { EndeavorActivityExceptions } from '../EndeavorActivityException'

describe('EndeavorActivityExceptions', () => {
  it('names a missing endeavor by id, and does not offer a retry', () => {
    const exception = EndeavorActivityExceptions.endeavorNotFound('e-9')
    expect(exception.kind).toBe('endeavorNotFound')
    expect(exception.message).toContain("'e-9'")
    expect(exception.recoverable).toBe(false)
  })

  it('reports a failed read with its reason, and is retryable', () => {
    const exception = EndeavorActivityExceptions.loadFailed(
      'the database is closed',
    )
    expect(exception.kind).toBe('loadFailed')
    expect(exception.message).toBe(
      "Couldn't load activity: the database is closed",
    )
    expect(exception.recoverable).toBe(true)
  })

  it('carries an unexpected message through unchanged', () => {
    const exception = EndeavorActivityExceptions.unknown('boom')
    expect(exception).toMatchObject({
      kind: 'unknown',
      message: 'boom',
      recoverable: true,
    })
  })
})
