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
  makeReconciliationContext,
  reconcile,
} from '@kro/core'
import type { CaptureException } from './CaptureException'
import type {
  CaptureAddForTodayState,
  CapturePromptState,
  CaptureState,
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from './CaptureFeature'
import {
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  type CaptureDestination,
  type CaptureDraft,
  type CaptureKind,
  type CaptureRecurrence,
  type CaptureSchedulingSnapshot,
  captureIntentFor,
  clampCaptureRewards,
  isCaptureIntentDue,
  makeCaptureDraft,
  nextFreeSlotToday,
  nextQuarterHourSlot,
  schedulingIntentFor,
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
  return { ...state, prompt: { ...prompt, draft: edit(prompt.draft) } }
}

const snapshotFieldOf = (field: CaptureTimeField) =>
  field === 'start' ? ('startEdit' as const) : ('endEdit' as const)

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
  const available = state.availableDestinations
  const preferred = available.includes(state.lastUsedDestination)
    ? state.lastUsedDestination
    : (available[0] ?? state.lastUsedDestination)

  const prompt: CapturePromptState = {
    draft: makeCaptureDraft({
      kind: params.kind,
      now: params.now,
      initialStart: params.initialStart,
      destination: preferred,
    }),
    startEdit: null,
    endEdit: null,
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
 * Both picker snapshots are dropped, which is this tier's half of canon's
 * *"close any open editors when switching kinds"* — the draft's committed
 * values are kept, so a user who typed a time and then switched from Task to
 * Event still has it.
 */
export function withKindSelected(
  state: CaptureState,
  kind: CaptureKind,
): CaptureState {
  const prompt = state.prompt
  if (prompt === null) return state
  return {
    ...state,
    prompt: {
      draft: { ...prompt.draft, kind },
      startEdit: null,
      endEdit: null,
    },
  }
}

/** One concern: the date chip picked a day. */
export function withDatePicked(state: CaptureState, date: Date): CaptureState {
  return withDraft(state, (draft) => ({ ...draft, date }))
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
  const key = snapshotFieldOf(field)
  if (prompt[key] !== null) return state

  const draft = prompt.draft
  const snapshot =
    field === 'start'
      ? { time: draft.time, wasSet: draft.hasTime }
      : { time: draft.endTime, wasSet: draft.hasEndTime }
  const edited: CaptureDraft =
    field === 'start'
      ? { ...draft, hasTime: true }
      : { ...draft, hasEndTime: true }

  return { ...state, prompt: { ...prompt, draft: edited, [key]: snapshot } }
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
  const key = snapshotFieldOf(field)
  const snapshot = prompt[key]

  if (outcome === 'clear') {
    const cleared: CaptureDraft =
      field === 'start'
        ? { ...prompt.draft, hasTime: false }
        : { ...prompt.draft, hasEndTime: false }
    return { ...state, prompt: { ...prompt, draft: cleared, [key]: null } }
  }

  if (snapshot === null) return state

  if (outcome === 'done') {
    return { ...state, prompt: { ...prompt, [key]: null } }
  }

  const restored: CaptureDraft =
    field === 'start'
      ? { ...prompt.draft, time: snapshot.time, hasTime: snapshot.wasSet }
      : {
          ...prompt.draft,
          endTime: snapshot.time,
          hasEndTime: snapshot.wasSet,
        }
  return { ...state, prompt: { ...prompt, draft: restored, [key]: null } }
}

/** One concern: the rewards stepper moved, clamped to canon's 1…999. */
export function withRewardsPicked(
  state: CaptureState,
  points: number,
): CaptureState {
  return withDraft(state, (draft) => ({
    ...draft,
    rewards: clampCaptureRewards(points),
  }))
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
 */
export function withRouteDelivered(
  state: CaptureState,
  now: Date,
): CaptureState {
  const intent = state.navigation
  if (intent === null) return state
  if (!isCaptureIntentDue(intent, now)) return state

  if (intent.route.kind === 'inbox') {
    return {
      ...state,
      navigation: null,
      inbox: { isOpen: true, justCreatedEndeavorId: intent.route.endeavorId },
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
  return { ...state, inbox: { isOpen: true, justCreatedEndeavorId: null } }
}

/** One concern: the Inbox dismissed. The slot drains with it. */
export function withInboxDismissed(state: CaptureState): CaptureState {
  return {
    ...state,
    inbox: { isOpen: false, justCreatedEndeavorId: null },
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
): CaptureState {
  const known = state.endeavors.some((endeavor) => endeavor.id === endeavorId)
  if (!known) return state
  return {
    ...state,
    triageRequest: {
      endeavorId,
      nextFreeSlotToday: nextFreeSlotToday(state.endeavors, now),
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
    inbox: { isOpen: false, justCreatedEndeavorId: null },
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
