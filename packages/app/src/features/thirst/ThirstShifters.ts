/**
 * The Thirst vote surface's Shifters (`RC-4`, `RC-19`) — canon's
 * `ComingSoonShifters.swift`, widened from one shared `ThirstVoteEntryState`
 * to the `byFeatureKey`-keyed `ThirstState` this store uses.
 *
 * Every one returns a brand-new plain object; none reads a clock, a service
 * or a random source (`UZF-10`) — `id` for a cast vote is a caller-supplied
 * argument (`ThirstProducer.ts`).
 *
 * ## Guarding both async reads against a race with the vote (found in review)
 *
 * `checkVoteStateThunk` and `fetchCountsThunk` are each dispatched once per
 * mount, independently of `castVoteThunk` — so either can still be in flight
 * when a vote resolves, and its own (now-stale) response can arrive *after*.
 * Applied blindly, a stale response overwrites the optimistic state a
 * faster-resolving vote already wrote: a stale `hasVoted: false` would flip
 * `alreadyVoted` back to `false`, and a stale counts payload (fetched before
 * the vote landed server-side) would erase the optimistic bump while the
 * "You voted" chip stays put — a real, silent-looking regression a reviewer
 * caught, not a hypothetical.
 *
 * Both are guarded the same two ways:
 *   - **`requestId`** — each entry remembers the `requestId` of its own
 *     currently-outstanding request. A response whose `requestId` doesn't
 *     match is from an *older, superseded* dispatch (e.g. a second mount
 *     firing a fresh request while an earlier one is still in flight) and is
 *     dropped entirely — not even the in-flight flag moves, because the
 *     request that flag is tracking hasn't resolved yet.
 *   - **`voteEpoch`** — bumped every time a vote is locally confirmed
 *     (`withVoteResult`'s success branch). Each in-flight request also
 *     remembers `voteEpoch` as it stood at dispatch time. If a matching
 *     response's stored epoch no longer equals the *current* epoch, a vote
 *     landed while that request was in flight — so its payload predates the
 *     vote and must not be allowed to overwrite what the vote already wrote,
 *     even though it's otherwise the "current" (non-superseded) request.
 *
 * A fetch/check dispatched *after* the vote confirms is unaffected either
 * way: its own epoch matches the (now-current) `voteEpoch`, so its answer —
 * genuinely fresher than the vote — is trusted and applied normally.
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
 * `.unavailable` (canon's `applyLoadStarted`), and remember this dispatch's
 * identity for the race guard above. */
export const withVoteStateCheckStarted = (
  state: ThirstState,
  featureKey: string,
  requestId: string,
): ThirstState => {
  const current = entryOf(state, featureKey)
  return withEntry(state, featureKey, {
    ...current,
    isCheckingVoteState: true,
    voteStateException: null,
    pendingVoteStateRequestId: requestId,
    pendingVoteStateVoteEpoch: current.voteEpoch,
  })
}

/**
 * Canon's `applyVoteStateResult`: a success records whether the person
 * already voted; a failure (signed out / offline) blocks voting. Either way
 * the check is no longer in flight — unless this response is superseded
 * (see the file header): a response for a `requestId` other than the one
 * currently tracked is silently dropped, and a response that predates a
 * vote confirmed while it was in flight never reverts `alreadyVoted`.
 */
export const withVoteStateResult = (
  state: ThirstState,
  featureKey: string,
  requestId: string,
  result: Result<boolean, ThirstException>,
): ThirstState => {
  const current = entryOf(state, featureKey)
  if (requestId !== current.pendingVoteStateRequestId) return state
  if (current.pendingVoteStateVoteEpoch !== current.voteEpoch) {
    // A vote landed while this check was in flight — its answer predates
    // that vote. Only clear the in-flight flag; never touch `alreadyVoted`.
    return withEntry(state, featureKey, {
      ...current,
      isCheckingVoteState: false,
      pendingVoteStateRequestId: null,
    })
  }
  return withEntry(state, featureKey, {
    ...current,
    isCheckingVoteState: false,
    alreadyVoted: result.ok ? result.value : current.alreadyVoted,
    voteStateException: result.ok ? null : result.error,
    pendingVoteStateRequestId: null,
  })
}

// ---------------------------------------------------------------------------
// The public counts fetch
// ---------------------------------------------------------------------------

export const withCountsFetchStarted = (
  state: ThirstState,
  featureKey: string,
  requestId: string,
): ThirstState => {
  const current = entryOf(state, featureKey)
  return withEntry(state, featureKey, {
    ...current,
    isLoadingCounts: true,
    pendingCountsRequestId: requestId,
    pendingCountsVoteEpoch: current.voteEpoch,
  })
}

/**
 * Canon's `applyCountsResult`: a success stores the counts; a failure is
 * non-blocking — the count is secondary, so `counts` (and
 * `voteStateException`) are left exactly as they were. A superseded or
 * vote-predating response is handled the same way `withVoteStateResult`
 * handles its own (see the file header).
 */
export const withCountsResult = (
  state: ThirstState,
  featureKey: string,
  requestId: string,
  result: Result<FeatureVoteCounts, ThirstException>,
): ThirstState => {
  const current = entryOf(state, featureKey)
  if (requestId !== current.pendingCountsRequestId) return state
  if (current.pendingCountsVoteEpoch !== current.voteEpoch) {
    // A vote landed while this fetch was in flight — its payload predates
    // that vote. Clear the in-flight flag only; the optimistic bump wins.
    return withEntry(state, featureKey, {
      ...current,
      isLoadingCounts: false,
      pendingCountsRequestId: null,
    })
  }
  return withEntry(state, featureKey, {
    ...current,
    isLoadingCounts: false,
    counts: result.ok ? result.value : current.counts,
    pendingCountsRequestId: null,
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
 * clear the retry error, bump `voteEpoch` (the race guard above), and
 * optimistically bump the total + the `web` platform's tally (canon bumps
 * `.ios`; this app always casts `web`) so the count reflects the new vote
 * without a refetch. `ok(false)` (no vote recorded) leaves the surface
 * votable. On failure: keep votable and surface the retry error.
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
    voteEpoch: current.voteEpoch + 1,
    counts: bumpVotePlatform(current.counts, featureKey, VotePlatform.web),
  })
}
