/**
 * The phase machine, as pure functions (`RC-56`).
 *
 * No store, no dispatch, no timers, no I/O — every instant is an argument, so
 * a twenty-five-minute session is exercised in a few lines of arithmetic.
 *
 * Three properties get the most attention, because they are the ones the issue
 * names as acceptance criteria:
 *
 * - **the one-session invariant** — `withSessionStarted` is the only arm that
 *   installs an anchor, and it refuses while one exists;
 * - **the 30 % threshold** — exactly 30 % records; a hair under aborts;
 * - **exactly-once conclusion** — replaying the tick past zero claims once.
 */
import {
  FocusTimerMode,
  PerformResolution,
  PersistedSessionPhase,
  minutesInSeconds,
  runningSessionElapsedDuration,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { SessionExceptions } from '../SessionException'
import {
  SESSION_MOCK_NOW,
  SESSION_MOCK_TARGET,
  sessionAvailabilityMocks,
  sessionIdentityMocks,
  sessionMockInstant,
  sessionPreferenceMocks,
  sessionStateMocks,
} from '../SessionMocks'
import { SessionOutcomeReason } from '../SessionOutcome'
import { type SessionState, initialSessionState } from '../SessionState'
import {
  withAnchorHydrated,
  withBreakElapsed,
  withBreakEnded,
  withBreakFinished,
  withBreakStarted,
  withCompletedSessionsCount,
  withConclusionDismissed,
  withConclusionRecorded,
  withConclusionRecordingFailed,
  withConclusionRecordingStarted,
  withDisplayAdvanced,
  withEditedTitleChanged,
  withException,
  withIdentityApplied,
  withLaunchPrepared,
  withModeSelected,
  withPreferencesApplied,
  withSessionAborted,
  withSessionAwaitingResolution,
  withSessionClosed,
  withSessionLoadStarted,
  withSessionPaused,
  withSessionResumed,
  withSessionStartRefused,
  withSessionStarted,
  withSymbolPickerDismissed,
  withSymbolPickerPresented,
  withTargetDurationSelected,
  withTitleEditingCancelled,
  withTitleEditingStarted,
} from '../SessionShifters'
import { SessionPhase } from '../SessionVocabulary'

const ready = sessionStateMocks.ready
const started = withSessionStarted(ready, SESSION_MOCK_NOW)

/** Runs the display tick over a whole span, one second at a time. */
const tickThrough = (
  state: SessionState,
  fromSecond: number,
  toSecond: number,
): SessionState => {
  let next = state
  for (let second = fromSecond; second <= toSecond; second += 1) {
    next = withDisplayAdvanced(next, sessionMockInstant(second))
  }
  return next
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('withSessionLoadStarted', () => {
  it('marks a first read in flight', () => {
    expect(withSessionLoadStarted(initialSessionState).load.kind).toBe('loading')
  })

  it('clears a previous failure so a retry is not shown as still broken', () => {
    const failed = withException(
      initialSessionState,
      SessionExceptions.anchorReadFailed('offline'),
    )
    expect(withSessionLoadStarted(failed).load.kind).toBe('loading')
  })

  it('leaves the running session alone — a reload is not a stop', () => {
    const loading = withSessionLoadStarted(sessionStateMocks.running)
    expect(loading.phase).toBe(SessionPhase.running)
    expect(loading.anchor).not.toBeNull()
  })
})

describe('withException', () => {
  it('records the failure on the one lifecycle field', () => {
    const next = withException(
      initialSessionState,
      SessionExceptions.anchorWriteFailed('quota exceeded'),
    )
    expect(next.load).toEqual({
      kind: 'failed',
      exception: SessionExceptions.anchorWriteFailed('quota exceeded'),
    })
  })

  it('never stops a session that is still counting down correctly', () => {
    const next = withException(
      sessionStateMocks.running,
      SessionExceptions.anchorWriteFailed('quota exceeded'),
    )
    expect(next.phase).toBe(SessionPhase.running)
    expect(next.anchor).toBe(sessionStateMocks.running.anchor)
  })

  it('never discards a conclusion claim already in flight', () => {
    const next = withException(
      sessionStateMocks.concluded,
      SessionExceptions.unknown('boom'),
    )
    expect(next.conclusion.kind).toBe('pending')
  })
})

describe('withPreferencesApplied', () => {
  const applied = {
    preferences: sessionPreferenceMocks.autoBreak,
    availability: sessionAvailabilityMocks.everythingOn,
  }

  it('installs the five preferences and the three gates together', () => {
    const next = withPreferencesApplied(initialSessionState, applied)
    expect(next.preferences.autoStartBreak).toBe(true)
    expect(next.availability.areBreaksAvailable).toBe(true)
  })

  it('adopts the new default target while still in ready', () => {
    const next = withPreferencesApplied(initialSessionState, applied)
    expect(next.targetDuration).toBe(applied.preferences.defaultDuration)
  })

  it('never moves the finish line of a session already counting down', () => {
    const next = withPreferencesApplied(sessionStateMocks.running, applied)
    expect(next.targetDuration).toBe(SESSION_MOCK_TARGET)
  })
})

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

describe('withLaunchPrepared', () => {
  const prepared = {
    identity: sessionIdentityMocks.plain,
    recommendation: {
      mode: FocusTimerMode.stopwatch,
      targetDuration: minutesInSeconds(45),
      source: { kind: 'stopwatch' } as const,
    },
    completedSessionsCount: 7,
  }

  it('opens the sheet in the recommended mode and duration', () => {
    const next = withLaunchPrepared(initialSessionState, prepared)
    expect(next.mode).toBe(FocusTimerMode.stopwatch)
    expect(next.targetDuration).toBe(minutesInSeconds(45))
  })

  it('carries the tomato count the endeavor’s history produced', () => {
    expect(
      withLaunchPrepared(initialSessionState, prepared).completedSessionsCount,
    ).toBe(7)
  })

  it('refuses while a session is live — re-preparing would move its target', () => {
    expect(withLaunchPrepared(sessionStateMocks.running, prepared)).toBe(
      sessionStateMocks.running,
    )
  })
})

describe('withAnchorHydrated', () => {
  it('recovers a running session at the phase the document recorded', () => {
    const next = withAnchorHydrated(initialSessionState, {
      anchor: started.anchor,
      identity: sessionIdentityMocks.slides,
      completedSessionsCount: 3,
      now: sessionMockInstant(900),
    })
    expect(next.phase).toBe(SessionPhase.running)
    expect(next.anchor).toBe(started.anchor)
  })

  it('shows wall-clock-correct elapsed time on the first paint after a reload', () => {
    // The tab was closed for fifteen minutes; the figure must reflect that,
    // not the number the tab held when it went away.
    const next = withAnchorHydrated(initialSessionState, {
      anchor: started.anchor,
      identity: sessionIdentityMocks.slides,
      completedSessionsCount: 3,
      now: sessionMockInstant(900),
    })
    expect(
      runningSessionElapsedDuration(next.anchor!, next.now!),
    ).toBeCloseTo(900, 5)
  })

  it('lands on ready when no document exists — a cleared anchor is ready', () => {
    const next = withAnchorHydrated(sessionStateMocks.running, {
      anchor: null,
      identity: null,
      completedSessionsCount: 0,
      now: sessionMockInstant(900),
    })
    expect(next.phase).toBe(SessionPhase.ready)
    expect(next.anchor).toBeNull()
  })

  it('re-presents the conclusion screen for a session recovered at concluded', () => {
    const concludedAnchor = {
      ...started.anchor!,
      phase: PersistedSessionPhase.concluded,
    }
    const next = withAnchorHydrated(initialSessionState, {
      anchor: concludedAnchor,
      identity: sessionIdentityMocks.slides,
      completedSessionsCount: 3,
      now: sessionMockInstant(1_800),
    })
    expect(next.phase).toBe(SessionPhase.concluded)
    expect(next.isPresentingConclusion).toBe(true)
  })

  it('rebuilds an identity from the document when no endeavor row survives', () => {
    const next = withAnchorHydrated(initialSessionState, {
      anchor: started.anchor,
      identity: null,
      completedSessionsCount: 0,
      now: sessionMockInstant(60),
    })
    expect(next.identity?.title).toBe(started.anchor?.endeavor.title)
  })
})

// ---------------------------------------------------------------------------
// The one-session invariant
// ---------------------------------------------------------------------------

describe('withSessionStarted', () => {
  it('opens one fragment and moves to running', () => {
    expect(started.phase).toBe(SessionPhase.running)
    expect(started.anchor?.fragments).toHaveLength(1)
    expect(started.anchor?.fragments[0]?.end).toBeNull()
  })

  it('anchors the session to the identity the sheet was prepared with', () => {
    expect(started.anchor?.endeavor.id).toBe(
      sessionIdentityMocks.slides.endeavorId,
    )
    expect(started.anchor?.endeavor.title).toBe(
      sessionIdentityMocks.slides.title,
    )
  })

  it('refuses outright while a session is already anchored', () => {
    const second = withSessionStarted(
      sessionStateMocks.running,
      sessionMockInstant(700),
    )
    expect(second).toBe(sessionStateMocks.running)
  })

  it('refuses a paused session too — it is still the one session', () => {
    expect(
      withSessionStarted(sessionStateMocks.paused, sessionMockInstant(700)),
    ).toBe(sessionStateMocks.paused)
  })

  it('refuses a concluded session, whose anchor is deliberately kept', () => {
    expect(
      withSessionStarted(sessionStateMocks.concluded, sessionMockInstant(2_000)),
    ).toBe(sessionStateMocks.concluded)
  })

  it('refuses when no identity has been prepared — there is nobody to run for', () => {
    expect(withSessionStarted(initialSessionState, SESSION_MOCK_NOW)).toBe(
      initialSessionState,
    )
  })
})

describe('withSessionStartRefused', () => {
  it('rolls the optimistic start back to ready', () => {
    const refused = withSessionStartRefused(
      started,
      SessionExceptions.sessionAlreadyRunning(),
    )
    expect(refused.phase).toBe(SessionPhase.ready)
    expect(refused.anchor).toBeNull()
  })

  it('surfaces the refusal rather than failing silently', () => {
    const refused = withSessionStartRefused(
      started,
      SessionExceptions.sessionAlreadyRunning(),
    )
    expect(refused.load).toEqual({
      kind: 'failed',
      exception: SessionExceptions.sessionAlreadyRunning(),
    })
  })

  it('leaves no conclusion claim behind for the next session to inherit', () => {
    const refused = withSessionStartRefused(
      started,
      SessionExceptions.sessionAlreadyRunning(),
    )
    expect(refused.conclusion.kind).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Pause / resume
// ---------------------------------------------------------------------------

describe('withSessionPaused', () => {
  it('stamps the open fragment closed so the figure stops growing', () => {
    const paused = withSessionPaused(started, sessionMockInstant(600))
    expect(paused.anchor?.fragments[0]?.end).toEqual(sessionMockInstant(600))
    expect(
      runningSessionElapsedDuration(paused.anchor!, sessionMockInstant(9_999)),
    ).toBeCloseTo(600, 5)
  })

  it('moves the phase and the fragment together, never one alone', () => {
    const paused = withSessionPaused(started, sessionMockInstant(600))
    expect(paused.phase).toBe(SessionPhase.paused)
    expect(paused.anchor?.fragments.some((f) => f.end === null)).toBe(false)
  })

  it('does nothing to an already-paused session', () => {
    const paused = withSessionPaused(started, sessionMockInstant(600))
    expect(withSessionPaused(paused, sessionMockInstant(700))).toBe(paused)
  })

  it('does nothing when there is no session at all', () => {
    expect(withSessionPaused(initialSessionState, SESSION_MOCK_NOW)).toBe(
      initialSessionState,
    )
  })
})

describe('withSessionResumed', () => {
  const paused = withSessionPaused(started, sessionMockInstant(600))

  it('appends a fresh fragment rather than reopening the closed one', () => {
    const resumed = withSessionResumed(paused, sessionMockInstant(900))
    expect(resumed.anchor?.fragments).toHaveLength(2)
    expect(resumed.anchor?.fragments[1]?.start).toEqual(sessionMockInstant(900))
  })

  it('does not count the paused gap — canon’s anchored accounting', () => {
    const resumed = withSessionResumed(paused, sessionMockInstant(900))
    expect(
      runningSessionElapsedDuration(resumed.anchor!, sessionMockInstant(1_200)),
    ).toBeCloseTo(900, 5)
  })

  it('refuses on a session that is not paused', () => {
    expect(withSessionResumed(started, sessionMockInstant(700))).toBe(started)
  })
})

// ---------------------------------------------------------------------------
// The display tick
// ---------------------------------------------------------------------------

describe('withDisplayAdvanced', () => {
  it('moves only the clock on an ordinary tick — no fragment is touched', () => {
    const ticked = withDisplayAdvanced(started, sessionMockInstant(1))
    expect(ticked.anchor).toBe(started.anchor)
    expect(ticked.now).toEqual(sessionMockInstant(1))
  })

  it('accumulates nothing — a skipped minute of ticks changes no total', () => {
    const everySecond = tickThrough(started, 1, 120)
    const oneJump = withDisplayAdvanced(started, sessionMockInstant(120))
    expect(
      runningSessionElapsedDuration(everySecond.anchor!, everySecond.now!),
    ).toBe(runningSessionElapsedDuration(oneJump.anchor!, oneJump.now!))
  })

  it('concludes the moment the countdown reaches zero', () => {
    const concluded = withDisplayAdvanced(
      started,
      sessionMockInstant(SESSION_MOCK_TARGET),
    )
    expect(concluded.phase).toBe(SessionPhase.concluded)
    expect(concluded.conclusion.kind).toBe('pending')
  })

  it('claims the conclusion exactly once across a hundred racing ticks', () => {
    let state = withDisplayAdvanced(
      started,
      sessionMockInstant(SESSION_MOCK_TARGET),
    )
    const first = state.conclusion
    for (let extra = 0; extra < 100; extra += 1) {
      state = withDisplayAdvanced(
        state,
        sessionMockInstant(SESSION_MOCK_TARGET + extra),
      )
    }
    expect(state.conclusion).toBe(first)
  })

  it('never concludes a stopwatch — there is no target to run out', () => {
    const stopwatch = withSessionStarted(
      { ...ready, mode: FocusTimerMode.stopwatch },
      SESSION_MOCK_NOW,
    )
    const ticked = withDisplayAdvanced(
      stopwatch,
      sessionMockInstant(SESSION_MOCK_TARGET * 4),
    )
    expect(ticked.phase).toBe(SessionPhase.running)
    expect(ticked.conclusion.kind).toBe('none')
  })

  it('does nothing but move the clock while paused', () => {
    const paused = withSessionPaused(started, sessionMockInstant(60))
    const ticked = withDisplayAdvanced(paused, sessionMockInstant(9_999))
    expect(ticked.phase).toBe(SessionPhase.paused)
    expect(ticked.conclusion.kind).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// The 30 % threshold and the conclusion claim
// ---------------------------------------------------------------------------

describe('withSessionAwaitingResolution', () => {
  it('parks at concluded and keeps the anchor so the pill can offer Complete', () => {
    const concluded = withSessionAwaitingResolution(
      withDisplayAdvanced(started, sessionMockInstant(1_500)),
      { now: sessionMockInstant(1_500), reason: SessionOutcomeReason.finishedEarly },
    )
    expect(concluded.phase).toBe(SessionPhase.concluded)
    expect(concluded.anchor).not.toBeNull()
  })

  it('claims a `complete` resolution — the task is not done yet', () => {
    const concluded = withSessionAwaitingResolution(started, {
      now: sessionMockInstant(1_500),
      reason: SessionOutcomeReason.countdownElapsed,
    })
    expect(
      concluded.conclusion.kind === 'pending' &&
        concluded.conclusion.outcome.resolution,
    ).toBe(PerformResolution.complete)
  })

  it('auto-presents the sheet at the conclusion screen', () => {
    const concluded = withSessionAwaitingResolution(started, {
      now: sessionMockInstant(1_500),
      reason: SessionOutcomeReason.countdownElapsed,
    })
    expect(concluded.isPresentingConclusion).toBe(true)
  })

  it('refuses a second claim while one is already in flight', () => {
    const once = withSessionAwaitingResolution(started, {
      now: sessionMockInstant(1_500),
      reason: SessionOutcomeReason.countdownElapsed,
    })
    expect(
      withSessionAwaitingResolution(once, {
        now: sessionMockInstant(1_600),
        reason: SessionOutcomeReason.finishedEarly,
      }),
    ).toBe(once)
  })

  it('reports the whole session — every fragment, closed, pauses included', () => {
    const paused = withSessionPaused(started, sessionMockInstant(600))
    const resumed = withSessionResumed(paused, sessionMockInstant(900))
    const concluded = withSessionAwaitingResolution(resumed, {
      now: sessionMockInstant(1_800),
      reason: SessionOutcomeReason.finishedEarly,
    })
    const outcome =
      concluded.conclusion.kind === 'pending' ? concluded.conclusion.outcome : null
    expect(outcome?.fragments).toHaveLength(2)
    expect(outcome?.fragments.every((fragment) => fragment.end !== null)).toBe(true)
    expect(outcome?.elapsedDuration).toBeCloseTo(1_500, 5)
  })
})

describe('withSessionAborted', () => {
  it('closes the session, clears the anchor and returns to ready', () => {
    const aborted = withSessionAborted(started, {
      now: sessionMockInstant(120),
      reason: SessionOutcomeReason.aborted,
    })
    expect(aborted.phase).toBe(SessionPhase.ready)
    expect(aborted.anchor).toBeNull()
  })

  it('still records the attempt — canon keeps aborts in the history', () => {
    const aborted = withSessionAborted(started, {
      now: sessionMockInstant(120),
      reason: SessionOutcomeReason.aborted,
    })
    expect(
      aborted.conclusion.kind === 'pending' &&
        aborted.conclusion.outcome.resolution,
    ).toBe(PerformResolution.aborted)
  })

  it('resets the target to the configured default for the next session', () => {
    const aborted = withSessionAborted(started, {
      now: sessionMockInstant(120),
      reason: SessionOutcomeReason.aborted,
    })
    expect(aborted.targetDuration).toBe(started.preferences.defaultDuration)
  })

  it('records nothing for an aborted break — a break is never a performance', () => {
    const onBreak = sessionStateMocks.onBreak
    const aborted = withSessionAborted(onBreak, {
      now: sessionMockInstant(200),
      reason: SessionOutcomeReason.aborted,
    })
    expect(aborted.conclusion.kind).toBe('none')
  })

  it('does nothing when there is no session to abort', () => {
    expect(
      withSessionAborted(initialSessionState, {
        now: SESSION_MOCK_NOW,
        reason: SessionOutcomeReason.aborted,
      }),
    ).toBe(initialSessionState)
  })
})

// ---------------------------------------------------------------------------
// Break
// ---------------------------------------------------------------------------

describe('withBreakStarted', () => {
  /**
   * Canon records the focus session the instant it concludes — *before* the
   * user is offered Break — so the claim this fixture carries is `recorded`,
   * which is the only state a real Break tap can be dispatched from.
   */
  const withBreaks = {
    ...withConclusionRecorded(
      withConclusionRecordingStarted(sessionStateMocks.concluded),
      {
        date: SESSION_MOCK_NOW,
        duration: SESSION_MOCK_TARGET,
        notes: null,
        resolution: PerformResolution.complete,
        sessionFragments: [],
        rewardPoints: 9,
        followUpNotes: null,
        completedAt: null,
        wasCompletedInSession: true,
      },
    ),
    availability: sessionAvailabilityMocks.everythingOn,
  }

  it('runs a fresh countdown at the configured break length', () => {
    const onBreak = withBreakStarted(withBreaks, sessionMockInstant(1_500))
    expect(onBreak.phase).toBe(SessionPhase.break)
    expect(onBreak.targetDuration).toBe(withBreaks.preferences.defaultBreakDuration)
  })

  it('starts from an empty fragment list, never reusing the focus fragments', () => {
    const onBreak = withBreakStarted(withBreaks, sessionMockInstant(1_500))
    expect(onBreak.anchor?.fragments).toHaveLength(1)
    expect(onBreak.anchor?.fragments[0]?.start).toEqual(
      sessionMockInstant(1_500),
    )
  })

  it('is impossible while the sessionBreak flag is off — the statusQuo default', () => {
    expect(
      withBreakStarted(sessionStateMocks.concluded, sessionMockInstant(1_500)),
    ).toBe(sessionStateMocks.concluded)
  })

  it('gives the break a clean claim so its own cue can fire once', () => {
    expect(
      withBreakStarted(withBreaks, sessionMockInstant(1_500)).conclusion.kind,
    ).toBe('none')
  })

  it('refuses while the focus session’s performance is still unrecorded', () => {
    // Starting here would clear the pending claim and lose the record.
    const unrecorded = {
      ...sessionStateMocks.concluded,
      availability: sessionAvailabilityMocks.everythingOn,
    }
    expect(withBreakStarted(unrecorded, sessionMockInstant(1_500))).toBe(
      unrecorded,
    )
  })
})

describe('withBreakElapsed', () => {
  const onBreak = sessionStateMocks.onBreak

  it('returns to ready with the anchor cleared when the break runs out', () => {
    const done = withBreakElapsed(onBreak, sessionMockInstant(1_000))
    expect(done.phase).toBe(SessionPhase.ready)
    expect(done.anchor).toBeNull()
  })

  it('claims the break cue exactly once, so it cannot double-play', () => {
    const done = withBreakElapsed(onBreak, sessionMockInstant(1_000))
    expect(done.conclusion.kind).toBe('breakElapsed')
    expect(withBreakElapsed(done, sessionMockInstant(1_001))).toBe(done)
  })

  it('resets the target back to the focus default', () => {
    const done = withBreakElapsed(onBreak, sessionMockInstant(1_000))
    expect(done.targetDuration).toBe(onBreak.preferences.defaultDuration)
  })

  it('records no performance — a break is never one', () => {
    const done = withBreakElapsed(onBreak, sessionMockInstant(1_000))
    expect(done.conclusion.kind).not.toBe('pending')
  })
})

describe('withBreakFinished / withBreakEnded', () => {
  it('releases the break claim once the cue has played', () => {
    const done = withBreakElapsed(sessionStateMocks.onBreak, sessionMockInstant(1_000))
    expect(withBreakFinished(done).conclusion.kind).toBe('breakFinished')
  })

  it('ends a break early with no cue and no claim at all', () => {
    const ended = withBreakEnded(sessionStateMocks.onBreak, sessionMockInstant(200))
    expect(ended.phase).toBe(SessionPhase.ready)
    expect(ended.conclusion.kind).toBe('none')
  })

  it('does nothing when no break is running', () => {
    expect(withBreakEnded(sessionStateMocks.running, sessionMockInstant(200))).toBe(
      sessionStateMocks.running,
    )
  })
})

// ---------------------------------------------------------------------------
// The recording claim
// ---------------------------------------------------------------------------

describe('the conclusion claim’s remaining moves', () => {
  const pending = sessionStateMocks.concluded

  it('moves pending → recording exactly once', () => {
    const recording = withConclusionRecordingStarted(pending)
    expect(recording.conclusion.kind).toBe('recording')
    expect(withConclusionRecordingStarted(recording)).toBe(recording)
  })

  it('refuses to start recording from any other claim state', () => {
    expect(withConclusionRecordingStarted(sessionStateMocks.running)).toBe(
      sessionStateMocks.running,
    )
  })

  it('lands the recorded row and grows the tomato row', () => {
    const recording = withConclusionRecordingStarted(pending)
    const performance = {
      date: SESSION_MOCK_NOW,
      duration: 1_500,
      notes: null,
      resolution: PerformResolution.complete,
      sessionFragments: [],
      rewardPoints: 9,
      followUpNotes: null,
      completedAt: null,
      wasCompletedInSession: true,
    }
    const recorded = withConclusionRecorded(recording, performance)
    expect(recorded.conclusion.kind).toBe('recorded')
    expect(recorded.completedSessionsCount).toBe(
      pending.completedSessionsCount + 1,
    )
  })

  it('never grows the tomato row for an aborted attempt', () => {
    const recording = withConclusionRecordingStarted(
      withSessionAborted(started, {
        now: sessionMockInstant(60),
        reason: SessionOutcomeReason.belowThreshold,
      }),
    )
    const recorded = withConclusionRecorded(recording, {
      date: SESSION_MOCK_NOW,
      duration: 60,
      notes: null,
      resolution: PerformResolution.aborted,
      sessionFragments: [],
      rewardPoints: 0,
      followUpNotes: null,
      completedAt: null,
      wasCompletedInSession: true,
    })
    expect(recorded.completedSessionsCount).toBe(started.completedSessionsCount)
  })

  it('releases a failed recording back to pending so it can be retried', () => {
    const recording = withConclusionRecordingStarted(pending)
    const failed = withConclusionRecordingFailed(
      recording,
      SessionExceptions.performanceRecordFailed('disk full'),
    )
    expect(failed.conclusion.kind).toBe('pending')
    expect(failed.load.kind).toBe('failed')
  })
})

// ---------------------------------------------------------------------------
// Conclusion choices and setup
// ---------------------------------------------------------------------------

describe('withConclusionDismissed / withSessionClosed', () => {
  it('leaves the pill up with its Mark-complete affordance on dismiss', () => {
    const dismissed = withConclusionDismissed(sessionStateMocks.concluded)
    expect(dismissed.isPresentingConclusion).toBe(false)
    expect(dismissed.phase).toBe(SessionPhase.concluded)
  })

  it('clears the anchor and returns to ready when a choice is made', () => {
    const closed = withSessionClosed(
      sessionStateMocks.concluded,
      sessionMockInstant(1_600),
    )
    expect(closed.phase).toBe(SessionPhase.ready)
    expect(closed.anchor).toBeNull()
  })

  it('keeps the recorded claim, so the choice cannot record a duplicate', () => {
    const closed = withSessionClosed(
      sessionStateMocks.concluded,
      sessionMockInstant(1_600),
    )
    expect(closed.conclusion.kind).toBe('pending')
  })
})

describe('withModeSelected / withTargetDurationSelected', () => {
  it('accepts a mode change before the session starts', () => {
    expect(withModeSelected(ready, FocusTimerMode.stopwatch).mode).toBe(
      FocusTimerMode.stopwatch,
    )
  })

  it('refuses a mode change mid-session', () => {
    expect(
      withModeSelected(sessionStateMocks.running, FocusTimerMode.stopwatch),
    ).toBe(sessionStateMocks.running)
  })

  it('accepts a duration before the session starts', () => {
    expect(withTargetDurationSelected(ready, 900).targetDuration).toBe(900)
  })

  it('refuses a duration change mid-session — it would move the finish line', () => {
    expect(withTargetDurationSelected(sessionStateMocks.running, 900)).toBe(
      sessionStateMocks.running,
    )
  })

  it('refuses a non-positive duration outright', () => {
    expect(withTargetDurationSelected(ready, 0)).toBe(ready)
  })
})

// ---------------------------------------------------------------------------
// Identity editing
// ---------------------------------------------------------------------------

describe('identity editing', () => {
  it('prefills the editor with the current title', () => {
    const editing = withTitleEditingStarted(ready)
    expect(editing.isEditingTitle).toBe(true)
    expect(editing.editedTitle).toBe(sessionIdentityMocks.slides.title)
  })

  it('tracks the draft without touching the identity', () => {
    const typed = withEditedTitleChanged(withTitleEditingStarted(ready), 'Draft')
    expect(typed.editedTitle).toBe('Draft')
    expect(typed.identity?.title).toBe(sessionIdentityMocks.slides.title)
  })

  it('drops the draft on cancel', () => {
    const cancelled = withTitleEditingCancelled(
      withEditedTitleChanged(withTitleEditingStarted(ready), 'Draft'),
    )
    expect(cancelled.isEditingTitle).toBe(false)
    expect(cancelled.editedTitle).toBe('')
  })

  it('refuses the symbol picker during a break — there is no endeavor to re-glyph', () => {
    expect(withSymbolPickerPresented(sessionStateMocks.onBreak)).toBe(
      sessionStateMocks.onBreak,
    )
  })

  it('closes the picker without touching the identity', () => {
    const opened = withSymbolPickerPresented(ready)
    const closed = withSymbolPickerDismissed(opened)
    expect(closed.isEditingSymbol).toBe(false)
    expect(closed.identity).toBe(ready.identity)
  })
})

describe('withIdentityApplied', () => {
  const renamed = { ...sessionIdentityMocks.slides, title: '💻 Prepare slides', symbol: '💻' }

  it('installs the new identity and closes both editors', () => {
    const next = withIdentityApplied(withTitleEditingStarted(ready), renamed)
    expect(next.identity).toBe(renamed)
    expect(next.isEditingTitle).toBe(false)
    expect(next.isEditingSymbol).toBe(false)
  })

  it('mirrors the change into a live anchor so the pill updates immediately', () => {
    const next = withIdentityApplied(sessionStateMocks.running, renamed)
    expect(next.anchor?.endeavor.title).toBe('💻 Prepare slides')
    expect(next.anchor?.endeavor.symbol).toBe('💻')
  })

  it('leaves an anchor belonging to a different endeavor untouched', () => {
    const other = { ...renamed, endeavorId: 'someone-else' }
    const next = withIdentityApplied(sessionStateMocks.running, other)
    expect(next.anchor).toBe(sessionStateMocks.running.anchor)
  })
})

describe('withCompletedSessionsCount', () => {
  it('installs the count storage answered with', () => {
    expect(withCompletedSessionsCount(ready, 11).completedSessionsCount).toBe(11)
  })

  it('accepts zero — the row is simply hidden', () => {
    expect(withCompletedSessionsCount(ready, 0).completedSessionsCount).toBe(0)
  })

  it('touches nothing else', () => {
    const next = withCompletedSessionsCount(sessionStateMocks.running, 4)
    expect(next.phase).toBe(SessionPhase.running)
    expect(next.anchor).toBe(sessionStateMocks.running.anchor)
  })
})
