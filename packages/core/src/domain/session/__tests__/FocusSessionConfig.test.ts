import { describe, expect, it } from 'vitest'
import { hoursInSeconds, minutesInSeconds } from '../../shared/TimeInterval'
import {
  DEFAULT_SESSION_DURATION,
  defaultSessionPresets,
  focusSessionConfigId,
  makeFocusSessionConfig,
} from '../FocusSessionConfig'
import { FocusTimerMode } from '../FocusTimerMode'

describe('building a session config', () => {
  it('takes the caller’s duration, rest and mode when a user configures one', () => {
    const config = makeFocusSessionConfig({
      title: 'Deep work',
      duration: minutesInSeconds(90),
      rest: minutesInSeconds(20),
      mode: FocusTimerMode.countdown,
    })
    expect(config.duration).toBe(5400)
    expect(config.rest).toBe(1200)
    expect(config.mode).toBe(FocusTimerMode.countdown)
  })

  it('defaults an unnamed duration to canon’s three hours', () => {
    const config = makeFocusSessionConfig({ title: 'Open ended' })
    expect(config.duration).toBe(DEFAULT_SESSION_DURATION)
    expect(config.duration).toBe(10_800)
  })

  it('defaults to countdown and to no rest, the way canon’s init does', () => {
    const config = makeFocusSessionConfig({ title: 'Bare' })
    expect(config.mode).toBe(FocusTimerMode.countdown)
    expect(config.rest).toBeNull()
  })

  it('keeps an explicit zero rest distinct from no rest at all', () => {
    expect(makeFocusSessionConfig({ title: 'Zero', rest: 0 }).rest).toBe(0)
    expect(makeFocusSessionConfig({ title: 'None' }).rest).toBeNull()
  })

  it('uses the title as the identity, including when the title is empty', () => {
    expect(
      focusSessionConfigId(makeFocusSessionConfig({ title: 'Focus' })),
    ).toBe('Focus')
    expect(focusSessionConfigId(makeFocusSessionConfig({ title: '' }))).toBe('')
  })
})

describe('the six canonical presets', () => {
  it('ships exactly six, in canon’s declaration order', () => {
    expect(defaultSessionPresets.map((preset) => preset.title)).toEqual([
      'Quick Focus',
      'Pomodoro',
      'Focus',
      'Momentum',
      'Headspace',
      'Open Space',
    ])
  })

  it('reproduces every canon duration/rest pair exactly', () => {
    expect(
      defaultSessionPresets.map((preset) => [
        preset.title,
        preset.duration,
        preset.rest,
      ]),
    ).toEqual([
      ['Quick Focus', minutesInSeconds(5), null],
      ['Pomodoro', minutesInSeconds(25), minutesInSeconds(5)],
      ['Focus', minutesInSeconds(50), minutesInSeconds(10)],
      ['Momentum', minutesInSeconds(75), minutesInSeconds(15)],
      ['Headspace', hoursInSeconds(3), minutesInSeconds(60)],
      ['Open Space', DEFAULT_SESSION_DURATION, null],
    ])
  })

  it('makes Open Space the only stopwatch preset', () => {
    const stopwatchTitles = defaultSessionPresets
      .filter((preset) => preset.mode === FocusTimerMode.stopwatch)
      .map((preset) => preset.title)
    expect(stopwatchTitles).toEqual(['Open Space'])
  })

  it('gives Open Space the 3-hour default target, not zero — canon names no duration for it', () => {
    const openSpace = defaultSessionPresets.find(
      (preset) => preset.title === 'Open Space',
    )
    expect(openSpace?.duration).toBe(hoursInSeconds(3))
  })

  it('gives every preset a distinct title, since the title is the identity', () => {
    const ids = defaultSessionPresets.map(focusSessionConfigId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
