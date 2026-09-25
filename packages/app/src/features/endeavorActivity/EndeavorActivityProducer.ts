/**
 * Endeavor Activity's Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`): reads the
 * endeavor with its performances through `extra.localStore`, never throws,
 * always resolves a `Result`.
 */
import {
  type Endeavor,
  type LocalStore,
  type Result,
  deferFromRecord,
  endeavorFromRecord,
  err,
  livingChildRecords,
  ok,
  performFromRecord,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import {
  type EndeavorActivityException,
  EndeavorActivityExceptions,
} from './EndeavorActivityException'
import {
  type ActivityEndeavor,
  type ActivityRow,
  activityRowsFor,
} from './EndeavorActivityRows'

export interface EndeavorActivitySnapshot {
  readonly endeavor: ActivityEndeavor
  readonly rows: readonly ActivityRow[]
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Every stored endeavor, hydrated with its relations — the Do Producer's
 * helper, copied rather than imported because a feature never reaches into a
 * sibling feature's module (`UZF-6`).
 */
const readStoredEndeavors = async (
  localStore: LocalStore,
): Promise<readonly Endeavor[]> => {
  const [endeavorRecords, deferRecords, performanceRecords] = await Promise.all(
    [
      localStore.endeavors.all(),
      localStore.defers.all(),
      localStore.performances.all(),
    ],
  )
  const defersByEndeavor = new Map<
    string,
    ReturnType<typeof deferFromRecord>[]
  >()
  for (const record of livingChildRecords(deferRecords)) {
    const bucket = defersByEndeavor.get(record.endeavorId) ?? []
    bucket.push(deferFromRecord(record))
    defersByEndeavor.set(record.endeavorId, bucket)
  }
  const performancesByEndeavor = new Map<
    string,
    ReturnType<typeof performFromRecord>[]
  >()
  for (const record of livingChildRecords(performanceRecords)) {
    const bucket = performancesByEndeavor.get(record.endeavorId) ?? []
    bucket.push(performFromRecord(record))
    performancesByEndeavor.set(record.endeavorId, bucket)
  }
  const endeavors: Endeavor[] = []
  for (const record of endeavorRecords) {
    const hydrated = endeavorFromRecord(record, {
      defers: defersByEndeavor.get(record.id) ?? [],
      performances: performancesByEndeavor.get(record.id) ?? [],
    })
    if (hydrated.ok) endeavors.push(hydrated.value)
  }
  return endeavors
}

export const loadEndeavorActivityThunk = createAsyncThunk<
  Result<EndeavorActivitySnapshot, EndeavorActivityException>,
  { endeavorId: string },
  { extra: ThunkExtra }
>(
  'endeavorActivity/onActivityLoadCompleted',
  async ({ endeavorId }, { extra }) => {
    try {
      const stored = await readStoredEndeavors(extra.localStore)
      const endeavor = stored.find((candidate) => candidate.id === endeavorId)
      if (!endeavor) {
        return err(EndeavorActivityExceptions.endeavorNotFound(endeavorId))
      }
      return ok({
        endeavor: {
          id: endeavor.id,
          title: endeavor.title,
          kind: endeavor.kind,
        },
        rows: activityRowsFor(endeavor),
      })
    } catch (error) {
      return err(EndeavorActivityExceptions.loadFailed(messageOf(error)))
    }
  },
)
