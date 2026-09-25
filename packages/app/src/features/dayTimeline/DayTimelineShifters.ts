/**
 * Day Timeline Shifters (`RC-4`, `UZF-10`) — pure `with…(state, args)`
 * functions returning a brand-new state. None reads a clock: `now` arrives in
 * an event payload.
 */
import type { Endeavor } from '@kro/core'
import type { PlanDayKey } from '../plan/PlanCalendar'
import type { DayTimelineException } from './DayTimelineException'
import type { DayTimelineState } from './DayTimelineFeature'

/** A clock stamp. The same instant twice is a no-op (same object back). */
export const withClockStamped = (
  state: DayTimelineState,
  now: Date,
): DayTimelineState =>
  state.now !== null && state.now.getTime() === now.getTime()
    ? state
    : { ...state, now }

/** A read started — the same `loading` Plan's authoritative day shows. */
export const withDayTimelineLoading = (
  state: DayTimelineState,
): DayTimelineState => ({ ...state, load: { kind: 'loading' } })

export const withDayTimelineLoaded = (
  state: DayTimelineState,
  dayKey: PlanDayKey,
  events: readonly Endeavor[],
): DayTimelineState => ({ ...state, load: { kind: 'loaded', dayKey, events } })

export const withDayTimelineFailed = (
  state: DayTimelineState,
  exception: DayTimelineException,
): DayTimelineState => ({ ...state, load: { kind: 'failed', exception } })
