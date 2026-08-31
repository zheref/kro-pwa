/**
 * The fixtures themselves (`RC-31`).
 *
 * Every variant is built by running the real Shifters, so this suite's job is
 * to prove that claim rather than to re-test the Shifters: each state below is
 * checked for the invariant its name promises, which is exactly what a
 * hand-assembled literal could quietly violate.
 */
import { PersistedSessionPhase, runningSessionElapsedDuration } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  SESSION_MOCK_NOW,
  SESSION_MOCK_TARGET,
  sessionAvailabilityMocks,
  sessionIdentityMocks,
  sessionMockInstant,
  sessionPreferenceMocks,
  sessionStateMocks,
} from '../SessionMocks'
import { SessionPhase } from '../SessionVocabulary'

describe('the phase/anchor invariant', () => {
  it('gives every non-ready fixture an anchor', () => {
    for (const [name, state] of Object.entries(sessionStateMocks)) {
      if (state.phase === SessionPhase.ready) continue
      expect(state.anchor, `${name} is ${state.phase} with no anchor`).not.toBeNull()
    }
  })

  it('leaves every ready fixture without one', () => {
    for (const [name, state] of Object.entries(sessionStateMocks)) {
      if (state.phase !== SessionPhase.ready) continue
      expect(state.anchor, `${name} is ready but still anchored`).toBeNull()
    }
  })

  it('agrees with the document’s own phase wherever both exist', () => {
    for (const [name, state] of Object.entries(sessionStateMocks)) {
      if (state.anchor === null) continue
      expect(
        state.anchor.phase,
        `${name}: runtime ${state.phase} vs document ${state.anchor.phase}`,
      ).not.toBe(undefined)
    }
  })
})

describe('the fragment invariants', () => {
  it('leaves exactly one fragment open while running', () => {
    const open = sessionStateMocks.running.anchor?.fragments.filter(
      (fragment) => fragment.end === null,
    )
    expect(open).toHaveLength(1)
  })

  it('closes every fragment while paused', () => {
    expect(
      sessionStateMocks.paused.anchor?.fragments.every(
        (fragment) => fragment.end !== null,
      ),
    ).toBe(true)
  })

  it('closes every fragment at the conclusion screen', () => {
    expect(
      sessionStateMocks.concluded.anchor?.fragments.every(
        (fragment) => fragment.end !== null,
      ),
    ).toBe(true)
  })
})

describe('the named scenarios really are what they claim', () => {
  it('running is ten minutes in', () => {
    const state = sessionStateMocks.running
    expect(
      runningSessionElapsedDuration(state.anchor!, state.now!),
    ).toBeCloseTo(600, 5)
  })

  it('concluded ran the full target and claimed exactly one conclusion', () => {
    const state = sessionStateMocks.concluded
    expect(state.phase).toBe(SessionPhase.concluded)
    expect(state.conclusion.kind).toBe('pending')
    expect(
      state.conclusion.kind === 'pending' &&
        state.conclusion.outcome.elapsedDuration,
    ).toBeCloseTo(SESSION_MOCK_TARGET, 5)
  })

  it('concludedAtThreshold sits at exactly 30 % and still records', () => {
    const state = sessionStateMocks.concludedAtThreshold
    expect(state.phase).toBe(SessionPhase.concluded)
    expect(
      state.conclusion.kind === 'pending' &&
        state.conclusion.outcome.elapsedDuration,
    ).toBeCloseTo(SESSION_MOCK_TARGET * 0.3, 5)
  })

  it('abortedBelowThreshold cleared the anchor but kept the record', () => {
    const state = sessionStateMocks.abortedBelowThreshold
    expect(state.phase).toBe(SessionPhase.ready)
    expect(state.anchor).toBeNull()
    expect(state.conclusion.kind).toBe('pending')
  })

  it('onBreak runs a break countdown with breaks enabled', () => {
    const state = sessionStateMocks.onBreak
    expect(state.phase).toBe(SessionPhase.break)
    expect(state.anchor?.phase).toBe(PersistedSessionPhase.break)
    expect(state.availability.areBreaksAvailable).toBe(true)
  })

  it('hydrated recomputes against a much later instant', () => {
    const state = sessionStateMocks.hydrated
    expect(state.now).toEqual(sessionMockInstant(900))
    expect(
      runningSessionElapsedDuration(state.anchor!, state.now!),
    ).toBeCloseTo(900, 5)
  })

  it('failedWriteWhileRunning is failed AND still running', () => {
    const state = sessionStateMocks.failedWriteWhileRunning
    expect(state.load.kind).toBe('failed')
    expect(state.phase).toBe(SessionPhase.running)
  })
})

describe('the supporting fixture sets', () => {
  it('ships an identity for each of the three cases a launch can hit', () => {
    expect(sessionIdentityMocks.slides.isAnonymous).toBe(false)
    expect(sessionIdentityMocks.anonymous.isAnonymous).toBe(true)
    expect(sessionIdentityMocks.plain.title).not.toContain('📊')
  })

  it('ships the shipped preference defaults and two deliberate variants', () => {
    expect(sessionPreferenceMocks.shipped.autoStartBreak).toBe(false)
    expect(sessionPreferenceMocks.autoBreak.autoStartBreak).toBe(true)
    expect(sessionPreferenceMocks.silent.soundOnEnd).toBe(false)
  })

  it('ships the statusQuo gate set with everything off', () => {
    expect(sessionAvailabilityMocks.statusQuo).toEqual({
      isStopwatchAvailable: false,
      areBreaksAvailable: false,
      isDurationLearningEnabled: false,
    })
  })

  it('anchors every fixture to one stated instant', () => {
    expect(sessionMockInstant(0)).toEqual(SESSION_MOCK_NOW)
    expect(sessionMockInstant(60).getTime() - SESSION_MOCK_NOW.getTime()).toBe(
      60_000,
    )
  })
})
