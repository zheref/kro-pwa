/** Selectors run against a hand-built root state, never a live store (`RC-55`). */
import { describe, expect, it } from 'vitest'
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
import type { RootState } from '../../../library/store'
import { THIRST_MOCK_FEATURE_KEY, thirstCountsFixture, thirstStateMocks } from '../ThirstMocks'
import type { ThirstState } from '../ThirstFeature'
import {
  selectThirstHasLoadedCounts,
  selectThirstPerPlatformTallies,
  selectThirstTotalCount,
  selectThirstVoteErrorMessage,
  selectThirstVoteStatus,
} from '../ThirstSelectors'

const key = THIRST_MOCK_FEATURE_KEY

const rootWith = (thirst: ThirstState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this
  // suite asserts nothing about the other features.
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
  main: initialMainState,
  thirst,
})

describe('selectThirstVoteStatus', () => {
  it('is notVotable for an unmapped dead-end regardless of stored state', () => {
    const state = rootWith(thirstStateMocks.matrixVotable)
    expect(selectThirstVoteStatus(state, 'unknown')).toEqual({ kind: 'notVotable' })
  })

  it('is voted once already-voted, even while counts are still loading', () => {
    const state = rootWith({
      byFeatureKey: {
        [key]: {
          counts: null,
          alreadyVoted: true,
          isVoting: false,
          isLoadingCounts: true,
          isCheckingVoteState: false,
          voteStateException: null,
          voteException: null,
        },
      },
    })
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'voted' })
  })

  it('is unavailable with the typed copy when the auth check failed', () => {
    const state = rootWith({
      byFeatureKey: {
        [key]: {
          counts: null,
          alreadyVoted: false,
          isVoting: false,
          isLoadingCounts: false,
          isCheckingVoteState: false,
          voteStateException: { kind: 'notSignedIn', message: 'x', recoverable: false },
          voteException: null,
        },
      },
    })
    expect(selectThirstVoteStatus(state, key)).toEqual({
      kind: 'unavailable',
      message: 'Sign in to vote for upcoming features.',
    })
  })

  it('is loading while the auth check is in flight, even if counts already arrived', () => {
    const state = rootWith({
      byFeatureKey: {
        [key]: {
          counts: thirstCountsFixture,
          alreadyVoted: false,
          isVoting: false,
          isLoadingCounts: false,
          isCheckingVoteState: true,
          voteStateException: null,
          voteException: null,
        },
      },
    })
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'loading' })
  })

  it('is loading while counts are in flight and none has ever loaded', () => {
    const state = rootWith({
      byFeatureKey: {
        [key]: {
          counts: null,
          alreadyVoted: false,
          isVoting: false,
          isLoadingCounts: true,
          isCheckingVoteState: false,
          voteStateException: null,
          voteException: null,
        },
      },
    })
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'loading' })
  })

  it('is votable once both checks resolved cleanly', () => {
    const state = rootWith(thirstStateMocks.matrixVotable)
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'votable' })
  })
})

describe('selectThirstHasLoadedCounts / selectThirstTotalCount', () => {
  it('reports no counts loaded before any fetch resolves', () => {
    const state = rootWith(thirstStateMocks.empty)
    expect(selectThirstHasLoadedCounts(state, key)).toBe(false)
    expect(selectThirstTotalCount(state, key)).toBe(0)
  })

  it('reports the loaded total once counts arrive', () => {
    const state = rootWith(thirstStateMocks.matrixVotable)
    expect(selectThirstHasLoadedCounts(state, key)).toBe(true)
    expect(selectThirstTotalCount(state, key)).toBe(thirstCountsFixture.total)
  })
})

describe('selectThirstPerPlatformTallies', () => {
  it('is empty before counts load', () => {
    expect(selectThirstPerPlatformTallies(rootWith(thirstStateMocks.empty), key)).toEqual([])
  })

  it('omits zero-vote platforms once counts load', () => {
    const tallies = selectThirstPerPlatformTallies(rootWith(thirstStateMocks.matrixVotable), key)
    expect(tallies.every((tally) => tally.count > 0)).toBe(true)
  })
})

describe('selectThirstVoteErrorMessage', () => {
  it('is null while the surface has not loaded any counts yet', () => {
    expect(selectThirstVoteErrorMessage(rootWith(thirstStateMocks.empty), key)).toBeNull()
  })

  it('is null once already voted — no retry affordance to explain', () => {
    expect(
      selectThirstVoteErrorMessage(rootWith(thirstStateMocks.matrixVoted), key),
    ).toBeNull()
  })

  it('surfaces the typed copy for a failed vote attempt', () => {
    const state = rootWith({
      byFeatureKey: {
        [key]: {
          counts: thirstCountsFixture,
          alreadyVoted: false,
          isVoting: false,
          isLoadingCounts: false,
          isCheckingVoteState: false,
          voteStateException: null,
          voteException: { kind: 'offline', message: 'x', recoverable: true },
        },
      },
    })
    expect(selectThirstVoteErrorMessage(state, key)).toBe(
      'No internet connection. Please try again.',
    )
  })
})
