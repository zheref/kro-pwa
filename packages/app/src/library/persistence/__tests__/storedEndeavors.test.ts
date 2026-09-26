import {
  type Endeavor,
  type EndeavorRecord,
  deferRecordFromDefer,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  makeProject,
  performanceRecordFromPerform,
  projectRecordFromProject,
} from '@kro/core'
import { deferMocks, endeavorMocks, performMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { readStoredEndeavor, readStoredEndeavors } from '../storedEndeavors'

const NOW = new Date(2026, 0, 15, 9, 0, 0)
const NOW_MILLIS = epochMillisFromDate(NOW)
const FINANCES = makeProject({ id: 'project-finances', title: 'Finances' })

const withRelations: Endeavor = {
  ...endeavorMocks.plannedTask,
  defers: Object.values(deferMocks).slice(0, 1),
  performances: Object.values(performMocks).slice(0, 1),
}

const seededStore = ({
  endeavors = [withRelations],
  extraRecords = [],
  withProject = true,
  pendingDeletion = false,
}: {
  readonly endeavors?: readonly Endeavor[]
  readonly extraRecords?: readonly EndeavorRecord[]
  readonly withProject?: boolean
  readonly pendingDeletion?: boolean
} = {}) =>
  makeInMemoryLocalStore({
    endeavors: [
      ...endeavors.map((endeavor) =>
        endeavorRecordFromEndeavor(endeavor, { now: NOW }),
      ),
      ...extraRecords,
    ],
    projects: withProject
      ? [projectRecordFromProject(FINANCES, { now: NOW })]
      : [],
    defers: endeavors.flatMap((endeavor) =>
      endeavor.defers.map((entry) => ({
        ...deferRecordFromDefer(entry, {
          endeavorId: endeavor.id,
          now: NOW,
          nowMillis: NOW_MILLIS,
        }),
        pendingDeletion,
      })),
    ),
    performances: endeavors.flatMap((endeavor) =>
      endeavor.performances.map((entry) =>
        performanceRecordFromPerform(entry, {
          endeavorId: endeavor.id,
          nowMillis: NOW_MILLIS,
        }),
      ),
    ),
  })

describe('readStoredEndeavors', () => {
  it('hydrates every stored endeavor with its defers and performances (Do opening the day)', async () => {
    const [endeavor] = await readStoredEndeavors(seededStore())
    expect(endeavor?.id).toBe(withRelations.id)
    expect(endeavor?.defers).toHaveLength(1)
    expect(endeavor?.performances).toHaveLength(1)
  })

  it('leaves the list unresolved unless asked (surfaces that never show lists)', async () => {
    const [endeavor] = await readStoredEndeavors(seededStore())
    expect(endeavor?.list ?? null).toBeNull()
  })

  it('looks each list up from the project table when asked (a Lists destination)', async () => {
    const [endeavor] = await readStoredEndeavors(seededStore(), {
      resolveLists: true,
    })
    expect(endeavor?.list?.id).toBe(FINANCES.id)
  })

  it('leaves list null when the project it names is gone (deleted list)', async () => {
    const [endeavor] = await readStoredEndeavors(
      seededStore({ withProject: false }),
      { resolveLists: true },
    )
    expect(endeavor?.list).toBeNull()
  })

  it('drops defers awaiting a remote delete (child row pending deletion)', async () => {
    const [endeavor] = await readStoredEndeavors(
      seededStore({ pendingDeletion: true }),
    )
    expect(endeavor?.defers).toHaveLength(0)
  })

  it('skips a row that fails to decode rather than blanking the surface', async () => {
    const corrupt = {
      ...endeavorRecordFromEndeavor(endeavorMocks.plannedTask, { now: NOW }),
      id: 'corrupt',
      kind: 'not-a-kind',
    } as EndeavorRecord
    const stored = await readStoredEndeavors(
      seededStore({ extraRecords: [corrupt] }),
    )
    expect(stored.map((endeavor) => endeavor.id)).toEqual([withRelations.id])
  })

  it('answers an empty store with no endeavors (first launch)', async () => {
    expect(await readStoredEndeavors(makeInMemoryLocalStore())).toEqual([])
  })
})

describe('readStoredEndeavor', () => {
  it('hydrates the one endeavor asked for with its own relations (Activity pane)', async () => {
    const endeavor = await readStoredEndeavor(seededStore(), withRelations.id)
    expect(endeavor?.defers).toHaveLength(1)
    expect(endeavor?.performances).toHaveLength(1)
  })

  it('answers null for an id that is not stored (a stale selection)', async () => {
    expect(await readStoredEndeavor(seededStore(), 'missing')).toBeNull()
  })

  it('answers null for a row that fails to decode', async () => {
    const corrupt = {
      ...endeavorRecordFromEndeavor(endeavorMocks.plannedTask, { now: NOW }),
      id: 'corrupt',
      kind: 'not-a-kind',
    } as EndeavorRecord
    expect(
      await readStoredEndeavor(
        seededStore({ endeavors: [], extraRecords: [corrupt] }),
        'corrupt',
      ),
    ).toBeNull()
  })
})
