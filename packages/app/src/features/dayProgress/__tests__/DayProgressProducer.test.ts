import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { dayProgressSeed } from '../pages/__tests__/dayProgressFixtures'
import { makeDayProgressEndeavors } from '../DayProgressMocks'
import { loadDayProgressThunk } from '../DayProgressProducer'

const now = new Date(2026, 8, 24, 23, 0)
const endeavors = makeDayProgressEndeavors(now)

const run = async (
  localStore = makeInMemoryLocalStore(dayProgressSeed(endeavors, now)),
) => {
  const store = makeStore({ ...stubbedThunkExtra, localStore })
  const action = await store.dispatch(loadDayProgressThunk({ now }))
  if (!loadDayProgressThunk.fulfilled.match(action)) throw new Error('rejected')
  return action.payload
}

describe('loadDayProgressThunk', () => {
  it('resolves every stored endeavor, hydrated with its performances', async () => {
    const result = await run()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(endeavors.length)
      expect(
        result.value.find((e) => e.id === 'dp-deep-work')?.performances,
      ).toHaveLength(2)
    }
  })

  it('trims performances older than the window around the passed-in now', async () => {
    const result = await run()
    if (!result.ok) throw new Error('expected ok')
    expect(
      result.value.find((e) => e.id === 'dp-ancient')?.performances,
    ).toEqual([])
  })

  it('a failed read resolves err, never throws', async () => {
    const broken = makeInMemoryLocalStore()
    const result = await run({
      ...broken,
      endeavors: { ...broken.endeavors, all: () => Promise.reject('offline') },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('loadFailed')
      expect(result.error.message).toContain('offline')
    }
  })
})
