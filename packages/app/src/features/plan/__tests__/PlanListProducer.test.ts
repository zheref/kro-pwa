/**
 * The list's delete effect, dispatched for real against a stubbed `LocalStore`
 * injected through `ThunkExtra` (`RC-54`, `RC-35`).
 *
 * The assertions are on the resolved `Result` and on what the store holds
 * afterwards — a Producer's contract is what it resolves and what it wrote,
 * never what it left in a slice.
 */
import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { PLAN_REFERENCE_DAY, PLAN_REFERENCE_NOW, planAt } from '../PlanMocks'
import { deletePlanEndeavorThunk } from '../PlanProducer'

const task = (id: string): Endeavor =>
  makeEndeavor({
    id,
    title: `Task ${id}`,
    kind: EndeavorKind.task,
    due: planAt(16),
    value: 3,
    hostedBy: [EndeavorHost.local],
  })

const recordOf = (endeavor: Endeavor): EndeavorRecord =>
  endeavorRecordFromEndeavor(endeavor, { now: PLAN_REFERENCE_DAY })

const storeWith = (records: readonly EndeavorRecord[]) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return { localStore, store: makeStore({ ...stubbedThunkExtra, localStore }) }
}

describe('deletePlanEndeavorThunk', () => {
  it('tombstones the row the user swiped away and names it in the result', async () => {
    const { localStore, store } = storeWith([recordOf(task('doomed'))])

    const result = await store
      .dispatch(
        deletePlanEndeavorThunk({
          endeavorId: 'doomed',
          now: PLAN_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.endeavorId).toBe('doomed')

    // `all()` returns LIVE rows; the tombstone itself survives in
    // `allIncludingRemoved`, which is what a later sync carries.
    expect(await localStore.endeavors.all()).toEqual([])
    const tombstoned = await localStore.endeavors.allIncludingRemoved()
    expect(tombstoned[0]?.deletedAtEpochMillis).not.toBeNull()
  })

  it('leaves every other row untouched — a swipe deletes one thing', async () => {
    const { localStore, store } = storeWith([
      recordOf(task('doomed')),
      recordOf(task('spared')),
    ])

    await store.dispatch(
      deletePlanEndeavorThunk({
        endeavorId: 'doomed',
        now: PLAN_REFERENCE_NOW,
      }),
    )

    const records = await localStore.endeavors.all()
    expect(records.map((record) => record.id)).toEqual(['spared'])
  })

  it('resolves an error rather than throwing when the store refuses the write', async () => {
    const base = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          softDelete: async () => {
            throw new Error('store unavailable')
          },
        },
      },
    })

    const result = await store
      .dispatch(
        deletePlanEndeavorThunk({
          endeavorId: 'doomed',
          now: PLAN_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('store unavailable')
    }
  })

  it('is a no-op the store accepts when the row is already gone', async () => {
    const { store } = storeWith([])

    const result = await store
      .dispatch(
        deletePlanEndeavorThunk({
          endeavorId: 'never-existed',
          now: PLAN_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok).toBe(true)
  })
})
