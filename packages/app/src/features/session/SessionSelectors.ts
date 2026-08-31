/**
 * The session feature's Selectors (`RC-5`, `RC-20`) — canon's
 * `SessionSetupSelectors.swift`, plus the pill's own surface (which canon
 * derives inside `SessionPillFeature`).
 *
 * ## Every time value is derived, never stored
 *
 * `elapsedDuration` and `remainingDuration` are computed here, on every read,
 * from the anchor's fragments against `state.now`. There is no counter in
 * `SessionState` to read instead — deliberately, and it is what makes the three
 * properties `docs/Features/Session.md` § Persistence promises true:
 *
 * - **Kill-resilient** — a reload re-reads the fragments and the derived figure
 *   is correct for an arbitrary gap.
 * - **Cheap** — the display tick moves one `Date`; no disk write, no counter.
 * - **Trustworthy** — a throttled or coalesced tick cannot drift the clock,
 *   because there is nothing accumulating to drift.
 *
 * Every selector below is pure and takes `RootState` alone (`RC-5`): none reads
 * a clock. Where a caller needs "as of a different instant" — a Storybook story
 * driving a fake time — it dispatches a tick with that instant, and the
 * selectors follow.
 */
import {
  type FocusTimerMode,
  type PersistedRunningSession,
  type TimeIntervalSeconds,
  FocusTimerMode as TimerMode,
  runningSessionElapsedDuration,
  runningSessionRemainingDuration,
  sessionRecordingThreshold,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import { type SessionCueMark, sessionCueSchedule } from './SessionCues'
import type { SessionException } from './SessionException'
import type { SessionIdentity } from './SessionIdentity'
import type { SessionCalendarEvent, SessionOutcome } from './SessionOutcome'
import { sessionCalendarEventFor } from './SessionOutcome'
import type { SessionState } from './SessionState'
import {
  type SessionPillAffordance,
  type SessionTint,
  BREAK_SESSION_TITLE,
  SessionPhase,
  isActiveSessionPhase,
  isSessionPillVisiblePhase,
  sessionPillAffordanceForPhase,
  sessionStatusLabel,
  sessionTintForPhase,
} from './SessionVocabulary'

const selectSessionSlice = (state: RootState): SessionState => state.session

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsSessionLoading = createSelector(
  [selectSessionSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectSessionException = createSelector(
  [selectSessionSlice],
  (slice): SessionException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

export const selectSessionPhase = createSelector(
  [selectSessionSlice],
  (slice) => slice.phase,
)

/** Canon's `statusLabelSelector` — READY / FOCUSED / PAUSED / COMPLETED / BREAK. */
export const selectSessionStatusLabel = createSelector(
  [selectSessionPhase],
  sessionStatusLabel,
)

/**
 * Canon's `isSessionRunningSelector` — whether interactive dismissal of the
 * sheet should be blocked. `running`, `paused` **and** `break`.
 */
export const selectIsSessionInFlight = createSelector(
  [selectSessionPhase],
  (phase) =>
    phase === SessionPhase.running ||
    phase === SessionPhase.paused ||
    phase === SessionPhase.break,
)

/** Whether time is accruing right now — canon's `isActivePhase`. */
export const selectIsSessionActive = createSelector(
  [selectSessionPhase],
  isActiveSessionPhase,
)

export const selectSessionMode = createSelector(
  [selectSessionSlice],
  (slice): FocusTimerMode => slice.mode,
)

export const selectSessionTargetDuration = createSelector(
  [selectSessionSlice],
  (slice): TimeIntervalSeconds => slice.targetDuration,
)

export const selectSessionIdentity = createSelector(
  [selectSessionSlice],
  (slice): SessionIdentity | null => slice.identity,
)

export const selectSessionLaunchSource = createSelector(
  [selectSessionSlice],
  (slice) => slice.launchSource,
)

export const selectSessionAnchor = createSelector(
  [selectSessionSlice],
  (slice): PersistedRunningSession | null => slice.anchor,
)

// ---------------------------------------------------------------------------
// Derived time
// ---------------------------------------------------------------------------

/**
 * The instant every derived time is measured against. `null` until the first
 * tick or hydration stamps one, which is the honest answer: before then this
 * tier genuinely does not know what time it is.
 */
export const selectSessionNow = createSelector(
  [selectSessionSlice],
  (slice): Date | null => slice.now,
)

/** Σ over fragments of `(end ?? now) − start` — #8's rule, consumed. */
export const selectSessionElapsedDuration = createSelector(
  [selectSessionAnchor, selectSessionNow],
  (anchor, now): TimeIntervalSeconds =>
    anchor === null || now === null
      ? 0
      : runningSessionElapsedDuration(anchor, now),
)

/** Canon's `remainingDurationSelector` — `max(target − elapsed, 0)`. */
export const selectSessionRemainingDuration = createSelector(
  [selectSessionAnchor, selectSessionNow, selectSessionTargetDuration],
  (anchor, now, target): TimeIntervalSeconds =>
    anchor === null || now === null
      ? Math.max(target, 0)
      : runningSessionRemainingDuration(anchor, now),
)

/**
 * How far through the target the session is, clamped to `0…1`.
 *
 * A stopwatch has no target and reports `0` — canon's own guard, and the reason
 * a progress ring must not be drawn from this value in stopwatch mode.
 */
export const selectSessionProgress = createSelector(
  [
    selectSessionMode,
    selectSessionElapsedDuration,
    selectSessionTargetDuration,
  ],
  (mode, elapsed, target): number => {
    if (mode !== TimerMode.countdown) return 0
    if (!Number.isFinite(target) || target <= 0) return 0
    return Math.min(Math.max(elapsed / target, 0), 1)
  },
)

/**
 * The elapsed seconds a countdown must reach for a finish-early to record as a
 * real session rather than an aborted attempt — 30 % of the target (#8's
 * `sessionRecordingThreshold`). Surfaced so the sheet can show the user where
 * the line is instead of letting them discover it by crossing it.
 */
export const selectSessionRecordingThreshold = createSelector(
  [selectSessionMode, selectSessionTargetDuration],
  (mode, target): TimeIntervalSeconds | null =>
    mode === TimerMode.countdown ? sessionRecordingThreshold(target) : null,
)

/** Whether a finish-early right now would record a completion, not an abort. */
export const selectWouldFinishEarlyRecord = createSelector(
  [
    selectSessionMode,
    selectSessionElapsedDuration,
    selectSessionRecordingThreshold,
  ],
  (mode, elapsed, threshold): boolean =>
    mode !== TimerMode.countdown || threshold === null || elapsed >= threshold,
)

/** The cue marks this session will fire — explicit, sorted, modulo-free. */
export const selectSessionCueSchedule = createSelector(
  [selectSessionMode, selectSessionTargetDuration, selectSessionPhase],
  (mode, target, phase): readonly SessionCueMark[] =>
    sessionCueSchedule({
      mode,
      targetDuration: target,
      isBreak: phase === SessionPhase.break,
    }),
)

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/**
 * `MM:SS`, or `H:MM:SS` past an hour. Negative and non-finite inputs clamp to
 * zero rather than rendering `-1:-1`.
 */
export const formatSessionClock = (seconds: TimeIntervalSeconds): string => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hours = Math.floor(total / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)
  const rest = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`
}

/**
 * The number the sheet and the pill show: remaining for a countdown, elapsed
 * for a stopwatch (`docs/Features/Session.md` § States).
 */
export const selectSessionClockSeconds = createSelector(
  [
    selectSessionMode,
    selectSessionElapsedDuration,
    selectSessionRemainingDuration,
  ],
  (mode, elapsed, remaining): TimeIntervalSeconds =>
    mode === TimerMode.countdown ? remaining : elapsed,
)

export const selectSessionClockLabel = createSelector(
  [selectSessionClockSeconds],
  formatSessionClock,
)

/**
 * The browser tab's title while a session runs — `12:30 — Kro`, the web's
 * stand-in for KroApple's macOS menu-bar extra (epic KC-IS-#1).
 *
 * `null` in every phase where nothing is advancing, which is the value that
 * **releases** the title back to the route's own. Paused and concluded are
 * deliberately included in that: a frozen `00:00 — Kro` in a background tab
 * reads as a running session that has stalled.
 */
export const SESSION_DOCUMENT_TITLE_SUFFIX = 'Kro'

export const selectSessionDocumentTitle = createSelector(
  [selectSessionPhase, selectSessionClockLabel],
  (phase, label): string | null =>
    isActiveSessionPhase(phase)
      ? `${label} — ${SESSION_DOCUMENT_TITLE_SUFFIX}`
      : null,
)

// ---------------------------------------------------------------------------
// The pill's surface
// ---------------------------------------------------------------------------

/**
 * Everything the Session Pill renders, in one selector — so `#22` reads a
 * single value rather than assembling five and risking a combination the phase
 * machine cannot actually produce.
 */
export interface SessionPillState {
  /** Hidden in `ready`; visible in every other phase. */
  readonly isVisible: boolean
  /** The endeavor title, or `Break` while the break runs. */
  readonly title: string
  readonly symbol: string
  /** Remaining for a countdown, elapsed for a stopwatch, already formatted. */
  readonly clockLabel: string
  /** Vivid while advancing; the system glass while idle. */
  readonly tint: SessionTint
  /** The single trailing button: pause, resume, or the blue checkmark. */
  readonly affordance: SessionPillAffordance
}

export const selectSessionPillState = createSelector(
  [
    selectSessionPhase,
    selectSessionIdentity,
    selectSessionClockLabel,
    selectSessionAnchor,
  ],
  (phase, identity, clockLabel, anchor): SessionPillState => ({
    isVisible: isSessionPillVisiblePhase(phase),
    title:
      phase === SessionPhase.break
        ? BREAK_SESSION_TITLE
        : (identity?.title ?? anchor?.endeavor.title ?? ''),
    symbol: identity?.symbol ?? anchor?.endeavor.symbol ?? '',
    clockLabel,
    tint: sessionTintForPhase(phase),
    affordance: sessionPillAffordanceForPhase(phase),
  }),
)

export const selectIsSessionPillVisible = createSelector(
  [selectSessionPillState],
  (pill) => pill.isVisible,
)

export const selectSessionTint = createSelector(
  [selectSessionPillState],
  (pill) => pill.tint,
)

// ---------------------------------------------------------------------------
// Conclusion
// ---------------------------------------------------------------------------

export const selectSessionConclusion = createSelector(
  [selectSessionSlice],
  (slice) => slice.conclusion,
)

/** The outcome awaiting (or undergoing) recording, if any. */
export const selectPendingSessionOutcome = createSelector(
  [selectSessionConclusion],
  (conclusion): SessionOutcome | null =>
    conclusion.kind === 'pending' ||
    conclusion.kind === 'recording' ||
    conclusion.kind === 'recorded'
      ? conclusion.outcome
      : null,
)

/** Whether the sheet should be auto-presented at the conclusion screen. */
export const selectIsPresentingConclusion = createSelector(
  [selectSessionSlice],
  (slice) => slice.isPresentingConclusion,
)

/** The points the last recorded session awarded, or `null` before it lands. */
export const selectLastAwardedPoints = createSelector(
  [selectSessionConclusion],
  (conclusion): number | null =>
    conclusion.kind === 'recorded' ? conclusion.performance.rewardPoints : null,
)

/**
 * The calendar event the concluded session would log — `Session: <intention>`
 * from the first fragment's start to the last fragment's end.
 *
 * Derived rather than sent: `services/googleCalendar` (KC-IS-#33) does not
 * exist on `main` at this build's rebase point, so the intent is exposed for
 * the surface (and for #33's binding) instead of being invented. `timezone` is
 * the caller's — reading `Intl` here would put a platform global in a Selector.
 */
export const selectSessionCalendarEvent = (
  state: RootState,
  timezone: string,
): SessionCalendarEvent | null => {
  const outcome = selectPendingSessionOutcome(state)
  return outcome === null ? null : sessionCalendarEventFor(outcome, timezone)
}

// ---------------------------------------------------------------------------
// Setup surface
// ---------------------------------------------------------------------------

export const selectSessionPreferences = createSelector(
  [selectSessionSlice],
  (slice) => slice.preferences,
)

export const selectSessionAvailability = createSelector(
  [selectSessionSlice],
  (slice) => slice.availability,
)

/** Whether the mode toggle should be offered at all. */
export const selectIsStopwatchAvailable = createSelector(
  [selectSessionAvailability],
  (availability) => availability.isStopwatchAvailable,
)

/** Whether the conclusion screen may offer Break. */
export const selectAreBreaksAvailable = createSelector(
  [selectSessionAvailability],
  (availability) => availability.areBreaksAvailable,
)

/**
 * Canon's tomato counter — one per completed or finished performance for this
 * endeavor; aborted attempts never count, and the row is hidden at zero.
 */
export const selectTomatoCount = createSelector(
  [selectSessionSlice],
  (slice) => slice.completedSessionsCount,
)

export const selectShouldShowTomatoRow = createSelector(
  [selectTomatoCount],
  (count) => count > 0,
)

/**
 * Canon's *"first ten tomatoes followed by a numeric × N so the row never
 * overflows"* — the two numbers, not the markup.
 */
export const SESSION_TOMATO_DISPLAY_CAP = 10

export const selectTomatoRow = createSelector(
  [selectTomatoCount],
  (count): { readonly glyphs: number; readonly overflowLabel: string | null } => ({
    glyphs: Math.min(count, SESSION_TOMATO_DISPLAY_CAP),
    overflowLabel: count > SESSION_TOMATO_DISPLAY_CAP ? `× ${count}` : null,
  }),
)

// ---------------------------------------------------------------------------
// Identity editing
// ---------------------------------------------------------------------------

export const selectIsEditingSessionTitle = createSelector(
  [selectSessionSlice],
  (slice) => slice.isEditingTitle,
)

export const selectEditedSessionTitle = createSelector(
  [selectSessionSlice],
  (slice) => slice.editedTitle,
)

export const selectIsEditingSessionSymbol = createSelector(
  [selectSessionSlice],
  (slice) => slice.isEditingSymbol,
)
