import { describe, expect, it } from 'vitest'
import { EarlyAccessExceptions } from '../EarlyAccessException'

describe('EarlyAccessExceptions', () => {
  it('marks only "already joined" as not recoverable — retrying cannot help', () => {
    expect(EarlyAccessExceptions.alreadyJoined().recoverable).toBe(false)
    expect(EarlyAccessExceptions.invalidEmail().recoverable).toBe(true)
    expect(EarlyAccessExceptions.offline().recoverable).toBe(true)
    expect(EarlyAccessExceptions.unavailable().recoverable).toBe(true)
    expect(EarlyAccessExceptions.unknown().recoverable).toBe(true)
  })

  it('writes a distinct, non-empty sentence per kind, so the view never assembles one', () => {
    const messages = [
      EarlyAccessExceptions.invalidEmail(),
      EarlyAccessExceptions.alreadyJoined(),
      EarlyAccessExceptions.offline(),
      EarlyAccessExceptions.unavailable(),
      EarlyAccessExceptions.unknown(),
    ].map((value) => value.message)
    for (const message of messages) expect(message.length).toBeGreaterThan(10)
    expect(new Set(messages).size).toBe(messages.length)
  })

  it('lets the route give "unknown" a better sentence when it knows one', () => {
    const value = EarlyAccessExceptions.unknown('The request was not JSON.')
    expect(value).toEqual({
      kind: 'unknown',
      message: 'The request was not JSON.',
      recoverable: true,
    })
  })
})

describe('EarlyAccessExceptions.fromKind', () => {
  it('rebuilds each declared kind from the route’s error body', () => {
    for (const kind of [
      'invalidEmail',
      'alreadyJoined',
      'offline',
      'unavailable',
      'unknown',
    ] as const) {
      expect(EarlyAccessExceptions.fromKind(kind)?.kind).toBe(kind)
    }
  })

  it('refuses a kind this union does not declare', () => {
    expect(EarlyAccessExceptions.fromKind('notFound')).toBeNull()
  })

  it('refuses a non-string kind from a malformed body', () => {
    expect(EarlyAccessExceptions.fromKind(undefined)).toBeNull()
    expect(EarlyAccessExceptions.fromKind(409)).toBeNull()
  })
})

describe('EarlyAccessExceptions.httpStatus', () => {
  it('answers a client mistake with 4xx — bad email 400, already joined 409', () => {
    expect(
      EarlyAccessExceptions.httpStatus(EarlyAccessExceptions.invalidEmail()),
    ).toBe(400)
    expect(
      EarlyAccessExceptions.httpStatus(EarlyAccessExceptions.alreadyJoined()),
    ).toBe(409)
  })

  it('answers an unconfigured deployment with 503', () => {
    expect(
      EarlyAccessExceptions.httpStatus(EarlyAccessExceptions.unavailable()),
    ).toBe(503)
  })

  it('answers an unreachable sink with 502 and anything else with 500', () => {
    expect(
      EarlyAccessExceptions.httpStatus(EarlyAccessExceptions.offline()),
    ).toBe(502)
    expect(
      EarlyAccessExceptions.httpStatus(EarlyAccessExceptions.unknown()),
    ).toBe(500)
  })
})
