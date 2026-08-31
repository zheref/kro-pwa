/**
 * The Earn surface's slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — the port of
 * `EarnFeature.swift`: the reward catalog, the claim flow, the Add-Reward
 * draft and the two `earn.*` preferences the surface reads (`#27`).
 *
 * `State` holds domain types only (`Reward[]`, `Perform[]`) and never a
 * derived total — `EarnRules.ts` computes the balance and the partition fresh
 * from `performances` + `rewards` + `claimedRewardIds` on every read, so there
 * is no shadow counter to drift (see that file's header for the one
 * deliberate divergence from canon's own selector).
 *
 * ## Why every catalog mutation is a Producer, never an optimistic reducer arm
 *
 * Canon mutates `state.rewards`/`state.claimedIDs` synchronously in the
 * reducer and fires the persist effect afterwards, fire-and-forget — if the
 * `UserDefaults` write somehow fails, the in-memory catalog has already
 * diverged from disk and nothing ever reconciles it. The issue's acceptance
 * criteria are explicit that this port must not do that for claiming
 * ("claim flow … atomically"; "a failed claim leaves balance and catalog
 * untouched"), and the same reasoning applies identically to add/delete/add-
 * suggestion — a catalog write that silently fails should never look like it
 * succeeded. So **every** mutation here is persist-then-apply: `EarnProducer`
 * reads the current catalog fresh from storage, writes the new one, and only
 * on that write's success does the reducer's `.fulfilled` arm touch `State`.
 * On failure only `load` moves to `failed`; `rewards`/`claimedRewardIds` are
 * never touched, which is what makes the balance and the partition provably
 * unaffected by a failed write. Named as a flagged divergence from canon in
 * the PR, applied uniformly rather than only where the issue tested it.
 */
import type { Perform, PointsFormula, Reward } from '@kro/core'
import { PointsFormula as PointsFormulas } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { type EarnException, EarnExceptions } from './EarnException'
import type { EarnCatalogSnapshot } from './EarnProducer'
import {
  addRewardThunk,
  addSuggestionThunk,
  claimRewardThunk,
  deleteRewardThunk,
  loadEarnCatalogThunk,
  loadEarnPreferencesThunk,
} from './EarnProducer'
import {
  withCatalogInstalled,
  withCatalogLoadStarted,
  withClaimApplied,
  withClaimCancelled,
  withClaimRequested,
  withDraftGlyphChanged,
  withDraftNotesChanged,
  withDraftPointsChanged,
  withDraftTitleChanged,
  withException,
  withPreferencesApplied,
  withRewardAdded,
  withRewardDraftClosed,
  withRewardDraftOpened,
  withRewardRemoved,
} from './EarnShifters'

/**
 * The one lifecycle field (`RC-24`, `UZF-9`). `loading`/`loaded` describe only
 * the catalog read (`loadEarnCatalogThunk`'s `.pending`/`.fulfilled`); `failed`
 * is shared more widely — every load (including `loadEarnPreferencesThunk`)
 * and every mutation (add/delete/claim) lands here on its own failure too, via
 * the single `withException` Shifter (`EarnShifters.ts`). There is no second
 * lifecycle field for those; `load` is Earn's one advisory signal.
 */
export type EarnLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: EarnException }

/** The two `earn.*` preferences this surface reads (`#11`'s settings). */
export interface EarnPreferences {
  /** `earn.defaultRewardThreshold` — the Add-Reward cost prefill. Default 100. */
  readonly defaultRewardThreshold: number
  /**
   * `earn.pointsFormula`, surfaced read-only. The formula math itself lives in
   * `domain/session/RewardCalculator` (`#8`) and is awarded by Session (`#21`)
   * — this feature never recomputes it, only reads which one is active.
   */
  readonly pointsFormula: PointsFormula
}

export const defaultEarnPreferences: EarnPreferences = {
  defaultRewardThreshold: 100,
  pointsFormula: PointsFormulas.slidingScale,
}

/** The Add-Reward sheet's in-progress form. Canon's `Reward.blankDraft`. */
export interface EarnRewardDraft {
  readonly title: string
  readonly glyph: string
  readonly pointsRequired: number
  readonly notes: string | null
}

export const blankEarnRewardDraft: EarnRewardDraft = {
  title: '',
  glyph: '🎁',
  pointsRequired: 100,
  notes: null,
}

export interface EarnState {
  readonly load: EarnLoadState

  /** The user's reward catalog. */
  readonly rewards: readonly Reward[]
  /** Ids of rewards already claimed — canon's `claimedIDs: Set<String>`. */
  readonly claimedRewardIds: readonly string[]
  /**
   * Every recorded performance, the balance's one source (`EarnRules.ts`).
   * Raw pass-through from `#10`'s store — no reconciliation needed, since
   * award points are stamped once at completion and never re-derived here.
   */
  readonly performances: readonly Perform[]

