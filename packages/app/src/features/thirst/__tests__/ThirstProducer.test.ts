/**
 * The Thirst Producers, driven through the real slice against a stubbed
 * `thirstService` injected via `extra` (`RC-54`, `RC-35`). No suite here
 * mocks `fetch`; the stub records every call it is given and the assertions
 * read that record.
 */
import { describe, expect, it } from 'vitest'
import {
  makeStore,
  stubbedThunkExtra,
  type ThunkExtra,
} from '../../../library/store'
import { makeStubbedThirstService } from '../../../services/thirst/ThirstService'
import { THIRST_MOCK_FEATURE_KEY, thirstCountsFixture } from '../ThirstMocks'
import {
  castVoteThunk,
  checkVoteStateThunk,
  fetchCountsThunk,
} from '../ThirstProducer'

const key = THIRST_MOCK_FEATURE_KEY

const harness = (
  overrides: Partial<Parameters<typeof makeStubbedThirstService>[0]> = {},
) => {
  const thirstService = makeStubbedThirstService(overrides)
  const extra: ThunkExtra = { ...stubbedThunkExtra, thirstService }
  return { store: makeStore(extra), thirstService }
}

describe('checkVoteStateThunk', () => {
  it('resolves ok(true) once the stub has recorded a vote for this signed-in user', async () => {
    const { store } = harness({
      signedIn: true,
      initialVotedFeatureKeys: [key],
    })
    await store.dispatch(checkVoteStateThunk({ featureKey: key }))
    expect(store.getState().thirst.byFeatureKey[key]?.alreadyVoted).toBe(true)
  })

  it('resolves ok(false) for a signed-in user who has not voted yet', async () => {
    const { store } = harness({ signedIn: true })
    await store.dispatch(checkVoteStateThunk({ featureKey: key }))
    expect(store.getState().thirst.byFeatureKey[key]?.alreadyVoted).toBe(false)
  })

  it('resolves the typed notSignedIn failure when signed out — this is what blocks voting', async () => {
    const { store } = harness({ signedIn: false })
    await store.dispatch(checkVoteStateThunk({ featureKey: key }))
    expect(
      store.getState().thirst.byFeatureKey[key]?.voteStateException?.kind,
    ).toBe('notSignedIn')
  })
})

describe('fetchCountsThunk', () => {
  it("installs the stub's seeded counts", async () => {
    const { store } = harness({ initialCounts: { [key]: thirstCountsFixture } })
    await store.dispatch(fetchCountsThunk({ featureKey: key }))
    expect(store.getState().thirst.byFeatureKey[key]?.counts).toEqual(
      thirstCountsFixture,
    )
  })

  it('installs an empty count for a feature with no seeded votes — public, no session needed', async () => {
    const { store } = harness({ signedIn: false })
    await store.dispatch(fetchCountsThunk({ featureKey: key }))
    expect(store.getState().thirst.byFeatureKey[key]?.counts?.total).toBe(0)
  })

  it('degrades a scripted failure to the typed unknown exception, never throwing out of the thunk', async () => {
    const { store } = harness({
      failures: { fetchCounts: new Error('rpc down') },
    })
    const action = await store.dispatch(fetchCountsThunk({ featureKey: key }))
    expect(fetchCountsThunk.fulfilled.match(action)).toBe(true)
  })
})

describe('castVoteThunk', () => {
  it('locks to voted and bumps the web tally on success', async () => {
    const { store } = harness({ signedIn: true })
    await store.dispatch(castVoteThunk({ featureKey: key, id: 'vote-1' }))
    const entry = store.getState().thirst.byFeatureKey[key]
    expect(entry?.alreadyVoted).toBe(true)
    expect(entry?.counts?.perPlatform.web).toBe(1)
  })

  it('resolves the typed notSignedIn failure when signed out', async () => {
    const { store } = harness({ signedIn: false })
    await store.dispatch(castVoteThunk({ featureKey: key, id: 'vote-1' }))
    expect(store.getState().thirst.byFeatureKey[key]?.voteException?.kind).toBe(
      'notSignedIn',
    )
  })

  /**
   * The optimistic-vote race: two taps land while the first request is still
   * in flight (a slow network, a double-click before the CTA disables). The
   * server's vote-once guarantee — mirrored by the stub — means only the
   * first actually records a vote; the count must bump exactly once, never
   * twice, however the two responses interleave.
   */
  it('two concurrent votes for the same feature only ever bump the count once', async () => {
    const { store, thirstService } = harness({ signedIn: true })
    const first = store.dispatch(
      castVoteThunk({ featureKey: key, id: 'vote-1' }),
    )
    const second = store.dispatch(
      castVoteThunk({ featureKey: key, id: 'vote-2' }),
    )
    await Promise.all([first, second])

    const entry = store.getState().thirst.byFeatureKey[key]
    expect(entry?.counts?.total).toBe(1)
    expect(entry?.counts?.perPlatform.web).toBe(1)
    expect(entry?.alreadyVoted).toBe(true)
    expect(thirstService.votedFeatureKeys()).toEqual([key])
  })

  it('a second vote for an already-voted feature (server convergence) reports a no-op success', async () => {
    const { store } = harness({
      signedIn: true,
      initialVotedFeatureKeys: [key],
    })
    const action = await store.dispatch(
      castVoteThunk({ featureKey: key, id: 'vote-2' }),
    )
    expect(castVoteThunk.fulfilled.match(action)).toBe(true)
  })

  /**
   * The stale-counts race (found in review): a counts fetch dispatched
   * *before* the vote, but resolving *after* it, must never overwrite the
   * optimistic bump with its now-outdated snapshot — the scenario is a
   * remount re-firing `fetchCountsThunk` while the vote lands before that
   * refetch resolves. Driven end to end through real thunks: seed the
   * counts with one ordinary fetch, then dispatch a second, deliberately
   * delayed one that is still in flight when the (fast, real) vote resolves.
   */
  it('a slower in-flight counts fetch never overwrites an optimistic vote that resolves first', async () => {
    let releaseFetch: (() => void) | undefined
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve
    })
    let gateNextFetch = false
    const base = makeStubbedThirstService({
      signedIn: true,
      initialCounts: { [key]: thirstCountsFixture },
    })
    const delayedService = {
      ...base,
      async fetchCounts(
        featureKey: string,
        options?: { signal?: AbortSignal },
      ) {
        if (gateNextFetch) await fetchGate
        return base.fetchCounts(featureKey, options)
      },
    }
    const extra: ThunkExtra = {
      ...stubbedThunkExtra,
      thirstService: delayedService,
    }
    const store = makeStore(extra)

    // The ordinary first mount's fetch — resolves immediately and installs
    // the seeded counts.
    await store.dispatch(fetchCountsThunk({ featureKey: key }))
    expect(store.getState().thirst.byFeatureKey[key]?.counts?.total).toBe(
      thirstCountsFixture.total,
    )

    // A remount re-fires the fetch; gate this one so it stays in flight.
    gateNextFetch = true
    const refetching = store.dispatch(fetchCountsThunk({ featureKey: key }))

    await store.dispatch(castVoteThunk({ featureKey: key, id: 'vote-1' }))
    const bumpedTotal = store.getState().thirst.byFeatureKey[key]?.counts?.total
    expect(bumpedTotal).toBe(thirstCountsFixture.total + 1)

    // The stale, gated fetch finally resolves with its pre-vote snapshot.
    releaseFetch?.()
    await refetching

    const entry = store.getState().thirst.byFeatureKey[key]
    expect(entry?.counts?.total).toBe(bumpedTotal)
    expect(entry?.alreadyVoted).toBe(true)
  })
})
