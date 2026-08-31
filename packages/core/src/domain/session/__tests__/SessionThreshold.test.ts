import { describe, expect, it } from 'vitest'
import { PerformResolution } from '../../endeavor/Perform'
import { minutesInSeconds } from '../../shared/TimeInterval'
import { FocusTimerMode } from '../FocusTimerMode'
import {
  SESSION_ABORT_THRESHOLD_RATIO,
  meetsPerformanceThreshold,
  resolveFinishEarlyOutcome,
  sessionRecordingThreshold,
} from '../SessionThreshold'

/** A 25-minute Pomodoro: the threshold sits at 450 s (7 min 30 s). */
const TARGET = minutesInSeconds(25)
const THRESHOLD = 450

const countdownAfter = (elapsedDuration: number) => ({
  mode: FocusTimerMode.countdown,
  elapsedDuration,
  targetDuration: TARGET,
})

describe('the threshold itself', () => {
  it('is canon’s 30 % of the target', () => {
    expect(SESSION_ABORT_THRESHOLD_RATIO).toBe(0.3)
    expect(sessionRecordingThreshold(TARGET)).toBe(THRESHOLD)
  })

  it('is zero for a zero target, so any elapsed time clears it', () => {
    expect(sessionRecordingThreshold(0)).toBe(0)
  })

  it('scales with the target — a 50-minute session needs 15 minutes', () => {
    expect(sessionRecordingThreshold(minutesInSeconds(50))).toBe(
      minutesInSeconds(15),
    )
  })
})

describe('the boundary — canon’s comparison is `elapsed < target * 0.3`', () => {
  it('records at *exactly* 30 %, because the strict `<` excludes equality', () => {
    expect(meetsPerformanceThreshold(countdownAfter(THRESHOLD))).toBe(true)
  })

  it('does not record one second under 30 %', () => {
    expect(meetsPerformanceThreshold(countdownAfter(THRESHOLD - 1))).toBe(false)
  })

  it('does not record a millisecond under 30 % either', () => {
    expect(meetsPerformanceThreshold(countdownAfter(THRESHOLD - 0.001))).toBe(
      false,
    )
  })

  it('records a millisecond over 30 %', () => {
    expect(meetsPerformanceThreshold(countdownAfter(THRESHOLD + 0.001))).toBe(
      true,
    )
  })

  it('records comfortably above the bar', () => {
    expect(
      meetsPerformanceThreshold(countdownAfter(minutesInSeconds(20))),
    ).toBe(true)
  })

  it('does not record an instant abandon at zero elapsed', () => {
    expect(meetsPerformanceThreshold(countdownAfter(0))).toBe(false)
  })
})

describe('stopwatch mode', () => {
  it('always clears the bar — canon guards the threshold with `mode == .countdown`', () => {
    expect(
      meetsPerformanceThreshold({
        mode: FocusTimerMode.stopwatch,
        elapsedDuration: 1,
        targetDuration: TARGET,
      }),
    ).toBe(true)
  })

  it('clears it even at zero elapsed, since there is no target to fall short of', () => {
    expect(
      meetsPerformanceThreshold({
        mode: FocusTimerMode.stopwatch,
        elapsedDuration: 0,
        targetDuration: TARGET,
      }),
    ).toBe(true)
  })

  it('clears it with the 3-hour default target Open Space carries', () => {
    expect(
      meetsPerformanceThreshold({
        mode: FocusTimerMode.stopwatch,
        elapsedDuration: 120,
        targetDuration: 10_800,
      }),
    ).toBe(true)
  })
})

describe('what a finish-early resolves to', () => {
  it('records an aborted attempt when the user quit after 4 of 25 minutes', () => {
    expect(
      resolveFinishEarlyOutcome(countdownAfter(minutesInSeconds(4))),
    ).toEqual({ kind: 'belowThreshold', resolution: PerformResolution.aborted })
  })

  it('offers Complete / Start New / Break once 15 of 25 minutes are in', () => {
    expect(
      resolveFinishEarlyOutcome(countdownAfter(minutesInSeconds(15))),
    ).toEqual({
      kind: 'awaitingResolution',
      resolution: PerformResolution.complete,
    })
  })

  it('offers the choice at exactly the boundary, matching the predicate', () => {
    expect(resolveFinishEarlyOutcome(countdownAfter(THRESHOLD)).kind).toBe(
      'awaitingResolution',
    )
    expect(resolveFinishEarlyOutcome(countdownAfter(THRESHOLD - 1)).kind).toBe(
      'belowThreshold',
    )
  })

  it('offers the choice for any stopwatch finish, however short', () => {
    expect(
      resolveFinishEarlyOutcome({
        mode: FocusTimerMode.stopwatch,
        elapsedDuration: 5,
        targetDuration: TARGET,
      }).kind,
    ).toBe('awaitingResolution')
  })

  it('resolves the above-threshold branch as `complete`, not `finished`', () => {
    // The task has not been marked done at this point — `finished` is what the
    // subsequent "Complete Task" choice produces. Getting these two backwards
    // silently turns a 30 % award into 100 %.
    expect(
      resolveFinishEarlyOutcome(countdownAfter(minutesInSeconds(20)))
        .resolution,
    ).toBe(PerformResolution.complete)
  })
})
