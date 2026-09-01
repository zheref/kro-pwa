/**
 * The Thirst vote surface's Producers (`RC-3`, `RC-6`, `RC-25`) — canon's
 * `ComingSoonProducer.swift`, against the injected `thirstService`
 * (`ThunkExtra`, `library/store.ts`).
 *
 * None of these mints an id: `castVoteThunk`'s `id` is a caller-supplied
 * argument (the Page mints it, `crypto.randomUUID()`), the same convention
 * `EarnProducer.ts`'s `addRewardThunk` documents for itself.
 */
import { type Result, err, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import { type ThirstException, toThirstException } from './ThirstException'
import type { FeatureVoteCounts } from './ThirstModels'

/** Whether the current user has already voted for `featureKey`. Requires a
 * signed-in session; a signed-out caller's typed failure is what blocks
 * voting (`ThirstSelectors.ts`'s `.unavailable`). */
export const checkVoteStateThunk = createAsyncThunk<
  Result<boolean, ThirstException>,
  { featureKey: string },
  { extra: ThunkExtra }
>(
  'thirst/onVoteStateCheckCompleted',
  async ({ featureKey }, { extra, signal }) => {
    try {
      const voted = await extra.thirstService.hasVoted(featureKey, { signal })
      return ok(voted)
    } catch (error) {
      return err(toThirstException(error))
    }
  },
)

/** Total + per-platform vote counts for `featureKey`. Public — no session
 * required. */
export const fetchCountsThunk = createAsyncThunk<
  Result<FeatureVoteCounts, ThirstException>,
  { featureKey: string },
  { extra: ThunkExtra }
>(
  'thirst/onCountsFetchCompleted',
  async ({ featureKey }, { extra, signal }) => {
    try {
      const counts = await extra.thirstService.fetchCounts(featureKey, {
        signal,
      })
      return ok(counts)
    } catch (error) {
      return err(toThirstException(error))
    }
  },
)

/** Casts the signed-in user's single vote for `featureKey`, tagged `web`
 * (`ThirstService.ts`). A vote the server already has (the unique-constraint
 * conflict) converges quietly — the Service resolves `void`, so this always
 * reports `ok(true)` on a non-throwing return, matching canon's
 * `.success(true)`. */
export const castVoteThunk = createAsyncThunk<
  Result<boolean, ThirstException>,
  { featureKey: string; id: string },
  { extra: ThunkExtra }
>(
  'thirst/onVoteCastCompleted',
  async ({ featureKey, id }, { extra, signal }) => {
    try {
      await extra.thirstService.castVote(featureKey, id, { signal })
      return ok(true)
    } catch (error) {
      return err(toThirstException(error))
    }
  },
)
