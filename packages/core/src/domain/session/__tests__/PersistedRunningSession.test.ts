import { describe, expect, it } from 'vitest'
import { minutesInSeconds } from '../../shared/TimeInterval'
import {
  PersistedSessionPhase,
  hasOpenFragment,
  isRunningSessionConsistent,
  isRunningSessionCountdownFinished,
  makePersistedRunningSession,
  openFragmentOf,
  persistedSessionPhaseFromRawValue,
  persistedSessionPhases,
  runningSessionElapsedDuration,
  runningSessionRemainingDuration,
} from '../PersistedRunningSession'
import { SESSION_MOCK_NOW } from '../__mocks__/FocusSessionFragment.mocks'
import {
  persistedRunningSessionMocks,
  persistedSessionEndeavorMocks,
} from '../__mocks__/PersistedRunningSession.mocks'
import { makeFocusSessionFragment } from '../FocusSessionFragment'
import { FocusTimerMode } from '../FocusTimerMode'

const at = (offsetSeconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + offsetSeconds * 1000)

describe('the persisted phase', () => {
  it('carries canon’s four cases, with ready deliberately absent', () => {
    expect(persistedSessionPhases).toEqual([
      'running',
      'paused',
      'break',
      'concluded',
    ])
    expect(persistedSessionPhaseFromRawValue('ready')).toBeNull()
  })

  it('narrows a phase written by a previous launch', () => {
    expect(persistedSessionPhaseFromRawValue('concluded')).toBe(
      PersistedSessionPhase.concluded,
    )
  })

  it('refuses a phase it does not recognize rather than defaulting to running', () => {
    expect(persistedSessionPhaseFromRawValue('finished')).toBeNull()
  })
})

describe('elapsed time, recomputed from fragments', () => {
  it('sums a running session’s open fragment against now', () => {
    expect(
      runningSessionElapsedDuration(
        persistedRunningSessionMocks.runningPomodoro,
        at(0),
      ),
    ).toBe(600)
  })

  it('grows with wall time while running, without anything being written', () => {
    const session = persistedRunningSessionMocks.runningPomodoro
    expect(runningSessionElapsedDuration(session, at(300))).toBe(900)
  })

  it('sums two closed fragments and stays frozen while paused', () => {
    const session = persistedRunningSessionMocks.pausedAfterTwoRuns
    expect(runningSessionElapsedDuration(session, at(0))).toBe(600)
    expect(runningSessionElapsedDuration(session, at(86_400))).toBe(600)
  })

  it('is zero for an anchor that carries no fragments yet', () => {
    expect(
      runningSessionElapsedDuration(
        persistedRunningSessionMocks.noFragments,
        at(0),
      ),
    ).toBe(0)
  })

  it('is zero for a session opened exactly at now', () => {
    expect(
      runningSessionElapsedDuration(
        persistedRunningSessionMocks.justStarted,
        at(0),
      ),
    ).toBe(0)
  })
})

describe('remaining time on a countdown', () => {
  it('is the target minus elapsed for a session mid-run', () => {
    expect(
      runningSessionRemainingDuration(
        persistedRunningSessionMocks.runningPomodoro,
        at(0),
      ),
    ).toBe(900)
  })

  it('clamps at zero rather than going negative when the target is overrun', () => {
    expect(
      runningSessionRemainingDuration(
        persistedRunningSessionMocks.overrunAfterKill,
        at(0),
      ),
    ).toBe(0)
  })

  it('stays clamped at zero however long the app was dead', () => {
    expect(
      runningSessionRemainingDuration(
        persistedRunningSessionMocks.overrunAfterKill,
        at(86_400),
      ),
    ).toBe(0)
  })

  it('is the full target for a session that has not started accruing', () => {
    expect(
      runningSessionRemainingDuration(
        persistedRunningSessionMocks.justStarted,
        at(0),
      ),
    ).toBe(minutesInSeconds(15))
  })
})

