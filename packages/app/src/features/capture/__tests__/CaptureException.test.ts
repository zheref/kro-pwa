import { assertNever } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { type CaptureException, CaptureExceptions } from '../CaptureException'

/**
 * The copy a surface shows is derived from `kind`, never assembled in a view
 * (`RC-8`). This switch is the proof the union is closed: adding a member
 * without giving it a recovery affordance stops compiling here.
 */
const canRetry = (exception: CaptureException): boolean => {
  switch (exception.kind) {
    case 'contextLoadFailed':
    case 'invalidCapture':
    case 'captureFailed':
    case 'schedulingFailed':
    case 'undoFailed':
    case 'operationFailed':
    case 'unknown':
      return true
    case 'endeavorNotFound':
    case 'unsupportedOperation':
      return false
    default:
      return assertNever(exception)
  }
}

describe('the capture failures a user can act on', () => {
  it('offers a retry when the write simply failed', () => {
    expect(canRetry(CaptureExceptions.captureFailed('offline'))).toBe(true)
    expect(CaptureExceptions.captureFailed('offline').recoverable).toBe(true)
  })

  it('offers no retry for a row that is gone — reading it again finds nothing', () => {
    expect(canRetry(CaptureExceptions.endeavorNotFound('fresh-task'))).toBe(
      false,
    )
    expect(CaptureExceptions.endeavorNotFound('fresh-task').recoverable).toBe(
      false,
    )
  })

  it('offers no retry for an operation this surface does not implement', () => {
    expect(canRetry(CaptureExceptions.unsupportedOperation('edit'))).toBe(false)
  })
})

describe('the copy each failure carries', () => {
  it('names the row that could not be found', () => {
    expect(CaptureExceptions.endeavorNotFound('fresh-task').message).toBe(
      "No endeavor with id 'fresh-task' is in the Inbox.",
    )
  })

  it('passes the validation reason straight through, so Add’s tooltip and the error agree', () => {
    expect(
      CaptureExceptions.invalidCapture('Pick an end time to add this event.')
        .message,
    ).toBe('Pick an end time to add this event.')
  })

  it('explains a failed undo without blaming the user', () => {
    expect(CaptureExceptions.undoFailed('quota exceeded').message).toBe(
      "Couldn't undo that scheduling: quota exceeded",
    )
  })

  it('carries the underlying message on the defensive fallback', () => {
    expect(CaptureExceptions.unknown('boom').kind).toBe('unknown')
    expect(CaptureExceptions.unknown('boom').message).toBe('boom')
  })
})
