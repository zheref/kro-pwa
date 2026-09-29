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
  makeReconciliationContext,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { CaptureException } from './CaptureException'
import type { CapturePromptPanel, CaptureState } from './CaptureFeature'
import {
  CAPTURE_SUGGESTIONS,
  type CaptureSuggestion,
  captureSuggestionTallyText,
} from './CaptureSuggestions'
import {
  captureBlockedReason,
  captureBlocker,
  captureDestinationsForKind,
  captureResolvedSymbol,
  canSubmitCapture,
  isCaptureValueRequired,
  alsoJustCreatedEndeavors,
  justCreatedEndeavor,
  isCaptureRowTriageable,
  pendingTriageEndeavors,
  resolvedCaptureDestination,
  type CaptureDestination,
  type CaptureKindCapabilities,
  captureKindCapabilities,
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

/**
 * What blocks submission, as a named requirement — the order Return walks the
 * required fields in. `null` when Add is enabled or no prompt is open.
 */
export const selectCaptureBlocker = createSelector(
  [selectCaptureDraft],
  (draft) => (draft === null ? null : captureBlocker(draft)),
)

export const selectAvailableCaptureDestinations = createSelector(
  [selectCaptureSlice],
  (slice) => slice.availableDestinations,
)

/**
 * The hosts the picker offers for the open draft's kind — canon's
 * `supported(for:)` intersected with what is available. With no prompt open,
 * every available host.
 */
export const selectCaptureDestinationsForKind = createSelector(
  [selectCaptureDraft, selectAvailableCaptureDestinations],
  (draft, available) =>
    draft === null
      ? available
      : captureDestinationsForKind(draft.kind, available),
)

/** The title row's badge symbol, or `null` with no prompt open. */
export const selectCaptureResolvedSymbol = createSelector(
  [selectCaptureDraft],
  (draft) => (draft === null ? null : captureResolvedSymbol(draft)),
)

/** Whether the open draft must carry a value rating before Add. */
export const selectIsCaptureValueRequired = createSelector(
  [selectCaptureDraft],
  (draft) => (draft === null ? false : isCaptureValueRequired(draft)),
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

/**
 * A multi-add's further Just Created rows, beneath the first — empty for a
 * single capture.
 */
export const selectAlsoJustCreatedEndeavors = createSelector(
  [selectCaptureSlice],
  (slice) =>
    alsoJustCreatedEndeavors(slice.endeavors, slice.inbox.alsoJustCreatedIds),
)

/** `pendingTriageSelector` — every unscheduled non-event endeavor, newest first. */
/**
 * The reconciliation context the pool was reconciled with on load
 * (`withContextLoaded`: `makeReconciliationContext({ now })`), re-derived at
 * the slice's own clock anchor — never the wall clock.
 */
const selectCaptureReconciliationContext = createSelector(
  [(state: RootState) => state.capture.clockAnchor],
  (now) => makeReconciliationContext({ now }),
)

export const selectPendingTriageEndeavors = createSelector(
  [selectCaptureSlice, selectCaptureReconciliationContext],
  (slice, context) =>
    pendingTriageEndeavors(
      slice.endeavors,
      slice.inbox.justCreatedEndeavorId,
      slice.inbox.alsoJustCreatedIds,
      context,
    ),
)

/** `isEmptySelector` — no section has anything to show. */
export const selectIsInboxEmpty = createSelector(
  [selectJustCreatedEndeavor, selectPendingTriageEndeavors],
  (justCreated, pendingTriage) =>
    justCreated === null && pendingTriage.length === 0,
)

/** `totalCountSelector` — rows across both sections. */
export const selectInboxTotalCount = createSelector(
  [
    selectJustCreatedEndeavor,
    selectAlsoJustCreatedEndeavors,
    selectPendingTriageEndeavors,
  ],
  (justCreated, alsoJustCreated, pendingTriage) =>
    (justCreated === null ? 0 : 1) +
    alsoJustCreated.length +
    pendingTriage.length,
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

// ---------------------------------------------------------------------------
// Suggestions (web-only, `captureSuggestions`)
// ---------------------------------------------------------------------------

const NO_SUGGESTIONS: readonly CaptureSuggestion[] = []

/** The pane's cards — empty with the flag off or no prompt open. */
export const selectCaptureSuggestions = createSelector(
  [selectCaptureSlice],
  (slice) =>
    slice.isSuggestionsEnabled &&
    slice.isSuggestionsShown &&
    slice.prompt !== null
      ? CAPTURE_SUGGESTIONS
      : NO_SUGGESTIONS,
)

const NO_IDS: readonly string[] = []

/** The ids ticked for a multi-add, in tick order. */
export const selectSelectedSuggestionIds = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt?.selectedSuggestionIds ?? NO_IDS,
)

/**
 * What **Add N** would write: every ticked suggestion, events included,
 * each paired with the host its kind supports — the draft's host when it
 * can, else the kind's first choice.
 */
export const selectSuggestionsToAdd = createSelector(
  [selectCaptureSlice, selectSelectedSuggestionIds],
  (
    slice,
    ids,
  ): readonly {
    readonly suggestion: CaptureSuggestion
    readonly destination: CaptureDestination
  }[] => {
    const preferred =
      slice.prompt?.draft.destination ?? slice.lastUsedDestination
    return ids.flatMap((id) => {
      const suggestion = CAPTURE_SUGGESTIONS.find((item) => item.id === id)
      if (suggestion === undefined) return []
      return [
        {
          suggestion,
          destination: resolvedCaptureDestination(
            suggestion.kind,
            preferred,
            slice.availableDestinations,
          ),
        },
      ]
    })
  },
)

/**
 * The status line's text: the last multi-add's tally while it stands, else
 * what blocks Add. `null` when there is nothing to say.
 */
export const selectCaptureStatusReason = createSelector(
  [selectCaptureSlice, selectCaptureBlockedReason],
  (slice, blocked) => {
    const notice = slice.prompt?.suggestionNotice ?? null
    if (notice === null) return blocked
    const added = captureSuggestionTallyText(notice.toInbox, notice.toPlan)
    if (notice.failed === 0) return added
    const failed = `${notice.failed} couldn’t be saved — still selected.`
    return added === null ? failed : `${added} ${failed}`
  },
)

/** Whether the pane may exist at all — flag on and a prompt open. */
export const selectCanShowCaptureSuggestions = createSelector(
  [selectCaptureSlice],
  (slice) => slice.isSuggestionsEnabled && slice.prompt !== null,
)

/** The remembered on/off choice for the pane. */
export const selectIsCaptureSuggestionsShown = createSelector(
  [selectCaptureSlice],
  (slice) => slice.isSuggestionsShown,
)

/** The open prompt's draft kind, or `null` with no prompt open. */
const selectCapturePromptKind = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt?.draft.kind ?? null,
)

/**
 * What the draft's kind can carry (`UZF-11`): rewards, a value, a duration, a
 * clearable time. `null` with no prompt open. Recomputed only when the kind
 * changes, so the prompt's props stay referentially stable while typing.
 */
export const selectCaptureKindCapabilities = createSelector(
  [selectCapturePromptKind],
  (kind): CaptureKindCapabilities | null =>
    kind === null ? null : captureKindCapabilities(kind),
)

/** The open inline panel, or `null` — the panel half of the one editor. */
export const selectCaptureOpenPanel = createSelector(
  [selectCaptureSlice],
  (slice): CapturePromptPanel | null =>
    slice.prompt?.editor?.kind === 'panel' ? slice.prompt.editor.panel : null,
)

/** Whether the start-time picker is the open editor. */
export const selectIsEditingCaptureStartTime = createSelector(
  [selectCaptureSlice],
  (slice) =>
    slice.prompt?.editor?.kind === 'time' &&
    slice.prompt.editor.field === 'start',
)

/** Whether the end-time picker is the open editor. */
export const selectIsEditingCaptureEndTime = createSelector(
  [selectCaptureSlice],
  (slice) =>
    slice.prompt?.editor?.kind === 'time' &&
    slice.prompt.editor.field === 'end',
)

/** Whether a multi-add is being written — Add stays spent until it settles. */
export const selectIsAddingCaptureSuggestions = createSelector(
  [selectCaptureSlice],
  (slice) => slice.prompt?.isAddingSuggestions ?? false,
)

const NO_UNTRIAGEABLE: readonly string[] = []

/**
 * The Inbox rows whose Triage would refuse to open — a multi-added habit in
 * Just Created, or a row whose resolved kind is not triaged. The Inbox hides
 * their Triage button rather than offer a button that fails.
 */
export const selectUntriageableInboxRowIds = createSelector(
  [
    selectJustCreatedEndeavor,
    selectAlsoJustCreatedEndeavors,
    selectCaptureReconciliationContext,
  ],
  (justCreated, alsoJustCreated, context): readonly string[] => {
    const rows =
      justCreated === null ? alsoJustCreated : [justCreated, ...alsoJustCreated]
    const ids = rows
      .filter((row) => !isCaptureRowTriageable(row, context))
      .map((row) => row.id)
    return ids.length === 0 ? NO_UNTRIAGEABLE : ids
  },
)

/** Whether the web-only keyboard accelerators are on (`keyboardAccelerators`). */
export const selectAreCaptureKeyboardAcceleratorsEnabled = createSelector(
  [selectCaptureSlice],
  (slice) => slice.isKeyboardAcceleratorsEnabled,
)
