/**
 * The Capture & Inbox Shifters (`RC-4`, `RC-19`) — every state transition this
 * feature makes, as pure `with…(state, args) => CaptureState` functions.
 *
 * Each returns a brand-new plain object; none reads a clock, a service or a
 * random source. Where canon's mutating code reaches for `Date()`, the instant
 * arrives here as an argument — which is the whole reason the 500 ms routing
 * delay and the ~8 s Undo window are testable at all.
 *
 * **A closed prompt is a no-op, never a crash.** Every draft Shifter returns
 * `state` unchanged when `prompt` is `null`, because a keystroke can always
 * land one tick after a dismiss and the slice must not invent a prompt to hold
 * it.
 */
import {
  type Endeavor,
  type Result,
  makeReconciliationContext,
  reconcile,
} from '@kro/core'
import type { CaptureException } from './CaptureException'
import {
  type CaptureSuggestion,
  applyCaptureSuggestion,
  captureSuggestionById,
} from './CaptureSuggestions'
import type {
  CaptureAddForTodayState,
  CapturePickerSnapshot,
  CapturePromptPanel,
  CapturePromptState,
  CaptureInboxHost,
  CaptureState,
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from './CaptureFeature'
import {
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  type CaptureDestination,
  type CaptureDraft,
  CaptureKind,
  type CaptureRecurrence,
  type CaptureSchedulingSnapshot,
  MAXIMUM_CAPTURE_VALUE,
  MINIMUM_CAPTURE_VALUE,
  applyCaptureKindDefaults,
  captureIntentFor,
  multiAddIntentFor,
  captureRouteFor,
  captureKindRequiresTime,
  captureKindSupportsDuration,
  captureKindSupportsValue,
  clampCaptureRewards,
  isCaptureIntentDue,
  makeCaptureDraft,
  nextFreeSlotToday,
  nextQuarterHourSlot,
  resolvedCaptureDestination,
  schedulingIntentFor,
  supportedCaptureDestinations,
} from './CaptureRules'

/**
 * The one place a draft edit is written. Public Shifters below stay one-concern
 * and delegate here so "a closed prompt is a no-op" is stated once.
 */
const withDraft = (
  state: CaptureState,
  edit: (draft: CaptureDraft) => CaptureDraft,
): CaptureState => {
  const prompt = state.prompt
  if (prompt === null) return state
  // Any edit retires the last multi-add's notice from the status line.
  return {
    ...state,
    prompt: { ...prompt, draft: edit(prompt.draft), suggestionNotice: null },
  }
}

/** The open time editor's snapshot for `field`, or `null` when it is not open. */
const timeSnapshotOf = (
  prompt: CapturePromptState,
  field: CaptureTimeField,
): CapturePickerSnapshot | null =>
  prompt.editor?.kind === 'time' && prompt.editor.field === field
    ? prompt.editor.snapshot
    : null

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** One concern: a read is in flight, so any prior exception is cleared. */
export function withFetchStarted(state: CaptureState): CaptureState {
  return { ...state, load: { kind: 'loading' } }
}

/**
 * One concern: something failed.
 *
 * The pool, the prompt and the Inbox are untouched — a failed capture must
 * leave the user's typing where it was, and a failed refresh must leave the
 * Inbox they are reading on screen.
 */
export function withException(
  state: CaptureState,
  exception: CaptureException,
): CaptureState {
  return { ...state, load: { kind: 'failed', exception } }
}

/**
 * One concern: the pool and the remembered destination landed together.
 *
 * They arrive in one Shifter because they are read in one pass and the prompt
 * reads both: seeding a draft with a destination the available list does not
 * contain is exactly the case canon's `preferredDestination` guard exists to
 * prevent.
 *
 * **Reconciliation runs here, exactly once**, before anything reads the pool —
 * #12's reconcile-before-filtering contract, and the same single-pass shape
 * `withEndeavorsInstalled` uses on the Do surface. Reconciling later could
 * never repair a stale row, because the section predicates would already have
 * dropped the fresh evidence that proves it stale.
 */
export function withContextLoaded(
  state: CaptureState,
  loaded: {
    readonly endeavors: readonly Endeavor[]
    readonly lastUsedDestination: CaptureDestination
    readonly availableDestinations: readonly CaptureDestination[]
    readonly now: Date
    /** The web-only `captureSuggestions` flag; absent reads as off. */
    readonly isSuggestionsEnabled?: boolean
    /** The remembered pane choice; absent reads as hidden. */
    readonly isSuggestionsShown?: boolean
    /** The web-only `keyboardAccelerators` flag; absent reads as off. */
    readonly isKeyboardAcceleratorsEnabled?: boolean
  },
): CaptureState {
  return {
    ...state,
    load: { kind: 'loaded' },
    endeavors: reconcile(
      loaded.endeavors,
      makeReconciliationContext({ now: loaded.now }),
    ),
    lastUsedDestination: loaded.lastUsedDestination,
    availableDestinations: loaded.availableDestinations,
    clockAnchor: loaded.now,
    isSuggestionsEnabled: loaded.isSuggestionsEnabled ?? false,
    isSuggestionsShown: loaded.isSuggestionsShown ?? false,
    isKeyboardAcceleratorsEnabled:
      loaded.isKeyboardAcceleratorsEnabled ?? false,
  }
}

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

/**
 * One concern: the prompt opened on a kind.
 *
 * The seeded destination is canon's `preferredDestination` rule verbatim — the
 * remembered one **if it is still available**, otherwise the first available,
 * otherwise `.local`.
 */
export function withPromptOpened(
  state: CaptureState,
  params: {
    readonly kind: CaptureKind
    readonly now: Date
    readonly initialStart: Date | null
  },
): CaptureState {
  // `preferredDestination`, narrowed to what this kind supports: the
  // remembered host while it is still offered, else the kind's first choice.
  const preferred = resolvedCaptureDestination(
    params.kind,
    state.lastUsedDestination,
    state.availableDestinations,
  )

  const prompt: CapturePromptState = {
    draft: makeCaptureDraft({
      kind: params.kind,
      now: params.now,
      initialStart: params.initialStart,
      destination: preferred,
    }),
    editor: null,
    selectedSuggestionIds: [],
    suggestionNotice: null,
    isAddingSuggestions: false,
  }
  return { ...state, prompt, clockAnchor: params.now }
}

/** One concern: the prompt is gone, draft and all. */
export function withPromptClosed(state: CaptureState): CaptureState {
  if (state.prompt === null) return state
  return { ...state, prompt: null }
}

/** One concern: the title changed. Stored raw; validation trims. */
export function withTitleEdited(
  state: CaptureState,
  title: string,
): CaptureState {
  return withDraft(state, (draft) => ({ ...draft, title }))
}

/**
 * One concern: a different kind chip.
 *
 * Canon's `applyKindChanged`: rewards re-seed unless the user moved the
 * stepper, value/duration drop for a kind without them, a habit opens with a
 * time and an every-day rule, and an Event pins `hasDate` (`KC-IS-#75`). The
 * destination falls back to the kind's first supported host when the current
 * one is not offered for the new kind. Both picker snapshots are dropped —
 * this tier's half of *"close any open editors when switching kinds"*.
 */
export function withKindSelected(
  state: CaptureState,
  kind: CaptureKind,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  const draft = applyCaptureKindDefaults(prompt.draft, kind)
  return {
    ...state,
    prompt: {
      ...prompt,
      draft: {
        ...draft,
        destination: resolvedCaptureDestination(
          kind,
          draft.destination,
          state.availableDestinations,
        ),
      },
      editor: null,
    },
  }
}

/** One concern: the date chip picked a day. Picking one always commits it. */
export function withDatePicked(state: CaptureState, date: Date): CaptureState {
  return withDraft(state, (draft) => ({ ...draft, date, hasDate: true }))
}

/**
 * One concern: the date chip's Clear button (`KC-IS-#75`).
 *
 * The one affordance canon's own date chip never offers — see `CaptureDraft`'s
 * `hasDate` doc. A no-op for an Event (dates are mandatory; the button is
 * never rendered for one, but the invariant is enforced here too, not only in
 * the view) and for an already-dateless draft.
 */
export function withDateCleared(state: CaptureState): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  if (prompt.draft.kind === CaptureKind.event) return state
  if (!prompt.draft.hasDate) return state
  return {
    ...state,
    prompt: { ...prompt, draft: { ...prompt.draft, hasDate: false } },
  }
}

