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
import { type Endeavor, type Result, err, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { readStoredEndeavors } from '../../library/persistence/storedEndeavors'
import type { ThunkExtra } from '../../library/store'
import {
  type DayProgressException,
  DayProgressExceptions,
  dayProgressExceptionMessage,
} from './DayProgressException'
import { withinDayProgressWindow } from './DayProgressRules'

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
