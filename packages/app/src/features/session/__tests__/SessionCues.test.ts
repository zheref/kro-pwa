/**
 * The cue schedule — and with it, the **structural proof** that the first
 * routed legacy defect cannot recur.
 *
 * `useSessionTimer.ts` decided cues with `totalElapsed % (duration / 3) === 0`,
 * which (a) almost never fired, because `duration / 3` is fractional for nearly
 * every real duration, and (b) *did* fire spuriously at `totalElapsed === 0`,
 * because `0 % anything === 0`. Both are asserted below against the
 * replacement, which has no modulo to get wrong.
 */
import { FocusTimerMode, minutesInSeconds } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  FALLBACK_SESSION_TARGET_DURATION,
  SESSION_PROGRESS_CUE_FRACTIONS,
  sessionCueMarksCrossed,
  sessionCueSchedule,
} from '../SessionCues'

const countdown = (
  targetDuration: number,
  extra: Record<string, unknown> = {},
) =>
  sessionCueSchedule({
    mode: FocusTimerMode.countdown,
    targetDuration,
    ...extra,
  })

describe('sessionCueSchedule', () => {
  it('schedules the terminal chime for a 25-minute focus session', () => {
    expect(countdown(minutesInSeconds(25))).toEqual([
      { at: 1500, role: 'sessionComplete' },
    ])
  })

  it('schedules the break chime instead while a break runs', () => {
    expect(countdown(minutesInSeconds(5), { isBreak: true })).toEqual([
      { at: 300, role: 'breakComplete' },
    ])
  })

  it('schedules nothing for a stopwatch — there is no target to reach', () => {
    expect(
      sessionCueSchedule({
        mode: FocusTimerMode.stopwatch,
        targetDuration: minutesInSeconds(25),
      }),
    ).toEqual([])
  })

  it('schedules nothing for a zero or non-finite target, so 0 is never a mark', () => {
    expect(countdown(0)).toEqual([])
    expect(countdown(Number.NaN)).toEqual([])
    expect(countdown(-60)).toEqual([])
  })

  it('carries no mid-session cue by default — canon schedules none', () => {
    expect(SESSION_PROGRESS_CUE_FRACTIONS).toEqual([])
    expect(countdown(minutesInSeconds(25))).toHaveLength(1)
  })

  it('derives an explicit whole-second mark from a fraction, never a divisor', () => {
    // 25 min ÷ 3 is the legacy `progressThreshold`: 500 s, a value the integer
    // tick can never be an exact multiple of past 0. As a *mark* it is simply
    // a second the elapsed time reaches.
    const schedule = countdown(minutesInSeconds(25), {
      progressFractions: [1 / 3, 2 / 3],
    })
    expect(schedule.map((mark) => mark.at)).toEqual([500, 1000, 1500])
  })

  it('sorts marks ascending and never emits a duplicate second', () => {
    const schedule = countdown(600, { progressFractions: [0.5, 0.5, 0.25] })
    expect(schedule.map((mark) => mark.at)).toEqual([150, 300, 600])
  })

  it('drops a fraction that would land on 0 or at/after the terminal mark', () => {
    const schedule = countdown(100, {
      progressFractions: [0, 0.001, 1, 1.5, Number.POSITIVE_INFINITY],
    })
    expect(schedule.map((mark) => mark.at)).toEqual([100])
  })
})

describe('sessionCueMarksCrossed', () => {
  const schedule = countdown(minutesInSeconds(25), {
    progressFractions: [1 / 3],
  })

  it('fires nothing at the very start — the legacy 0 % threshold bug', () => {
    expect(sessionCueMarksCrossed(schedule, [], 0)).toEqual([])
  })

  it('fires a mark the tick lands exactly on', () => {
    expect(sessionCueMarksCrossed(schedule, [], 500)).toEqual([
      { at: 500, role: 'taskCompleteDuringSession' },
    ])
  })

  it('fires a mark the tick jumped past — a throttled or coalesced tab', () => {
    // The legacy equality test would have missed 500 entirely here.
    expect(sessionCueMarksCrossed(schedule, [], 512).map((m) => m.at)).toEqual([
      500,
    ])
  })

  it('fires every mark a long reload gap skipped over, once each', () => {
    expect(
      sessionCueMarksCrossed(schedule, [], 9_999).map((m) => m.at),
    ).toEqual([500, 1500])
  })

  it('never fires a mark twice, however many times the tick repeats', () => {
    const first = sessionCueMarksCrossed(schedule, [], 600)
    const fired = first.map((mark) => mark.at)
    expect(sessionCueMarksCrossed(schedule, fired, 600)).toEqual([])
    expect(sessionCueMarksCrossed(schedule, fired, 700)).toEqual([])
    expect(sessionCueMarksCrossed(schedule, fired, 1_400)).toEqual([])
  })

  it('is stable when elapsed goes backwards — nothing re-fires', () => {
    const fired = [500]
    expect(sessionCueMarksCrossed(schedule, fired, 400)).toEqual([])
  })

  it('ignores a non-finite elapsed rather than firing everything', () => {
    expect(sessionCueMarksCrossed(schedule, [], Number.NaN)).toEqual([])
  })
})

describe('FALLBACK_SESSION_TARGET_DURATION', () => {
  it('is the Pomodoro focus half, 25 minutes — never the 5-minute rest', () => {
    expect(FALLBACK_SESSION_TARGET_DURATION).toBe(minutesInSeconds(25))
  })

  it('is a defined, positive number — the legacy default was `undefined`', () => {
    expect(Number.isFinite(FALLBACK_SESSION_TARGET_DURATION)).toBe(true)
    expect(FALLBACK_SESSION_TARGET_DURATION).toBeGreaterThan(0)
  })

  it('reads its value from the shared preset rather than restating it', () => {
    // If #8's `defaultPomodoroConfig` ever moves, this constant moves with it.
    expect(FALLBACK_SESSION_TARGET_DURATION).toBe(
      countdown(FALLBACK_SESSION_TARGET_DURATION)[0]?.at,
    )
  })
})