/**
 * One concern: a time picker opened.
 *
 * Two fields move together and that is the invariant worth a Shifter: the
 * snapshot is taken **and** the field is marked set, exactly as canon does on
 * open (`dueTimeSnapshot = draft.dueTime; hadTimeSnapshot = draft.hasTime;
 * draft.hasTime = true`). Re-opening an already-open picker keeps the original
 * snapshot, so Discard still reaches the pre-edit value.
 */
export function withTimeEditBegun(
  state: CaptureState,
  field: CaptureTimeField,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  if (timeSnapshotOf(prompt, field) !== null) return state

  // Opening this picker closes whatever else was open — another picker keeps
  // what it was turned to (its "done"), a panel simply shuts.
  const draft = prompt.draft
  const snapshot =
    field === 'start'
      ? { time: draft.time, wasSet: draft.hasTime }
      : { time: draft.endTime, wasSet: draft.hasEndTime }
  const edited: CaptureDraft =
    field === 'start'
      ? { ...draft, hasTime: true }
      : { ...draft, hasEndTime: true }

  return {
    ...state,
    prompt: {
      ...prompt,
      draft: edited,
      editor: { kind: 'time', field, snapshot },
    },
  }
}

/** One concern: the wheel moved. The field stays set while it is being turned. */
export function withTimePicked(
  state: CaptureState,
  field: CaptureTimeField,
  time: Date,
): CaptureState {
  return withDraft(state, (draft) =>
    field === 'start'
      ? { ...draft, time, hasTime: true }
      : { ...draft, endTime: time, hasEndTime: true },
  )
}

