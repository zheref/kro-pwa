/**
 * The Earn surface's Selectors (`RC-5`, `RC-20`) — canon's `EarnSelectors.swift`,
 * built with `createSelector` over `RootState` and composed from the pure
 * functions in `EarnRules.ts`. No selector here stores its own total: every
 * balance/partition read recomputes from `performances` + `rewards` +
 * `claimedRewardIds` on each call (`EarnRules.ts`'s header states why).
 */
import { createSelector } from '@reduxjs/toolkit'
import type { Reward } from '@kro/core'
import type { RootState } from '../../library/store'
import type { EarnException } from './EarnException'
import type { EarnPreferences, EarnRewardDraft, EarnState } from './EarnFeature'
import {
  type EarnPartition,
  availableSuggestions,
  currentPoints,
  isCatalogEmpty,
  partitionRewards,
  spentPoints,
  totalEarnedPoints,
} from './EarnRules'

const selectEarnSlice = (state: RootState): EarnState => state.earn

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsEarnLoading = createSelector(
  [selectEarnSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectEarnException = createSelector(
  [selectEarnSlice],
  (slice): EarnException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const selectTotalEarnedPoints = createSelector(
  [selectEarnSlice],
  (slice) => totalEarnedPoints(slice.performances),
)

export const selectSpentPoints = createSelector([selectEarnSlice], (slice) =>
  spentPoints(slice.rewards, slice.claimedRewardIds),
)

export const selectCurrentPoints = createSelector([selectEarnSlice], (slice) =>
  currentPoints(slice.performances, slice.rewards, slice.claimedRewardIds),
)

// ---------------------------------------------------------------------------
// Catalog partition
// ---------------------------------------------------------------------------

const selectEarnPartition = createSelector(
  [selectEarnSlice, selectCurrentPoints],
  (slice, points): EarnPartition =>
    partitionRewards(slice.rewards, slice.claimedRewardIds, points),
)

export const selectClaimableRewards = createSelector(
  [selectEarnPartition],
  (partition) => partition.claimable,
)

export const selectLockedRewards = createSelector(
  [selectEarnPartition],
  (partition) => partition.locked,
)

export const selectAvailableSuggestions = createSelector(
  [selectEarnSlice],
  (slice) => availableSuggestions(slice.rewards),
)

export const selectIsEarnCatalogEmpty = createSelector(
  [selectEarnSlice],
  (slice) => isCatalogEmpty(slice.load.kind, slice.rewards),
)

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export const selectEarnPreferences = createSelector(
  [selectEarnSlice],
  (slice): EarnPreferences => slice.preferences,
)

export const selectDefaultRewardThreshold = createSelector(
  [selectEarnPreferences],
  (preferences) => preferences.defaultRewardThreshold,
)

/** The active `earn.pointsFormula`, surfaced read-only (`#27`). */
export const selectPointsFormula = createSelector(
  [selectEarnPreferences],
  (preferences) => preferences.pointsFormula,
)

// ---------------------------------------------------------------------------
// Add Reward sheet
// ---------------------------------------------------------------------------

export const selectIsAddingReward = createSelector(
  [selectEarnSlice],
  (slice) => slice.isAddingReward,
)

export const selectAddRewardDraft = createSelector(
  [selectEarnSlice],
  (slice): EarnRewardDraft => slice.addRewardDraft,
)

// ---------------------------------------------------------------------------
// Claim flow
// ---------------------------------------------------------------------------

export const selectClaimingRewardId = createSelector(
  [selectEarnSlice],
  (slice) => slice.claimingRewardId,
)

/** The reward the confirm sheet is open on, resolved from the catalog. */
export const selectClaimingReward = createSelector(
  [selectEarnSlice],
  (slice): Reward | null =>
    slice.rewards.find((reward) => reward.id === slice.claimingRewardId) ??
    null,
)
