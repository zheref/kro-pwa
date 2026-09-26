import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  endeavorActivitySlice,
  onActivityRequested,
  userDidSelectActivityTab,
} from '../EndeavorActivityFeature'
import {
  EndeavorActivityMocks,
  activityEndeavorMocks,
} from '../EndeavorActivityMocks'
import { loadEndeavorActivityThunk } from '../EndeavorActivityProducer'
import { activityStore } from '../pages/__tests__/endeavorActivityScenes'

const reduce = endeavorActivitySlice.reducer

describe('onActivityRequested', () => {
  it('stamps the endeavor when the pane first opens', () => {
    expect(
      reduce(
        EndeavorActivityMocks.idle,
        onActivityRequested({ endeavorId: 'a' }),
      ).endeavorId,
    ).toBe('a')
  })
  it('resets to All when another endeavor is opened', () => {
    expect(
      reduce(
        EndeavorActivityMocks.loadedManyCompleteTab,
        onActivityRequested({ endeavorId: 'b' }),
      ).tab,
    ).toBe('all')
  })
  it('is a no-op when the same endeavor is re-requested', () => {
    const state = EndeavorActivityMocks.loadedManyCompleteTab
    expect(
      reduce(
        state,
        onActivityRequested({ endeavorId: state.endeavorId ?? '' }),
      ),
    ).toEqual(state)
  })
})

describe('userDidSelectActivityTab', () => {
  it('selects Aborted', () => {
    expect(
      reduce(
        EndeavorActivityMocks.loadedMany,
        userDidSelectActivityTab({ tab: 'aborted' }),
      ).tab,
    ).toBe('aborted')
  })
  it('returns to All from a filtered tab', () => {
    expect(
      reduce(
        EndeavorActivityMocks.loadedManyCompleteTab,
        userDidSelectActivityTab({ tab: 'all' }),
      ).tab,
    ).toBe('all')
  })
  it('re-selecting the current tab leaves the rest untouched', () => {
    const state = EndeavorActivityMocks.loadedMany
    expect(reduce(state, userDidSelectActivityTab({ tab: 'all' }))).toEqual(
      state,
    )
  })
})

describe('onActivityLoadCompleted lifecycle', () => {
  it('happy: installs a task’s rows', async () => {
    const store = activityStore()
    await store.dispatch(
      loadEndeavorActivityThunk({ endeavorId: activityEndeavorMocks.many.id }),
    )
    const { load } = store.getState().endeavorActivity
    expect(load.kind === 'loaded' && load.rows).toHaveLength(4)
  })
  it('failure: an unknown id lands as endeavorNotFound', async () => {
    const store = activityStore()
    await store.dispatch(loadEndeavorActivityThunk({ endeavorId: 'nope' }))
    const { load } = store.getState().endeavorActivity
    expect(load.kind === 'failed' && load.exception.kind).toBe(
      'endeavorNotFound',
    )
  })
  it('edge: pending shows loading, and an abort leaves no exception', async () => {
    const store = activityStore()
    const effect = store.dispatch(
      loadEndeavorActivityThunk({ endeavorId: activityEndeavorMocks.many.id }),
    )
    expect(store.getState().endeavorActivity.load.kind).toBe('loading')
    effect.abort()
    await effect
    expect(store.getState().endeavorActivity.load.kind).toBe('loading')
  })
  it('defensive rejected arm degrades to an unknown exception', () => {
    const next = reduce(
      EndeavorActivityMocks.loading,
      loadEndeavorActivityThunk.rejected(new Error('boom'), 'req', {
        endeavorId: 'x',
      }),
    )
    expect(next.load.kind === 'failed' && next.load.exception.kind).toBe(
      'unknown',
    )
  })
  it('a store read failure lands as loadFailed', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          get: () => Promise.reject(new Error('disk')),
        },
      },
    })
    await store.dispatch(loadEndeavorActivityThunk({ endeavorId: 'x' }))
    const { load } = store.getState().endeavorActivity
    expect(load.kind === 'failed' && load.exception.kind).toBe('loadFailed')
  })
})
