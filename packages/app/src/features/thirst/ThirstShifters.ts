/**
 * The Thirst vote surface's Shifters (`RC-4`, `RC-19`) — canon's
 * `ComingSoonShifters.swift`, widened from one shared `ThirstVoteEntryState`
 * to the `byFeatureKey`-keyed `ThirstState` this store uses.
 *
 * Every one returns a brand-new plain object; none reads a clock, a service
 * or a random source (`UZF-10`) — `id` for a cast vote is a caller-supplied
 * argument (`ThirstProducer.ts`).
 */
import type { Result } from '@kro/core'
import type { ThirstException } from './ThirstException'
import { initialThirstVoteEntry, type ThirstState, type ThirstVoteEntryState } from './ThirstFeature'
import { type FeatureVoteCounts, VotePlatform, bumpVotePlatform } from './ThirstModels'

const entryOf = (state: ThirstState, featureKey: string): ThirstVoteEntryState =>
  state.byFeatureKey[featureKey] ?? initialThirstVoteEntry

const withEntry = (
  state: ThirstState,
  featureKey: string,
  entry: ThirstVoteEntryState,
): ThirstState => ({
  ...state,
  byFeatureKey: { ...state.byFeatureKey, [featureKey]: entry },
})

// ---------------------------------------------------------------------------
// The auth-gated "have I already voted" check
// ---------------------------------------------------------------------------

/** A load begins: flag the check in flight, clear any stale exception so a
 * retry surfaces `.loading` rather than the previous attempt's
 * `.unavailable` (canon's `applyLoadStarted`). */
export const withVoteStateCheckStarted = (
  state: ThirstState,
  featureKey: string,
): ThirstState =>
  withEntry(state, featureKey, {
    ...entryOf(state, featureKey),
    isCheckingVoteState: true,
    voteStateException: null,
  })

/** Canon's `applyVoteStateResult`: a success records whether the person
 * already voted; a failure (signed out / offline) blocks voting. Either way
 * the check is no longer in flight. */
export const withVoteStateResult = (
  state: ThirstState,
  featureKey: string,
  result: Result<boolean, ThirstException>,
): ThirstState => {
  const current = entryOf(state, featureKey)
  return withEntry(state, featureKey, {
    ...current,
    isCheckingVoteState: false,
    alreadyVoted: result.ok ? result.value : current.alreadyVoted,
    voteStateException: result.ok ? null : result.error,
  })
}

// ---------------------------------------------------------------------------
// The public counts fetch
// ---------------------------------------------------------------------------

export const withCountsFetchStarted = (
  state: ThirstState,
  featureKey: string,
): ThirstState =>
  withEntry(state, featureKey, { ...entryOf(state, featureKey), isLoadingCounts: true })

/** Canon's `applyCountsResult`: a success stores the counts; a failure is
 * non-blocking — the count is secondary, so `counts` (and
 * `voteStateException`) are left exactly as they were. */
export const withCountsResult = (
  state: ThirstState,
  featureKey: string,
  result: Result<FeatureVoteCounts, ThirstException>,
): ThirstState => {
  const current = entryOf(state, featureKey)
  return withEntry(state, featureKey, {
    ...current,
    isLoadingCounts: false,
    counts: result.ok ? result.value : current.counts,
  })
}

// ---------------------------------------------------------------------------
// The vote itself
// ---------------------------------------------------------------------------

/** A vote request begins: flag it in-flight and clear any prior retry error. */
export const withVoteStarted = (state: ThirstState, featureKey: string): ThirstState =>
  withEntry(state, featureKey, {
    ...entryOf(state, featureKey),
    isVoting: true,
    voteException: null,
  })

/**
 * Canon's `applyVoteResult`. On a confirmed vote (`ok(true)`): lock to voted,
 * clear the retry error, and optimistically bump the total + the `web`
 * platform's tally (canon bumps `.ios`; this app always casts `web`) so the
 * count reflects the new vote without a refetch. `ok(false)` (no vote
 * recorded) leaves the surface votable. On failure: keep votable and surface
 * the retry error.
 *
 * **Idempotent on an already-voted entry — the one place this diverges from
 * canon's literal shape, on purpose.** `ThirstService.castVote`'s own
 * `23505` branch converges a second in-flight vote for the same feature into
 * a non-throwing `ok(true)` (matching canon's "resolves quietly as
 * already-voted"), so two overlapping `castVoteThunk` dispatches for one
 * feature key BOTH fulfil `ok(true)`. Bumping unconditionally on every
 * `ok(true)` — canon's literal `perPlatform[.ios, default: 0] += 1` — would
 * double-count that second, no-op confirmation. Guarding on
 * `!current.alreadyVoted` is the vote-once invariant the server enforces,
 * expressed here too, so the count stays correct even when a race reaches
 * the reducer before the UI's own `isVoting`-disabled button could prevent
 * the second dispatch (`ThirstProducer.test.ts`'s race case).
 */
export const withVoteResult = (
  state: ThirstState,
  featureKey: string,
  result: Result<boolean, ThirstException>,
): ThirstState => {
  const current = entryOf(state, featureKey)
  if (!result.ok) {
    return withEntry(state, featureKey, {
      ...current,
      isVoting: false,
      voteException: result.error,
    })
  }
  if (!result.value || current.alreadyVoted) {
    return withEntry(state, featureKey, {
      ...current,
      isVoting: false,
      alreadyVoted: current.alreadyVoted || result.value,
      voteException: null,
    })
  }
  return withEntry(state, featureKey, {
    ...current,
    isVoting: false,
    alreadyVoted: true,
    voteException: null,
    counts: bumpVotePlatform(current.counts, featureKey, VotePlatform.web),
  })
}
