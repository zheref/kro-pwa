/**
 * The Day Timeline Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Reads exactly what Plan's authoritative-day read does — every Plan host,
 * one day's range — through Plan's own exported helpers, so the pane and the
 * Plan tab can never disagree about what "today" holds. It never throws,
 * never reads a clock, and passes `signal` through so an unmount is silent.
 */
import type { Endeavor, Result } from '@kro/core'
import { err, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import {
  type PlanDayKey,
  planDayKey,
  startOfNextPlanDay,
  startOfPlanDay,
} from '../plan/PlanCalendar'
import { fetchPlanHostRange } from '../plan/PlanHosts'
import { planHostsFor } from '../plan/PlanProducer'
import {
  type DayTimelineException,
  DayTimelineExceptions,
  dayTimelineExceptionMessage,
} from './DayTimelineException'

export interface DayTimelineLoadPayload {
  readonly dayKey: PlanDayKey
  readonly events: readonly Endeavor[]
}

export const loadDayTimelineThunk = createAsyncThunk<
  Result<DayTimelineLoadPayload, DayTimelineException>,
  { readonly day: Date },
  { extra: ThunkExtra }
>(
  'dayTimeline/onDayTimelineLoadCompleted',
  async ({ day }, { extra, signal }) => {
    try {
      const events = await fetchPlanHostRange(
        planHostsFor(extra),
        { start: startOfPlanDay(day), end: startOfNextPlanDay(day) },
        { signal },
      )
      return ok({ dayKey: planDayKey(day), events })
    } catch (error) {
      return err(
        DayTimelineExceptions.loadFailed(dayTimelineExceptionMessage(error)),
      )
    }
  },
)
