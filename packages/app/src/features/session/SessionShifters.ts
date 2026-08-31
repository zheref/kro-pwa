/**
 * The session slice's Shifters (`RC-4`, `RC-19`) — canon's
 * `SessionSetupShifters.swift`, plus the load/claim transitions canon leaves to
 * TCA's reducer body.
 *
 * Every one is a pure function returning a brand-new plain object. None reads a
 * clock, a service or a random source: `now` is always an argument, which is
 * the whole reason a session's behaviour is reproducible under a controlled
 * clock (`UZF-10`, `RC-24`).
 *
 * ## The phase move and the fragment edit happen together
 *
 * That invariant is #8's, and it is not restated here — it is **consumed**.
 * Every transition below delegates to `@kro/core`'s pure
 * `pauseSessionAt` / `resumeSessionAt` / `concludeSessionAt` / `startBreakAt` /
 * `closeSessionAt`, which return a whole new `PersistedRunningSession` with the
 * fragments already edited. There is no intermediate value in which the phase
 * has moved and the fragment has not, because this file never builds one.
 *
 * ## Why the conclusion claim lives *here* and not in a Producer
 *
 * `withSessionAwaitingResolution` and `withBreakElapsed` are the exactly-once
 * gates. They refuse to claim when `state.conclusion.kind !== 'none'`, and
 * because a Shifter is applied inside a **synchronous** reducer arm, two ticks
 * observing the same countdown reaching zero are serialized by the dispatch
 * queue: the first claims, the second sees a non-`none` claim and changes
 * nothing. Putting that test inside an async Producer would reopen the race the
 * issue's "exactly once under racing ticks" criterion names.
 */
import {
  type FocusSessionFragment,
  type FocusTimerMode,
  type PersistedRunningSession,
  type Perform,
  type PerformResolution,
  type SessionLaunchRecommendation,
  type TimeIntervalSeconds,
  FocusTimerMode as TimerMode,
  PerformResolution as Resolution,
  PersistedSessionPhase as PersistedPhase,
  closeSessionAt,
  concludeSessionAt,
  isRunningSessionCountdownFinished,
  makePersistedRunningSession,
  makePersistedSessionEndeavor,
  pauseSessionAt,
  resumeSessionAt,
  runningSessionElapsedDuration,
  startBreakAt,
} from '@kro/core'
import type { SessionException } from './SessionException'
import type { SessionIdentity } from './SessionIdentity'
import {
  type SessionOutcome,
  type SessionOutcomeReason,
  SessionOutcomeReason as Reason,
} from './SessionOutcome'
import type {
  SessionAvailability,
  SessionPreferences,
  SessionState,
} from './SessionState'
import { SessionPhase, sessionPhaseFromPersisted } from './SessionVocabulary'

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const withSessionLoadStarted = (state: SessionState): SessionState => ({
  ...state,
  load: { kind: 'loading' },
})

/**
 * The shared failure landing spot. It never touches `phase`, `anchor` or
 * `conclusion`: a failed anchor write must not stop a session that is, as far
 * as the user can see, still counting down correctly — the fragments in memory
 * are still right, and the next transition rewrites the document.
 */
export const withException = (
  state: SessionState,
  exception: SessionException,
): SessionState => ({ ...state, load: { kind: 'failed', exception } })

export const withPreferencesApplied = (
  state: SessionState,
  applied: {
    readonly preferences: SessionPreferences
    readonly availability: SessionAvailability
  },
): SessionState => ({
  ...state,
  load: { kind: 'loaded' },
  preferences: applied.preferences,
  availability: applied.availability,
  // A `ready` session adopts the newly-loaded default immediately; a live one
  // keeps the target it was started with, which is the number the user is
  // watching count down.
  targetDuration:
    state.phase === SessionPhase.ready
      ? applied.preferences.defaultDuration
      : state.targetDuration,
})

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

/**
 * The ready-phase setup a launch surface opens with — canon's
 * `sessionSetupState(for:)`.
 *
 * The recommendation is #8's resolver, already AND-ed against the flags and
 * preferences by the Producer, so this Shifter only installs its answer. It is
 * refused outright while a session is live: re-preparing would silently
 * overwrite the running session's target.
 */
