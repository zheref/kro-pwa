/**
 * The presentation vocabulary — pure functions, so these are pure tests: no
 * store, no render, no clock (`RC-55`/`RC-56` shape).
 *
 * The group that matters most is `sessionDialState`. It is canon's `dialArea`
 * branch table, and getting it wrong is invisible in a screenshot: a stopwatch
 * that shows its *target* instead of its elapsed total looks like a working
 * dial right up until the number stops making sense.
 */
import { describe, expect, it } from 'vitest'
import { SessionPhase } from '../../SessionVocabulary'
import {
  SESSION_SLOT_HEIGHT,
  SessionSurfacePresentation,
  areSessionSuggestionsInteractive,
  formatSessionDurationShort,
  sessionDialState,
  sessionDismissalHint,
  sessionPillTint,
  sessionSuggestionsHeading,
  sessionSurfaceTint,
} from '../sessionSheetModel'

describe('sessionDismissalHint', () => {
  it('tells a handheld user to swipe the sheet down', () => {
    expect(sessionDismissalHint(SessionSurfacePresentation.sheet)).toBe(
      'Swipe down to dismiss',
    )
  })

  it('tells a desktop user to close the modal instead', () => {
    expect(sessionDismissalHint(SessionSurfacePresentation.modal)).toBe(
      'Close to dismiss',
    )
  })

  it('says the same on the /execute column, which cannot be swiped either', () => {
    expect(sessionDismissalHint(SessionSurfacePresentation.inline)).toBe(
      'Close to dismiss',
    )
  })
})

describe('sessionDialState', () => {
  const base = {
    isCountdown: true,
    targetDuration: 1_500,
    elapsedDuration: 600,
    remainingDuration: 900,
  }

  it('lets the user drag the dial before a countdown starts', () => {
    expect(sessionDialState({ ...base, phase: SessionPhase.ready })).toEqual({
      seconds: 1_500,
      isEditable: true,
    })
  })

  it('freezes the dial on the remaining time once the countdown runs', () => {
    expect(sessionDialState({ ...base, phase: SessionPhase.running })).toEqual({
      seconds: 900,
      isEditable: false,
    })
  })

  it('shows a stopwatch nothing at all before it starts', () => {
    expect(
      sessionDialState({
        ...base,
        isCountdown: false,
        phase: SessionPhase.ready,
      }),
    ).toEqual({ seconds: 0, isEditable: false })
  })

  it('counts a running stopwatch UP, not down', () => {
    expect(
      sessionDialState({
        ...base,
        isCountdown: false,
        phase: SessionPhase.running,
      }),
    ).toEqual({ seconds: 600, isEditable: false })
  })

  it('always shows a break its remaining time, whatever the mode was', () => {
    expect(
      sessionDialState({
        ...base,
        isCountdown: false,
        phase: SessionPhase.break,
        remainingDuration: 180,
      }),
    ).toEqual({ seconds: 180, isEditable: false })
  })

  it('never lets a concluded session be re-dialled', () => {
    expect(
      sessionDialState({
        ...base,
        phase: SessionPhase.concluded,
        remainingDuration: 0,
      }),
    ).toEqual({ seconds: 0, isEditable: false })
  })
})

describe('sessionSuggestionsHeading', () => {
  it('offers parallel work before focus begins', () => {
    expect(sessionSuggestionsHeading(SessionPhase.ready)).toBe(
      'MAYBE DO THIS IN PARALLEL?',
    )
  })

  it('offers the next thing once focus is under way', () => {
    expect(sessionSuggestionsHeading(SessionPhase.running)).toBe(
      'MAYBE DO THIS NEXT?',
    )
  })

  it('keeps saying "next" while the session is paused', () => {
    expect(sessionSuggestionsHeading(SessionPhase.paused)).toBe(
      'MAYBE DO THIS NEXT?',
    )
  })
})

describe('areSessionSuggestionsInteractive', () => {
  it('lets the user swap task before starting', () => {
    expect(areSessionSuggestionsInteractive(SessionPhase.ready)).toBe(true)
  })

  it('refuses a swap mid-session — the suggestion is a reminder, not a switch', () => {
    expect(areSessionSuggestionsInteractive(SessionPhase.running)).toBe(false)
  })

  it('refuses on a break too', () => {
    expect(areSessionSuggestionsInteractive(SessionPhase.break)).toBe(false)
  })
})

describe('formatSessionDurationShort', () => {
  it('reads a sub-hour suggestion in minutes', () => {
    expect(formatSessionDurationShort(2_700)).toBe('45m')
  })

  it('drops the minutes when they are zero', () => {
    expect(formatSessionDurationShort(7_200)).toBe('2h')
  })

  it('reads an hour and a half as both parts', () => {
    expect(formatSessionDurationShort(5_400)).toBe('1h 30m')
  })

  it('truncates rather than rounding, exactly as canon does', () => {
    expect(formatSessionDurationShort(90)).toBe('1m')
  })

  it('clamps a negative or non-finite duration to zero minutes', () => {
    expect(formatSessionDurationShort(-60)).toBe('0m')
    expect(formatSessionDurationShort(Number.NaN)).toBe('0m')
  })
})

describe('sessionSurfaceTint', () => {
  it('washes a running session green', () => {
    expect(sessionSurfaceTint(SessionPhase.running)).toContain('focus-green')
  })

  it('washes a break beige', () => {
    expect(sessionSurfaceTint(SessionPhase.break)).toContain('break-beige')
  })

  it('leaves ready and concluded untinted — canon uses a fixed dark wash', () => {
    expect(sessionSurfaceTint(SessionPhase.ready)).toBeNull()
    expect(sessionSurfaceTint(SessionPhase.concluded)).toBeNull()
  })
})

describe('sessionPillTint', () => {
  it('tints the pill green while focus time is accruing', () => {
    expect(sessionPillTint('focus')).toContain('focus-green')
  })

  it('tints the pill beige while a break is accruing', () => {
    expect(sessionPillTint('break')).toContain('break-beige')
  })

  it('drops the tint entirely while nothing advances, so the pill takes the chrome', () => {
    expect(sessionPillTint('chrome')).toBeNull()
  })
})

describe('SESSION_SLOT_HEIGHT', () => {
  it("carries canon's own frame heights, not rounded stand-ins", () => {
    expect(SESSION_SLOT_HEIGHT.identity).toBe(148)
    expect(SESSION_SLOT_HEIGHT.dial).toBe(212)
    expect(SESSION_SLOT_HEIGHT.status).toBe(28)
  })

  it('reserves the suggestion region whether or not it has content', () => {
    expect(SESSION_SLOT_HEIGHT.suggestions).toBe(90)
  })

  it('gives the play button and the pause/stop row the same 80px band', () => {
    expect(SESSION_SLOT_HEIGHT.primaryAction).toBe(80)
  })
})
