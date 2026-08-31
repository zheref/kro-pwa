import { describe, expect, it } from 'vitest'
import {
  FocusTimerMode,
  focusTimerModeFromRawValue,
  focusTimerModes,
} from '../FocusTimerMode'

describe('FocusTimerMode', () => {
  it('carries canon’s two cases in declaration order', () => {
    expect(focusTimerModes).toEqual(['countdown', 'stopwatch'])
  })

  it('keeps canon’s raw values, so an anchor written by iOS still reads here', () => {
    expect(FocusTimerMode.countdown).toBe('countdown')
    expect(FocusTimerMode.stopwatch).toBe('stopwatch')
  })
})

describe('reading a stored timer mode back', () => {
  it('narrows a countdown anchor written on a previous launch', () => {
    expect(focusTimerModeFromRawValue('countdown')).toBe(
      FocusTimerMode.countdown,
    )
  })

  it('narrows a stopwatch anchor written on a previous launch', () => {
    expect(focusTimerModeFromRawValue('stopwatch')).toBe(
      FocusTimerMode.stopwatch,
    )
  })

  it('refuses a mode from a newer app version rather than guessing one', () => {
    expect(focusTimerModeFromRawValue('interval')).toBeNull()
  })

  it('refuses an empty string, which is what a truncated write leaves behind', () => {
    expect(focusTimerModeFromRawValue('')).toBeNull()
  })

  it('is case-sensitive — “Countdown” is not a mode canon ever wrote', () => {
    expect(focusTimerModeFromRawValue('Countdown')).toBeNull()
  })
})