/**
 * One concern: the open time panel closed, one of three ways.
 *
 * - **Done** confirms and keeps the value.
 * - **Discard** restores the snapshot — both the instant and whether it was
 *   set at all, which is what makes "open the picker, change your mind" leave
 *   an unscheduled task unscheduled.
 * - **Clear** removes the value outright.
 *
 * Ending an edit that never began is a no-op rather than a clear: the snapshot
 * is the evidence an edit was in flight.
 */
export function withTimeEditEnded(
  state: CaptureState,
  field: CaptureTimeField,
  outcome: CaptureTimeEditOutcome,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  const snapshot = timeSnapshotOf(prompt, field)
  // Only this field's own editor closes; a panel open meanwhile stays open.
  const editor = snapshot === null ? prompt.editor : null

  if (outcome === 'clear') {
    // A habit's time is required and never clearable (`requiresTime`).
    if (field === 'start' && captureKindRequiresTime(prompt.draft.kind)) {
      return state
    }
    const cleared: CaptureDraft =
      field === 'start'
        ? { ...prompt.draft, hasTime: false }
        : { ...prompt.draft, hasEndTime: false }
    return { ...state, prompt: { ...prompt, draft: cleared, editor } }
  }

  if (snapshot === null) return state

  if (outcome === 'done') {
    return { ...state, prompt: { ...prompt, editor: null } }
  }

  const restored: CaptureDraft =
    field === 'start'
      ? { ...prompt.draft, time: snapshot.time, hasTime: snapshot.wasSet }
      : {
          ...prompt.draft,
          endTime: snapshot.time,
          hasEndTime: snapshot.wasSet,
        }
  return { ...state, prompt: { ...prompt, draft: restored, editor: null } }
}

/**
 * One concern: an inline panel opened, or closed with `null`.
 *
 * Opening a panel closes an open time picker the way its **Done** would —
 * the value it was turned to stays — because the two are one exclusive
 * editor. Closing a panel leaves a time picker alone.
 */
export function withPanelSet(
  state: CaptureState,
  panel: CapturePromptPanel | null,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  if (panel === null) {
    if (prompt.editor?.kind !== 'panel') return state
    return { ...state, prompt: { ...prompt, editor: null } }
  }
  if (prompt.editor?.kind === 'panel' && prompt.editor.panel === panel) {
    return state
  }
  return { ...state, prompt: { ...prompt, editor: { kind: 'panel', panel } } }
}

/**
 * One concern: the rewards stepper moved, clamped to canon's 1…999. It also
 * marks the value as the user's own, so a later kind switch keeps it.
 */
