/**
 * The fixture helpers, proven in isolation before other suites lean on them.
 */
import { describe, expect, it } from 'vitest'
import { earnStateMocks } from '../../EarnMocks'
import {
  loadEarnCatalogThunk,
  loadEarnPreferencesThunk,
} from '../../EarnProducer'
import { rootWith, makeSeededEarnStore } from './earnFixtures'

describe('rootWith', () => {
  it('carries the earn state through untouched (typical catalog)', () => {
    const state = rootWith(earnStateMocks.loadedTypical)
    expect(state.earn).toBe(earnStateMocks.loadedTypical)
  })

  it('fills every other registered slice with its own initial state', () => {
    const state = rootWith(earnStateMocks.idle)
    expect(state.do.load.kind).toBe('idle')
    expect(state.main).toBeDefined()
  })
})

describe('makeSeededEarnStore', () => {
  it('reaches the typical catalog through the real preferences + performance thunks', async () => {
    const store = makeSeededEarnStore()
    await store.dispatch(loadEarnPreferencesThunk())
    await store.dispatch(loadEarnCatalogThunk())

    const state = store.getState().earn
    expect(state.load.kind).toBe('loaded')
    expect(state.rewards.length).toBe(3)
    expect(state.performances.length).toBe(3)
  })

  it('reaches the empty catalog when asked for one', async () => {
    const store = makeSeededEarnStore({ withCatalog: false })
    await store.dispatch(loadEarnCatalogThunk())

    const state = store.getState().earn
    expect(state.rewards).toEqual([])
    expect(state.performances).toEqual([])
  })

  it('seeds a claimed id so the reward starts out already spent', async () => {
    const { rewardMocks } = await import('@kro/core/mocks')
    const store = makeSeededEarnStore({
      claimedRewardIds: [rewardMocks.bobaTea.id],
    })
    await store.dispatch(loadEarnCatalogThunk())

    expect(store.getState().earn.claimedRewardIds).toEqual([
      rewardMocks.bobaTea.id,
    ])
  })
})
