import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { activityEndeavorMocks } from '../EndeavorActivityMocks'
import { loadEndeavorActivityThunk } from '../EndeavorActivityProducer'
import { activityStore } from '../pages/__tests__/endeavorActivityScenes'

const resultOf = async (
  store: ReturnType<typeof activityStore>,
  endeavorId: string,
) => {
  const action = await store.dispatch(loadEndeavorActivityThunk({ endeavorId }))
  if (!loadEndeavorActivityThunk.fulfilled.match(action)) {
    throw new Error('the Producer must never reject')
  }
  return action.payload
}

describe('loadEndeavorActivityThunk', () => {
  it('resolves a habit with its performances read from the store', async () => {
    const result = await resultOf(
      activityStore(),
      activityEndeavorMocks.habit.id,
    )
    expect(result.ok && result.value.rows).toHaveLength(2)
  })
  it('keeps session fragments across the store round-trip', async () => {
    const result = await resultOf(
      activityStore(),
      activityEndeavorMocks.many.id,
    )
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.rows.some((row) => row.duration === 65 * 60)).toBe(true)
  })
  it('reads only the one endeavor it was asked for, never the whole table', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          all: () => Promise.reject(new Error('whole-table read')),
        },
      },
    })
    const result = await resultOf(store, 'missing')
    expect(!result.ok && result.error.kind).toBe('endeavorNotFound')
  })
  it('resolves err(endeavorNotFound), never throwing, for a missing id', async () => {
    const result = await resultOf(activityStore(), 'missing')
    expect(!result.ok && result.error.kind).toBe('endeavorNotFound')
  })
  it('resolves err(loadFailed) when the store read throws', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          get: () => Promise.reject(new Error('io')),
        },
      },
    })
    const result = await resultOf(store, 'x')
    expect(!result.ok && result.error.message).toContain('io')
  })
})