export function withRewardsPicked(
  state: CaptureState,
  points: number,
): CaptureState {
  return withDraft(state, (draft) => ({
    ...draft,
    rewards: clampCaptureRewards(points),
    hasCustomRewards: true,
  }))
}

/**
 * One concern: the value rating. `null` clears it (tapping the selected
 * star). A no-op for a kind without a rating, or a rating outside 1…5.
 */
export function withValuePicked(
  state: CaptureState,
  value: number | null,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  if (!captureKindSupportsValue(prompt.draft.kind)) return state
  if (
    value !== null &&
    (!Number.isInteger(value) ||
      value < MINIMUM_CAPTURE_VALUE ||
      value > MAXIMUM_CAPTURE_VALUE)
  ) {
    return state
  }
  return withDraft(state, (draft) => ({ ...draft, value }))
}

/**
 * One concern: the duration estimate, in seconds. `null` clears it. A no-op
 * for a kind without one, or a non-positive length.
 */
export function withDurationPicked(
  state: CaptureState,
  seconds: number | null,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  if (!captureKindSupportsDuration(prompt.draft.kind)) return state
  if (seconds !== null && !(seconds > 0)) return state
  return withDraft(state, (draft) => ({ ...draft, duration: seconds }))
}

/**
 * One concern: the emoji badge's picker chose a symbol. The title is left
 * alone — the pick is folded in only at save (`captureTitleForPersistence`).
 */
export function withEmojiPicked(
  state: CaptureState,
  emoji: string,
): CaptureState {
  if (emoji.trim().length === 0) return state
  return withDraft(state, (draft) => ({ ...draft, pickedEmoji: emoji }))
}

/** One concern: the repeat chip chose a rule. */
export function withRecurrencePicked(
  state: CaptureState,
  recurrence: CaptureRecurrence,
): CaptureState {
  return withDraft(state, (draft) => ({ ...draft, recurrence }))
}

/**
 * One concern: the destination menu picked a host.
 *
 * `lastUsedDestination` is **not** touched here: canon writes the AppStorage
 * value in the prompt's `onAdd` callback, i.e. on a confirmed capture only, so
 * browsing the menu and then discarding leaves the memory alone.
 */
export function withDestinationSelected(
  state: CaptureState,
  destination: CaptureDestination,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  // A host the current kind does not support is never selectable.
  if (!supportedCaptureDestinations(prompt.draft.kind).includes(destination)) {
    return state
  }
  return withDraft(state, (draft) => ({ ...draft, destination }))
}

// ---------------------------------------------------------------------------
// Capture → routing
// ---------------------------------------------------------------------------

/**
 * One concern: a capture landed.
 *
 * Five things move together and none of them makes sense alone: the endeavor
 * joins the pool, the prompt closes, the destination is remembered, the route
 * is decided, and the load settles. Deciding the route here — rather than in
 * the Producer — is what keeps the branch (`event → Plan`, everything else →
 * Inbox) a pure, table-testable rule.
 */
export function withCaptureCommitted(
  state: CaptureState,
  committed: {
    readonly endeavor: Endeavor
    readonly destination: CaptureDestination
    readonly now: Date
  },
): CaptureState {
  return {
    ...state,
    load: { kind: 'loaded' },
    endeavors: [...state.endeavors, committed.endeavor],
    prompt: null,
    lastUsedDestination: committed.destination,
    navigation: captureIntentFor(committed.endeavor, committed.now),
    clockAnchor: committed.now,
  }
}

/**
 * One concern: the shell performed the pending route.
 *
 * Before the deadline this is a **no-op** — the wait is the behaviour, not an
 * implementation detail of how canon happened to express it. On an `inbox`
 * route the sheet opens here with its Just Created row; on a `plan` route the
 * shell has already navigated and only the one-shot needs clearing.
 *
 * `presentsInPane` (web-only) is the shell's answer to "does the detail pane
 * host the Inbox here?". When it does, the shell reveals the pane's Inbox
 * segment instead, so the overlay stays closed — but the Just Created row is
 * still stamped, because the pane's Inbox draws it the same way.
 */
