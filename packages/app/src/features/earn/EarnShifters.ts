/**
 * The Earn surface's Shifters (`RC-4`, `RC-19`) — canon's `EarnShifters.swift`,
 * plus the load/exception transitions canon leaves to TCA's reducer body.
 *
 * Every one returns a brand-new plain object; none reads a clock, a service or
 * a random source — `now`/`id` arrive as arguments wherever a caller needs one
 * (`UZF-10`).
 */
import type { Reward } from '@kro/core'
import type { EarnException } from './EarnException'
import type { EarnPreferences, EarnState } from './EarnFeature'
import { blankEarnRewardDraft } from './EarnFeature'
import type { EarnCatalogSnapshot } from './EarnProducer'

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const withCatalogLoadStarted = (state: EarnState): EarnState => ({
  ...state,
  load: { kind: 'loading' },
})

export const withCatalogInstalled = (
  state: EarnState,
  snapshot: EarnCatalogSnapshot,
): EarnState => ({
  ...state,
  load: { kind: 'loaded' },
  rewards: snapshot.rewards,
  claimedRewardIds: snapshot.claimedRewardIds,
  performances: snapshot.performances,
})

export const withPreferencesApplied = (
  state: EarnState,
  preferences: EarnPreferences,
): EarnState => ({ ...state, preferences })

/**
 * The shared failure landing spot for every load and every mutation. Never
 * touches `rewards`/`claimedRewardIds`/`performances`/`preferences` — that is
 * what makes a failed write leave the catalog and the balance untouched
 * (`EarnFeature.ts`'s header; the issue's atomicity acceptance criterion).
 */
export const withException = (
  state: EarnState,
  exception: EarnException,
): EarnState => ({ ...state, load: { kind: 'failed', exception } })

// ---------------------------------------------------------------------------
// Add Reward sheet
// ---------------------------------------------------------------------------

/**
 * `applyRewardDraftOpened` — always resets the form and presents the sheet.
 * The cost is pre-filled from the already-loaded `earn.defaultRewardThreshold`
 * preference (`#11`).
 */
export const withRewardDraftOpened = (state: EarnState): EarnState => ({
  ...state,
  isAddingReward: true,
  addRewardDraft: {
    ...blankEarnRewardDraft,
    pointsRequired: state.preferences.defaultRewardThreshold,
  },
})

/** `applyRewardDraftClosed` — always hides the sheet and resets the form. */
export const withRewardDraftClosed = (state: EarnState): EarnState => ({
  ...state,
  isAddingReward: false,
  addRewardDraft: blankEarnRewardDraft,
})

export const withDraftTitleChanged = (
  state: EarnState,
  title: string,
): EarnState => ({
  ...state,
  addRewardDraft: { ...state.addRewardDraft, title },
})

/** Canon's `String(glyph.prefix(2))` — capped at two code points. */
export const withDraftGlyphChanged = (
  state: EarnState,
  glyph: string,
): EarnState => ({
  ...state,
  addRewardDraft: {
    ...state.addRewardDraft,
    glyph: [...glyph].slice(0, 2).join(''),
  },
})

/** Canon's `max(0, points)` — never negative. */
export const withDraftPointsChanged = (
  state: EarnState,
  pointsRequired: number,
): EarnState => ({
  ...state,
  addRewardDraft: {
    ...state.addRewardDraft,
    pointsRequired: Math.max(0, pointsRequired),
  },
})

/** Canon's `notes.isEmpty ? nil : notes`. */
export const withDraftNotesChanged = (
  state: EarnState,
  notes: string,
): EarnState => ({
  ...state,
  addRewardDraft: {
    ...state.addRewardDraft,
    notes: notes.length === 0 ? null : notes,
  },
})

// ---------------------------------------------------------------------------
// Catalog mutations — applied only after the persist succeeds
// ---------------------------------------------------------------------------

/**
 * A typed add and a suggestion-add land here identically: both insert at the
 * top (canon's `rewards.insert(_, at: 0)`), close the sheet and clear the
 * draft — harmless when the sheet was never open (the suggestion path).
 */
export const withRewardAdded = (
  state: EarnState,
  reward: Reward,
): EarnState => ({
  ...state,
  load: { kind: 'loaded' },
  rewards: [reward, ...state.rewards],
  isAddingReward: false,
  addRewardDraft: blankEarnRewardDraft,
})

/** `userDidTapDeleteReward` — context-menu delete, by id. */
export const withRewardRemoved = (state: EarnState, id: string): EarnState => ({
  ...state,
  load: { kind: 'loaded' },
  rewards: state.rewards.filter((reward) => reward.id !== id),
})

// ---------------------------------------------------------------------------
// Claim flow
// ---------------------------------------------------------------------------

export const withClaimRequested = (
  state: EarnState,
  rewardId: string,
): EarnState => ({ ...state, claimingRewardId: rewardId })

export const withClaimCancelled = (state: EarnState): EarnState => ({
  ...state,
  claimingRewardId: null,
})

/**
 * `applyClaimConfirmed` — marks the id claimed (idempotent: claiming an
 * already-claimed id is a no-op on the set) and clears the confirm sheet.
 */
export const withClaimApplied = (state: EarnState, id: string): EarnState => ({
  ...state,
  load: { kind: 'loaded' },
  claimedRewardIds: state.claimedRewardIds.includes(id)
    ? state.claimedRewardIds
    : [...state.claimedRewardIds, id],
  claimingRewardId: null,
})