  readonly preferences: EarnPreferences

  readonly isAddingReward: boolean
  readonly addRewardDraft: EarnRewardDraft

  /** The reward the confirm-claim sheet is open on, or `null`. */
  readonly claimingRewardId: string | null
}

export const initialEarnState: EarnState = {
  load: { kind: 'idle' },
  rewards: [],
  claimedRewardIds: [],
  performances: [],
  preferences: defaultEarnPreferences,
  isAddingReward: false,
  addRewardDraft: blankEarnRewardDraft,
  claimingRewardId: null,
}

export type { EarnCatalogSnapshot } from './EarnProducer'

export const earnSlice = createSlice({
  name: 'earn',
  initialState: initialEarnState,
  reducers: {
    // --- Add Reward sheet -------------------------------------------------

    /**
     * User intent: the FAB. Prefills the cost from the already-loaded
     * `earn.defaultRewardThreshold` preference — synchronous, since the
     * preference was read once by `loadEarnPreferencesThunk` and lives in
     * `state.preferences` (`RC-3`: no service call belongs in a reducer).
     */
    userDidTapAddReward(state) {
      Object.assign(state, withRewardDraftOpened(state))
    },

    userDidChangeDraftTitle(state, action: PayloadAction<{ title: string }>) {
      Object.assign(state, withDraftTitleChanged(state, action.payload.title))
    },

    /** User intent: the emoji field. Truncated to two code points, canon's cap. */
    userDidChangeDraftGlyph(state, action: PayloadAction<{ glyph: string }>) {
      Object.assign(state, withDraftGlyphChanged(state, action.payload.glyph))
    },

    userDidChangeDraftPoints(
      state,
      action: PayloadAction<{ pointsRequired: number }>,
    ) {
      Object.assign(
        state,
        withDraftPointsChanged(state, action.payload.pointsRequired),
      )
    },

    userDidChangeDraftNotes(state, action: PayloadAction<{ notes: string }>) {
      Object.assign(state, withDraftNotesChanged(state, action.payload.notes))
    },

    /** User intent: Cancel. The draft is dropped whole; nothing is kept. */
    userDidCancelAddReward(state) {
      Object.assign(state, withRewardDraftClosed(state))
    },

    // --- Claim flow ---------------------------------------------------------

    /** User intent: the Claim button. Opens the confirm sheet. */
    userDidTapClaim(state, action: PayloadAction<{ rewardId: string }>) {
      Object.assign(state, withClaimRequested(state, action.payload.rewardId))
    },

    /** User intent: Cancel on the confirm sheet. */
    userDidCancelClaim(state) {
      Object.assign(state, withClaimCancelled(state))
    },
  },

  extraReducers: (builder) => {
    builder
      // --- earn.* preferences --------------------------------------------
      // No `.pending`/`load` transition here — `load` is the catalog read's
      // own field; a preferences-load failure still reports through it
      // (canon shares one lifecycle signal across both loads too), but a
      // preferences-load success never claims the catalog is ready.
      .addCase(loadEarnPreferencesThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withPreferencesApplied(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(loadEarnPreferencesThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- the catalog: rewards + claimed ids + performances --------------
      .addCase(loadEarnCatalogThunk.pending, (state) => {
        Object.assign(state, withCatalogLoadStarted(state))
      })
      .addCase(loadEarnCatalogThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withCatalogInstalled(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(loadEarnCatalogThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- add a typed reward ----------------------------------------------
      // No `.pending` arm: the sheet stays exactly as the user left it until
      // the write lands, so a failed add can be retried without re-typing
      // (mirrors Capture's `submitCaptureThunk`).
      .addCase(addRewardThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withRewardAdded(state, result.value.reward))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(addRewardThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- add a suggestion --------------------------------------------------
      .addCase(addSuggestionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withRewardAdded(state, result.value.reward))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(addSuggestionThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- delete a reward (context menu) ------------------------------------
      .addCase(deleteRewardThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withRewardRemoved(state, result.value.id))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(deleteRewardThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- claim: the atomic one -------------------------------------------
      // On failure `claimingRewardId` is left exactly as it was, so the
      // confirm sheet stays open and the same claim can be retried; the
      // catalog and the claimed set are untouched either way until `ok`.
      .addCase(claimRewardThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withClaimApplied(state, result.value.id))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(claimRewardThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            EarnExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  userDidCancelAddReward,
  userDidCancelClaim,
  userDidChangeDraftGlyph,
  userDidChangeDraftNotes,
  userDidChangeDraftPoints,
  userDidChangeDraftTitle,
  userDidTapAddReward,
  userDidTapClaim,
} = earnSlice.actions