export function withRouteDelivered(
  state: CaptureState,
  now: Date,
  presentsInPane = false,
): CaptureState {
  const intent = state.navigation
  if (intent === null) return state
  if (!isCaptureIntentDue(intent, now)) return state

  if (intent.route.kind === 'inbox') {
    return {
      ...state,
      navigation: null,
      inbox: {
        isOpen: !presentsInPane,
        justCreatedEndeavorId: intent.route.endeavorId,
        alsoJustCreatedIds: intent.route.additionalEndeavorIds ?? [],
      },
      clockAnchor: now,
    }
  }
  return { ...state, navigation: null, clockAnchor: now }
}

// ---------------------------------------------------------------------------
// The Inbox
// ---------------------------------------------------------------------------

/**
 * One concern: the Inbox opened from its own affordance.
 *
 * The Just Created slot is cleared, which is canon's
 * `justCreatedEndeavor: nil` on `userDidTapOpenInbox` — the mechanism behind
 * *"on any subsequent open, that endeavor moves into Pending Triage"*.
 */
export function withInboxOpened(state: CaptureState): CaptureState {
  return {
    ...state,
    inbox: {
      isOpen: true,
      justCreatedEndeavorId: null,
      alsoJustCreatedIds: [],
    },
  }
}

/** One concern: the Inbox dismissed. The slot drains with it. */
export function withInboxDismissed(state: CaptureState): CaptureState {
  return {
    ...state,
    inbox: {
      isOpen: false,
      justCreatedEndeavorId: null,
      alsoJustCreatedIds: [],
    },
    addForToday: null,
  }
}

/**
 * One concern: a row asked for Triage, seeded with today's first free gap.
 *
 * An unknown row id is a no-op — a stale row must not open Triage on nothing.
 */
export function withTriageRequested(
  state: CaptureState,
  endeavorId: string,
  now: Date,
  host: CaptureInboxHost = 'overlay',
): CaptureState {
  const known = state.endeavors.some((endeavor) => endeavor.id === endeavorId)
  if (!known) return state
  return {
    ...state,
    triageRequest: {
      endeavorId,
      nextFreeSlotToday: nextFreeSlotToday(state.endeavors, now),
      host,
    },
    clockAnchor: now,
  }
}

/** One concern: the Triage one-shot is spent. */
export function withTriageRequestCleared(state: CaptureState): CaptureState {
  if (state.triageRequest === null) return state
  return { ...state, triageRequest: null }
}

/**
 * One concern: a row operation landed.
 *
 * `null` means the row is gone (a delete); anything else replaces it in place,
 * so a completed row leaves Pending Triage without the list re-ordering around
 * it.
 */
export function withOperationApplied(
  state: CaptureState,
  applied: {
    readonly endeavorId: string
    readonly endeavor: Endeavor | null
  },
): CaptureState {
  const replacement = applied.endeavor
  const endeavors =
    replacement === null
      ? state.endeavors.filter((endeavor) => endeavor.id !== applied.endeavorId)
      : state.endeavors.map((endeavor) =>
          endeavor.id === applied.endeavorId ? replacement : endeavor,
        )
  return { ...state, load: { kind: 'loaded' }, endeavors }
}

// ---------------------------------------------------------------------------
// Add for Today
// ---------------------------------------------------------------------------

/**
 * One concern: the scheduling popover opened on a row, pre-filled with the next
 * quarter-hour slot. An unknown row id is a no-op.
 */
export function withAddForTodayRequested(
  state: CaptureState,
  endeavorId: string,
  now: Date,
): CaptureState {
  const known = state.endeavors.some((endeavor) => endeavor.id === endeavorId)
  if (!known) return state
  const addForToday: CaptureAddForTodayState = {
    endeavorId,
    pickedTime: nextQuarterHourSlot(now),
  }
  return { ...state, addForToday, clockAnchor: now }
}

/** One concern: the popover's time picker moved. */
export function withAddForTodayTimeAdjusted(
  state: CaptureState,
  time: Date,
): CaptureState {
  const addForToday = state.addForToday
  if (addForToday === null) return state
  return { ...state, addForToday: { ...addForToday, pickedTime: time } }
}

/** One concern: the popover was cancelled. Nothing else is disturbed. */
export function withAddForTodayCancelled(state: CaptureState): CaptureState {
  if (state.addForToday === null) return state
  return { ...state, addForToday: null }
}

