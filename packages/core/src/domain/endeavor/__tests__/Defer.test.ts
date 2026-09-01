import { describe, expect, it } from 'vitest'
import { deferMocks } from '../__mocks__/EndeavorRelations.mocks'
import { makeDefer } from '../Defer'

const MADE = new Date(2026, 0, 12, 9, 0, 0)
const TARGET = new Date(2026, 0, 13, 9, 0, 0)

describe('makeDefer', () => {
  it('carries made, reason and target through unchanged', () => {
    expect(
      makeDefer({ made: MADE, reason: 'Courier', target: TARGET }),
    ).toEqual({
      made: MADE,
      reason: 'Courier',
      target: TARGET,
    })
  })

  it('defaults the optional reason to null, as canon does', () => {
    expect(makeDefer({ made: MADE, target: TARGET }).reason).toBeNull()
  })

  it('keeps an empty-string reason distinct from an absent one', () => {
    expect(makeDefer({ made: MADE, reason: '', target: TARGET }).reason).toBe(
      '',
    )
    expect(deferMocks.zeroLength.reason).toBe('')
    expect(deferMocks.noReason.reason).toBeNull()
  })

  it('accepts a target before the moment it was made, without complaint', () => {
    expect(deferMocks.targetInThePast.target.getTime()).toBeLessThan(
      deferMocks.targetInThePast.made.getTime(),
    )
  })
})
