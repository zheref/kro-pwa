import { describe, expect, it } from 'vitest'
import { defaultSessionPresets } from '../../FocusSessionConfig'
import { FocusTimerMode } from '../../FocusTimerMode'
import {
  allFocusSessionConfigMocks,
  focusSessionConfigMocks,
} from '../FocusSessionConfig.mocks'

describe('the FocusSessionConfig mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allFocusSessionConfigMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('reuses the real presets rather than copying them, so canon can never drift', () => {
    expect(defaultSessionPresets).toContain(focusSessionConfigMocks.pomodoro)
    expect(defaultSessionPresets).toContain(focusSessionConfigMocks.quickFocus)
    expect(defaultSessionPresets).toContain(focusSessionConfigMocks.openSpace)
  })

  it('covers both timer modes', () => {
    const modes = new Set(
      allFocusSessionConfigMocks.map((config) => config.mode),
    )
    expect(modes).toEqual(
      new Set([FocusTimerMode.countdown, FocusTimerMode.stopwatch]),
    )
  })

  it('includes a config with no rest and one with a rest longer than the focus', () => {
    expect(focusSessionConfigMocks.custom.rest).toBeNull()
    const restLonger = focusSessionConfigMocks.restLongerThanFocus
    expect(restLonger.rest).toBeGreaterThan(restLonger.duration)
  })

  it('includes a zero-duration config, which the sliding scale reads as quick-complete', () => {
    expect(focusSessionConfigMocks.zeroDuration.duration).toBe(0)
  })

  it('includes an empty title, since the title is the identity', () => {
    expect(focusSessionConfigMocks.untitled.title).toBe('')
  })

  it('includes a long non-ASCII title', () => {
    const title = focusSessionConfigMocks.overlongUnicode.title
    expect(title.length).toBeGreaterThan(40)
    const hasNonAscii = [...title].some(
      (character) => (character.codePointAt(0) ?? 0) > 0x7f,
    )
    expect(hasNonAscii).toBe(true)
  })
})
