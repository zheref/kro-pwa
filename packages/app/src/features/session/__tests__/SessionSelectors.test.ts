/**
 * The session Selectors (`RC-55`) — run against a hand-built root state, never
 * a live store.
 *
 * The load-bearing group is the derived time: nothing in `SessionState` stores
 * an elapsed figure, so every number below is recomputed from the anchored
 * fragments against `now`. A test that could pass with a stored counter would
 * not be testing the anchoring at all, so each one moves `now` rather than a
 * count.
 */
import { FocusTimerMode, minutesInSeconds } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialMainState } from '../../main/MainFeature'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialPlanState } from '../../plan/PlanState'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialTriageState } from '../../triage/TriageFeature'
import { SessionExceptions } from '../SessionException'
import {
  SESSION_MOCK_TARGET,
  sessionMockInstant,
  sessionStateMocks,
} from '../SessionMocks'
import {
  SESSION_DOCUMENT_TITLE_SUFFIX,
  SESSION_TOMATO_DISPLAY_CAP,
  formatSessionClock,
  selectAreBreaksAvailable,
  selectIsPresentingConclusion,
  selectIsSessionActive,
  selectIsSessionInFlight,
  selectIsSessionLoading,
  selectIsSessionPillVisible,
  selectIsStopwatchAvailable,
  selectLastAwardedPoints,
  selectPendingSessionOutcome,
  selectSessionCalendarLog,
  selectSessionClockLabel,
  selectSessionCueSchedule,
  selectSessionDocumentTitle,
  selectSessionElapsedDuration,
  selectSessionException,
  selectSessionPhase,
  selectSessionPillState,
  selectSessionProgress,
  selectSessionRecordingThreshold,
  selectSessionRemainingDuration,
  selectSessionStatusLabel,
  selectShouldShowTomatoRow,
  selectTomatoCount,
  selectTomatoRow,
  selectWouldFinishEarlyRecord,
} from '../SessionSelectors'
import type { SessionState } from '../SessionState'
import {
  withConclusionRecorded,
  withConclusionRecordingStarted,
  withDisplayAdvanced,
  withException,
} from '../SessionShifters'
import {
  SessionPhase,
  SessionPillAffordance,
  SessionTint,
} from '../SessionVocabulary'
import { initialSettingsState } from '../../settings/SettingsState'
import { initialThirstState } from '../../thirst/ThirstFeature'

/** Selectors run against a hand-built root state, never a live store. */
const rootWith = (session: SessionState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts nothing about the other features.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session,
  auth: initialAuthState,
  main: initialMainState,
  settings: initialSettingsState,
  thirst: initialThirstState,
})

const running = rootWith(sessionStateMocks.running)
const paused = rootWith(sessionStateMocks.paused)
const concluded = rootWith(sessionStateMocks.concluded)
const onBreak = rootWith(sessionStateMocks.onBreak)
const ready = rootWith(sessionStateMocks.ready)

describe('selectIsSessionLoading / selectSessionException', () => {
  it('is loading while the first anchor read is in flight', () => {
    expect(selectIsSessionLoading(rootWith(sessionStateMocks.loading))).toBe(
      true,
    )
  })

  it('is not loading once the session is under way', () => {
    expect(selectIsSessionLoading(running)).toBe(false)
  })

  it('surfaces a failed anchor write without stopping the session', () => {
    const failed = rootWith(sessionStateMocks.failedWriteWhileRunning)
    expect(selectSessionException(failed)?.kind).toBe('anchorWriteFailed')
    expect(selectSessionPhase(failed)).toBe(SessionPhase.running)
  })

  it('reports no exception on a healthy session', () => {
    expect(selectSessionException(running)).toBeNull()
  })
})

