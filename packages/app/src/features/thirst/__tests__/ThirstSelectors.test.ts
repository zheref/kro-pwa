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
import { initialThirstVoteEntry, type ThirstState, type ThirstVoteEntryState } from '../ThirstFeature'
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

/** A resolved entry — the base every scenario below overrides from, so a
 * test only ever states the fields that matter for it. */
const resolved: ThirstVoteEntryState = { ...initialThirstVoteEntry, isCheckingVoteState: false }

const stateWith = (entry: ThirstVoteEntryState): ThirstState => ({
  byFeatureKey: { [key]: entry },
})

describe('selectThirstVoteStatus', () => {
  it('is notVotable for an unmapped dead-end regardless of stored state', () => {
    const state = rootWith(thirstStateMocks.matrixVotable)
    expect(selectThirstVoteStatus(state, 'unknown')).toEqual({ kind: 'notVotable' })
  })

  it('is voted once already-voted, even while counts are still loading', () => {
    const state = rootWith(
      stateWith({ ...resolved, alreadyVoted: true, isLoadingCounts: true }),
    )
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'voted' })
  })

  it('is unavailable with the typed copy when the auth check failed', () => {
    const state = rootWith(
      stateWith({
        ...resolved,
        voteStateException: { kind: 'notSignedIn', message: 'x', recoverable: false },
      }),
    )
    expect(selectThirstVoteStatus(state, key)).toEqual({
      kind: 'unavailable',
      message: 'Sign in to vote for upcoming features.',
    })
  })

  it('is loading while the auth check is in flight, even if counts already arrived', () => {
    const state = rootWith(
      stateWith({ ...resolved, counts: thirstCountsFixture, isCheckingVoteState: true }),
    )
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'loading' })
  })

  it('is loading while counts are in flight and none has ever loaded', () => {
    const state = rootWith(stateWith({ ...resolved, isLoadingCounts: true }))
    expect(selectThirstVoteStatus(state, key)).toEqual({ kind: 'loading' })
  })

  it('is loading before the check has ever started — no entry at all yet (the pre-mount first paint)', () => {
    // No entry in `byFeatureKey` ⇒ the initial-entry defaults, which start
    // `isCheckingVoteState: true` specifically so this reads as loading, not
    // a transiently-votable false positive (found in review).
    const state = rootWith(thirstStateMocks.empty)
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
  it('is null before any vote has ever been attempted', () => {
    expect(selectThirstVoteErrorMessage(rootWith(thirstStateMocks.empty), key)).toBeNull()
  })

  it('is null once already voted — no retry affordance to explain', () => {
    expect(
      selectThirstVoteErrorMessage(rootWith(thirstStateMocks.matrixVoted), key),
    ).toBeNull()
  })

  it('surfaces the typed copy for a failed vote attempt', () => {
    const state = rootWith(
      stateWith({
        ...resolved,
        counts: thirstCountsFixture,
        voteException: { kind: 'offline', message: 'x', recoverable: true },
      }),
    )
    expect(selectThirstVoteErrorMessage(state, key)).toBe(
      'No internet connection. Please try again.',
    )
  })

  it('still surfaces a failed-vote error even when public counts never loaded (found in review: voting never depends on counts)', () => {
    const state = rootWith(
      stateWith({
        ...resolved,
        counts: null,
        voteException: { kind: 'unknown', message: 'insert failed', recoverable: true },
      }),
    )
    expect(selectThirstVoteErrorMessage(state, key)).toBe('Something went wrong while voting.')
  })
})
