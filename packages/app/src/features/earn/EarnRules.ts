/**
 * The Earn surface's pure math — canon's `EarnSelectors.swift`, ported as
 * framework-free functions of `(performances, rewards, claimedRewardIds)`
 * rather than computed properties on a TCA `State` (`UZF-10`, `UZF-11`).
 *
 * ## The one deliberate divergence from canon, and why
 *
 * Canon's `totalEarnedPointsSelector` sums `endeavor.sessionPoints ?? 10` over
 * every completed endeavor — a coarse, per-endeavor estimate. This port sums
 * `performance.rewardPoints` instead: the ported domain (`#8`) already carries
 * the *exact* points a completion earned, computed once at award time by
 * `RewardCalculator.awardRewardPoints` and stamped onto the `Perform` record.
 * Re-deriving a second, coarser number here would be the "shadow counter" the
 * issue's acceptance criteria explicitly rule out — the balance has exactly one
 * source, the recorded performances, and this is it. Named in the PR as the
 * issue's own stated acceptance criterion, not an unstated choice.
 *
 * `currentPoints` never goes negative — canon's `max(0, …)`, preserved exactly.
 */
import type { Perform, Reward } from '@kro/core'
import { rewardSuggestions } from '@kro/core'

/** `totalEarnedPointsSelector`, sourced from performances (see header). */
export const totalEarnedPoints = (performances: readonly Perform[]): number =>
  performances.reduce((sum, perform) => sum + perform.rewardPoints, 0)

/** `spentPointsSelector` — claimed rewards, read against the LIVE catalog. */
export const spentPoints = (
  rewards: readonly Reward[],
  claimedRewardIds: readonly string[],
): number =>
  rewards
    .filter((reward) => claimedRewardIds.includes(reward.id))
    .reduce((sum, reward) => sum + reward.pointsRequired, 0)

/**
 * `currentPointsSelector` — the whole balance, in one pass over the two inputs
 * above. No stored total is ever read; every call recomputes from scratch.
 */
export const currentPoints = (
  performances: readonly Perform[],
  rewards: readonly Reward[],
  claimedRewardIds: readonly string[],
): number =>
  Math.max(
    0,
    totalEarnedPoints(performances) - spentPoints(rewards, claimedRewardIds),
  )

/** `RewardListRow.pointsRemaining` — "N to go", never negative. */
export const pointsToGo = (reward: Reward, points: number): number =>
  Math.max(0, reward.pointsRequired - points)

/**
 * `RewardListRow.progress` — `0`…`1`. A free reward (`pointsRequired <= 0`) is
 * always "full", matching canon's `guard reward.pointsRequired > 0 else
 * return 1`.
 */
export const claimProgress = (reward: Reward, points: number): number =>
  reward.pointsRequired <= 0 ? 1 : Math.min(1, points / reward.pointsRequired)

export interface EarnPartition {
  /** Unclaimed, affordable now — sorted most-expensive first (canon's order). */
  readonly claimable: readonly Reward[]
  /** Unclaimed, still out of reach — sorted cheapest first (canon's order). */
  readonly locked: readonly Reward[]
}

/** `claimableRewardsSelector` + `lockedRewardsSelector`, computed together. */
export const partitionRewards = (
  rewards: readonly Reward[],
  claimedRewardIds: readonly string[],
  points: number,
): EarnPartition => {
  const unclaimed = rewards.filter(
    (reward) => !claimedRewardIds.includes(reward.id),
  )
  return {
    claimable: unclaimed
      .filter((reward) => points >= reward.pointsRequired)
      .sort((a, b) => b.pointsRequired - a.pointsRequired),
    locked: unclaimed
      .filter((reward) => points < reward.pointsRequired)
      .sort((a, b) => a.pointsRequired - b.pointsRequired),
  }
}

/**
 * `availableSuggestionsSelector` — the starter catalog, minus anything the
 * user's own catalog already has by title (case-insensitive, canon's rule).
 */
export const availableSuggestions = (
  rewards: readonly Reward[],
): readonly Reward[] => {
  const existingTitles = new Set(
    rewards.map((reward) => reward.title.toLowerCase()),
  )
  return rewardSuggestions.filter(
    (suggestion) => !existingTitles.has(suggestion.title.toLowerCase()),
  )
}

/**
 * `isCatalogEmptySelector` — canon's `didLoadCatalog && rewards.isEmpty`.
 *
 * Canon's storage read never throws — `RewardsStore.loadCatalog` degrades a
 * missing/corrupt row to `[]` rather than failing — so `didLoadCatalog` alone
 * (set unconditionally in `onViewAppearing`) is enough to mean "the read
 * happened, trust `rewards.isEmpty`". This port's read genuinely *can* fail
 * (`EarnException`), including the earn.pointsFormula/defaultRewardThreshold
 * preferences read that runs before the catalog is ever fetched — so `failed`
 * must **not** count as "loaded", or the surface would render the empty-state
 * copy ("add a reward") over what is actually an error it should retry. Only
 * `loaded` counts.
 */
export const isCatalogEmpty = (
  loadKind: 'idle' | 'loading' | 'loaded' | 'failed',
  rewards: readonly Reward[],
): boolean => loadKind === 'loaded' && rewards.length === 0
