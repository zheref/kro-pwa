import { err, ok } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { ThirstExceptions } from '../ThirstException'
import { initialThirstState } from '../ThirstFeature'
import { THIRST_MOCK_FEATURE_KEY, thirstCountsFixture, thirstStateMocks } from '../ThirstMocks'
import { VotePlatform } from '../ThirstModels'
import {
  withCountsFetchStarted,
  withCountsResult,
  withVoteResult,
  withVoteStarted,
  withVoteStateCheckStarted,
  withVoteStateResult,
} from '../ThirstShifters'

const key = THIRST_MOCK_FEATURE_KEY

describe('withVoteStateCheckStarted', () => {
  it('flags the check in flight for a fresh feature key', () => {
    const next = withVoteStateCheckStarted(initialThirstState, key)
    expect(next.byFeatureKey[key]?.isCheckingVoteState).toBe(true)
  })

  it('clears a stale exception so a retry surfaces loading, not the old failure', () => {
    const failed = withVoteStateResult(
      initialThirstState,
      key,
      err(ThirstExceptions.offline()),
    )
    const next = withVoteStateCheckStarted(failed, key)
    expect(next.byFeatureKey[key]?.voteStateException).toBeNull()
  })

  it('is a no-op on every other feature key already in state', () => {
    const withOther = withVoteStateCheckStarted(initialThirstState, 'board')
    const next = withVoteStateCheckStarted(withOther, key)
    expect(next.byFeatureKey.board?.isCheckingVoteState).toBe(true)
  })
})

describe('withVoteStateResult', () => {
  it('records already-voted on a true success', () => {
    const next = withVoteStateResult(initialThirstState, key, ok(true))
    expect(next.byFeatureKey[key]).toMatchObject({
      alreadyVoted: true,
      isCheckingVoteState: false,
      voteStateException: null,
    })
  })

  it('leaves alreadyVoted false on a false success — not yet voted', () => {
    const next = withVoteStateResult(initialThirstState, key, ok(false))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
  })

  it('records the typed failure — this is what blocks voting', () => {
    const next = withVoteStateResult(
      initialThirstState,
      key,
      err(ThirstExceptions.notSignedIn()),
    )
    expect(next.byFeatureKey[key]?.voteStateException?.kind).toBe('notSignedIn')
  })
})

describe('withCountsFetchStarted / withCountsResult', () => {
  it('flags the fetch in flight', () => {
    const next = withCountsFetchStarted(initialThirstState, key)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(true)
  })

  it('installs the counts on success', () => {
    const next = withCountsResult(initialThirstState, key, ok(thirstCountsFixture))
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(false)
  })

  it('a counts failure is non-blocking — leaves prior counts and voteStateException untouched', () => {
    const loaded = withCountsResult(initialThirstState, key, ok(thirstCountsFixture))
    const next = withCountsResult(loaded, key, err(ThirstExceptions.unknown('boom')))
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
    expect(next.byFeatureKey[key]?.voteStateException).toBeNull()
  })
})

describe('withVoteStarted', () => {
  it('flags voting in flight and clears a prior retry error', () => {
    const failed = withVoteResult(
      initialThirstState,
      key,
      err(ThirstExceptions.unknown('x')),
    )
    const next = withVoteStarted(failed, key)
    expect(next.byFeatureKey[key]).toMatchObject({ isVoting: true, voteException: null })
  })
})

describe('withVoteResult — the atomic one', () => {
  it('locks to voted and bumps the web tally on a confirmed vote', () => {
    const votable = withCountsResult(initialThirstState, key, ok(thirstCountsFixture))
    const next = withVoteResult(votable, key, ok(true))
    const entry = next.byFeatureKey[key]
    expect(entry?.alreadyVoted).toBe(true)
    expect(entry?.isVoting).toBe(false)
    expect(entry?.counts?.total).toBe(thirstCountsFixture.total + 1)
    expect(entry?.counts?.perPlatform[VotePlatform.web]).toBe(1)
  })

  it('bumps the total without disturbing other platforms\' tallies', () => {
    const votable = withCountsResult(initialThirstState, key, ok(thirstCountsFixture))
    const next = withVoteResult(votable, key, ok(true))
    expect(next.byFeatureKey[key]?.counts?.perPlatform[VotePlatform.ios]).toBe(
      thirstCountsFixture.perPlatform.ios,
    )
  })

  it('ok(false) — no vote recorded — leaves the surface votable, unchanged otherwise', () => {
    const votable = withVoteStarted(
      withCountsResult(initialThirstState, key, ok(thirstCountsFixture)),
      key,
    )
    const next = withVoteResult(votable, key, ok(false))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
    expect(next.byFeatureKey[key]?.isVoting).toBe(false)
  })

  it('on failure keeps the surface votable and surfaces the retry error', () => {
    const votable = withVoteStarted(
      withCountsResult(initialThirstState, key, ok(thirstCountsFixture)),
      key,
    )
    const next = withVoteResult(votable, key, err(ThirstExceptions.offline()))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
    expect(next.byFeatureKey[key]?.voteException?.kind).toBe('offline')
  })

  it('starts from empty counts when a vote is confirmed before any fetch ever landed', () => {
    const next = withVoteResult(initialThirstState, key, ok(true))
    expect(next.byFeatureKey[key]?.counts).toEqual({
      featureKey: key,
      total: 1,
      perPlatform: { web: 1 },
    })
  })

  it('never disturbs a sibling feature key\'s entry', () => {
    const seeded = thirstStateMocks.matrixVotable
    const next = withVoteResult(seeded, 'board', ok(true))
    expect(next.byFeatureKey[key]).toEqual(seeded.byFeatureKey[key])
  })

  it('a second ok(true) for an already-voted entry does not double-bump the count — the race case', () => {
    const votable = withCountsResult(initialThirstState, key, ok(thirstCountsFixture))
    const votedOnce = withVoteResult(votable, key, ok(true))
    const votedAgain = withVoteResult(votedOnce, key, ok(true))
    expect(votedAgain.byFeatureKey[key]?.counts?.total).toBe(
      votedOnce.byFeatureKey[key]?.counts?.total,
    )
    expect(votedAgain.byFeatureKey[key]?.counts?.perPlatform.web).toBe(1)
  })
})
