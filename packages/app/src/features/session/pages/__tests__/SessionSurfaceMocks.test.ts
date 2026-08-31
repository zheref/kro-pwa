/**
 * The render tier's fixtures.
 *
 * The point of asserting on a mocks file at all: these props are what every
 * story and every render test is judged against, so a fixture that drifts away
 * from what the Selectors actually produce would make the whole suite agree
 * with itself and disagree with the app. Each case below pins one such
 * agreement — the phase, the tint, the affordance and the gate flags all come
 * from the same canned state, through the same Selectors the Page uses.
 */
import { describe, expect, it } from 'vitest'
import { SessionPhase } from '../../SessionVocabulary'
import {
  pillStateFor,
  sessionPillMocks,
  sessionSheetMocks,
  sheetPropsFor,
} from '../SessionSurfaceMocks'
import { sessionStateMocks } from '../../SessionMocks'

describe('sheetPropsFor', () => {
  it('reads the phase and the status label from the same canned state', () => {
    const props = sheetPropsFor(sessionStateMocks.running)
    expect(props.phase).toBe(SessionPhase.running)
    expect(props.statusLabel).toBe('FOCUSED')
  })

  it('derives the remaining time rather than carrying a stored counter', () => {
    // The `running` mock is ten minutes into a 25-minute countdown.
    expect(sheetPropsFor(sessionStateMocks.running).remainingDuration).toBe(900)
  })

  it('carries the shipped gate answers — both session flags off', () => {
    const props = sheetPropsFor(sessionStateMocks.ready)
    expect(props.isStopwatchAvailable).toBe(false)
    expect(props.areBreaksAvailable).toBe(false)
  })

  it('lets a caller override one field without rebuilding the rest', () => {
    const props = sheetPropsFor(sessionStateMocks.concluded, {
      areBreaksAvailable: true,
    })
    expect(props.areBreaksAvailable).toBe(true)
    expect(props.phase).toBe(SessionPhase.concluded)
  })
})

describe('pillStateFor', () => {
  it('pairs the focus tint with the pause affordance while running', () => {
    const pill = pillStateFor(sessionStateMocks.running)
    expect(pill.tint).toBe('focus')
    expect(pill.affordance).toBe('pause')
    expect(pill.isVisible).toBe(true)
  })

  it('pairs the chrome tint with resume while paused', () => {
    const pill = pillStateFor(sessionStateMocks.paused)
    expect(pill.tint).toBe('chrome')
    expect(pill.affordance).toBe('resume')
  })

  it('hides the pill entirely, and offers nothing, when there is no session', () => {
    const pill = pillStateFor(sessionStateMocks.ready)
    expect(pill.isVisible).toBe(false)
    expect(pill.affordance).toBe('none')
  })
})

describe('the fixture set', () => {
  it('covers every phase the sheet claims to support', () => {
    const phases = new Set(
      Object.values(sessionSheetMocks).map((props) => props.phase),
    )
    expect(phases).toEqual(
      new Set([
        SessionPhase.ready,
        SessionPhase.running,
        SessionPhase.paused,
        SessionPhase.concluded,
        SessionPhase.break,
      ]),
    )
  })

  it('covers every pill affordance the diagram names', () => {
    const affordances = new Set(
      Object.values(sessionPillMocks).map((pill) => pill.affordance),
    )
    expect(affordances).toEqual(
      new Set(['pause', 'resume', 'markComplete', 'none']),
    )
  })

  it('shows "Break" in place of the endeavor title while a break runs', () => {
    expect(sessionPillMocks.onBreak.title).toBe('Break')
    expect(sessionPillMocks.running.title).toBe('📊 Prepare slides')
  })
})
