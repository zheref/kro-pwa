/**
 * The slice's own extraReducers wiring — `ThirstShifters.test.ts` proves each
 * Shifter in isolation; this proves the slice dispatches to the *right* one
 * per thunk lifecycle action, exactly as `EarnFeature.test.ts` does for Earn.
 */
import { describe, expect, it } from 'vitest'
import { THIRST_MOCK_FEATURE_KEY, thirstCountsFixture } from '../ThirstMocks'
import { initialThirstState, thirstSlice } from '../ThirstFeature'
import { castVoteThunk, checkVoteStateThunk, fetchCountsThunk } from '../ThirstProducer'

const reduce = (
  state: ReturnType<typeof thirstSlice.reducer>,
  action: Parameters<typeof thirstSlice.reducer>[1],
) => thirstSlice.reducer(state, action)

const key = THIRST_MOCK_FEATURE_KEY

const abortError = () => {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

describe('checkVoteStateThunk lifecycle', () => {
  it('pending flags the check in flight', () => {
    const next = reduce(
      initialThirstState,
      checkVoteStateThunk.pending('req', { featureKey: key }),
    )
    expect(next.byFeatureKey[key]?.isCheckingVoteState).toBe(true)
  })

  it('fulfilled(ok(true)) records already-voted', () => {
    const next = reduce(
      initialThirstState,
      checkVoteStateThunk.fulfilled({ ok: true, value: true }, 'req', { featureKey: key }),
    )
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(true)
  })

  it('fulfilled(err(notSignedIn)) blocks voting with the typed reason', () => {
    const next = reduce(
      initialThirstState,
      checkVoteStateThunk.fulfilled(
        { ok: false, error: { kind: 'notSignedIn', message: 'x', recoverable: false } },
        'req',
        { featureKey: key },
      ),
    )
    expect(next.byFeatureKey[key]?.voteStateException?.kind).toBe('notSignedIn')
  })

  it('rejected degrades to the defensive unknown exception', () => {
    const next = reduce(
      initialThirstState,
      checkVoteStateThunk.rejected(new Error('kaboom'), 'req', { featureKey: key }),
    )
    expect(next.byFeatureKey[key]?.voteStateException?.kind).toBe('unknown')
  })

  it('stays silent on an aborted check', () => {
    const started = reduce(
      initialThirstState,
      checkVoteStateThunk.pending('req', { featureKey: key }),
    )
    const next = reduce(
      started,
      checkVoteStateThunk.rejected(abortError(), 'req', { featureKey: key }),
    )
    expect(next.byFeatureKey[key]).toEqual(started.byFeatureKey[key])
  })
})

describe('fetchCountsThunk lifecycle', () => {
  it('pending flags the fetch in flight', () => {
    const next = reduce(
      initialThirstState,
      fetchCountsThunk.pending('req', { featureKey: key }),
    )
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(true)
  })

  it('fulfilled(ok(...)) installs the counts', () => {
    const next = reduce(
      initialThirstState,
      fetchCountsThunk.fulfilled({ ok: true, value: thirstCountsFixture }, 'req', {
        featureKey: key,
      }),
    )
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
  })

  it('fulfilled(err(...)) is non-blocking — clears the flag, leaves counts alone', () => {
    const loaded = reduce(
      initialThirstState,
      fetchCountsThunk.fulfilled({ ok: true, value: thirstCountsFixture }, 'req', {
        featureKey: key,
      }),
    )
    const next = reduce(
      loaded,
      fetchCountsThunk.fulfilled(
        { ok: false, error: { kind: 'offline', message: 'x', recoverable: true } },
        'req',
        { featureKey: key },
      ),
    )
    expect(next.byFeatureKey[key]?.counts).toEqual(thirstCountsFixture)
    expect(next.byFeatureKey[key]?.isLoadingCounts).toBe(false)
  })
})

describe('castVoteThunk lifecycle', () => {
  const arg = { featureKey: key, id: 'vote-1' }

  it('pending flags voting in flight', () => {
    const next = reduce(initialThirstState, castVoteThunk.pending('req', arg))
    expect(next.byFeatureKey[key]?.isVoting).toBe(true)
  })

  it('fulfilled(ok(true)) locks to voted', () => {
    const next = reduce(
      initialThirstState,
      castVoteThunk.fulfilled({ ok: true, value: true }, 'req', arg),
    )
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(true)
    expect(next.byFeatureKey[key]?.counts?.perPlatform.web).toBe(1)
  })

  it('fulfilled(err(...)) surfaces the retry error and stays votable', () => {
    const next = reduce(
      initialThirstState,
      castVoteThunk.fulfilled(
        { ok: false, error: { kind: 'unknown', message: 'insert failed', recoverable: true } },
        'req',
        arg,
      ),
    )
    expect(next.byFeatureKey[key]?.alreadyVoted).toBe(false)
    expect(next.byFeatureKey[key]?.voteException?.message).toBe('insert failed')
  })

  it('rejected degrades to the defensive unknown exception, isVoting cleared', () => {
    const next = reduce(
      initialThirstState,
      castVoteThunk.rejected(new Error('kaboom'), 'req', arg),
    )
    expect(next.byFeatureKey[key]?.isVoting).toBe(false)
    expect(next.byFeatureKey[key]?.voteException?.kind).toBe('unknown')
  })
})