export const withLaunchPrepared = (
  state: SessionState,
  prepared: {
    readonly identity: SessionIdentity
    readonly recommendation: SessionLaunchRecommendation
    readonly completedSessionsCount: number
  },
): SessionState => {
  if (state.phase !== SessionPhase.ready) return state
  return {
    ...state,
    load: { kind: 'loaded' },
    identity: prepared.identity,
    mode: prepared.recommendation.mode,
    targetDuration: prepared.recommendation.targetDuration,
    launchSource: prepared.recommendation.source,
    completedSessionsCount: prepared.completedSessionsCount,
    conclusion: { kind: 'none' },
    isPresentingConclusion: false,
    isEditingTitle: false,
    editedTitle: '',
    isEditingSymbol: false,
  }
}

/**
 * Reload recovery — canon's `applyHydration(from:now:)`.
 *
 * The anchor is re-read from storage and the runtime is rebuilt around it: the
 * phase, mode and target come from the document, and `now` is stamped so the
 * very first paint shows a wall-clock-correct figure rather than the value the
 * tab held when it was closed. Nothing is recomputed into the anchor — elapsed
 * time is derived on read, so there is no number here to be stale.
 *
 * A `null` anchor is "no session", and lands on `ready` with the cleared shape.
 */
export const withAnchorHydrated = (
  state: SessionState,
  hydrated: {
    readonly anchor: PersistedRunningSession | null
    readonly identity: SessionIdentity | null
    readonly completedSessionsCount: number
    readonly now: Date
  },
): SessionState => {
  const { anchor, now } = hydrated
  if (anchor === null) {
    return {
      ...state,
      load: { kind: 'loaded' },
      phase: SessionPhase.ready,
      anchor: null,
      now,
      conclusion: { kind: 'none' },
      isPresentingConclusion: false,
      completedSessionsCount: hydrated.completedSessionsCount,
      identity: hydrated.identity ?? state.identity,
    }
  }
  const phase = sessionPhaseFromPersisted(anchor.phase)
  return {
    ...state,
    load: { kind: 'loaded' },
    phase,
    anchor,
    identity:
      hydrated.identity ??
      state.identity ?? {
        endeavorId: anchor.endeavor.id,
        symbol: anchor.endeavor.symbol,
        title: anchor.endeavor.title,
        duration: anchor.endeavor.duration,
        isAnonymous: true,
      },
    mode: anchor.mode,
    targetDuration: anchor.targetDuration,
    completedSessionsCount: hydrated.completedSessionsCount,
    now,
    // A session recovered at `concluded` re-presents its conclusion screen —
    // canon parks the anchor there precisely so the choice is not lost, and
    // `docs/Features/Session.md` flow 7 has the pill keep offering it.
    isPresentingConclusion: phase === SessionPhase.concluded,
  }
}

// ---------------------------------------------------------------------------
// The phase machine
// ---------------------------------------------------------------------------

/**
 * Canon's `applySessionActivated(at:)`, the **first play** half — the one arm
 * in this feature that installs a fresh anchor.
 *
 * ## The one-session invariant, by construction
 *
 * Three facts together make a second concurrent session unrepresentable:
 *
 * 1. `SessionState` holds **one** `anchor` field, not a collection — so the
 *    type cannot express two running sessions.
 * 2. This is the **only** Shifter that assigns a newly-built anchor, and it
 *    returns `state` untouched whenever `state.anchor !== null`. Every other
 *    transition edits the anchor already there.
 * 3. The anchor **document** is a single key (#10's `RUNNING_SESSION_ANCHOR_KEY`)
 *    and `startSessionThunk` refuses when storage already holds one — so even a
 *    second tab cannot create a rival.
 *
 * Nothing here is a runtime check that a caller could forget to make: a start
 * dispatched onto a live session is a no-op that reports
 * `sessionAlreadyRunning`, not a second timer.
 */
export const withSessionStarted = (
  state: SessionState,
  now: Date,
): SessionState => {
  if (state.anchor !== null) return state
  const identity = state.identity
  if (identity === null) return state

  const anchor = resumeSessionAt(
    makePersistedRunningSession({
      endeavor: makePersistedSessionEndeavor({
        id: identity.endeavorId,
        symbol: identity.symbol,
        title: identity.title,
        duration: identity.duration,
      }),
      targetDuration: state.targetDuration,
      mode: state.mode,
      fragments: [],
      phase: PersistedPhase.running,
    }),
    now,
  )

  return {
    ...state,
    load: { kind: 'loaded' },
    phase: SessionPhase.running,
    anchor,
    now,
    conclusion: { kind: 'none' },
    isPresentingConclusion: false,
  }
}