/**
 * One concern: a scheduling was confirmed and persisted.
 *
 * Canon's four moves, in one transition because a half-applied scheduling is
 * observable otherwise: the row takes its new due date, the Inbox sheet
 * dismisses, the user is routed to Plan at the slot, and Undo arms for
 * `ADD_FOR_TODAY_UNDO_WINDOW_MS`.
 */
export function withSchedulingApplied(
  state: CaptureState,
  applied: {
    readonly endeavor: Endeavor
    readonly snapshot: CaptureSchedulingSnapshot
    readonly now: Date
  },
): CaptureState {
  return {
    ...state,
    load: { kind: 'loaded' },
    endeavors: state.endeavors.map((endeavor) =>
      endeavor.id === applied.endeavor.id ? applied.endeavor : endeavor,
    ),
    inbox: {
      isOpen: false,
      justCreatedEndeavorId: null,
      alsoJustCreatedIds: [],
    },
    addForToday: null,
    navigation: schedulingIntentFor({
      endeavorId: applied.endeavor.id,
      scheduledAt: applied.snapshot.scheduledAt,
      now: applied.now,
    }),
    undo: {
      kind: 'armed',
      snapshot: applied.snapshot,
      armedAt: applied.now,
      expiresAt: new Date(applied.now.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS),
    },
    clockAnchor: applied.now,
  }
}

/**
 * One concern: the window's deadline is compared against `now`.
 *
 * The boundary is inclusive on the *expiry* side (`now >= expiresAt` disarms),
 * so the window is `[armedAt, armedAt + 8s)` — the last instant an Undo is
 * accepted is one tick before the deadline, which is what "about 8 seconds"
 * means in a system with no timer of its own.
 */
export function withUndoWindowChecked(
  state: CaptureState,
  now: Date,
): CaptureState {
  const undo = state.undo
  if (undo.kind !== 'armed') return state
  if (now.getTime() < undo.expiresAt.getTime()) return state
  return { ...state, undo: { kind: 'expired' }, clockAnchor: now }
}

/**
 * One concern: the scheduling was undone.
 *
 * A **no-op unless the window is armed** — this is where "double-undo does
 * nothing" is enforced, rather than trusting every caller to check first.
 */
