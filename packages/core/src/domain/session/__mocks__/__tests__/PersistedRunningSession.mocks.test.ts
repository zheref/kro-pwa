import { describe, expect, it } from 'vitest'
import {
  PersistedSessionPhase,
  isRunningSessionConsistent,
  runningSessionElapsedDuration,
} from '../../PersistedRunningSession'
import { SESSION_MOCK_NOW } from '../FocusSessionFragment.mocks'
import {
  allPersistedRunningSessionMocks,
  allPersistedSessionEndeavorMocks,
  persistedRunningSessionMocks,
  persistedSessionEndeavorMocks,
} from '../PersistedRunningSession.mocks'

describe('the PersistedSessionEndeavor mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allPersistedSessionEndeavorMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id', () => {
    const ids = allPersistedSessionEndeavorMocks.map((endeavor) => endeavor.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes one with an estimate and one without', () => {
    expect(persistedSessionEndeavorMocks.writeBrief.duration).not.toBeNull()
    expect(persistedSessionEndeavorMocks.bare.duration).toBeNull()
  })

  it('includes a blank title and symbol — nothing at all to render', () => {
    expect(persistedSessionEndeavorMocks.blank.title).toBe('')
    expect(persistedSessionEndeavorMocks.blank.symbol).toBe('')
  })

  it('includes a multi-codepoint symbol and an overlong title', () => {
    expect(
      persistedSessionEndeavorMocks.overlong.symbol.length,
    ).toBeGreaterThan(2)
    expect(persistedSessionEndeavorMocks.overlong.title.length).toBeGreaterThan(
      60,
    )
  })
})

describe('the PersistedRunningSession mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allPersistedRunningSessionMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('covers all four persisted phases', () => {
    const phases = new Set(
      allPersistedRunningSessionMocks.map((session) => session.phase),
    )
    expect(phases).toEqual(
      new Set([
        PersistedSessionPhase.running,
        PersistedSessionPhase.paused,
        PersistedSessionPhase.break,
        PersistedSessionPhase.concluded,
      ]),
    )
  })

  it('includes exactly two deliberately inconsistent anchors, and both are flagged', () => {
    const inconsistent = allPersistedRunningSessionMocks.filter(
      (session) => !isRunningSessionConsistent(session),
    )
    expect(inconsistent).toHaveLength(2)
    expect(inconsistent).toContain(
      persistedRunningSessionMocks.corruptPausedWithOpenFragment,
    )
    expect(inconsistent).toContain(
      persistedRunningSessionMocks.corruptTwoOpenFragments,
    )
  })

  it('includes a session whose target is already overrun', () => {
    const overrun = persistedRunningSessionMocks.overrunAfterKill
    expect(
      runningSessionElapsedDuration(overrun, SESSION_MOCK_NOW),
    ).toBeGreaterThan(overrun.targetDuration)
  })

  it('includes an anchor with no fragments at all', () => {
    expect(persistedRunningSessionMocks.noFragments.fragments).toEqual([])
  })

  it('covers both timer modes', () => {
    const modes = new Set(
      allPersistedRunningSessionMocks.map((session) => session.mode),
    )
    expect(modes.size).toBe(2)
  })
})
