import { describe, expect, it } from 'vitest'
import { greetingMocks } from '../__mocks__/Greeting.mocks'
import { GreetingMapper } from '../GreetingMapper'
import type { GreetingResponse } from '../GreetingResponse'

const wire: GreetingResponse = {
  id: 'greeting-1',
  recipient: 'ada',
  message: 'Good morning, Ada.',
  signature: '— Kro',
  issued_at: '2026-01-15T08:00:00.000Z',
}

describe('GreetingMapper.toDomain', () => {
  it('turns a well-formed payload into the domain model — the ordinary success path', () => {
    expect(GreetingMapper.toDomain(wire)).toEqual(greetingMocks.typical)
  })

  it('defaults an absent signature to null rather than leaving it undefined', () => {
    const { signature: _omitted, ...withoutSignature } = wire

    expect(GreetingMapper.toDomain(withoutSignature)?.signature).toBeNull()
  })

  it('returns null when the timestamp is unparseable — a backend that shipped a bad format', () => {
    expect(
      GreetingMapper.toDomain({ ...wire, issued_at: 'yesterday' }),
    ).toBeNull()
  })

  it('returns null when the identity fields are empty, so no half-built greeting is stored', () => {
    expect(GreetingMapper.toDomain({ ...wire, id: '' })).toBeNull()
    expect(GreetingMapper.toDomain({ ...wire, recipient: '' })).toBeNull()
  })
})

describe('GreetingMapper.fromDomain', () => {
  it('serializes the timestamp back to ISO-8601 for the wire', () => {
    expect(GreetingMapper.fromDomain(greetingMocks.typical).issued_at).toBe(
      '2026-01-15T08:00:00.000Z',
    )
  })

  it('round-trips a greeting unchanged — write, read back, same domain value', () => {
    const roundTripped = GreetingMapper.toDomain(
      GreetingMapper.fromDomain(greetingMocks.unicode),
    )

    expect(roundTripped).toEqual(greetingMocks.unicode)
  })

  it('keeps a null signature null instead of dropping the key', () => {
    expect(
      GreetingMapper.fromDomain(greetingMocks.noSignature).signature,
    ).toBeNull()
  })
})

describe('GreetingMapper.toException', () => {
  it('reads a TypeError as offline — the shape `fetch` throws with no connection', () => {
    expect(
      GreetingMapper.toException(new TypeError('Failed to fetch')).kind,
    ).toBe('offline')
  })

  it('reads 401 and 403 as unauthorized — the session expired while the tab was open', () => {
    expect(GreetingMapper.toException({ status: 401 }).kind).toBe(
      'unauthorized',
    )
    expect(GreetingMapper.toException({ status: 403 }).kind).toBe(
      'unauthorized',
    )
  })

  it('reads 404 as notFound — the recipient has no greeting registered', () => {
    expect(GreetingMapper.toException({ status: 404 }).kind).toBe('notFound')
  })

  it('falls back to unknown for an unrecognized failure, keeping the detail for the log', () => {
    const mapped = GreetingMapper.toException(new Error('HTTP 500'))

    expect(mapped.kind).toBe('unknown')
    expect(mapped.message).toBe('HTTP 500')
  })

  it('survives a thrown null without throwing out of the catch block', () => {
    expect(GreetingMapper.toException(null).kind).toBe('unknown')
  })
})
