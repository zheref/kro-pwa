import { describe, expect, it } from 'vitest'
import {
  DayTimelineExceptions,
  dayTimelineExceptionCopy,
  dayTimelineExceptionMessage,
} from '../DayTimelineException'

describe('DayTimelineExceptions', () => {
  it('loadFailed carries the reason for the log and is recoverable', () => {
    const failure = DayTimelineExceptions.loadFailed('disk full')
    expect(failure.kind).toBe('loadFailed')
    expect(failure.message).toContain('disk full')
    expect(failure.recoverable).toBe(true)
  })

  it('the pane sentence for a failed read never leaks the log message', () => {
    expect(
      dayTimelineExceptionCopy(DayTimelineExceptions.loadFailed('SQL error')),
    ).toBe("Couldn't load today's timeline.")
  })

  it('the defensive unknown case has its own sentence', () => {
    expect(dayTimelineExceptionCopy(DayTimelineExceptions.unknown('x'))).toBe(
      'Something went wrong loading today.',
    )
  })

  it('narrows a thrown Error or a thrown string into a message', () => {
    expect(dayTimelineExceptionMessage(new Error('boom'))).toBe('boom')
    expect(dayTimelineExceptionMessage('plain')).toBe('plain')
  })
})