describe('phase selectors', () => {
  it('blocks interactive dismissal while running, paused or on a break', () => {
    expect(selectIsSessionInFlight(running)).toBe(true)
    expect(selectIsSessionInFlight(paused)).toBe(true)
    expect(selectIsSessionInFlight(onBreak)).toBe(true)
  })

  it('allows dismissal in ready and at the conclusion screen', () => {
    expect(selectIsSessionInFlight(ready)).toBe(false)
    expect(selectIsSessionInFlight(concluded)).toBe(false)
  })

  it('reports time as advancing only while running or on a break', () => {
    expect(selectIsSessionActive(running)).toBe(true)
    expect(selectIsSessionActive(onBreak)).toBe(true)
    expect(selectIsSessionActive(paused)).toBe(false)
  })

  it('labels the phase the way the sheet renders it', () => {
    expect(selectSessionStatusLabel(running)).toBe('FOCUSED')
    expect(selectSessionStatusLabel(paused)).toBe('PAUSED')
    expect(selectSessionStatusLabel(concluded)).toBe('COMPLETED')
  })
})

describe('derived time', () => {
  it('derives elapsed from the fragments, not from a stored counter', () => {
    expect(selectSessionElapsedDuration(running)).toBeCloseTo(600, 5)
  })

  it('keeps a paused figure frozen however far the clock moves', () => {
    const later = withDisplayAdvanced(
      sessionStateMocks.paused,
      sessionMockInstant(99_999),
    )
    expect(selectSessionElapsedDuration(rootWith(later))).toBeCloseTo(600, 5)
  })

  it('counts remaining down from the target and clamps at zero', () => {
    expect(selectSessionRemainingDuration(running)).toBeCloseTo(
      SESSION_MOCK_TARGET - 600,
      5,
    )
    expect(selectSessionRemainingDuration(concluded)).toBe(0)
  })

  it('reports the whole target as remaining before a session starts', () => {
    expect(selectSessionRemainingDuration(ready)).toBe(SESSION_MOCK_TARGET)
  })

  it('reports progress as a clamped fraction of the target', () => {
    expect(selectSessionProgress(running)).toBeCloseTo(
      600 / SESSION_MOCK_TARGET,
      5,
    )
    expect(selectSessionProgress(concluded)).toBe(1)
  })

  it('reports zero progress for a stopwatch, which has no target', () => {
    const stopwatch = rootWith({
      ...sessionStateMocks.running,
      mode: FocusTimerMode.stopwatch,
    })
    expect(selectSessionProgress(stopwatch)).toBe(0)
  })
})

describe('the 30 % recording threshold, surfaced', () => {
  it('is 30 % of the target for a countdown', () => {
    expect(selectSessionRecordingThreshold(running)).toBeCloseTo(
      SESSION_MOCK_TARGET * 0.3,
      5,
    )
  })

  it('does not apply to a stopwatch', () => {
    const stopwatch = rootWith({
      ...sessionStateMocks.running,
      mode: FocusTimerMode.stopwatch,
    })
    expect(selectSessionRecordingThreshold(stopwatch)).toBeNull()
  })

  it('says a ten-minute-in finish would record — it is past 7:30', () => {
    expect(selectWouldFinishEarlyRecord(running)).toBe(true)
  })

  it('says a one-minute-in finish would not', () => {
    const early = withDisplayAdvanced(
      sessionStateMocks.ready,
      sessionMockInstant(60),
    )
    expect(selectWouldFinishEarlyRecord(rootWith(early))).toBe(false)
  })
})

describe('selectSessionCueSchedule', () => {
  it('schedules one terminal chime for a focus countdown', () => {
    expect(selectSessionCueSchedule(running)).toEqual([
      { at: SESSION_MOCK_TARGET, role: 'sessionComplete' },
    ])
  })

  it('schedules the break chime while a break runs', () => {
    expect(selectSessionCueSchedule(onBreak)[0]?.role).toBe('breakComplete')
  })

  it('schedules nothing for a stopwatch', () => {
    const stopwatch = rootWith({
      ...sessionStateMocks.running,
      mode: FocusTimerMode.stopwatch,
    })
    expect(selectSessionCueSchedule(stopwatch)).toEqual([])
  })
})

