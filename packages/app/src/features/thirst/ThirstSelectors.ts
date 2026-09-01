/**
 * The Thirst vote surface's Selectors (`RC-5`, `RC-20`) — canon's
 * `ComingSoonSelectors.swift`, built with `createSelector` over `RootState`
 * and parameterized by `featureKey` (the reselect "selector with props"
 * shape — one exported selector per derived read, not a factory minted per
 * call).
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import {
  initialThirstVoteEntry,
  type ThirstState,
  type ThirstVoteEntryState,
} from './ThirstFeature'
import { isThirstVotable } from './ThirstRegistry'
import { thirstExceptionCopy } from './ThirstException'
import {
  type PlatformVoteTally,
  type ThirstVoteStatus,
  perPlatformTalliesFor,
} from './ThirstModels'

const selectThirstSlice = (state: RootState): ThirstState => state.thirst

const featureKeyArg = (_state: RootState, featureKey: string): string =>
  featureKey

export const selectThirstEntry = createSelector(
  [selectThirstSlice, featureKeyArg],
  (thirst, featureKey): ThirstVoteEntryState =>
    thirst.byFeatureKey[featureKey] ?? initialThirstVoteEntry,
)

/**
 * The composed status the Fragment renders — canon's `voteStatusSelector`.
 * Order matters: a not-votable dead-end never votes; an already-voted
 * surface shows the voted state even while counts are still arriving; only a
 * vote-state (auth) failure blocks voting (a counts-only failure keeps the
 * surface votable with the count block hidden); a fresh load in flight shows
 * loading.
 */
export const selectThirstVoteStatus = createSelector(
  [featureKeyArg, selectThirstEntry],
  (featureKey, entry): ThirstVoteStatus => {
    if (!isThirstVotable(featureKey)) return { kind: 'notVotable' }
    if (entry.alreadyVoted) return { kind: 'voted' }
    if (entry.voteStateException !== null) {
      return {
        kind: 'unavailable',
        message: thirstExceptionCopy(entry.voteStateException),
      }
    }
    // Stay in loading until the auth check resolves, even if public counts
    // already arrived — never show a votable CTA to a not-yet-verified user.
    // This also covers the check NOT having started yet: `isCheckingVoteState`
    // defaults `true` (`ThirstFeature.ts`'s `initialThirstVoteEntry`) for
    // exactly this reason — the pre-`useEffect` first paint reads as loading,
    // never as a transiently-votable false positive (found in review).
    if (entry.isCheckingVoteState) return { kind: 'loading' }
    if (entry.isLoadingCounts && entry.counts === null)
      return { kind: 'loading' }
    return { kind: 'votable' }
  },
)

/** Whether real counts have loaded — lets the Fragment distinguish "unknown /
 * not yet loaded" from a genuine zero-vote result. */
export const selectThirstHasLoadedCounts = createSelector(
  [selectThirstEntry],
  (entry) => entry.counts !== null,
)

/** Grand total across platforms (0 until counts load; pair with
 * `selectThirstHasLoadedCounts` so a not-yet-loaded count is never shown as
 * a genuine zero). */
export const selectThirstTotalCount = createSelector(
  [selectThirstEntry],
  (entry) => entry.counts?.total ?? 0,
)

/** Per-platform tallies for the breakdown row, platforms with zero votes
 * omitted. */
export const selectThirstPerPlatformTallies = createSelector(
  [selectThirstEntry],
  (entry): readonly PlatformVoteTally[] =>
    entry.counts === null ? [] : perPlatformTalliesFor(entry.counts),
)

export const selectThirstIsVoting = createSelector(
  [selectThirstEntry],
  (entry) => entry.isVoting,
)

/**
 * A transient vote-attempt error, shown inline only while the surface is
 * still votable (not while blocked by an auth failure, and not once a vote
 * already landed) — canon's `voteErrorMessageSelector`, minus its `counts !=
 * nil` guard. That guard is dropped deliberately: casting a vote never
 * depends on counts having loaded (`ComingSoonPage.tsx`'s `onVote` does not
 * check `hasCounts`), so requiring it here only hid a genuine failed-vote
 * retry message whenever the public counts fetch had itself failed — the
 * user would see the CTA stop spinning with no explanation at all (found in
 * review).
 */
export const selectThirstVoteErrorMessage = createSelector(
  [selectThirstEntry],
  (entry): string | null => {
    if (entry.alreadyVoted || entry.voteStateException !== null) return null
    return entry.voteException === null
      ? null
      : thirstExceptionCopy(entry.voteException)
  },
)
