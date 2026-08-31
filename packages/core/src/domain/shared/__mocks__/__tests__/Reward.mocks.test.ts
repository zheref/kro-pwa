import { describe, expect, it } from 'vitest'
import { allRewardMocks, rewardMocks } from '../Reward.mocks'

describe('the Reward mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allRewardMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id', () => {
    const ids = allRewardMocks.map((reward) => reward.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spans three orders of magnitude in cost, including zero', () => {
    const costs = allRewardMocks.map((reward) => reward.pointsRequired)
    expect(Math.min(...costs)).toBe(0)
    expect(Math.max(...costs)).toBeGreaterThanOrEqual(3500)
  })

  it('includes a fixture with an empty title and glyph', () => {
    expect(rewardMocks.blank.title).toBe('')
    expect(rewardMocks.blank.glyph).toBe('')
  })

  it('includes a fixture with notes and one without', () => {
    expect(rewardMocks.movieNight.notes).not.toBeNull()
    expect(rewardMocks.plain.notes).toBeNull()
  })
})