describe('whether a countdown has run out', () => {
  it('says no while time remains', () => {
    expect(
      isRunningSessionCountdownFinished(
        persistedRunningSessionMocks.runningPomodoro,
        at(0),
      ),
    ).toBe(false)
  })

  it('says yes at the exact instant the target is reached', () => {
    expect(
      isRunningSessionCountdownFinished(
        persistedRunningSessionMocks.runningPomodoro,
        at(900),
      ),
    ).toBe(true)
  })

  it('says no for a stopwatch, however long it has run — there is no target to hit', () => {
    const stopwatch = persistedRunningSessionMocks.runningStopwatch
    expect(isRunningSessionCountdownFinished(stopwatch, at(86_400))).toBe(false)
    // …even though remaining, ported as-is from canon, does clamp to zero.
    expect(runningSessionRemainingDuration(stopwatch, at(86_400))).toBe(0)
  })
})

describe('locating the open fragment', () => {
  it('finds the fragment currently accruing time', () => {
    expect(
      openFragmentOf(persistedRunningSessionMocks.runningPomodoro)?.start,
    ).toEqual(at(-600))
  })

  it('finds none once the session is paused', () => {
    expect(
      openFragmentOf(persistedRunningSessionMocks.pausedAfterTwoRuns),
    ).toBeNull()
    expect(
      hasOpenFragment(persistedRunningSessionMocks.pausedAfterTwoRuns),
    ).toBe(false)
  })

  it('returns the newest of two open fragments on a corrupt anchor', () => {
    expect(
      openFragmentOf(persistedRunningSessionMocks.corruptTwoOpenFragments)
        ?.start,
    ).toEqual(at(-600))
  })
})

describe('the anchor’s structural invariants', () => {
  it('accepts a healthy running session with exactly one open fragment', () => {
    expect(
      isRunningSessionConsistent(persistedRunningSessionMocks.runningPomodoro),
    ).toBe(true)
  })

  it('accepts a paused session with every fragment closed', () => {
    expect(
      isRunningSessionConsistent(
        persistedRunningSessionMocks.pausedAfterTwoRuns,
      ),
    ).toBe(true)
  })

  it('rejects a paused anchor that still has time accruing — the crash-mid-write shape', () => {
    expect(
      isRunningSessionConsistent(
        persistedRunningSessionMocks.corruptPausedWithOpenFragment,
      ),
    ).toBe(false)
  })

  it('rejects two open fragments, which would run the clock at double speed', () => {
    const corrupt = persistedRunningSessionMocks.corruptTwoOpenFragments
    expect(isRunningSessionConsistent(corrupt)).toBe(false)
    // The reason it matters, made concrete: 900 + 600 rather than 900.
    expect(runningSessionElapsedDuration(corrupt, at(0))).toBe(1500)
  })

  it('accepts a concluded session, which has no open fragment either', () => {
    expect(
      isRunningSessionConsistent(
        persistedRunningSessionMocks.concludedAwaitingChoice,
      ),
    ).toBe(true)
  })
})

describe('building an anchor', () => {
  it('defaults to no fragments, the state before the first play lands', () => {
    const session = makePersistedRunningSession({
      endeavor: persistedSessionEndeavorMocks.bare,
      targetDuration: minutesInSeconds(25),
      mode: FocusTimerMode.countdown,
      phase: PersistedSessionPhase.running,
    })
    expect(session.fragments).toEqual([])
  })

  it('keeps the fragments it was handed', () => {
    const fragment = makeFocusSessionFragment({ start: at(-60) })
    const session = makePersistedRunningSession({
      endeavor: persistedSessionEndeavorMocks.bare,
      targetDuration: minutesInSeconds(25),
      mode: FocusTimerMode.countdown,
      fragments: [fragment],
      phase: PersistedSessionPhase.running,
    })
    expect(session.fragments).toEqual([fragment])
  })
})
