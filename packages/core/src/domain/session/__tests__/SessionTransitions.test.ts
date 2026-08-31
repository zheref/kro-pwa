import { describe, expect, it } from 'vitest'
import { minutesInSeconds } from '../../shared/TimeInterval'
import { makeFocusSessionFragment } from '../FocusSessionFragment'
import { FocusTimerMode } from '../FocusTimerMode'
import {
  type PersistedRunningSession,
  PersistedSessionPhase,
  isRunningSessionConsistent,
  makePersistedRunningSession,
  openFragmentOf,
  runningSessionElapsedDuration,
  runningSessionRemainingDuration,
} from '../PersistedRunningSession'
import {
  closeSessionAt,
  concludeSessionAt,
  pauseSessionAt,
  resumeSessionAt,
  startBreakAt,
} from '../SessionTransitions'
import { SESSION_MOCK_NOW } from '../__mocks__/FocusSessionFragment.mocks'
import {
  persistedRunningSessionMocks,
  persistedSessionEndeavorMocks,
} from '../__mocks__/PersistedRunningSession.mocks'

const at = (offsetSeconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + offsetSeconds * 1000)

describe('pausing', () => {
  it('freezes the elapsed figure at the instant the user tapped pause', () => {
    const paused = pauseSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(0),
    )
    expect(runningSessionElapsedDuration(paused, at(0))).toBe(600)
    expect(runningSessionElapsedDuration(paused, at(100_000))).toBe(600)
  })

  it('moves the phase and closes the fragment in one step, never one without the other', () => {
    const paused = pauseSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(0),
    )
    expect(paused.phase).toBe(PersistedSessionPhase.paused)
    expect(openFragmentOf(paused)).toBeNull()
    expect(isRunningSessionConsistent(paused)).toBe(true)
  })

  it('is a no-op on the fragments when the session is already paused', () => {
    const alreadyPaused = persistedRunningSessionMocks.pausedAfterTwoRuns
    const again = pauseSessionAt(alreadyPaused, at(500))
    expect(again.fragments).toEqual(alreadyPaused.fragments)
    expect(runningSessionElapsedDuration(again, at(500))).toBe(600)
  })

  it('never mutates the session it was handed', () => {
    const original = persistedRunningSessionMocks.runningPomodoro
    pauseSessionAt(original, at(0))
    expect(original.phase).toBe(PersistedSessionPhase.running)
    expect(openFragmentOf(original)).not.toBeNull()
  })
})

describe('resuming', () => {
  it('starts a fresh fragment so the gap while paused is never counted', () => {
    const paused = pauseSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(0),
    )
    const resumed = resumeSessionAt(paused, at(3600))
    expect(runningSessionElapsedDuration(resumed, at(3600))).toBe(600)
    expect(runningSessionElapsedDuration(resumed, at(3900))).toBe(900)
  })

  it('moves a paused session back to running', () => {
    const resumed = resumeSessionAt(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
      at(0),
    )
    expect(resumed.phase).toBe(PersistedSessionPhase.running)
    expect(resumed.fragments).toHaveLength(3)
  })

  it('keeps a session already in the break phase there, so the pill still says “Break”', () => {
    // Canon's `phaseForBreakOrRunning()`: resuming reads the *current* phase.
    expect(
      resumeSessionAt(persistedRunningSessionMocks.onBreak, at(60)).phase,
    ).toBe(PersistedSessionPhase.break)
  })

  it('returns a *paused* break to running, not to break — canon loses the break on pause', () => {
    // `applySessionPaused` sets `.paused` unconditionally, so by the time
    // `phaseForBreakOrRunning()` runs there is no `.break` left to see. Pinned
    // rather than "fixed": repairing it here would make web and iOS disagree
    // about what the pill says after pausing a break from the pill.
    const paused = pauseSessionAt(persistedRunningSessionMocks.onBreak, at(0))
    expect(paused.phase).toBe(PersistedSessionPhase.paused)
    expect(resumeSessionAt(paused, at(60)).phase).toBe(
      PersistedSessionPhase.running,
    )
  })

  it('closes an already-open fragment first, so a double resume cannot double-count', () => {
    const doubleResumed = resumeSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(0),
    )
    expect(runningSessionElapsedDuration(doubleResumed, at(0))).toBe(600)
    expect(isRunningSessionConsistent(doubleResumed)).toBe(true)
  })
})

describe('concluding — the countdown ran out or a finish-early cleared the bar', () => {
  it('closes the fragment and parks at concluded, keeping the anchor alive', () => {
    const concluded = concludeSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(900),
    )
    expect(concluded.phase).toBe(PersistedSessionPhase.concluded)
    expect(openFragmentOf(concluded)).toBeNull()
    expect(concluded.endeavor).toEqual(
      persistedRunningSessionMocks.runningPomodoro.endeavor,
    )
  })

  it('freezes the elapsed figure while the user decides Complete / Start New / Break', () => {
    const concluded = concludeSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(900),
    )
    expect(runningSessionElapsedDuration(concluded, at(900))).toBe(1500)
    expect(runningSessionElapsedDuration(concluded, at(9000))).toBe(1500)
    expect(runningSessionRemainingDuration(concluded, at(9000))).toBe(0)
  })

  it('concludes a paused session without inventing extra time', () => {
    const concluded = concludeSessionAt(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
      at(1200),
    )
    expect(runningSessionElapsedDuration(concluded, at(1200))).toBe(600)
  })
})