/**
 * A start the storage boundary refused (another tab already owns the anchor).
 * The runtime rolls back to `ready` rather than counting down a session that
 * was never persisted, and the refusal surfaces as an exception.
 */
export const withSessionStartRefused = (
  state: SessionState,
  exception: SessionException,
): SessionState =>
  withException(
    {
      ...state,
      phase: SessionPhase.ready,
      anchor: null,
      conclusion: { kind: 'none' },
      isPresentingConclusion: false,
    },
    exception,
  )

/** Canon's `applySessionPaused(at:)` — freeze, with the open fragment stamped. */
export const withSessionPaused = (
  state: SessionState,
  now: Date,
): SessionState => {
  if (state.anchor === null) return state
  if (state.phase !== SessionPhase.running && state.phase !== SessionPhase.break) {
    return state
  }
  return {
    ...state,
    phase: SessionPhase.paused,
    anchor: pauseSessionAt(state.anchor, now),
    now,
  }
}

/** Canon's resume — a fresh open fragment appended; a break stays a break. */
export const withSessionResumed = (
  state: SessionState,
  now: Date,
): SessionState => {
  if (state.anchor === null) return state
  if (state.phase !== SessionPhase.paused) return state
  const anchor = resumeSessionAt(state.anchor, now)
  return {
    ...state,
    phase: sessionPhaseFromPersisted(anchor.phase),
    anchor,
    now,
  }
}

/** The closed fragments and elapsed total a conclusion reports. */
const closedSpan = (
  anchor: PersistedRunningSession,
  now: Date,
): {
  readonly fragments: readonly FocusSessionFragment[]
  readonly elapsedDuration: TimeIntervalSeconds
} => closeSessionAt(anchor, now)

/** Assembles the outcome a claim carries. */
const outcomeFor = (
  state: SessionState,
  anchor: PersistedRunningSession,
  params: {
    readonly now: Date
    readonly resolution: PerformResolution
    readonly reason: SessionOutcomeReason
  },
): SessionOutcome => {
  const span = closedSpan(anchor, params.now)
  return {
    endeavorId: anchor.endeavor.id,
    intention: state.identity?.title ?? anchor.endeavor.title,
    resolution: params.resolution,
    fragments: span.fragments,
    elapsedDuration: span.elapsedDuration,
    targetDuration: anchor.targetDuration,
    reason: params.reason,
    endedAt: params.now,
  }
}

/**
 * Canon's `applySessionAwaitingResolution(at:)` — the countdown reached zero,
 * or a finish-early cleared the 30 % threshold.
 *
 * The trailing fragment is closed, the phase parks at `concluded`, and **the
 * anchor is deliberately kept**: the user has not picked Complete / Start New /
 * Break, and the pill must go on offering "mark complete" while the sheet is
 * dismissed.
 *
 * The claim (`conclusion: none → pending`) is what makes recording
 * exactly-once. A second call with a claim already in flight moves nothing.
 */
export const withSessionAwaitingResolution = (
  state: SessionState,
  params: {
    readonly now: Date
    readonly reason: SessionOutcomeReason
  },
): SessionState => {
  const anchor = state.anchor
  if (anchor === null) return state
  if (state.conclusion.kind !== 'none') return state

  const outcome = outcomeFor(state, anchor, {
    now: params.now,
    // Canon attaches `.complete`, not `.finished`: the session has ended but
    // the task has not been marked done. "Complete Task" is what produces
    // `finished`, and `RewardCalculator` reads the two exactly that way.
    resolution: Resolution.complete,
    reason: params.reason,
  })

  return {
    ...state,
    phase: SessionPhase.concluded,
    anchor: concludeSessionAt(anchor, params.now),
    now: params.now,
    conclusion: { kind: 'pending', outcome },
    isPresentingConclusion: true,
  }
}

/**
 * Abort, and the below-threshold finish-early — canon's `applySessionConcluded`
 * plus its `taskMarkedComplete(resolution: .aborted, …)` dispatch.
 *
 * Both close the trailing fragment, **clear** the anchor and return to `ready`;
 * both still claim a `pending` outcome, because canon records an aborted
 * attempt rather than dropping it (`SessionThreshold.ts` records why the two
 * canon docs disagree and why the code wins). A break aborts to `ready` with
 * no claim at all — a break is never a performance.
 */
