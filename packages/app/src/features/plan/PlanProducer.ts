/**
 * Plan's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Four effects, one per thing the surface asks the world for. Each takes narrow
 * inputs, reads its services from `extra`, passes `thunkAPI.signal` down, and
 * **never throws** — every failure is caught and resolved as `err(...)`, which
 * is what makes the slice's `.rejected` arms defensive fallbacks rather than
 * the error path.
 *
 * Every thunk's type string is an **event name** (`plan/on…Completed`), never a
 * mechanism (`RC-2`).
 *
 * ## The preload contract lives here
 *
 * `loadPlanDayThunk` reads the **authoritative** day and nothing else;
 * `preloadPlanDaysThunk` reads the −3…+3 window with **one range request per
 * host** and returns it tagged with the day it was centred on. The two are
 * separate thunks precisely because the slice must be able to install one
 * without the other ever touching its arrays — see `PlanShifters`.
 *
 * The centre travels with the *result* as well as with the failure, so a
 * response that lands after the user has navigated away can be recognised as
 * superseded. Canon: *"a best-effort query can swallow cancellation and still
 * answer, so a superseded window can land here — installing it would overwrite
 * the day the user is actually looking at."*
 *
 * ## Clocks are arguments, never reads
 *
 * `updateEventTimeThunk` needs an instant to stamp the record's write
 * watermark. It takes one rather than calling `Date.now()`, so the write a test
 * asserts on is the write it asked for.
 */
import type { Endeavor, Result } from '@kro/core'
import { endeavorRecordFromEndeavor, err, ok, withRescheduled } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import type { PlanDayKey } from './PlanCalendar'
import { planDayKey, startOfNextPlanDay, startOfPlanDay } from './PlanCalendar'
import { planPreloadWindow } from './PlanDayCache'
import type { PlanException } from './PlanException'
import { PlanExceptions, planExceptionFrom } from './PlanException'
import {
  type PlanHost,
  endeavorsFromRecords,
  fetchPlanHostRange,
  makeLocalStorePlanHost,
} from './PlanHosts'
import type { PlanLoadReason } from './PlanState'

/**
 * Every host the Plan preload fans out over.
 *
 * One entry today. #33 adds a Google Calendar host here and nowhere else —
 * which is the reason the fan-out is a list rather than a direct call.
 */
export const planHostsFor = (extra: ThunkExtra): readonly PlanHost[] => [
  makeLocalStorePlanHost(extra.localStore),
]

/** What one authoritative-day read answers with. */
export interface PlanDayLoadPayload {
  readonly dayKey: PlanDayKey
  readonly reason: PlanLoadReason
  readonly events: readonly Endeavor[]
}

/** What one read-ahead window answers with, tagged by the day it centred on. */
export interface PlanPreloadPayload {
  readonly centerDayKey: PlanDayKey
  readonly events: readonly Endeavor[]
}

/**
 * The authoritative selected day. First, and the only read allowed to write
 * `dayLoad`.
 */
export const loadPlanDayThunk = createAsyncThunk<
  Result<PlanDayLoadPayload, PlanException>,
  { readonly day: Date; readonly reason: PlanLoadReason },
  { extra: ThunkExtra }
>('plan/onPlanDayLoadCompleted', async ({ day, reason }, { extra, signal }) => {
  const dayKey = planDayKey(day)
  try {
    const events = await fetchPlanHostRange(
      planHostsFor(extra),
      { start: startOfPlanDay(day), end: startOfNextPlanDay(day) },
      { signal },
    )
    return ok({ dayKey, reason, events })
  } catch (error) {
    return err(
      PlanExceptions.dayLoadFailed(
        planExceptionFrom(error).message,
      ),
    )
  }
})

/**
 * The lazy −3…+3 buffer. Runs **after** the authoritative day, one range
 * request per host, into the day-indexed cache the authoritative arrays never
 * share.
 */
export const preloadPlanDaysThunk = createAsyncThunk<
  Result<PlanPreloadPayload, PlanException>,
  { readonly center: Date },
  { extra: ThunkExtra }
>('plan/onPlanDayPreloadCompleted', async ({ center }, { extra, signal }) => {
  const centerDayKey = planDayKey(center)
  try {
    const events = await fetchPlanHostRange(
      planHostsFor(extra),
      planPreloadWindow(center),
      { signal },
    )
    return ok({ centerDayKey, events })
  } catch (error) {
    // The window is left as-is (last-good-value); only its own in-flight
    // marker settles, which is what keeps the activity control terminating.
    return err(
      PlanExceptions.preloadFailed(
        centerDayKey,
        planExceptionFrom(error).message,
      ),
    )
  }
})

/**
 * The matrix's own row set.
 *
 * Deliberately independent of the timeline's day-scoped read: the matrix is not
 * a day view, and canon keeps the two queries apart for the same reason —
 * *"the matrix must receive fresh Apple recurrence evidence on every visit."*
 * Rows arrive unreconciled; `selectPlanMatrixEndeavors` reconciles at the
 * presentation boundary, where canon reconciles.
 */
export const loadPlanMatrixThunk = createAsyncThunk<
  Result<readonly Endeavor[], PlanException>,
  void,
  { extra: ThunkExtra }
>('plan/onPlanMatrixLoadCompleted', async (_args, { extra }) => {
  try {
    const records = await extra.localStore.endeavors.all()
    return ok(endeavorsFromRecords(records))
  } catch (error) {
    return err(PlanExceptions.dayLoadFailed(planExceptionFrom(error).message))
  }
})

/**
 * Persist a committed timeline edit.
 *
 * The slice has already applied the new times optimistically — canon does the
 * same, and says why: *"local state was updated optimistically. On failure the
 * next background sync will restore the true state from the server."* So this
 * effect's job is only the write, and its failure is reported without rolling
 * the surface back under the user's finger.
 */
export const updateEventTimeThunk = createAsyncThunk<
  Result<Endeavor, PlanException>,
  {
    readonly endeavor: Endeavor
    readonly start: Date
    readonly end: Date
    readonly now: Date
  },
  { extra: ThunkExtra }
>(
  'plan/onEventTimeUpdateCompleted',
  async ({ endeavor, start, end, now }, { extra }) => {
    try {
      const durationSeconds = (end.getTime() - start.getTime()) / 1000
      const rescheduled = withRescheduled(endeavor, start, durationSeconds)
      await extra.localStore.endeavors.put(
        endeavorRecordFromEndeavor(rescheduled, { now }),
      )
      return ok(rescheduled)
    } catch (error) {
      return err(planExceptionFrom(error))
    }
  },
)
