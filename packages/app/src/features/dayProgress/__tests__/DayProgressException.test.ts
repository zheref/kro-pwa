import { describe, expect, it } from 'vitest'
import {
  DayProgressExceptions,
  dayProgressExceptionCopy,
  dayProgressExceptionMessage,
} from '../DayProgressException'

describe('DayProgressExceptions', () => {
  it('a failed read is recoverable and keeps the reason for logs', () => {
    const failure = DayProgressExceptions.loadFailed('quota exceeded')
    expect(failure.kind).toBe('loadFailed')
    expect(failure.recoverable).toBe(true)
    expect(failure.message).toContain('quota exceeded')
  })

  it('user copy is chosen by kind, never read from the message', () => {
    expect(
      dayProgressExceptionCopy(DayProgressExceptions.loadFailed('x')),
    ).toBe("Couldn't load your activity for this day.")
    expect(dayProgressExceptionCopy(DayProgressExceptions.unknown('x'))).toBe(
      'Something went wrong loading your day.',
    )
  })

  it('narrows an Error and a thrown non-Error into a message', () => {
    expect(dayProgressExceptionMessage(new Error('boom'))).toBe('boom')
    expect(dayProgressExceptionMessage('plain')).toBe('plain')
  })
})
