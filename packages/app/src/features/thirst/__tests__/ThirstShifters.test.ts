import { err, ok } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { ThirstExceptions } from '../ThirstException'
import { initialThirstState } from '../ThirstFeature'
import {
  THIRST_MOCK_FEATURE_KEY,
  thirstCountsFixture,
  thirstStateMocks,
} from '../ThirstMocks'
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
const REQ = 'req-1'

describe('withVoteStateCheckStarted', () => {
  it('flags the check in flight for a fresh feature key', () => {
    const next = withVoteStateCheckStarted(initialThirstState, key, REQ)
    expect(next.byFeatureKey[key]?.isCheckingVoteState).toBe(true)
  })

  it('clears a stale exception so a retry surfaces loading, not the old failure', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const failed = withVoteStateResult(
      started,
      key,
      REQ,
      err(ThirstExceptions.offline()),
    )
    const next = withVoteStateCheckStarted(failed, key, 'req-2')
    expect(next.byFeatureKey[key]?.voteStateException).toBeNull()
  })

  it('is a no-op on every other feature key already in state', () => {
    const withOther = withVoteStateCheckStarted(
      initialThirstState,
      'board',
      REQ,
    )
    const next = withVoteStateCheckStarted(withOther, key, REQ)
    expect(next.byFeatureKey.board?.isCheckingVoteState).toBe(true)
  })
})

describe('withVoteStateResult', () => {
  it('records already-voted on a true success', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const next = withVoteStateResult(started, key, REQ, ok(true))
    expect(next.byFeatureKey[key]).toMatchObject({
      alreadyVoted: true,
      isCheckingVoteState: false,
      voteStateException: null,
    })
  })

  it('leaves alreadyVoted false on a false success — not yet voted', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const next = withVoteStateResult(started, key, REQ, ok(false))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
  })

  it('records the typed failure — this is what blocks voting', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const next = withVoteStateResult(
      started,
      key,
      REQ,
      err(ThirstExceptions.notSignedIn()),
    )
    expect(next.byFeatureKey[key]?.voteStateException?.kind).toBe('notSignedIn')
  })

  it('drops a response whose requestId does not match the currently-tracked one — superseded by a newer dispatch', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const restarted = withVoteStateCheckStarted(started, key, 'req-2')
    // The OLD request's late response arrives after a newer one was dispatched.
    const next = withVoteStateResult(restarted, key, REQ, ok(true))
    expect(next).toBe(restarted)
  })

  it('a response that predates a vote confirmed while it was in flight never reverts alreadyVoted', () => {
    const started = withVoteStateCheckStarted(initialThirstState, key, REQ)
    const votedWhileChecking = withVoteResult(started, key, ok(true))
    // The check's own (now-stale) "not yet voted" answer lands after.
    const next = withVoteStateResult(votedWhileChecking, key, REQ, ok(false))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(true)
    expect(next.byFeatureKey[key]?.isCheckingVoteState).toBe(false)
  })
})

describe('withCountsFetchStarted / withCountsResult', () => {
  it('flags the fetch in flight', () => {
    const next = withCountsFetchStarted(initialThirstState, key, REQ)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(true)
  })

  it('installs the counts on success', () => {
    const started = withCountsFetchStarted(initialThirstState, key, REQ)
    const next = withCountsResult(started, key, REQ, ok(thirstCountsFixture))
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(false)
  })

  it('a counts failure is non-blocking — leaves prior counts and voteStateException untouched', () => {
    const loaded = withCountsResult(
      withCountsFetchStarted(initialThirstState, key, REQ),
      key,
      REQ,
      ok(thirstCountsFixture),
    )
    const reFetching = withCountsFetchStarted(loaded, key, 'req-2')
    const next = withCountsResult(
      reFetching,
      key,
      'req-2',
      err(ThirstExceptions.unknown('boom')),
    )
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
    expect(next.byFeatureKey[key]?.voteStateException).toBeNull()
  })

  it('drops a response whose requestId does not match the currently-tracked one — a stale fetch from before a remount', () => {
    const started = withCountsFetchStarted(initialThirstState, key, REQ)
    const remounted = withCountsFetchStarted(started, key, 'req-2')
    const next = withCountsResult(remounted, key, REQ, ok(thirstCountsFixture))
    expect(next).toBe(remounted)
  })

  it('a response that predates a vote confirmed while it was in flight never overwrites the optimistic bump', () => {
    const votable = withCountsResult(
      withCountsFetchStarted(initialThirstState, key, REQ),
      key,
      REQ,
      ok(thirstCountsFixture),
    )
    const refetching = withCountsFetchStarted(votable, key, 'req-2')
    const votedWhileFetching = withVoteResult(refetching, key, ok(true))
    const bumpedTotal = votedWhileFetching.byFeatureKey[key]?.counts?.total
    // The slower fetch (dispatched before the vote) finally resolves with
    // its stale, pre-vote snapshot.
    const next = withCountsResult(
      votedWhileFetching,
      key,
      'req-2',
      ok(thirstCountsFixture),
    )
    expect(next.byFeatureKey[key]?.counts?.total).toBe(bumpedTotal)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(false)
  })

  it('a fetch dispatched AFTER the vote confirms is trusted normally — its answer is genuinely fresher', () => {
    const votedFirst = withVoteResult(initialThirstState, key, ok(true))
    const fetchedAfter = withCountsFetchStarted(votedFirst, key, REQ)
    const serverConfirmedTotal = { ...thirstCountsFixture, total: 99 }
    const next = withCountsResult(
      fetchedAfter,
      key,
      REQ,
      ok(serverConfirmedTotal),
    )
    expect(next.byFeatureKey[key]?.counts?.total).toBe(99)
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
    expect(next.byFeatureKey[key]).toMatchObject({
      isVoting: true,
      voteException: null,
    })
  })
})

