/**
 * The Thirst vote surface's slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — port of
 * KroApple's `ComingSoonFeature.swift` (epic #83, sub-issue #87) to the web,
 * tagged with the `web` `VotePlatform`.
 *
 * ## One entry per feature key, not one shared surface
 *
 * Canon's `ComingSoonFeature.State` is per-composed-child (TCA mounts one
 * store per destination). This app has one global store, so `ThirstState`
 * keys its vote bookkeeping by `featureKey` in `byFeatureKey` — a route
 * mounts one destination at a time, but the shape does not assume that (a
 * future surface reusing the same store while more than one Thirst surface
 * is mounted, e.g. a route plus a sheet, is unaffected).
 *
 * ## Two independent load flags, not canon's one fused `applyLoadStarted`
 *
 * Canon flips `isLoadingCounts` and `isCheckingVoteState` together from one
 * `.onAppeared` reducer arm because both effects are kicked off by the same
 * event. Here the Page (`ComingSoonPage.tsx`) dispatches
 * `checkVoteStateThunk` and `fetchCountsThunk` directly — the shape every
 * other multi-effect mount in this repo uses (`MainShellPage.tsx`'s
 * `onShellMounted` + `loadShellThunk`) — so each thunk's own `.pending` arm
 * flips only its own flag. `ThirstSelectors.ts`'s `selectThirstVoteStatus`
 * still reads them exactly per canon's `voteStatusSelector` priority, so the
 * observable behavior is unchanged; only where the flag is set differs.
 */
import { err } from '@kro/core'
import { createSlice } from '@reduxjs/toolkit'
import { ThirstExceptions, type ThirstException } from './ThirstException'
import type { FeatureVoteCounts } from './ThirstModels'
import { castVoteThunk, checkVoteStateThunk, fetchCountsThunk } from './ThirstProducer'
import {
  withCountsFetchStarted,
  withCountsResult,
  withVoteResult,
  withVoteStarted,
  withVoteStateCheckStarted,
  withVoteStateResult,
} from './ThirstShifters'

/** One feature key's whole vote-surface bookkeeping. */
export interface ThirstVoteEntryState {
  /** Live counts (total + per-platform); `null` until first load. */
  readonly counts: FeatureVoteCounts | null
  readonly alreadyVoted: boolean
  /** A vote request is in flight. */
  readonly isVoting: boolean
  /** A counts fetch is in flight. */
  readonly isLoadingCounts: boolean
  /**
   * The auth-gated vote-state check is in flight. The surface stays
   * `.loading` until this resolves, so a signed-out user never sees a
   * transiently-`.votable` CTA when the public counts fetch wins the race
   * (canon's own note, kept verbatim in `ThirstSelectors.ts`).
   */
  readonly isCheckingVoteState: boolean
  /** Failure from the vote-state (auth) check — the only thing that blocks
   * voting. A public counts fetch failing does NOT block voting. */
  readonly voteStateException: ThirstException | null
  /** Failure from a vote attempt — surface stays votable so a retry works. */
  readonly voteException: ThirstException | null
}

export const initialThirstVoteEntry: ThirstVoteEntryState = {
  counts: null,
  alreadyVoted: false,
  isVoting: false,
  isLoadingCounts: false,
  isCheckingVoteState: false,
  voteStateException: null,
  voteException: null,
}

export interface ThirstState {
  readonly byFeatureKey: Readonly<Record<string, ThirstVoteEntryState>>
}

export const initialThirstState: ThirstState = { byFeatureKey: {} }

export const thirstSlice = createSlice({
  name: 'thirst',
  initialState: initialThirstState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- the auth-gated "have I already voted" check -----------------
      .addCase(checkVoteStateThunk.pending, (state, action) => {
        Object.assign(
          state,
          withVoteStateCheckStarted(state, action.meta.arg.featureKey),
        )
      })
      .addCase(checkVoteStateThunk.fulfilled, (state, action) => {
        Object.assign(
          state,
          withVoteStateResult(state, action.meta.arg.featureKey, action.payload),
        )
      })
      // Defensive only — the payload creator's try/catch means this should
      // not fire in practice (`RC-26`).
      .addCase(checkVoteStateThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withVoteStateResult(
            state,
            action.meta.arg.featureKey,
            err(ThirstExceptions.unknown(action.error.message ?? 'Unknown error')),
          ),
        )
      })

      // --- the public counts fetch ---------------------------------------
      .addCase(fetchCountsThunk.pending, (state, action) => {
        Object.assign(state, withCountsFetchStarted(state, action.meta.arg.featureKey))
      })
      .addCase(fetchCountsThunk.fulfilled, (state, action) => {
        Object.assign(
          state,
          withCountsResult(state, action.meta.arg.featureKey, action.payload),
        )
      })
      .addCase(fetchCountsThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        // Non-blocking, matching canon: leaves `counts` (and
        // `voteStateException`) untouched — only the in-flight flag clears.
        Object.assign(
          state,
          withCountsResult(
            state,
            action.meta.arg.featureKey,
            err(ThirstExceptions.unknown(action.error.message ?? 'Unknown error')),
          ),
        )
      })

      // --- the vote itself -------------------------------------------------
      .addCase(castVoteThunk.pending, (state, action) => {
        Object.assign(state, withVoteStarted(state, action.meta.arg.featureKey))
      })
      .addCase(castVoteThunk.fulfilled, (state, action) => {
        Object.assign(
          state,
          withVoteResult(state, action.meta.arg.featureKey, action.payload),
        )
      })
      .addCase(castVoteThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withVoteResult(
            state,
            action.meta.arg.featureKey,
            err(ThirstExceptions.unknown(action.error.message ?? 'Unknown error')),
          ),
        )
      })
  },
})
