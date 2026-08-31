/**
 * The Earn feature's canned fixtures (`RC-31`, `UZF-18`).
 *
 * `earnPerformanceFixtures` supplies the balance's only input; the reward
 * catalog itself is `@kro/core/mocks`' `rewardMocks` (`#7`'s seven variants —
 * already satisfying `UZF-18`'s per-model minimum, so this file does not
 * duplicate them). `earnStateMocks` runs the real Shifters over both, so a
 * variant here is by construction a state the reducer can actually reach.
 */
import { PerformResolution, makePerform } from '@kro/core'
import { rewardMocks } from '@kro/core/mocks'
import { EarnExceptions } from './EarnException'
import { type EarnState, initialEarnState } from './EarnFeature'
import {
  withCatalogInstalled,
  withClaimRequested,
  withException,
  withRewardDraftOpened,
} from './EarnShifters'

/** Tuesday 17 March 2026, 10:00 local — arbitrary, fixed, and irrelevant. */
export const EARN_MOCK_NOW = new Date(2026, 2, 17, 10, 0, 0)

const perform = (rewardPoints: number, daysAgo: number) =>
  makePerform({
    date: new Date(2026, 2, 17 - daysAgo, 9, 0, 0),
    duration: 1500,
    resolution: PerformResolution.finished,
    rewardPoints,
    completedAt: new Date(2026, 2, 17 - daysAgo, 9, 25, 0),
    wasCompletedInSession: true,
  })

/** Three recorded performances, summing to 130 points. */
export const earnPerformanceFixtures = {
  first: perform(30, 3),
  second: perform(50, 2),
  third: perform(50, 1),
} as const

export const earnFixturePerformances = Object.values(earnPerformanceFixtures)

/**
 * `rewardMocks.bobaTea` (80) and `.plain` (200) straddle the fixture balance
 * of 130 — one claimable, one locked, without hand-building a new reward.
 */
export const earnCatalogFixture = [
  rewardMocks.bobaTea,
  rewardMocks.plain,
  rewardMocks.weekendTrip,
]

const loadedCatalog = withCatalogInstalled(initialEarnState, {
  rewards: earnCatalogFixture,
  claimedRewardIds: [],
  performances: earnFixturePerformances,
})

/** The states the Earn surface claims to support. */
export const earnStateMocks = {
  /** Nothing asked for yet — first paint before the surface mounts. */
  idle: initialEarnState,

  /** A read is in flight and nothing has landed. */
  loading: {
    ...initialEarnState,
    load: { kind: 'loading' },
  } satisfies EarnState,

  /** The ordinary catalog: one claimable, one locked, one out of reach. */
  loadedTypical: loadedCatalog,

  /** A catalog with nothing in it — the true empty state. */
  loadedEmpty: withCatalogInstalled(initialEarnState, {
    rewards: [],
    claimedRewardIds: [],
    performances: [],
  }),

  /** `bobaTea` already claimed — it leaves the claimable lane entirely. */
  loadedWithClaim: withCatalogInstalled(initialEarnState, {
    rewards: earnCatalogFixture,
    claimedRewardIds: [rewardMocks.bobaTea.id],
    performances: earnFixturePerformances,
  }),

  /**
   * A refresh failed after a good catalog was already showing — the catalog
   * is untouched, which is the whole point of `withException` (`EarnShifters.ts`).
   */
  failedRefreshKeepingCatalog: withException(
    loadedCatalog,
    EarnExceptions.catalogLoadFailed('the store is unavailable'),
  ),

  /** The Add-Reward sheet open, prefilled from the default-threshold preference. */
  addingReward: withRewardDraftOpened(loadedCatalog),

  /** The confirm-claim sheet open on the affordable reward. */
  claimingReward: withClaimRequested(loadedCatalog, rewardMocks.bobaTea.id),
}