export const withSessionAborted = (
  state: SessionState,
  params: {
    readonly now: Date
    readonly reason: SessionOutcomeReason
  },
): SessionState => {
  const anchor = state.anchor
  if (anchor === null) return state
  const wasBreak = state.phase === SessionPhase.break

  const cleared: SessionState = {
    ...state,
    phase: SessionPhase.ready,
    anchor: null,
    now: params.now,
    targetDuration: state.preferences.defaultDuration,
    isPresentingConclusion: false,
    isEditingTitle: false,
    editedTitle: '',
    isEditingSymbol: false,
  }

  if (wasBreak) return { ...cleared, conclusion: { kind: 'none' } }
  if (state.conclusion.kind !== 'none') return cleared

  return {
    ...cleared,
    conclusion: {
      kind: 'pending',
      outcome: outcomeFor(state, anchor, {
        now: params.now,
        resolution: Resolution.aborted,
        reason: params.reason,
      }),
    },
  }
}

/**
 * The display tick — canon's `._timerTicked`, minus the counter.
 *
 * It advances `now` and nothing else, **unless** the anchored countdown has run
 * out, in which case it hands off to the matching claim. Two properties are
 * load-bearing:
 *
 * - **No tick ever persists.** This Shifter touches `anchor` only through the
 *   claim it delegates to, and a claim is a phase transition. A tick that
 *   changes no phase produces no write (`SessionProducer.ts` writes on
 *   transitions only).
 * - **Elapsed is not accumulated.** `now` moves; the figure is derived. A
 *   throttled, coalesced or replayed tick therefore cannot drift the clock,
 *   because there is no counter to drift.
 *
 * The completion test is #8's `isRunningSessionCountdownFinished`, which is
 * mode-aware (a stopwatch never finishes) — consumed, not reimplemented.
 */
export const withDisplayAdvanced = (
  state: SessionState,
  now: Date,
): SessionState => {
  const anchor = state.anchor
  if (anchor === null) return { ...state, now }
  if (state.phase !== SessionPhase.running && state.phase !== SessionPhase.break) {
    return { ...state, now }
  }
  if (!isRunningSessionCountdownFinished(anchor, now)) return { ...state, now }

  return state.phase === SessionPhase.break
    ? withBreakElapsed(state, now)
    : withSessionAwaitingResolution(state, {
        now,
        reason: Reason.countdownElapsed,
      })
}

// ---------------------------------------------------------------------------
// Break
// ---------------------------------------------------------------------------

/**
 * Canon's `userDidTapBreak` — reset for the break, then activate.
 *
 * The break's target is `session.defaultBreakDuration` (#11, 5 min), the mode
 * is always countdown, and the fragment list starts **fresh**: the focus
 * session's fragments have already been closed and claimed by the conclusion,
 * so reusing them would count the focus time again inside the break. The
 * endeavor identity is kept (canon does), which is what lets an abort during a
 * break still know whose session it interrupted; the pill renders `Break` in
 * its place from `SessionSelectors`.
 *
 * Refused when breaks are unavailable — the `sessionBreak` flag is off at
 * `statusQuo`, so the shipped build genuinely cannot enter this phase.
 */
export const withBreakStarted = (
  state: SessionState,
  now: Date,
): SessionState => {
  const identity = state.identity
  if (identity === null) return state
  if (!state.availability.areBreaksAvailable) return state
  if (state.phase === SessionPhase.break) return state
  // The focus session's own claim must have landed first, or starting the
  // break would clear it below and lose the performance. Canon cannot reach
  // this state — `._timerTicked` and `userDidTapFinishEarly` both record
  // before the user is ever offered Break — so refusing here is a guard on a
  // caller that dispatched out of order, not a reachable product path.
  if (
    state.conclusion.kind === 'pending' ||
    state.conclusion.kind === 'recording'
  ) {
    return state
  }

  const anchor = startBreakAt(
    makePersistedRunningSession({
      endeavor: makePersistedSessionEndeavor({
        id: identity.endeavorId,
        symbol: identity.symbol,
        title: identity.title,
        duration: identity.duration,
      }),
      targetDuration: state.preferences.defaultBreakDuration,
      mode: TimerMode.countdown,
      fragments: [],
      phase: PersistedPhase.break,
    }),
    now,
  )

  return {
    ...state,
    phase: SessionPhase.break,
    anchor,
    mode: TimerMode.countdown,
    targetDuration: state.preferences.defaultBreakDuration,
    now,
    isPresentingConclusion: false,
    // The focus session's claim is spent; the break needs a clean one of its
    // own so `withBreakElapsed` can claim its single `breakComplete` cue.
    conclusion: { kind: 'none' },
  }
}

