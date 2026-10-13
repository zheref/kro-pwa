import { describe, expect, it } from 'vitest'
import { earlyAccessMocks } from '../__mocks__/EarlyAccessReceipt.mocks'
import { earlyAccessRequestMocks } from '../__mocks__/EarlyAccessRequest.mocks'
import { EarlyAccessMapper, isLikelyEmail } from '../EarlyAccessMapper'
import type { EarlyAccessResponse } from '../EarlyAccessResponse'

const wire = (
  overrides: Partial<EarlyAccessResponse> = {},
): EarlyAccessResponse => ({
  id: 'ea-0001',
  email: 'ada@example.com',
  platform: 'ios',
  position: 3,
  joined_at: '2026-10-01T09:30:00.000Z',
  ...overrides,
})

describe('EarlyAccessMapper.isLikelyEmail', () => {
  it('accepts an ordinary address, a plus-tag and a non-ASCII one', () => {
    expect(isLikelyEmail('ada@example.com')).toBe(true)
    expect(isLikelyEmail('ada+kro@mail.example.co.uk')).toBe(true)
    expect(isLikelyEmail(earlyAccessMocks.unicodeEmail.email)).toBe(true)
    expect(isLikelyEmail(earlyAccessMocks.longEmail.email)).toBe(true)
  })

  it('rejects the typos a visitor actually makes', () => {
    expect(isLikelyEmail('')).toBe(false)
    expect(isLikelyEmail('ada.example.com')).toBe(false)
    expect(isLikelyEmail('ada@example')).toBe(false)
    expect(isLikelyEmail('ada@@example.com')).toBe(false)
    expect(isLikelyEmail('ada @example.com')).toBe(false)
    expect(isLikelyEmail('ada@example..com')).toBe(false)
    expect(isLikelyEmail('@example.com')).toBe(false)
  })

  it('rejects an address past 254 characters, and a non-string body field', () => {
    expect(isLikelyEmail(`${'a'.repeat(250)}@x.co`)).toBe(false)
    expect(isLikelyEmail(undefined)).toBe(false)
    expect(isLikelyEmail(42)).toBe(false)
  })
})

describe('EarlyAccessMapper.toDomain', () => {
  it('translates a well-formed receipt, date and all', () => {
    expect(EarlyAccessMapper.toDomain(wire())).toEqual(earlyAccessMocks.typical)
  })

  it('keeps a missing position as null — a webhook sink with no queue', () => {
    const receipt = EarlyAccessMapper.toDomain(
      wire({ position: null, platform: 'web' }),
    )
    expect(receipt?.position).toBeNull()
    expect(receipt?.platform).toBe('web')
  })

  it('returns null for an unknown platform, a bad date, an empty id or email', () => {
    expect(EarlyAccessMapper.toDomain(wire({ platform: 'linux' }))).toBeNull()
    expect(
      EarlyAccessMapper.toDomain(wire({ joined_at: 'last tuesday' })),
    ).toBeNull()
    expect(EarlyAccessMapper.toDomain(wire({ id: '' }))).toBeNull()
    expect(EarlyAccessMapper.toDomain(wire({ email: '' }))).toBeNull()
  })

  it('returns null for a position that is not a non-negative whole number', () => {
    expect(EarlyAccessMapper.toDomain(wire({ position: -1 }))).toBeNull()
    expect(EarlyAccessMapper.toDomain(wire({ position: 1.5 }))).toBeNull()
  })
})

describe('EarlyAccessMapper.fromDomain', () => {
  it('carries every field of a typical request to the wire', () => {
    expect(
      EarlyAccessMapper.fromDomain(earlyAccessRequestMocks.typical),
    ).toEqual({
      email: 'ada@example.com',
      platform: 'ios',
      source: 'hero',
      locale: 'en-US',
    })
  })

  it('keeps the optional context null rather than dropping the keys', () => {
    const body = EarlyAccessMapper.fromDomain(earlyAccessRequestMocks.bare)
    expect(body).toHaveProperty('source', null)
    expect(body).toHaveProperty('locale', null)
  })

  it('sends nothing the request did not hold — no id, no timestamp', () => {
    expect(
      Object.keys(
        EarlyAccessMapper.fromDomain(earlyAccessRequestMocks.androidVote),
      ).sort(),
    ).toEqual(['email', 'locale', 'platform', 'source'])
  })
})

describe('EarlyAccessMapper.toException', () => {
  it('reads a sink that timed out as unavailable — the waitlist did not answer in time', () => {
    const timedOut = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    })
    expect(EarlyAccessMapper.toException(timedOut).kind).toBe('unavailable')
  })

  it('reads an aborted call as unavailable, duck-typed on the name alone', () => {
    expect(EarlyAccessMapper.toException({ name: 'AbortError' }).kind).toBe(
      'unavailable',
    )
  })

  it('reads a status-less refusal as unknown, never invalidEmail', () => {
    expect(
      EarlyAccessMapper.toException(new Error('sink refused the request')).kind,
    ).toBe('unknown')
  })

  it('reads a network TypeError as offline — the visitor lost signal', () => {
    expect(
      EarlyAccessMapper.toException(new TypeError('Failed to fetch')).kind,
    ).toBe('offline')
  })

  it('maps HTTP statuses: 409 joined, 400/422 bad email, 503 unavailable', () => {
    expect(EarlyAccessMapper.toException({ status: 409 }).kind).toBe(
      'alreadyJoined',
    )
    expect(EarlyAccessMapper.toException({ status: 400 }).kind).toBe(
      'invalidEmail',
    )
    expect(EarlyAccessMapper.toException({ status: 422 }).kind).toBe(
      'invalidEmail',
    )
    expect(EarlyAccessMapper.toException({ status: 503 }).kind).toBe(
      'unavailable',
    )
  })

  it('prefers a kind the route already declared over the bare status', () => {
    expect(
      EarlyAccessMapper.toException({ status: 502, kind: 'offline' }).kind,
    ).toBe('offline')
    expect(
      EarlyAccessMapper.toException({ status: 400, kind: 'unknown' }).kind,
    ).toBe('unknown')
  })

  it('falls back to unknown without leaking the caught error’s own text', () => {
    const value = EarlyAccessMapper.toException(
      new Error('ECONNRESET at 10.0.0.4:443'),
    )
    expect(value.kind).toBe('unknown')
    expect(value.message).not.toContain('ECONNRESET')
    expect(EarlyAccessMapper.toException({ status: 500 }).kind).toBe('unknown')
    expect(EarlyAccessMapper.toException('boom').kind).toBe('unknown')
    expect(EarlyAccessMapper.toException(null).kind).toBe('unknown')
  })
})
