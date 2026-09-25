/**
 * The Day Progress Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — canon's
 * `produceLoadDayProgressEffect`.
 *
 * Reads every stored endeavor with its performances through
 * `extra.localStore`, trims performances to canon's 45-day window around the
 * passed-in `now`, and resolves a `Result`. It never throws and never reads a
 * clock. The hydration mirrors `DoProducer`'s local helper (one read per
 * store, grouped in memory; a malformed row is skipped, never fatal).
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
  type DayProgressException,
  DayProgressExceptions,
  dayProgressExceptionMessage,
} from './DayProgressException'
import { withinDayProgressWindow } from './DayProgressRules'

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

export const loadDayProgressThunk = createAsyncThunk<
  Result<readonly Endeavor[], DayProgressException>,
  { readonly now: Date },
  { extra: ThunkExtra }
>('dayProgress/onDayProgressLoadCompleted', async ({ now }, { extra }) => {
  try {
    const stored = await readStoredEndeavors(extra.localStore)
    return ok(withinDayProgressWindow(stored, now))
  } catch (error) {
    return err(
      DayProgressExceptions.loadFailed(dayProgressExceptionMessage(error)),
    )
  }
})
