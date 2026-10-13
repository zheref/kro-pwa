/**
 * `EarlyAccessReceipt` is a type; these pin the contract the landing page reads
 * off it — the fields a confirmation renders and their domain types.
 */
import { describe, expect, it } from 'vitest'
import { earlyAccessMocks } from '../__mocks__/EarlyAccess.mocks'
import type { EarlyAccessReceipt } from '../EarlyAccessReceipt'

describe('EarlyAccessReceipt', () => {
  it('carries a real Date, never the wire string', () => {
    const receipt: EarlyAccessReceipt = earlyAccessMocks.typical
    expect(receipt.joinedAt).toBeInstanceOf(Date)
  })

  it('allows a null position — a sink with no queue', () => {
    const receipt: EarlyAccessReceipt = earlyAccessMocks.noPosition
    expect(receipt.position).toBeNull()
  })

  it('holds exactly the five fields a confirmation needs', () => {
    expect(Object.keys(earlyAccessMocks.typical).sort()).toEqual([
      'email',
      'id',
      'joinedAt',
      'platform',
      'position',
    ])
  })
})
