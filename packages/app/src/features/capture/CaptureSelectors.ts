/**
 * The Capture & Inbox Selectors (`RC-5`, `RC-20`) — canon's
 * `InboxSelectors.swift` plus the derived reads the prompt's disabled Add
 * button and the Undo toast need.
 *
 * Every derived read the surface performs lives here, built with
 * `createSelector` over `RootState` alone. None of them reads a clock: where a
 * decision needs an instant the reducer has already parked one
 * (`clockAnchor`, `undo.expiresAt`), so the view never has to consult a clock
 * either — and a Selector could not, because it must stay pure (`UZF-11`).
 */
import {
  type EndeavorOperationBinding,
  EndeavorsVistas,
  bindingsForGesture,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { CaptureException } from './CaptureException'
import type { CaptureState } from './CaptureFeature'
import {
  captureBlockedReason,
  canSubmitCapture,
  justCreatedEndeavor,
  pendingTriageEndeavors,
} from './CaptureRules'

const selectCaptureSlice = (state: RootState): CaptureState => state.capture

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsCaptureLoading = createSelector(
  [selectCaptureSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectCaptureException = createSelector(
  [selectCaptureSlice],
  (slice): CaptureException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

export const selectIsCapturePromptOpen = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt !== null,
)

/** The live draft, or `null` when the prompt is closed. */
export const selectCaptureDraft = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt?.draft ?? null,
)

/**
 * Whether **Add** is enabled — canon's `canSubmit`.
 *
 * `false` with no prompt open, so a stray keyboard shortcut cannot submit a
 * draft that does not exist.
 */
export const selectCanSubmitCapture = createSelector(
  [selectCaptureDraft],
  (draft) => (draft === null ? false : canSubmitCapture(draft)),
)

/**
 * What blocks submission, in words — the epic's a11y contract that a disabled
 * submit control *"names what blocks it"*. `null` when Add is enabled.
 */
export const selectCaptureBlockedReason = createSelector(
  [selectCaptureDraft],
  (draft) => (draft === null ? null : captureBlockedReason(draft)),
)

export const selectAvailableCaptureDestinations = createSelector(
  [selectCaptureSlice],
  (slice) => slice.availableDestinations,
)

/**
 * The destination the picker shows: the draft's while a prompt is open, and
 * the remembered one otherwise — which is what the next prompt will seed with.
 */
export const selectSelectedCaptureDestination = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt?.draft.destination ?? slice.lastUsedDestination,
)

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/**
 * The pending navigation intent — the shell's one-shot (`RC-17`: it performs
 * the navigation, this slice only decides it).
 */
export const selectCaptureNavigationIntent = createSelector(
  [selectCaptureSlice],
  (slice) => slice.navigation,
)

// ---------------------------------------------------------------------------
// The Inbox
// ---------------------------------------------------------------------------

export const selectIsInboxOpen = createSelector(
  [selectCaptureSlice],
  (slice) => slice.inbox.isOpen,
)

/**
 * `justCreatedCardSelector` — the single row at the top of the sheet, or
 * `null`.
 */
export const selectJustCreatedEndeavor = createSelector(
  [selectCaptureSlice],
  (slice) =>
    justCreatedEndeavor(slice.endeavors, slice.inbox.justCreatedEndeavorId),
)

/** `pendingTriageSelector` — every unscheduled non-event endeavor, newest first. */
export const selectPendingTriageEndeavors = createSelector(
  [selectCaptureSlice],
  (slice) =>
    pendingTriageEndeavors(slice.endeavors, slice.inbox.justCreatedEndeavorId),
)

/** `isEmptySelector` — no section has anything to show. */
export const selectIsInboxEmpty = createSelector(
  [selectJustCreatedEndeavor, selectPendingTriageEndeavors],
  (justCreated, pendingTriage) =>
    justCreated === null && pendingTriage.length === 0,
)

/** `totalCountSelector` — rows across both sections. */
export const selectInboxTotalCount = createSelector(
  [selectJustCreatedEndeavor, selectPendingTriageEndeavors],
  (justCreated, pendingTriage) =>
    (justCreated === null ? 0 : 1) + pendingTriage.length,
)

/**
 * The Inbox vista — canon's `InboxFeature.State.vista`, which is
 * `EndeavorsVistas.inbox` and never anything else.
 *
 * It is a Selector rather than a bare import so #24 reads it the same way it
 * reads every other row input, and so a later per-list variant is a change here
 * rather than in every consumer.
 */
export const selectInboxVista = createSelector(
  [selectCaptureSlice],
  () => EndeavorsVistas.inbox,
)

/**
 * The row's swipe operations, from the vista's capabilities — canon passes
 * `store.vista.capabilities` straight into `InboxView`, which resolves them per
 * gesture.
 *
 * Leading is empty and trailing is `[markComplete, delete]` in declaration
 * order, which **is** the swipe-button order. The doc's "Start / Edit leading,
 * Delete / Archive trailing" describes a set the code does not ship; the
 * delivery PR records the divergence and the epic's tie-breaker (code wins).
 */
export const selectInboxSwipeOperations = createSelector(
  [selectInboxVista],
  (
    vista,
  ): {
    readonly leading: readonly EndeavorOperationBinding[]
    readonly trailing: readonly EndeavorOperationBinding[]
  } => ({
    leading: bindingsForGesture(vista.capabilities, 'swipeLeading'),
    trailing: bindingsForGesture(vista.capabilities, 'swipeTrailing'),
  }),
)

/** The Triage one-shot, seeded with today's first free gap. `null` when spent. */
export const selectCaptureTriageRequest = createSelector(
  [selectCaptureSlice],
  (slice) => slice.triageRequest,
)

// ---------------------------------------------------------------------------
// Add for Today + Undo
// ---------------------------------------------------------------------------

/** The open scheduling popover, or `null`. */
export const selectAddForToday = createSelector(
  [selectCaptureSlice],
  (slice) => slice.addForToday,
)

/** The pre-filled slot the popover offers, or `null` when it is closed. */
export const selectAddForTodayPrefill = createSelector(
  [selectAddForToday],
  (addForToday) => addForToday?.pickedTime ?? null,
)

/**
 * Everything the Undo toast needs while the window is open, and `null` the
 * moment it is not.
 *
 * No message string: #24 owns the copy and the locale-aware time formatting
 * (canon's `toastTimeFormatter`), so formatting here would both duplicate that
 * and make this Selector's output depend on the runtime's locale.
 */
export const selectSchedulingUndo = createSelector(
  [selectCaptureSlice],
  (slice) =>
    slice.undo.kind === 'armed'
      ? {
          endeavorId: slice.undo.snapshot.endeavorId,
          title: slice.undo.snapshot.title,
          scheduledAt: slice.undo.snapshot.scheduledAt,
          expiresAt: slice.undo.expiresAt,
        }
      : null,
)

/** Whether the window is open — the toast's own visibility. */
export const selectIsUndoArmed = createSelector(
  [selectCaptureSlice],
  (slice) => slice.undo.kind === 'armed',
)

/**
 * The snapshot `undoScheduleForTodayThunk` needs, or `null` when there is
 * nothing to undo. A second Undo therefore has nothing to dispatch, and the
 * reducer refuses it even if something does.
 */
export const selectUndoSnapshot = createSelector(
  [selectCaptureSlice],
  (slice) => (slice.undo.kind === 'armed' ? slice.undo.snapshot : null),
)
