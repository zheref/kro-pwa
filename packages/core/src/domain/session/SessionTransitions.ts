/**
 * The running session's phase transitions — canon
 * `Kro/Application/Session/SessionSetupShifters.swift`.
 *
 * Canon's four shifters are `applySessionActivated`, `applySessionPaused`,
 * `applySessionAwaitingResolution` and `applySessionConcluded`. Each carries
 * the same doc-comment invariant: **the phase move and the fragment edit
 * happen together**. Ported as pure functions returning a new session, so that
 * invariant is a property of the type rather than a comment somebody has to
 * remember — there is no intermediate value in which the phase has moved and
 * the fragment has not.
 *
 * `now` is always a parameter (`RC-24`: nothing in this tier reads a clock).
 */
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { FocusSessionFragment } from './FocusSessionFragment'
import { makeFocusSessionFragment } from './FocusSessionFragment'
import type { PersistedRunningSession } from './PersistedRunningSession'
import {
  PersistedSessionPhase,
  runningSessionElapsedDuration,
} from './PersistedRunningSession'

/**
 * Closes the **last** open fragment at `endedAt`, leaving everything else
 * alone. Canon's `fragments.lastIndex(where: { $0.end == nil })` — last, not
 * first, so a corrupt anchor carrying two open fragments degrades to closing
 * the newer one rather than resurrecting the older.
 */
const withOpenFragmentsClosed = (
  fragments: readonly FocusSessionFragment[],
  endedAt: Date,
): readonly FocusSessionFragment[] => {
  // A healthy anchor never holds more than one open fragment (activation only
  // appends when nothing is open), so on every reachable state this matches
  // canon's close-the-last semantics exactly. Closing ALL open fragments is
  // pure defence: a corrupted persisted anchor self-heals on its next
  // transition instead of silently accruing elapsed time forever.
  if (!fragments.some((fragment) => fragment.end === null)) return fragments
  return fragments.map((fragment) =>
    fragment.end === null ? { start: fragment.start, end: endedAt } : fragment,
  )
}

/**
 * `applySessionPaused(at:)` — freeze the session.
 *
 * Phase becomes `paused` **and** the open fragment is stamped closed, so the
 * elapsed figure stops growing no matter how far `now` advances afterwards.
 * Pausing an already-paused session is a no-op on the fragments (there is
 * nothing open to close) and idempotent on the phase.
 */
export const pauseSessionAt = (
  session: PersistedRunningSession,
  now: Date,
): PersistedRunningSession => ({
  ...session,
  fragments: withOpenFragmentsClosed(session.fragments, now),
  phase: PersistedSessionPhase.paused,
})

/**
 * `applySessionActivated(at:)` — start or resume.
 *
 * One shifter serves both in canon, and the port keeps that: the first play
 * and every resume append a fresh open fragment. The phase becomes `running`,
 * **except** that a session already in `break` stays in `break` — canon's
 * `phaseForBreakOrRunning()`, which exists so the pill can label "Break"
 * rather than the endeavor title.
 *
 * A caller resuming a session that still has an open fragment would otherwise
 * double-count the overlap, so the open one is closed at the same instant
 * first. In canon that case cannot arise (pause always precedes resume); here
 * it is made structurally harmless rather than left to trust, because #10 will
 * hydrate this shape from disk where a crash could leave it inconsistent.
 */
export const resumeSessionAt = (
  session: PersistedRunningSession,
  now: Date,
): PersistedRunningSession => ({
  ...session,
  fragments: [
    ...withOpenFragmentsClosed(session.fragments, now),
    makeFocusSessionFragment({ start: now }),
  ],
  phase:
    session.phase === PersistedSessionPhase.break
      ? PersistedSessionPhase.break
      : PersistedSessionPhase.running,
})

/**
 * `applySessionAwaitingResolution(at:)` — the countdown reached zero, or a
 * finish-early cleared the recording threshold.
 *
 * The trailing fragment is closed and the phase parks at `concluded`; the
 * anchor is deliberately **kept**, because the user has not yet chosen
 * Complete / Start New / Break and the pill must go on offering the "mark
 * complete" shortcut while the sheet is dismissed.
 */
export const concludeSessionAt = (
  session: PersistedRunningSession,
  now: Date,
): PersistedRunningSession => ({
  ...session,
  fragments: withOpenFragmentsClosed(session.fragments, now),
  phase: PersistedSessionPhase.concluded,
})

/**
 * The break timer that follows a focus session — canon sets `phase = .break`
 * and then runs `applySessionActivated`, which is exactly this composition.
 */
export const startBreakAt = (
  session: PersistedRunningSession,
  now: Date,
): PersistedRunningSession =>
  resumeSessionAt({ ...session, phase: PersistedSessionPhase.break }, now)

/**
 * What a closed session hands to the performance record.
 *
 * Canon's `applySessionConcluded` closes the trailing fragment, resets the
 * runtime to `.ready` and **clears** the anchor — so there is no
 * `PersistedRunningSession` left to return; a cleared anchor is `null`, which
 * is why this returns the payload instead of a session. The caller (#21) then
 * writes `null` to storage and records the performance from these fragments.
 */
export interface ClosedSession {
  readonly fragments: readonly FocusSessionFragment[]
  readonly elapsedDuration: TimeIntervalSeconds
}

/**
 * `applySessionConcluded(at:)` — abort, complete, start-new, break-chosen, or
 * a below-threshold finish-early. Closes the trailing fragment and returns the
 * final fragment set plus its elapsed total; the anchor is gone afterwards.
 */
export const closeSessionAt = (
  session: PersistedRunningSession,
  now: Date,
): ClosedSession => {
  const fragments = withOpenFragmentsClosed(session.fragments, now)
  return {
    fragments,
    elapsedDuration: runningSessionElapsedDuration(
      { ...session, fragments },
      now,
    ),
  }
}