describe('formatSessionClock', () => {
  it('renders MM:SS below an hour', () => {
    expect(formatSessionClock(750)).toBe('12:30')
  })

  it('renders H:MM:SS past one', () => {
    expect(formatSessionClock(3_725)).toBe('1:02:05')
  })

  it('clamps a negative or non-finite value to zero rather than rendering junk', () => {
    expect(formatSessionClock(-5)).toBe('00:00')
    expect(formatSessionClock(Number.NaN)).toBe('00:00')
  })
})

describe('selectSessionClockLabel', () => {
  it('shows remaining time for a countdown', () => {
    expect(selectSessionClockLabel(running)).toBe('15:00')
  })

  it('shows elapsed time for a stopwatch instead', () => {
    const stopwatch = rootWith({
      ...sessionStateMocks.running,
      mode: FocusTimerMode.stopwatch,
    })
    expect(selectSessionClockLabel(stopwatch)).toBe('10:00')
  })

  it('reads 00:00 at the conclusion screen', () => {
    expect(selectSessionClockLabel(concluded)).toBe('00:00')
  })
})

describe('selectSessionDocumentTitle', () => {
  it('publishes the countdown to the tab while the session advances', () => {
    expect(selectSessionDocumentTitle(running)).toBe(
      `15:00 — ${SESSION_DOCUMENT_TITLE_SUFFIX}`,
    )
  })

  it('publishes the break countdown too', () => {
    expect(selectSessionDocumentTitle(onBreak)).toContain(
      SESSION_DOCUMENT_TITLE_SUFFIX,
    )
  })

  it('releases the tab while paused — a frozen clock reads as a stall', () => {
    expect(selectSessionDocumentTitle(paused)).toBeNull()
  })

  it('releases the tab in ready and at the conclusion screen', () => {
    expect(selectSessionDocumentTitle(ready)).toBeNull()
    expect(selectSessionDocumentTitle(concluded)).toBeNull()
  })
})

describe('selectSessionPillState', () => {
  it('shows the endeavor title, the live time and the pause glyph while running', () => {
    const pill = selectSessionPillState(running)
    expect(pill.isVisible).toBe(true)
    expect(pill.title).toBe('📊 Prepare slides')
    expect(pill.clockLabel).toBe('15:00')
    expect(pill.affordance).toBe(SessionPillAffordance.pause)
    expect(pill.tint).toBe(SessionTint.focus)
  })

  it('says "Break" in place of the endeavor title during a break', () => {
    const pill = selectSessionPillState(onBreak)
    expect(pill.title).toBe('Break')
    expect(pill.tint).toBe(SessionTint.break)
  })

  it('drops its tint and offers resume while paused', () => {
    const pill = selectSessionPillState(paused)
    expect(pill.tint).toBe(SessionTint.chrome)
    expect(pill.affordance).toBe(SessionPillAffordance.resume)
  })

  it('swaps the toggle for the Mark-complete checkmark once concluded', () => {
    expect(selectSessionPillState(concluded).affordance).toBe(
      SessionPillAffordance.markComplete,
    )
  })

  it('is hidden entirely in ready', () => {
    expect(selectIsSessionPillVisible(ready)).toBe(false)
  })
})

describe('conclusion selectors', () => {
  it('exposes the outcome awaiting recording', () => {
    expect(selectPendingSessionOutcome(concluded)?.targetDuration).toBe(
      SESSION_MOCK_TARGET,
    )
  })

  it('exposes nothing while a session is merely running', () => {
    expect(selectPendingSessionOutcome(running)).toBeNull()
  })

  it('auto-presents the conclusion screen when the countdown ends', () => {
    expect(selectIsPresentingConclusion(concluded)).toBe(true)
  })

  it('reports the points the recorded session awarded', () => {
    const recorded = withConclusionRecorded(
      withConclusionRecordingStarted(sessionStateMocks.concluded),
      {
        date: sessionMockInstant(0),
        duration: SESSION_MOCK_TARGET,
        notes: null,
        resolution: 'complete',
        sessionFragments: [],
        rewardPoints: 9,
        followUpNotes: null,
        completedAt: null,
        wasCompletedInSession: true,
      },
    )
    expect(selectLastAwardedPoints(rootWith(recorded))).toBe(9)
  })

  it('reports no points before the recording lands', () => {
    expect(selectLastAwardedPoints(concluded)).toBeNull()
  })
})

