import { describe, expect, it } from 'vitest'
import {
  ThirstExceptions,
  isThirstException,
  thirstExceptionCopy,
  toThirstException,
} from '../ThirstException'

describe('ThirstExceptions factory', () => {
  it('notSignedIn is not recoverable — no retry fixes a missing session', () => {
    expect(ThirstExceptions.notSignedIn().recoverable).toBe(false)
  })

  it('offline is recoverable — a retry once connectivity returns can succeed', () => {
    expect(ThirstExceptions.offline().recoverable).toBe(true)
  })

  it('unknown falls back to a generic message on an empty string', () => {
    expect(ThirstExceptions.unknown('').message).toBe(
      'Something went wrong while voting.',
    )
  })
})

describe('isThirstException', () => {
  it('recognizes a value this module built', () => {
    expect(isThirstException(ThirstExceptions.offline())).toBe(true)
  })

  it('rejects a plain Error', () => {
    expect(isThirstException(new Error('boom'))).toBe(false)
  })

  it('rejects an object missing the recoverable field', () => {
    expect(isThirstException({ kind: 'offline', message: 'x' })).toBe(false)
  })
})

describe('toThirstException', () => {
  it('passes an already-typed exception straight through — the Service already knew the answer', () => {
    const original = ThirstExceptions.notSignedIn()
    expect(toThirstException(original)).toBe(original)
  })

  it('maps a browser transport TypeError to offline', () => {
    expect(toThirstException(new TypeError('Failed to fetch')).kind).toBe(
      'offline',
    )
  })

  it('degrades any other caught value to unknown, keeping its message for logs', () => {
    const result = toThirstException(new Error('constraint violated'))
    expect(result.kind).toBe('unknown')
    expect(result.message).toBe('constraint violated')
  })
})

describe('thirstExceptionCopy', () => {
  it('derives copy from kind, never from a raw server message', () => {
    expect(
      thirstExceptionCopy(ThirstExceptions.unknown('pg error 23514')),
    ).toBe('Something went wrong while voting.')
  })

  it('reads the sign-in prompt for notSignedIn', () => {
    expect(thirstExceptionCopy(ThirstExceptions.notSignedIn())).toBe(
      'Sign in to vote for upcoming features.',
    )
  })
})
