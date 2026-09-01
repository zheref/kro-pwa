/**
 * The haptic boundary — canon's single site, and the majority case where the
 * platform has no vibrator at all.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  TIMELINE_HOLD_VIBRATION_MS,
  type VibrationNavigatorLike,
  makeLiveVibrationService,
  makeStubbedVibrationService,
} from '../VibrationService'

const vibratingNavigator = () => {
  const fired: (number | number[])[] = []
  const nav: VibrationNavigatorLike = {
    vibrate: (pattern) => {
      fired.push(pattern)
      return true
    },
  }
  return { nav, fired }
}

describe('liveVibrationService', () => {
  it('reports unsupported on a platform with no vibrator (desktop, iOS Safari)', () => {
    const service = makeLiveVibrationService({ navigator: null })
    expect(service.isSupported()).toBe(false)
  })

  it('reports supported where navigator.vibrate exists', () => {
    const { nav } = vibratingNavigator()
    expect(makeLiveVibrationService({ navigator: nav }).isSupported()).toBe(
      true,
    )
  })

  it("fires canon's single haptic as one short pulse on a timeline hold", () => {
    const { nav, fired } = vibratingNavigator()
    const service = makeLiveVibrationService({ navigator: nav })

    expect(service.vibrateForTimelineHold()).toBe(true)
    expect(fired).toEqual([TIMELINE_HOLD_VIBRATION_MS])
  })

  it('passes a pattern through as an array the platform accepts', () => {
    const { nav, fired } = vibratingNavigator()
    const service = makeLiveVibrationService({ navigator: nav })

    service.vibrate([10, 20, 10])

    expect(fired).toEqual([[10, 20, 10]])
  })

  it('reports false rather than throwing where there is no vibrator', () => {
    const service = makeLiveVibrationService({ navigator: null })
    expect(service.vibrateForTimelineHold()).toBe(false)
  })

  it('swallows a refusal from the platform', () => {
    const nav: VibrationNavigatorLike = {
      vibrate: vi.fn(() => {
        throw new Error('NotAllowedError')
      }),
    }
    const service = makeLiveVibrationService({ navigator: nav })

    expect(service.vibrate(20)).toBe(false)
  })
})

describe('stubbedVibrationService', () => {
  it('records the timeline-hold pulse so a Producer test can assert it fired', () => {
    const service = makeStubbedVibrationService()

    service.vibrateForTimelineHold()

    expect(service.recordedPatterns()).toEqual([TIMELINE_HOLD_VIBRATION_MS])
  })

  it('records nothing and reports false on an unsupported device', () => {
    const service = makeStubbedVibrationService({ supported: false })

    expect(service.vibrateForTimelineHold()).toBe(false)
    expect(service.recordedPatterns()).toEqual([])
  })

  it('records each pattern in order across repeated holds', () => {
    const service = makeStubbedVibrationService()

    service.vibrateForTimelineHold()
    service.vibrate([5, 5])

    expect(service.recordedPatterns()).toEqual([
      TIMELINE_HOLD_VIBRATION_MS,
      [5, 5],
    ])
  })
})
