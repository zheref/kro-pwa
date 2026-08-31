/**
 * The Triage Selectors (`RC-5`, `RC-20`) — canon's `TriageSelectors.swift` plus
 * the derived reads the disabled Complete button, the pill row and the
 * operation-status indicator need.
 *
 * Every derived read the surface performs lives here, built with
 * `createSelector` over `RootState` alone. None of them reads a clock: where a
 * decision needs an instant the reducer has already parked one
 * (`clockAnchor`, the seeded dates), so the view never has to consult a clock
 * either — and a Selector could not, because it must stay pure (`UZF-11`).
 */
import {
  type EisenhowerQuadrant,
  eisenhowerQuadrants,
  quadrantIsImportant,
  quadrantIsUrgent,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { TriageException } from './TriageException'
import type { TriageState } from './TriageFeature'
import {
  type TriageExpiryToken,
  isTriageExpiryCustom,
  orderedTriageExpiryTokens,
  selectedTriageExpiryToken,
  triageExpiryInvariantHolds,
} from './TriageExpiry'
import {
  type TriageDecision,
  type TriageSecondaryAction,
  canConfirmTriage,
  triageBlockedReason,
  triageDecisionFrom,
  triageDurationChipLabel,
  triageEffortLabel,
  triagePrimaryActionLabel,
  triageSecondaryAction,
  triageValueLabel,
} from './TriageRules'
import { type TriagePushOutcome, triagePushNotice } from './TriageSave'
import type { TriageForm, TriageOutcome, TriageSession } from './TriageState'

const selectTriageSlice = (state: RootState): TriageState => state.triage

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsTriageLoading = createSelector(
  [selectTriageSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectTriageException = createSelector(
  [selectTriageSlice],
  (slice): TriageException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

/** The open session, or `null` when the screen is not mounted. */
export const selectTriageSession = createSelector(
  [selectTriageSlice],
  (slice): TriageSession | null => slice.session,
)

/** The live form, or `null` when the screen is not mounted. */
export const selectTriageForm = createSelector(
  [selectTriageSession],
  (session): TriageForm | null => session?.form ?? null,
)

// ---------------------------------------------------------------------------
// The header and the two rating rows
// ---------------------------------------------------------------------------

/** The endeavor's title and symbol, as the header pair renders them. */
export const selectTriageHeading = createSelector(
  [selectTriageSession],
  (session) =>
    session === null
      ? null
      : { title: session.endeavorTitle, symbol: session.endeavorSymbol },
)

/**
 * The header's reward badge — *"bound to the same value the Reward stepper
 * edits, so it updates live as the user adjusts"*.
 */
export const selectTriageRewardPoints = createSelector(
  [selectTriageForm],
  (form) => form?.rewardPoints ?? null,
)

/** The Value row: the rating and the descriptor for it (`null` when cleared). */
export const selectTriageValueRating = createSelector(
  [selectTriageForm],
  (form) =>
    form === null
      ? null
      : { rating: form.value, label: triageValueLabel(form.value) },
)

/** The Effort row: same shape, Autopilot…Grueling. */
export const selectTriageEffortRating = createSelector(
  [selectTriageForm],
  (form) =>
    form === null
      ? null
      : { rating: form.effort, label: triageEffortLabel(form.effort) },
)

// ---------------------------------------------------------------------------
// The duration chips
// ---------------------------------------------------------------------------

/**
 * The chip row: every option with its canon label and whether it is selected.
 *
 * There is deliberately no "Skip" entry — *"There is no 'Skip' affordance"* —
 * so #26 has nothing to render that could revert the value.
 */
export const selectTriageDurationChips = createSelector(
  [selectTriageSession],
  (session) =>
    session === null
      ? []
      : session.durationOptionsMinutes.map((minutes) => ({
          minutes,
          label: triageDurationChipLabel(minutes),
          isSelected: session.form.durationMinutes === minutes,
        })),
)

/**
 * Whether the duration can still be left undefined — `true` only before the
 * first pick. Exposed so the UI never has to infer the irreversibility rule.
 */
export const selectIsTriageDurationUndefined = createSelector(
  [selectTriageForm],
  (form) => form !== null && form.durationMinutes === null,
)

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

/**
 * The 2 × 2 grid, in canon's `allCases` order, each tile carrying the two axis
 * facts the unselected state renders and whether it is the current pick.
 */
export const selectTriageQuadrantTiles = createSelector(
  [selectTriageForm],
  (form) =>
    eisenhowerQuadrants.map((quadrant) => ({
      quadrant,
      isSelected: form?.quadrant === quadrant,
      isUrgent: quadrantIsUrgent(quadrant),
      isImportant: quadrantIsImportant(quadrant),
    })),
)

export const selectTriageQuadrant = createSelector(
  [selectTriageForm],
  (form): EisenhowerQuadrant | null => form?.quadrant ?? null,
)

// ---------------------------------------------------------------------------
// Scheduled date and expiry
// ---------------------------------------------------------------------------

export const selectTriageDueDate = createSelector(
  [selectTriageForm],
  (form) => form?.dueDate ?? null,
)

export const selectTriageExpiry = createSelector(
  [selectTriageForm],
  (form) => form?.expiry ?? null,
)

/**
 * The pill row in **selected-first order**, with the always-on picker's own
 * slot left to the view (it is not a token — it is the row's leading control).
 */
export const selectTriageExpiryTokens = createSelector(
  [selectTriageForm],
  (form): readonly TriageExpiryToken[] =>
    form === null
      ? []
      : orderedTriageExpiryTokens({
          scheduled: form.dueDate,
          expiry: form.expiry,
        }),
)

/** The pill currently lit, or `null` when there is no expiry to attribute. */
export const selectTriageSelectedExpiryToken = createSelector(
  [selectTriageForm],
  (form): TriageExpiryToken | null =>
    form === null
      ? null
      : selectedTriageExpiryToken({
          scheduled: form.dueDate,
          expiry: form.expiry,
        }),
)

/** Whether the informational Custom pill is lit. */
export const selectIsTriageExpiryCustom = createSelector(
  [selectTriageForm],
  (form) =>
    form !== null &&
    isTriageExpiryCustom({ scheduled: form.dueDate, expiry: form.expiry }),
)

/**
 * The scroll-reset counter. #26 re-scrolls the row to its leading edge whenever
 * this changes; it never has to work out *whether* the expiry moved.
 */
export const selectTriageExpiryScrollNonce = createSelector(
  [selectTriageSession],
  (session) => session?.expiryScrollNonce ?? 0,
)

/**
 * Whether the Clear affordance may be shown at all — canon's `clearDisabled`,
 * inverted. Hidden while a scheduled date is in place, *"to keep the UI honest"*
 * about the snap-back the reducer would perform.
 */
export const selectCanClearTriageExpiry = createSelector(
  [selectTriageForm],
  (form) => form !== null && form.dueDate === null && form.expiry !== null,
)

/** The invariant as a readable fact — a scheduled date implies an expiry. */
export const selectTriageExpiryInvariantHolds = createSelector(
  [selectTriageForm],
  (form) =>
    form === null ||
    triageExpiryInvariantHolds({
      scheduled: form.dueDate,
      expiry: form.expiry,
    }),
)

// ---------------------------------------------------------------------------
// The bottom action row
// ---------------------------------------------------------------------------

/** `canConfirmSelector` — quadrant always, plus a date for every quadrant but Archive. */
export const selectCanConfirmTriage = createSelector(
  [selectTriageForm],
  (form) =>
    form !== null &&
    canConfirmTriage({ quadrant: form.quadrant, dueDate: form.dueDate }),
)

/**
 * What blocks Complete, in words — the epic's a11y contract that a disabled
 * submit control *"names what blocks it"*. `null` when the gate is open.
 */
export const selectTriageBlockedReason = createSelector(
  [selectTriageForm],
  (form) =>
    form === null
      ? null
      : triageBlockedReason({ quadrant: form.quadrant, dueDate: form.dueDate }),
)

/** `primaryActionLabelSelector` — "Complete Triage" until a quadrant is picked. */
export const selectTriagePrimaryActionLabel = createSelector(
  [selectTriageForm],
  (form) => triagePrimaryActionLabel(form?.quadrant ?? null),
)

/** `secondaryActionSelector` — `null` for Schedule and before any pick. */
export const selectTriageSecondaryAction = createSelector(
  [selectTriageForm],
  (form): TriageSecondaryAction | null =>
    triageSecondaryAction(form?.quadrant ?? null),
)

/**
 * `currentDecisionSelector` — the decision the buttons would emit, or `null`.
 *
 * Exposed so a test (and #26) can read exactly what confirming will commit
 * without dispatching it.
 */
export const selectTriageDecision = createSelector(
  [selectTriageSession],
  (session): TriageDecision | null =>
    session === null
      ? null
      : triageDecisionFrom({
          endeavorId: session.endeavorId,
          quadrant: session.form.quadrant,
          durationMinutes: session.form.durationMinutes,
          dueDate: session.form.dueDate,
          rewardPoints: session.form.rewardPoints,
          value: session.form.value,
          effort: session.form.effort,
          expiry: session.form.expiry,
        }),
)

/** Whether the dark-launched inline Edit affordance is reachable. */
export const selectIsTriageEditReachable = createSelector(
  [selectTriageSession],
  (session) => session?.isEditReachable ?? false,
)

/** The one-shot the shell performs. `null` when there is nothing pending. */
export const selectTriageOutcome = createSelector(
  [selectTriageSlice],
  (slice): TriageOutcome | null => slice.outcome,
)

// ---------------------------------------------------------------------------
// Kro-enhanced promotion
// ---------------------------------------------------------------------------

/**
 * Whether confirming will promote this row to Kro-enhanced — a **forecast**
 * taken when the session opened, never a promotion.
 */
export const selectTriageWillPromote = createSelector(
  [selectTriageSession],
  (session) => session?.willPromoteOnConfirm ?? false,
)

/** The row's category as it was when Triage opened. */
export const selectTriageCitizenshipAtEntry = createSelector(
  [selectTriageSession],
  (session) => session?.citizenshipAtEntry ?? null,
)

// ---------------------------------------------------------------------------
// The durable save
// ---------------------------------------------------------------------------

export const selectIsTriageSaving = createSelector(
  [selectTriageSlice],
  (slice) => slice.save.kind === 'saving',
)

/**
 * The **local** failure — the only one that means the decision was lost.
 * `null` for every other save state, including a deferred push.
 */
export const selectTriageSaveException = createSelector(
  [selectTriageSlice],
  (slice): TriageException | null =>
    slice.save.kind === 'failed' ? slice.save.exception : null,
)

export const selectTriagePushOutcome = createSelector(
  [selectTriageSlice],
  (slice): TriagePushOutcome | null =>
    slice.save.kind === 'saved' ? slice.save.push : null,
)

/**
 * The copy the operation-status indicator shows for a push that did not land,
 * or `null`. Canon surfaces the same thing through `onOperationError`.
 */
export const selectTriagePushNotice = createSelector(
  [selectTriagePushOutcome],
  (push) => (push === null ? null : triagePushNotice(push)),
)

/**
 * Whether the decision is durably captured — `true` for **every** `saved`
 * state, deferred push included. This is the offline guarantee, readable.
 */
export const selectIsTriageDecisionDurable = createSelector(
  [selectTriageSlice],
  (slice) => slice.save.kind === 'saved',
)
