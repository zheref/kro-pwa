import { describe, expect, it } from 'vitest'
import { EarlyAccessMapper } from '../../EarlyAccessMapper'
import { earlyAccessMocks } from '../EarlyAccessReceipt.mocks'

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