describe('selectSessionCalendarLog', () => {
  it('derives the log inputs for a concluded session', () => {
    const log = selectSessionCalendarLog(concluded, 'Europe/Madrid')
    expect(log?.intention).toBe('📊 Prepare slides')
    expect(log?.timeZone).toBe('Europe/Madrid')
  })

  it('spans the whole session — the first start to the last end', () => {
    const log = selectSessionCalendarLog(concluded, 'UTC')
    expect(log!.end.getTime() - log!.start.getTime()).toBe(
      SESSION_MOCK_TARGET * 1_000,
    )
  })

  it('derives nothing while a session is still running', () => {
    expect(selectSessionCalendarLog(running, 'UTC')).toBeNull()
  })
})

describe('availability selectors', () => {
  it('hides the mode toggle at statusQuo, where the stopwatch flag is off', () => {
    expect(selectIsStopwatchAvailable(running)).toBe(false)
  })

  it('hides Break at statusQuo, where the break flag is off', () => {
    expect(selectAreBreaksAvailable(running)).toBe(false)
  })

  it('offers both once their flags are on', () => {
    const enabled = rootWith(sessionStateMocks.readyEverythingOn)
    expect(selectIsStopwatchAvailable(enabled)).toBe(true)
    expect(selectAreBreaksAvailable(enabled)).toBe(true)
  })
})

describe('the tomato row', () => {
  it('counts the endeavor’s completed sessions', () => {
    expect(selectTomatoCount(running)).toBe(3)
  })

  it('hides the row entirely at zero', () => {
    const none = rootWith({
      ...sessionStateMocks.ready,
      completedSessionsCount: 0,
    })
    expect(selectShouldShowTomatoRow(none)).toBe(false)
  })

  it('renders a glyph per session below the cap', () => {
    expect(selectTomatoRow(running)).toEqual({ glyphs: 3, overflowLabel: null })
  })

  it('caps the glyphs and adds a × N label past ten', () => {
    const many = rootWith({
      ...sessionStateMocks.ready,
      completedSessionsCount: 42,
    })
    expect(selectTomatoRow(many)).toEqual({
      glyphs: SESSION_TOMATO_DISPLAY_CAP,
      overflowLabel: '× 42',
    })
  })
})

describe('a session whose anchor write failed', () => {
  it('still reports a correct, advancing clock', () => {
    const failed = withException(
      withDisplayAdvanced(sessionStateMocks.running, sessionMockInstant(900)),
      SessionExceptions.anchorWriteFailed('quota exceeded'),
    )
    expect(selectSessionElapsedDuration(rootWith(failed))).toBeCloseTo(900, 5)
  })

  it('still shows the pill', () => {
    expect(
      selectIsSessionPillVisible(
        rootWith(sessionStateMocks.failedWriteWhileRunning),
      ),
    ).toBe(true)
  })

  it('reports the failure alongside, not instead of, the running session', () => {
    const root = rootWith(sessionStateMocks.failedWriteWhileRunning)
    expect(selectSessionException(root)).not.toBeNull()
    expect(selectIsSessionActive(root)).toBe(true)
  })
})

describe('a fresh, never-started session', () => {
  it('reports zero elapsed rather than NaN', () => {
    expect(selectSessionElapsedDuration(rootWith(sessionStateMocks.idle))).toBe(
      0,
    )
  })

  it('reports the default target as remaining', () => {
    expect(
      selectSessionRemainingDuration(rootWith(sessionStateMocks.idle)),
    ).toBe(minutesInSeconds(25))
  })

  it('publishes no document title', () => {
    expect(
      selectSessionDocumentTitle(rootWith(sessionStateMocks.idle)),
    ).toBeNull()
  })
})