describe('taking a break after a focus session', () => {
  it('moves into the break phase with time accruing again', () => {
    const onBreak = startBreakAt(
      persistedRunningSessionMocks.concludedAwaitingChoice,
      at(0),
    )
    expect(onBreak.phase).toBe(PersistedSessionPhase.break)
    expect(openFragmentOf(onBreak)?.start).toEqual(at(0))
  })

  it('accrues break time on top of the focus fragments it inherited', () => {
    const onBreak = startBreakAt(
      persistedRunningSessionMocks.concludedAwaitingChoice,
      at(0),
    )
    expect(runningSessionElapsedDuration(onBreak, at(300))).toBe(1200)
  })

  it('leaves the source session untouched', () => {
    const source = persistedRunningSessionMocks.concludedAwaitingChoice
    startBreakAt(source, at(0))
    expect(source.phase).toBe(PersistedSessionPhase.concluded)
  })
})

describe('closing a session for good', () => {
  it('hands back the final fragments and their total, ready for the record', () => {
    const closed = closeSessionAt(
      persistedRunningSessionMocks.runningPomodoro,
      at(0),
    )
    expect(closed.elapsedDuration).toBe(600)
    expect(closed.fragments).toHaveLength(1)
    expect(closed.fragments[0]?.end).toEqual(at(0))
  })

  it('reports a frozen total for a session that was already paused', () => {
    expect(
      closeSessionAt(persistedRunningSessionMocks.pausedAfterTwoRuns, at(5000))
        .elapsedDuration,
    ).toBe(600)
  })

  it('reports zero for an anchor that never accrued a fragment', () => {
    const closed = closeSessionAt(
      persistedRunningSessionMocks.noFragments,
      at(0),
    )
    expect(closed.elapsedDuration).toBe(0)
    expect(closed.fragments).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Kill / restore — acceptance criterion 1
// ---------------------------------------------------------------------------

/**
 * The anchor as it actually survives a kill: JSON on disk, dates as ISO
 * strings, revived on relaunch. Going through the round trip rather than
 * reusing the in-memory value is the point — it is what proves nothing in the
 * elapsed figure came from a live object that happened to still be around.
 */
const throughStorage = (
  session: PersistedRunningSession,
): PersistedRunningSession => {
  const raw = JSON.parse(JSON.stringify(session)) as {
    endeavor: PersistedRunningSession['endeavor']
    targetDuration: number
    mode: PersistedRunningSession['mode']
    fragments: readonly { start: string; end: string | null }[]
    phase: PersistedRunningSession['phase']
  }
  return makePersistedRunningSession({
    endeavor: raw.endeavor,
    targetDuration: raw.targetDuration,
    mode: raw.mode,
    fragments: raw.fragments.map((fragment) =>
      makeFocusSessionFragment({
        start: new Date(fragment.start),
        end: fragment.end === null ? null : new Date(fragment.end),
      }),
    ),
    phase: raw.phase,
  })
}

describe('killing the app and relaunching', () => {
  it('shows wall-clock-correct remaining time, not the time it had when it died', () => {
    // Started a 25-minute session, ran 10 minutes, then the app was killed.
    const beforeKill = persistedRunningSessionMocks.runningPomodoro
    expect(runningSessionRemainingDuration(beforeKill, at(0))).toBe(900)

    // Seven minutes of wall time pass with the app dead. On relaunch the
    // anchor is re-read and recomputed against the real `now`.
    const restored = throughStorage(beforeKill)
    expect(runningSessionElapsedDuration(restored, at(420))).toBe(1020)
    expect(runningSessionRemainingDuration(restored, at(420))).toBe(480)
  })

  it('keeps a paused session frozen across the kill, however long it was dead', () => {
    const restored = throughStorage(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
    )
    expect(runningSessionElapsedDuration(restored, at(0))).toBe(600)
    expect(runningSessionElapsedDuration(restored, at(7 * 86_400))).toBe(600)
  })

  it('reports a countdown that ran out while the app was dead as finished', () => {
    const restored = throughStorage(
      persistedRunningSessionMocks.runningPomodoro,
    )
    expect(runningSessionRemainingDuration(restored, at(1200))).toBe(0)
  })

  it('survives a pause that landed after the restore, with no double count', () => {
    const restored = throughStorage(
      persistedRunningSessionMocks.runningPomodoro,
    )
    const paused = pauseSessionAt(restored, at(420))
    expect(runningSessionElapsedDuration(paused, at(420))).toBe(1020)
    expect(runningSessionElapsedDuration(paused, at(50_000))).toBe(1020)
  })

  it('round-trips a break anchor without losing the break phase', () => {
    const restored = throughStorage(persistedRunningSessionMocks.onBreak)
    expect(restored.phase).toBe(PersistedSessionPhase.break)
    expect(runningSessionElapsedDuration(restored, at(60))).toBe(180)
  })
})

// ---------------------------------------------------------------------------
// Property test — acceptance criterion 1, the anchoring invariant
// ---------------------------------------------------------------------------

/**
 * A deterministic 32-bit LCG. `Math.random` would make a failure impossible to
 * reproduce from CI output; a seeded generator gives the same 200 sequences on
 * every machine, and the seed is printed with the assertion when one fails.
 */
const lcg = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

type Op = 'pause' | 'resume'

describe('the anchoring invariant, under arbitrary pause/resume sequences', () => {
  it('never drifts: elapsed always equals the time actually spent running', () => {
    const SEQUENCES = 200
    const MAX_OPS = 24

    for (let seed = 1; seed <= SEQUENCES; seed += 1) {
      const random = lcg(seed)

      // The session starts running at t = 0 with one open fragment.
      let session = makePersistedRunningSession({
        endeavor: persistedSessionEndeavorMocks.writeBrief,
        targetDuration: minutesInSeconds(25),
        mode: FocusTimerMode.countdown,
        fragments: [makeFocusSessionFragment({ start: at(0) })],
        phase: PersistedSessionPhase.running,
      })

      // What the test tracks independently of the domain: seconds banked while
      // running, and the instant the current run began.
      let banked = 0
      let runningSince: number | null = 0
      let clock = 0
      let previousElapsed = 0

      const opCount = 1 + Math.floor(random() * MAX_OPS)
      const trace: string[] = []

      for (let step = 0; step < opCount; step += 1) {
        // Advance 1–600 seconds, then act. Whole seconds keep the arithmetic
        // exact, so a mismatch is real drift and never float noise.
        clock += 1 + Math.floor(random() * 600)
        const op: Op = random() < 0.5 ? 'pause' : 'resume'
        trace.push(`${op}@${clock}`)

        if (op === 'pause') {
          if (runningSince !== null) {
            banked += clock - runningSince
            runningSince = null
          }
          session = pauseSessionAt(session, at(clock))
        } else {
          // Resuming while already running closes the open fragment and opens
          // a fresh one at the same instant — banked time is unchanged.
          if (runningSince !== null) banked += clock - runningSince
          runningSince = clock
          session = resumeSessionAt(session, at(clock))
        }

        const expected =
          banked + (runningSince === null ? 0 : clock - runningSince)
        const actual = runningSessionElapsedDuration(session, at(clock))
        expect(
          actual,
          `seed ${seed}, step ${step}, trace ${trace.join(' ')}`,
        ).toBe(expected)

        // Two invariants that must hold at every step, not just at the end.
        expect(
          isRunningSessionConsistent(session),
          `seed ${seed} left an inconsistent anchor at step ${step}`,
        ).toBe(true)
        expect(
          actual,
          `seed ${seed} went backwards at step ${step}`,
        ).toBeGreaterThanOrEqual(previousElapsed)
        previousElapsed = actual
      }

      // …and it still holds an hour after the last operation.
      const later = clock + 3600
      const expectedLater =
        banked + (runningSince === null ? 0 : later - runningSince)
      expect(
        runningSessionElapsedDuration(session, at(later)),
        `seed ${seed} drifted after the sequence ended: ${trace.join(' ')}`,
      ).toBe(expectedLater)

      // A paused sequence must be frozen; a running one must still be moving.
      if (runningSince === null) {
        expect(runningSessionElapsedDuration(session, at(later))).toBe(banked)
      }
    }
  })

  it('never drifts across a kill inserted at a random point in the sequence', () => {
    for (let seed = 1_000; seed <= 1_060; seed += 1) {
      const random = lcg(seed)

      let session = makePersistedRunningSession({
        endeavor: persistedSessionEndeavorMocks.writeBrief,
        targetDuration: minutesInSeconds(25),
        mode: FocusTimerMode.countdown,
        fragments: [makeFocusSessionFragment({ start: at(0) })],
        phase: PersistedSessionPhase.running,
      })

      let banked = 0
      let runningSince: number | null = 0
      let clock = 0

      const opCount = 2 + Math.floor(random() * 12)
      const killAfter = Math.floor(random() * opCount)

      for (let step = 0; step < opCount; step += 1) {
        clock += 1 + Math.floor(random() * 600)
        const op: Op = random() < 0.5 ? 'pause' : 'resume'

        if (op === 'pause') {
          if (runningSince !== null) {
            banked += clock - runningSince
            runningSince = null
          }
          session = pauseSessionAt(session, at(clock))
        } else {
          if (runningSince !== null) banked += clock - runningSince
          runningSince = clock
          session = resumeSessionAt(session, at(clock))
        }

        // The app dies here and comes back later; only the JSON survives.
        if (step === killAfter) {
          clock += 1 + Math.floor(random() * 5_000)
          session = throughStorage(session)
        }
      }

      const expected =
        banked + (runningSince === null ? 0 : clock - runningSince)
      expect(
        runningSessionElapsedDuration(session, at(clock)),
        `seed ${seed} drifted across a kill after step ${killAfter}`,
      ).toBe(expected)
    }
  })
})