export function withSchedulingUndone(
  state: CaptureState,
  endeavor: Endeavor,
): CaptureState {
  if (state.undo.kind !== 'armed') return state
  return {
    ...state,
    load: { kind: 'loaded' },
    endeavors: state.endeavors.map((existing) =>
      existing.id === endeavor.id ? endeavor : existing,
    ),
    undo: { kind: 'undone' },
  }
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

/**
 * One concern: a suggestion card was picked — canon's `applySuggestion`,
 * through the same kind rules a kind switch runs, then the destination
 * re-resolved for the suggestion's kind. Open time edits are dropped: the
 * suggestion replaces what they were editing.
 */
export function withSuggestionApplied(
  state: CaptureState,
  params: { readonly suggestion: CaptureSuggestion; readonly now: Date },
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  const draft = applyCaptureSuggestion(
    prompt.draft,
    params.suggestion,
    params.now,
  )
  return {
    ...state,
    prompt: {
      ...prompt,
      draft: {
        ...draft,
        destination: resolvedCaptureDestination(
          draft.kind,
          draft.destination,
          state.availableDestinations,
        ),
      },
      editor: null,
      suggestionNotice: null,
    },
    clockAnchor: params.now,
  }
}

/**
 * One concern: a suggestion card was picked by id — the catalogue lookup
 * `withSuggestionApplied` needs. An id the catalogue does not know is a no-op.
 */
export function withSuggestionPicked(
  state: CaptureState,
  params: { readonly suggestionId: string; readonly now: Date },
): CaptureState {
  const suggestion = captureSuggestionById(params.suggestionId)
  if (suggestion === null) return state
  return withSuggestionApplied(state, { suggestion, now: params.now })
}

/** One concern: a suggestion ticked into (or out of) the multi-add selection. */
export function withSuggestionSelectionToggled(
  state: CaptureState,
  suggestionId: string,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  const selected = prompt.selectedSuggestionIds
  const next = selected.includes(suggestionId)
    ? selected.filter((id) => id !== suggestionId)
    : [...selected, suggestionId]
  return {
    ...state,
    prompt: { ...prompt, selectedSuggestionIds: next, suggestionNotice: null },
  }
}

/**
 * One concern: a multi-add started writing, so Add is spent until it settles
 * (`RC-24` — the in-flight write is state, not a view ref).
 */
export function withSuggestionsAddStarted(state: CaptureState): CaptureState {
  const prompt = state.prompt
  if (prompt === null || prompt.isAddingSuggestions) return state
  return { ...state, prompt: { ...prompt, isAddingSuggestions: true } }
}

/**
 * One concern: a multi-add could not run at all — the exception is reported
 * and Add is live again for a retry.
 */
export function withSuggestionsAddFailed(
  state: CaptureState,
  exception: CaptureException,
): CaptureState {
  const failed = withException(state, exception)
  const prompt = failed.prompt
  if (prompt === null || !prompt.isAddingSuggestions) return failed
  return { ...failed, prompt: { ...prompt, isAddingSuggestions: false } }
}

/**
 * One concern: a multi-add's per-item outcomes, split into what landed and
 * what failed, then settled through `withSuggestionsAddedToInbox`.
 */
export function withSuggestionBatchSettled(
  state: CaptureState,
  params: {
    readonly items: readonly {
      readonly suggestionId: string
      readonly result: Result<Endeavor, CaptureException>
    }[]
    readonly now: Date
  },
): CaptureState {
  const added = params.items.flatMap((item) =>
    item.result.ok
      ? [{ suggestionId: item.suggestionId, endeavor: item.result.value }]
      : [],
  )
  const failedSuggestionIds = params.items.flatMap((item) =>
    item.result.ok ? [] : [item.suggestionId],
  )
  const settled = withSuggestionsAddedToInbox(state, {
    added,
    failedSuggestionIds,
    now: params.now,
  })
  const prompt = settled.prompt
  if (prompt === null || !prompt.isAddingSuggestions) return settled
  return { ...settled, prompt: { ...prompt, isAddingSuggestions: false } }
}

/**
 * One concern: a multi-add settled, item by item.
 *
 * Every stored endeavor joins the pool. When everything landed the prompt
 * closes and the user is taken to what they added. When any item failed the
 * prompt stays up instead: those suggestions stay ticked so a retry is one key
 * away, and the tally goes to the status line. An empty batch changes nothing.
 */
export function withSuggestionsAddedToInbox(
  state: CaptureState,
  params: {
    readonly added: readonly {
      readonly suggestionId: string
      readonly endeavor: Endeavor
    }[]
    readonly failedSuggestionIds: readonly string[]
    readonly now: Date
  },
): CaptureState {
  if (params.added.length === 0 && params.failedSuggestionIds.length === 0) {
    return state
  }
  const addedIds = params.added.map((item) => item.suggestionId)
  const prompt = state.prompt
  // Everything landed: close the prompt and take the user to what they added
  // — the Inbox with each row Just Created (or the Plan, for all-events) —
  // through the same route-delivery path a single capture uses.
  if (params.failedSuggestionIds.length === 0) {
    const endeavors = params.added.map((item) => item.endeavor)
    return {
      ...state,
      load: { kind: 'loaded' },
      endeavors: [...state.endeavors, ...endeavors],
      prompt: null,
      navigation: multiAddIntentFor(endeavors, params.now),
      clockAnchor: params.now,
    }
  }
  return {
    ...state,
    load: { kind: 'loaded' },
    endeavors: [
      ...state.endeavors,
      ...params.added.map((item) => item.endeavor),
    ],
    prompt:
      prompt === null
        ? null
        : {
            ...prompt,
            selectedSuggestionIds: prompt.selectedSuggestionIds.filter(
              (id) => !addedIds.includes(id),
            ),
            suggestionNotice: {
              toInbox: params.added.filter(
                (item) => captureRouteFor(item.endeavor).kind === 'inbox',
              ).length,
              toPlan: params.added.filter(
                (item) => captureRouteFor(item.endeavor).kind === 'plan',
              ).length,
              failed: params.failedSuggestionIds.length,
            },
          },
    clockAnchor: params.now,
  }
}

/** One concern: the suggestions pane shown or hidden. */
export function withSuggestionsShown(
  state: CaptureState,
  shown: boolean,
): CaptureState {
  if (state.isSuggestionsShown === shown) return state
  return { ...state, isSuggestionsShown: shown }
}
