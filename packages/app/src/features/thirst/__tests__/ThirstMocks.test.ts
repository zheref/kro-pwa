import { initialSettingsState } from '../../settings/SettingsState'
import { describe, expect, it } from 'vitest'
import {
  thirstEntryMocks,
  thirstStateMocks,
  THIRST_MOCK_FEATURE_KEY,
} from '../ThirstMocks'
import { selectThirstVoteStatus } from '../ThirstSelectors'
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialMainState } from '../../main/MainFeature'
import { initialPlanState } from '../../plan/PlanState'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialTriageState } from '../../triage/TriageFeature'
import type { ThirstState } from '../ThirstFeature'

const rootWith = (thirst: ThirstState): RootState => ({
  greeting: initialGreetingState,
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  auth: initialAuthState,
  settings: initialSettingsState,
  main: initialMainState,
  thirst,
})

describe('thirstEntryMocks', () => {
  it('idle carries no counts and no exceptions', () => {
    expect(thirstEntryMocks.idle.counts).toBeNull()
    expect(thirstEntryMocks.idle.voteStateException).toBeNull()
  })

  it('votable has loaded counts and is not yet voted', () => {
    expect(thirstEntryMocks.votable.counts).not.toBeNull()
    expect(thirstEntryMocks.votable.alreadyVoted).toBe(false)
  })

  it('voted carries a bumped web tally and alreadyVoted true', () => {
    expect(thirstEntryMocks.voted.alreadyVoted).toBe(true)
    expect(thirstEntryMocks.voted.counts?.perPlatform.web).toBe(1)
  })

  it('unavailableSignedOut carries the notSignedIn exception', () => {
    expect(thirstEntryMocks.unavailableSignedOut.voteStateException?.kind).toBe(
      'notSignedIn',
    )
  })

  it('unavailableOffline carries the offline exception with no counts loaded — offline before anything resolved', () => {
    expect(thirstEntryMocks.unavailableOffline.voteStateException?.kind).toBe(
      'offline',
    )
    expect(thirstEntryMocks.unavailableOffline.counts).toBeNull()
  })

  it('voting flags a vote in flight', () => {
    expect(thirstEntryMocks.voting.isVoting).toBe(true)
  })

  it('voteFailed carries a retry-able vote exception and stays not-voted', () => {
    expect(thirstEntryMocks.voteFailed.voteException).not.toBeNull()
    expect(thirstEntryMocks.voteFailed.alreadyVoted).toBe(false)
  })
})

describe('thirstStateMocks — composed against the real Selectors', () => {
  it('matrixVotable resolves to a votable status through selectThirstVoteStatus', () => {
    const state = rootWith(thirstStateMocks.matrixVotable)
    expect(selectThirstVoteStatus(state, THIRST_MOCK_FEATURE_KEY)).toEqual({
      kind: 'votable',
    })
  })

  it('matrixVoted resolves to a voted status', () => {
    const state = rootWith(thirstStateMocks.matrixVoted)
    expect(selectThirstVoteStatus(state, THIRST_MOCK_FEATURE_KEY)).toEqual({
      kind: 'voted',
    })
  })

  it('empty resolves to loading before either check has started', () => {
    const state = rootWith(thirstStateMocks.empty)
    // No entry yet ⇒ the initial-entry defaults, which start
    // `isCheckingVoteState: true` for exactly this reason (found in review:
    // the pre-mount first paint must never read as a transiently-votable
    // false positive for a signed-out visitor).
    expect(selectThirstVoteStatus(state, THIRST_MOCK_FEATURE_KEY)).toEqual({
      kind: 'loading',
    })
  })
})