/**
 * The break countdown reaching zero — canon's `wasBreak` branch of
 * `._timerTicked`: close the fragment, clear the anchor, reset the target to
 * the focus default, and play `breakComplete`.
 *
 * The cue and the anchor clear are the Producer's, claimed here exactly once
 * via `conclusion: breakElapsed`. Claiming is refused while any other claim is
 * in flight, so a racing tick cannot double-fire the sound.
 */
export const withBreakElapsed = (
  state: SessionState,
  now: Date,
): SessionState => {
  if (state.anchor === null) return state
  if (state.phase !== SessionPhase.break) return state
  if (state.conclusion.kind !== 'none') return state
  return {
    ...state,
    phase: SessionPhase.ready,
    anchor: null,
    now,
    targetDuration: state.preferences.defaultDuration,
    conclusion: { kind: 'breakElapsed', endedAt: now },
  }
}

/** The Producer has played the cue and cleared the document. */
export const withBreakFinished = (state: SessionState): SessionState => ({
  ...state,
  conclusion: { kind: 'breakFinished' },
})

/**
 * Canon's `userDidTapEndBreak` — end the break early and return to `ready`.
 * No cue: canon plays `breakComplete` only when the break timer runs out.
 */
export const withBreakEnded = (
  state: SessionState,
  now: Date,
): SessionState => {
  if (state.phase !== SessionPhase.break) return state
  return {
    ...state,
    phase: SessionPhase.ready,
    anchor: null,
    now,
    targetDuration: state.preferences.defaultDuration,
    conclusion: { kind: 'none' },
  }
}

// ---------------------------------------------------------------------------
// The conclusion claim's two remaining moves
// ---------------------------------------------------------------------------

/**
 * `pending → recording`. Applied in `recordSessionPerformanceThunk`'s
 * `.pending` arm, which RTK dispatches **synchronously** at dispatch time — so
 * a second dispatch's `condition` already sees `recording` and aborts before
 * its payload creator ever runs.
 */
export const withConclusionRecordingStarted = (
  state: SessionState,
): SessionState =>
  state.conclusion.kind === 'pending'
    ? { ...state, conclusion: { kind: 'recording', outcome: state.conclusion.outcome } }
    : state

/** `recording → recorded`, carrying the row that landed. */
export const withConclusionRecorded = (
  state: SessionState,
  performance: Perform,
): SessionState => {
  if (state.conclusion.kind !== 'recording') return state
  return {
    ...state,
    load: { kind: 'loaded' },
    conclusion: {
      kind: 'recorded',
      outcome: state.conclusion.outcome,
      performance,
    },
    // The tomato row grows only for a recorded completion — an aborted attempt
    // is a real record but never a tomato (`MainSelectors.completedSessionsCount`).
    completedSessionsCount:
      performance.resolution === Resolution.aborted
        ? state.completedSessionsCount
        : state.completedSessionsCount + 1,
  }
}

/**
 * A failed recording releases the claim back to `pending` so the user can
 * retry, rather than stranding the session in `recording` forever with a
 * performance that was never written.
 */
export const withConclusionRecordingFailed = (
  state: SessionState,
  exception: SessionException,
): SessionState => {
  const released: SessionState =
    state.conclusion.kind === 'recording'
      ? { ...state, conclusion: { kind: 'pending', outcome: state.conclusion.outcome } }
      : state
  return withException(released, exception)
}

// ---------------------------------------------------------------------------
// Conclusion choices
// ---------------------------------------------------------------------------

/**
 * Dismissing the conclusion sheet without picking — `docs/Features/Session.md`
 * flow 7. The pill stays, carrying the Mark-complete affordance, so the phase
 * and the claim are untouched; only the presentation closes.
 */