describe('withVoteResult — the atomic one', () => {
  it('locks to voted and bumps the web tally on a confirmed vote', () => {
    const votable = withCountsResult(
      withCountsFetchStarted(initialThirstState, key, REQ),
      key,
      REQ,
      ok(thirstCountsFixture),
    )
    const next = withVoteResult(votable, key, ok(true))
    const entry = next.byFeatureKey[key]
    expect(entry?.alreadyVoted).toBe(true)
    expect(entry?.isVoting).toBe(false)
    expect(entry?.counts?.total).toBe(thirstCountsFixture.total + 1)
    expect(entry?.counts?.perPlatform[VotePlatform.web]).toBe(1)
  })

  it('bumps voteEpoch so an in-flight fetch/check dispatched before it recognizes its own stale response', () => {
    const next = withVoteResult(initialThirstState, key, ok(true))
    expect(next.byFeatureKey[key]?.voteEpoch).toBe(1)
  })

  it("bumps the total without disturbing other platforms' tallies", () => {
    const votable = withCountsResult(
      withCountsFetchStarted(initialThirstState, key, REQ),
      key,
      REQ,
      ok(thirstCountsFixture),
    )
    const next = withVoteResult(votable, key, ok(true))
    expect(next.byFeatureKey[key]?.counts?.perPlatform[VotePlatform.ios]).toBe(
      thirstCountsFixture.perPlatform.ios,
    )
  })

  it('ok(false) — no vote recorded — leaves the surface votable, unchanged otherwise', () => {
    const votable = withVoteStarted(
      withCountsResult(
        withCountsFetchStarted(initialThirstState, key, REQ),
        key,
        REQ,
        ok(thirstCountsFixture),
      ),
      key,
    )
    const next = withVoteResult(votable, key, ok(false))
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
    expect(next.byFeatureKey[key]?.isVoting).toBe(false)
  })

  it('on failure keeps the surface votable and surfaces the retry error', () => {
    const votable = withVoteStarted(
      withCountsResult(
        withCountsFetchStarted(initialThirstState, key, REQ),
        key,
        REQ,
        ok(thirstCountsFixture),
      ),
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

  it("never disturbs a sibling feature key's entry", () => {
    const seeded = thirstStateMocks.matrixVotable
    const next = withVoteResult(seeded, 'board', ok(true))
    expect(next.byFeatureKey[key]).toEqual(seeded.byFeatureKey[key])
  })

  it('a second ok(true) for an already-voted entry does not double-bump the count — the race case', () => {
    const votable = withCountsResult(
      withCountsFetchStarted(initialThirstState, key, REQ),
      key,
      REQ,
      ok(thirstCountsFixture),
    )
    const votedOnce = withVoteResult(votable, key, ok(true))
    const votedAgain = withVoteResult(votedOnce, key, ok(true))
    expect(votedAgain.byFeatureKey[key]?.counts?.total).toBe(
      votedOnce.byFeatureKey[key]?.counts?.total,
    )
    expect(votedAgain.byFeatureKey[key]?.counts?.perPlatform.web).toBe(1)
  })
})
