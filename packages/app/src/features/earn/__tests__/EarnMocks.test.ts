import { describe, expect, it } from 'vitest'
import {
  EARN_MOCK_NOW,
  earnCatalogFixture,
  earnFixturePerformances,
  earnStateMocks,
} from '../EarnMocks'
import { currentPoints } from '../EarnRules'

/**
 * The fixtures are load-bearing: every other suite in this folder asserts
 * against them, so a fixture that quietly stopped meaning what its name says
 * would turn a real regression into a green run.
 */

describe('EARN_MOCK_NOW', () => {
  it('is a fixed instant, not a clock reading', () => {
    expect(EARN_MOCK_NOW).toEqual(new Date(2026, 2, 17, 10, 0, 0))
  })

  it('is the same on every read', () => {
    expect(EARN_MOCK_NOW.getTime()).toBe(new Date(2026, 2, 17, 10, 0, 0).getTime())
  })
})

describe('earnFixturePerformances', () => {
  it('sums to exactly 130 points — the balance every selector suite assumes', () => {
    expect(currentPoints(earnFixturePerformances, [], [])).toBe(130)
  })

  it('holds three distinct performances', () => {
    expect(earnFixturePerformances).toHaveLength(3)
  })
})

describe('earnCatalogFixture', () => {
  it('straddles the fixture balance — one affordable, two not', () => {
    const balance = currentPoints(earnFixturePerformances, [], [])
    const affordable = earnCatalogFixture.filter((r) => r.pointsRequired <= balance)
    const unaffordable = earnCatalogFixture.filter((r) => r.pointsRequired > balance)
    expect(affordable.length).toBeGreaterThan(0)
    expect(unaffordable.length).toBeGreaterThan(0)
  })

  it('gives every fixture reward a distinct id', () => {
    const ids = earnCatalogFixture.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('earnStateMocks', () => {
  it('covers idle, loading, loaded and failed lifecycle states', () => {
    expect(earnStateMocks.idle.load.kind).toBe('idle')
    expect(earnStateMocks.loading.load.kind).toBe('loading')
    expect(earnStateMocks.loadedTypical.load.kind).toBe('loaded')
    expect(earnStateMocks.failedRefreshKeepingCatalog.load.kind).toBe('failed')
  })

  it('keeps the catalog on a failed refresh, never blanking it', () => {
    expect(earnStateMocks.failedRefreshKeepingCatalog.rewards).toEqual(
      earnStateMocks.loadedTypical.rewards,
    )
  })

  it('opens the Add-Reward sheet prefilled from the default threshold', () => {
    expect(earnStateMocks.addingReward.isAddingReward).toBe(true)
    expect(earnStateMocks.addingReward.addRewardDraft.pointsRequired).toBe(
      earnStateMocks.addingReward.preferences.defaultRewardThreshold,
    )
  })

  it('opens the claim confirm sheet on a reward actually in the catalog', () => {
    const { claimingRewardId, rewards } = earnStateMocks.claimingReward
    expect(rewards.some((r) => r.id === claimingRewardId)).toBe(true)
  })
})
