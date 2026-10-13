import { describe, expect, it } from 'vitest'
import { EarlyAccessMapper } from '../../EarlyAccessMapper'
import { isKroPlatform } from '../../KroPlatform'
import { earlyAccessRequestMocks } from '../EarlyAccessRequest.mocks'

describe('earlyAccessRequestMocks', () => {
  it('holds only plausible emails and declared platforms', () => {
    for (const request of Object.values(earlyAccessRequestMocks)) {
      expect(EarlyAccessMapper.isLikelyEmail(request.email)).toBe(true)
      expect(isKroPlatform(request.platform)).toBe(true)
    }
  })

  it('uses only reserved domains, so a fixture never reaches a real inbox', () => {
    for (const request of Object.values(earlyAccessRequestMocks)) {
      expect(request.email).toMatch(
        /@([a-z0-9-]+\.)*(example\.(com|net|org)|kro\.invalid)$/,
      )
    }
  })

  it('names the addresses the stubbed Service answers with a failure', () => {
    expect(earlyAccessRequestMocks.alreadyJoined.email).toBe(
      'already@kro.invalid',
    )
    expect(earlyAccessRequestMocks.offline.email).toBe('offline@kro.invalid')
  })

  it('ships at least seven requests, each a distinct address (RC-13)', () => {
    const requests = Object.values(earlyAccessRequestMocks)
    expect(requests.length).toBeGreaterThanOrEqual(7)
    expect(new Set(requests.map((request) => request.email)).size).toBe(
      requests.length,
    )
  })

  it('covers the inconvenient cases — a long address, a non-ASCII local part, no locale', () => {
    expect(earlyAccessRequestMocks.longEmail.email.length).toBeGreaterThan(64)
    expect(earlyAccessRequestMocks.longEmail.email.length).toBeLessThanOrEqual(
      254,
    )
    expect(
      [...earlyAccessRequestMocks.unicodeLocalPart.email].some(
        (char) => (char.codePointAt(0) ?? 0) > 127,
      ),
    ).toBe(true)
    expect(earlyAccessRequestMocks.missingLocale.locale).toBeNull()
    expect(earlyAccessRequestMocks.missingLocale.source).not.toBeNull()
  })
})
