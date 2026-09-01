import { describe, expect, it } from 'vitest'
import { exception, toUnknownException, unknownException } from '../exception'

describe('exception', () => {
  it('builds a union member with its discriminant, detail and retry affordance', () => {
    const built = exception(
      'offline',
      'The greeting service is unreachable.',
      true,
    )

    expect(built).toEqual({
      kind: 'offline',
      message: 'The greeting service is unreachable.',
      recoverable: true,
    })
  })

  it('marks a member unrecoverable when the caller says so — a 403 no retry can fix', () => {
    expect(exception('unauthorized', 'refused', false).recoverable).toBe(false)
  })

  it('defaults to recoverable, so a forgotten flag offers a retry rather than a dead end', () => {
    expect(exception('unknown', 'something happened').recoverable).toBe(true)
  })
})

describe('unknownException', () => {
  it('keeps the developer-facing detail for the log — a serialization bug in the payload creator', () => {
    expect(unknownException('cannot serialize payload').message).toBe(
      'cannot serialize payload',
    )
  })

  it('always discriminates as `unknown`, so the defensive `.rejected` arm has one shape to shift into', () => {
    expect(unknownException('anything').kind).toBe('unknown')
  })

  it('is recoverable — an unexplained failure still lets the user try again', () => {
    expect(unknownException('anything').recoverable).toBe(true)
  })
})

describe('toUnknownException', () => {
  it('reads the message off a thrown Error — the usual shape a Service rejects with', () => {
    expect(toUnknownException(new Error('HTTP 500')).message).toBe('HTTP 500')
  })

  it('passes a thrown string straight through — a hand-rolled `throw "boom"` somewhere', () => {
    expect(toUnknownException('boom').message).toBe('boom')
  })

  it('degrades a non-Error object into a printable detail rather than crashing the catch block', () => {
    expect(toUnknownException({ status: 500 }).message).toBe('[object Object]')
  })

  it('survives a thrown `undefined` — the shape a rejected promise with no reason produces', () => {
    expect(toUnknownException(undefined).kind).toBe('unknown')
    expect(toUnknownException(undefined).message).toBe('undefined')
  })
})
