import { describe, expect, it } from 'vitest'
import { EarlyAccessMapper } from '../../EarlyAccessMapper'
import { isKroPlatform } from '../../KroPlatform'
import { earlyAccessMocks, earlyAccessRequestMocks } from '../EarlyAccess.mocks'

describe('earlyAccessMocks', () => {
  it('ships at least seven receipts with distinct ids (RC-13)', () => {
    const receipts = Object.values(earlyAccessMocks)
    expect(receipts.length).toBeGreaterThanOrEqual(7)
    expect(new Set(receipts.map((receipt) => receipt.id)).size).toBe(
      receipts.length,
    )
  })

  it('round-trips every receipt through the Mapper unchanged', () => {
    for (const receipt of Object.values(earlyAccessMocks)) {
      expect(
        EarlyAccessMapper.toDomain({
          id: receipt.id,
          email: receipt.email,
          platform: receipt.platform,
          position: receipt.position,
          joined_at: receipt.joinedAt.toISOString(),
        }),
      ).toEqual(receipt)
    }
  })

  it('covers the inconvenient cases — no position, a stale join, non-ASCII', () => {
    expect(earlyAccessMocks.noPosition.position).toBeNull()
    expect(earlyAccessMocks.staleJoinedAt.joinedAt.getTime()).toBeLessThan(
      earlyAccessMocks.typical.joinedAt.getTime(),
    )
    expect(
      [...earlyAccessMocks.unicodeEmail.email].some(
        (char) => (char.codePointAt(0) ?? 0) > 127,
      ),
    ).toBe(true)
  })
})

describe('earlyAccessRequestMocks', () => {
  it('holds only plausible emails and declared platforms', () => {
    for (const request of Object.values(earlyAccessRequestMocks)) {
      expect(EarlyAccessMapper.isLikelyEmail(request.email)).toBe(true)
      expect(isKroPlatform(request.platform)).toBe(true)
    }
  })

  it('uses only reserved domains, so a fixture never reaches a real inbox', () => {
    for (const request of Object.values(earlyAccessRequestMocks)) {
      expect(request.email).toMatch(/@(example\.(com|net|org)|kro\.invalid)$/)
    }
  })

  it('names the addresses the stubbed Service answers with a failure', () => {
    expect(earlyAccessRequestMocks.alreadyJoined.email).toBe(
      'already@kro.invalid',
    )
    expect(earlyAccessRequestMocks.offline.email).toBe('offline@kro.invalid')
  })
})