export const withConclusionDismissed = (state: SessionState): SessionState => ({
  ...state,
  isPresentingConclusion: false,
})

/**
 * Complete Task / Start New — canon's `applySessionConcluded(at:)`: the anchor
 * is cleared, the runtime returns to `ready`, and the target resets to the
 * configured default so the next session opens correctly.
 *
 * The claim is **not** reset: the performance was recorded at conclusion, and
 * `recorded` is what tells a later "mark complete" that it must not record a
 * second one (`docs/Features/Session.md`: *"choosing Complete, Start New, or
 * Break after conclusion never records a duplicate"*).
 */
export const withSessionClosed = (
  state: SessionState,
  now: Date,
): SessionState => ({
  ...state,
  phase: SessionPhase.ready,
  anchor: null,
  now,
  targetDuration: state.preferences.defaultDuration,
  isPresentingConclusion: false,
  isEditingTitle: false,
  editedTitle: '',
  isEditingSymbol: false,
})

// ---------------------------------------------------------------------------
// Setup (ready phase only)
// ---------------------------------------------------------------------------

/** Canon's `guard state.phase == .ready else { return .none }`. */
export const withModeSelected = (
  state: SessionState,
  mode: FocusTimerMode,
): SessionState =>
  state.phase === SessionPhase.ready ? { ...state, mode } : state

/** Same guard: a duration change mid-session would move the finish line. */
export const withTargetDurationSelected = (
  state: SessionState,
  targetDuration: TimeIntervalSeconds,
): SessionState =>
  state.phase === SessionPhase.ready && targetDuration > 0
    ? { ...state, targetDuration }
    : state

// ---------------------------------------------------------------------------
// Identity editing
// ---------------------------------------------------------------------------

export const withTitleEditingStarted = (state: SessionState): SessionState =>
  state.identity === null
    ? state
    : { ...state, isEditingTitle: true, editedTitle: state.identity.title }

export const withEditedTitleChanged = (
  state: SessionState,
  editedTitle: string,
): SessionState => ({ ...state, editedTitle })

/** Canon's revert-on-empty: the draft is dropped, the identity untouched. */
export const withTitleEditingCancelled = (state: SessionState): SessionState => ({
  ...state,
  isEditingTitle: false,
  editedTitle: '',
})

/** Canon guards the picker at `.break` — there is no endeavor to re-glyph. */
export const withSymbolPickerPresented = (state: SessionState): SessionState =>
  state.phase === SessionPhase.break || state.identity === null
    ? state
    : { ...state, isEditingSymbol: true }

export const withSymbolPickerDismissed = (state: SessionState): SessionState => ({
  ...state,
  isEditingSymbol: false,
})

/**
 * A committed identity edit — the new title/symbol, the promotion flag, and the
 * anchor's mirror of both.
 *
 * **The anchor mirror is a deliberate, canon-faithful exception** to #10's
 * "written only on a phase transition". `MainFeature`'s
 * `endeavorTitleUpdated` / `endeavorSymbolUpdated` arms both write the running
 * anchor so *"the pill picks it up immediately"*, and dropping that would leave
 * the pill showing the old title until the next pause. The invariant that
 * actually matters — and that the spy test pins — is that **a display tick
 * never writes**; an identity edit is a user transition, not a tick.
 */
export const withIdentityApplied = (
  state: SessionState,
  identity: SessionIdentity,
): SessionState => ({
  ...state,
  load: { kind: 'loaded' },
  identity,
  isEditingTitle: false,
  editedTitle: '',
  isEditingSymbol: false,
  anchor:
    state.anchor === null || state.anchor.endeavor.id !== identity.endeavorId
      ? state.anchor
      : {
          ...state.anchor,
          endeavor: {
            ...state.anchor.endeavor,
            symbol: identity.symbol,
            title: identity.title,
          },
        },
})

/** The tomato row, recomputed from storage after a launch or a recording. */
export const withCompletedSessionsCount = (
  state: SessionState,
  completedSessionsCount: number,
): SessionState => ({ ...state, completedSessionsCount })

/** Re-exported so a caller reading this file finds the elapsed rule beside it. */
export const elapsedDurationOf = (
  anchor: PersistedRunningSession,
  now: Date,
): TimeIntervalSeconds => runningSessionElapsedDuration(anchor, now)
