/**
 * The anchored running-session state — canon
 * `KroCore/Model/Session/PersistedRunningSession.swift`.
 *
 * ## The invariant this file exists to hold
 *
 * **Display ticks never persist.** Elapsed time is *always* recomputed from
 * `fragments` against a `now` the caller supplies; nothing in this tier
 * accumulates a counter. That is what makes the session kill-resilient: a
 * relaunch re-reads the fragments and derives a figure that agrees with
 * wall-clock reality even if the app was dead for ten minutes
 * (`docs/Features/Session.md` § Persistence).
 *
 * Two structural consequences, both deliberate:
 *
 * - every function here takes `now` as a parameter — this package compiles
 *   with `types: []` and has no clock to reach for (the precedent #7 set), and
 *   a test states the moment it is asking about rather than mocking a global;
 * - the phase transitions in `SessionTransitions` return a **new** session
 *   rather than mutating one, so "close the fragment and move the phase" stays
 *   one atomic, unit-testable step — canon's shifters carry the same invariant
 *   as a comment, and here the type system carries it.
 *
 * Every duration is `TimeIntervalSeconds`. See `domain/session/index.ts` for
 * why that is stated once and never re-litigated per file.
 */
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { FocusSessionFragment } from './FocusSessionFragment'
import { focusSessionFragmentDuration } from './FocusSessionFragment'
import { FocusTimerMode } from './FocusTimerMode'

/**
 * `PersistedSessionEndeavor` — the minimal identity the pill and the sheet
 * need to render on relaunch. Canon keeps this separate from the full
 * `Endeavor` because the UI card model is not `Codable`; here the reason is
 * the same in spirit — the anchor is a persistence shape and should not carry
 * the whole domain object into local storage (#10 owns the storage itself).
 */
export interface PersistedSessionEndeavor {
  readonly id: string
  readonly symbol: string
  readonly title: string
  /** The endeavor's own estimate, when it has one. */
  readonly duration: TimeIntervalSeconds | null
}

export const makePersistedSessionEndeavor = (params: {
  readonly id: string
  readonly symbol: string
  readonly title: string
  readonly duration?: TimeIntervalSeconds | null
}): PersistedSessionEndeavor => ({
  id: params.id,
  symbol: params.symbol,
  title: params.title,
  duration: params.duration ?? null,
})

/**
 * `PersistedSessionPhase`. Canon's runtime phase enum also has a `.ready`
 * case; it is the one phase that never reaches disk, because a cleared anchor
 * (`null`) *is* "ready". Modelling `ready` here would create a second, silent
 * way to say the same thing.
 */
export const PersistedSessionPhase = {
  running: 'running',
  paused: 'paused',
  break: 'break',
  /**
   * The countdown finished (or a finish-early cleared the threshold) and the
   * user has not yet picked Complete / Start New / Break. Persisted on
   * purpose: the pill stays visible offering "mark complete".
   */
  concluded: 'concluded',
} as const

export type PersistedSessionPhase =
  (typeof PersistedSessionPhase)[keyof typeof PersistedSessionPhase]

/** The cases in canon declaration order. */
export const persistedSessionPhases: readonly PersistedSessionPhase[] = [
  PersistedSessionPhase.running,
  PersistedSessionPhase.paused,
  PersistedSessionPhase.break,
  PersistedSessionPhase.concluded,
]

/** Narrows a raw stored string, or `null` when it is not a known phase. */
export const persistedSessionPhaseFromRawValue = (
  raw: string,
): PersistedSessionPhase | null =>
  persistedSessionPhases.find((phase) => phase === raw) ?? null

/** `PersistedRunningSession` — a session that has begun and not yet closed. */
export interface PersistedRunningSession {
  readonly endeavor: PersistedSessionEndeavor
  /** Countdown only; inert under stopwatch. */
  readonly targetDuration: TimeIntervalSeconds
  readonly mode: FocusTimerMode
  /**
   * Timestamped fragments; their sum is the elapsed time. At most one may be
   * open (`end === null`), and none may be open while paused — see
   * `isRunningSessionConsistent`.
   */
  readonly fragments: readonly FocusSessionFragment[]
  readonly phase: PersistedSessionPhase
}

export const makePersistedRunningSession = (params: {
  readonly endeavor: PersistedSessionEndeavor
  readonly targetDuration: TimeIntervalSeconds
  readonly mode: FocusTimerMode
  readonly fragments?: readonly FocusSessionFragment[]
  readonly phase: PersistedSessionPhase
}): PersistedRunningSession => ({
  endeavor: params.endeavor,
  targetDuration: params.targetDuration,
  mode: params.mode,
  fragments: params.fragments ?? [],
  phase: params.phase,
})

/**
 * `elapsedDuration(now:)` — Σ over fragments of `(end ?? now) − start`.
 *
 * While running, the single open fragment contributes `now − start`; while
 * paused, every fragment is closed and contributes its real span, so the
 * figure is frozen no matter how large `now` grows.
 */
export const runningSessionElapsedDuration = (
  session: PersistedRunningSession,
  now: Date,
): TimeIntervalSeconds =>
  session.fragments.reduce(
    (total, fragment) => total + focusSessionFragmentDuration(fragment, now),
    0,
  )

/**
 * `remainingDuration(now:)` — countdown only, clamped at zero.
 *
 * Canon returns `targetDuration − elapsed` under stopwatch too and notes in
 * its own doc comment that the figure is not meaningful there; that behaviour
 * is ported as-is rather than "fixed", because a stopwatch caller is expected
 * to display elapsed instead and changing the return would be a silent
 * divergence. `isRunningSessionCountdownFinished` is the predicate a caller
 * actually wants, and it is mode-aware.
 */
export const runningSessionRemainingDuration = (
  session: PersistedRunningSession,
  now: Date,
): TimeIntervalSeconds =>
  Math.max(
    session.targetDuration - runningSessionElapsedDuration(session, now),
    0,
  )

/** The open fragment, or `null` when every fragment is closed. */
export const openFragmentOf = (
  session: PersistedRunningSession,
): FocusSessionFragment | null => {
  for (let index = session.fragments.length - 1; index >= 0; index -= 1) {
    const fragment = session.fragments[index]
    if (fragment !== undefined && fragment.end === null) return fragment
  }
  return null
}

/** Whether a fragment is currently open — i.e. time is accruing. */
export const hasOpenFragment = (session: PersistedRunningSession): boolean =>
  openFragmentOf(session) !== null

/**
 * The two structural invariants canon states as a doc comment on `fragments`:
 * at most one fragment is open, and a paused session has none open. Exposed as
 * a predicate so a hydration path (#10) can reject a corrupt anchor rather
 * than compute a plausible-looking wrong number from it.
 */
export const isRunningSessionConsistent = (
  session: PersistedRunningSession,
): boolean => {
  const openCount = session.fragments.filter(
    (fragment) => fragment.end === null,
  ).length
  if (openCount > 1) return false
  if (session.phase === PersistedSessionPhase.paused) return openCount === 0
  return true
}

/**
 * Whether a **countdown** session has run out its target. Always `false` under
 * stopwatch, which has no target to run out — canon guards its countdown-
 * completion branch with `selectedMode == .countdown` for exactly this reason.
 */
export const isRunningSessionCountdownFinished = (
  session: PersistedRunningSession,
  now: Date,
): boolean =>
  session.mode === FocusTimerMode.countdown &&
  runningSessionRemainingDuration(session, now) <= 0
