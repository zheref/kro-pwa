/**
 * The slice's `State` shape and its defaults.
 *
 * This suite exists mostly to pin the **second routed legacy defect**. Legacy
 * `useSession.ts` built its opening config as
 * `new SessionConfig(undefined, secondsFromMinutes(25))` — duration
 * `undefined`, so the timer read zero until a bootstrap effect replaced it, and
 * 25 minutes stored as the **rest**, inconsistent with the 25/5 default the
 * same file installed moments later. The assertions below are the shape of
 * that bug's absence: a defined, positive focus duration, taken from #8's
 * Pomodoro preset, and never the rest value.
 */
import { FocusTimerMode, defaultPomodoroConfig, minutesInSeconds } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  POMODORO_FOCUS_DURATION,
  POMODORO_REST_DURATION,
  defaultSessionAvailability,
  defaultSessionPreferences,
  initialSessionState,
} from '../SessionState'
import { SessionPhase } from '../SessionVocabulary'

describe('initialSessionState', () => {
  it('opens with a defined, positive target — never `undefined`', () => {
    expect(Number.isFinite(initialSessionState.targetDuration)).toBe(true)
    expect(initialSessionState.targetDuration).toBeGreaterThan(0)
  })

  it('opens at the Pomodoro focus length, not at its rest length', () => {
    expect(initialSessionState.targetDuration).toBe(POMODORO_FOCUS_DURATION)
    expect(initialSessionState.targetDuration).not.toBe(POMODORO_REST_DURATION)
  })

  it('opens as a countdown in ready, with no anchor and no claim', () => {
    expect(initialSessionState.mode).toBe(FocusTimerMode.countdown)
    expect(initialSessionState.phase).toBe(SessionPhase.ready)
    expect(initialSessionState.anchor).toBeNull()
    expect(initialSessionState.conclusion).toEqual({ kind: 'none' })
  })

  it('knows what time it is only once a tick or a hydration says so', () => {
    expect(initialSessionState.now).toBeNull()
  })

  it('carries one lifecycle field, idle — never a parallel loading flag', () => {
    expect(initialSessionState.load).toEqual({ kind: 'idle' })
  })
})

describe('the Pomodoro constants', () => {
  it('read the focus half from #8’s preset rather than restating 25', () => {
    expect(POMODORO_FOCUS_DURATION).toBe(defaultPomodoroConfig.duration)
    expect(POMODORO_FOCUS_DURATION).toBe(minutesInSeconds(25))
  })

  it('read the rest half from the same preset — 5 minutes', () => {
    expect(POMODORO_REST_DURATION).toBe(minutesInSeconds(5))
  })

  it('keep the two apart, which the legacy constructor call did not', () => {
    expect(POMODORO_FOCUS_DURATION).not.toBe(POMODORO_REST_DURATION)
  })
})

describe('defaultSessionPreferences', () => {
  it('matches #11’s declared defaults, converted to seconds', () => {
    expect(defaultSessionPreferences.defaultDuration).toBe(minutesInSeconds(20))
    expect(defaultSessionPreferences.defaultBreakDuration).toBe(
      minutesInSeconds(5),
    )
  })

  it('leaves auto-start-break off, as canon ships it', () => {
    expect(defaultSessionPreferences.autoStartBreak).toBe(false)
  })

  it('keeps the screen awake and the end-of-session sound on', () => {
    expect(defaultSessionPreferences.keepScreenAwake).toBe(true)
    expect(defaultSessionPreferences.soundOnEnd).toBe(true)
  })
})

describe('defaultSessionAvailability', () => {
  it('is the statusQuo baseline — every session flag off', () => {
    expect(defaultSessionAvailability).toEqual({
      isStopwatchAvailable: false,
      areBreaksAvailable: false,
      isDurationLearningEnabled: false,
    })
  })

  it('is what a cold start honestly knows before the gates resolve', () => {
    expect(initialSessionState.availability).toBe(defaultSessionAvailability)
  })

  it('never offers a capability the shipped flag set disables', () => {
    expect(
      Object.values(defaultSessionAvailability).some((value) => value),
    ).toBe(false)
  })
})
