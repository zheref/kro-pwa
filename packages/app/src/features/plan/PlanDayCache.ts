/**
 * The day-indexed read-ahead cache and the preload window it fills — the port
 * of `Kro/Application/Plan/PlanShifters.swift`'s buffer helpers and
 * `PlanProducer.timelineWindowQuery`.
 *
 * ## The rule this module exists to enforce
 *
 * > The selected current day loads **first** and is authoritative; then a lazy
 * > −3…+3 day buffer via one range request per host into **separate**
 * > day-indexed caches that never replace the authoritative current-day arrays.
 *
 * Canon states the same thing three times, from three angles: the buffer is
 * *"lazily prefetched non-today local calendar occurrences, partitioned by day
 * so range data never enters today's reconciliation snapshot"*; installing it
 * *"replaces the bounded local read-ahead cache without touching today's
 * established source-resolution arrays"*; and Google *"owns a parallel cache so
 * a later network response cannot replace either the local buffer or Google's
 * authoritative today snapshot."*
 *
 * The mechanism is `partitionPlanDayBuffer`'s `excludingDay` argument: the
 * authoritative day is filtered **out** of the buffer before it is stored, so
 * there is no code path — not even a bug — by which a stale range response can
 * overwrite the day the user is looking at. That is stronger than merging
 * carefully, and it is why the exclusion happens at partition time rather than
 * at read time.
 *
 * ## Keys are strings, because a `Date` cannot key a JavaScript object
 *
 * Canon's caches are `[Date: [Endeavor]]`. See `PlanCalendar.planDayKey` for
 * why that becomes a local-time `YYYY-MM-DD` here. This is the port's one
 * forced structural divergence in this area and it is called out in the PR.
 */
import type { Endeavor } from '@kro/core'
import { TIMELINE_PRELOAD_RADIUS_DAYS } from './PlanConstants'
import {
  type PlanDayKey,
  addingPlanDays,
  isSamePlanDay,
  planDayKey,
  startOfPlanDay,
} from './PlanCalendar'

/** Endeavors indexed by the local day their `start` falls on. */
export type PlanDayCache = Readonly<Record<PlanDayKey, readonly Endeavor[]>>

/** An empty cache. Exported so no caller has to spell the literal. */
export const emptyPlanDayCache: PlanDayCache = {}

/** The half-open `[start, end)` window one preload asks each host for. */
export interface PlanPreloadWindow {
  readonly start: Date
  readonly end: Date
}

/**
 * `PlanProducer.timelineWindowQuery` — the −3…+3 day window centred on
 * `center`, as `[center − 3 days, center + 4 days)`.
 *
 * Seven whole days, half-open at the far end: canon's `end` is
 * `center + radius + 1` precisely so the seventh day is included in full.
 */
export const planPreloadWindow = (
  center: Date,
  radiusDays: number = TIMELINE_PRELOAD_RADIUS_DAYS,
): PlanPreloadWindow => {
  const day = startOfPlanDay(center)
  return {
    start: addingPlanDays(day, -radiusDays),
    end: addingPlanDays(day, radiusDays + 1),
  }
}

/** The days a preload covers, in ascending order — `−radius … +radius`. */
export const planPreloadDays = (
  center: Date,
  radiusDays: number = TIMELINE_PRELOAD_RADIUS_DAYS,
): readonly Date[] => {
  const day = startOfPlanDay(center)
  const days: Date[] = []
  for (let offset = -radiusDays; offset <= radiusDays; offset += 1) {
    days.push(addingPlanDays(day, offset))
  }
  return days
}

/**
 * `PlanFeature.State.partitionBuffer` — group a range response by day, dropping
 * anything with no `start` and **everything that falls on `excludingDay`**.
 *
 * The exclusion is the guarantee: the authoritative day's array is the only
 * representation of that day anywhere in state.
 */
export const partitionPlanDayBuffer = (
  events: readonly Endeavor[],
  options: { readonly excludingDayKey: PlanDayKey | null },
): PlanDayCache => {
  const excludedKey = options.excludingDayKey
  const cache: Record<PlanDayKey, Endeavor[]> = {}
  for (const event of events) {
    if (event.start === null) continue
    const key = planDayKey(event.start)
    if (key === excludedKey) continue
    const bucket = cache[key]
    if (bucket === undefined) cache[key] = [event]
    else bucket.push(event)
  }
  return cache
}

/**
 * The cached events for one day, or `[]`. Never falls back to the authoritative
 * array — a caller that wants "the day I am looking at" reads that array
 * directly, and the two are kept apart on purpose.
 */
export const planDayCacheEntry = (
  cache: PlanDayCache,
  day: Date,
): readonly Endeavor[] => cache[planDayKey(day)] ?? []

/**
 * The events to render for `day`: the authoritative array when `day` is the
 * authoritative one, otherwise the buffer.
 *
 * This is the single place the two sources meet, and it is a *selection*, never
 * a merge — canon's `endeavorsForSelectedDateSelector` branches exactly the
 * same way.
 */
export const planEventsForDay = (params: {
  readonly day: Date
  /** The day the authoritative array holds, or `null` when it holds none. */
  readonly authoritativeDayKey: PlanDayKey | null
  readonly authoritativeEvents: readonly Endeavor[]
  readonly cache: PlanDayCache
}): readonly Endeavor[] =>
  params.authoritativeDayKey !== null &&
  planDayKey(params.day) === params.authoritativeDayKey
    ? params.authoritativeEvents
    : planDayCacheEntry(params.cache, params.day)

/**
 * `preserveSelectedDayAcrossMidnight` — when the wall clock crosses midnight
 * while yesterday is still the selected day, copy the authoritative array into
 * the buffer under yesterday's key so the day the user is reading does not
 * empty out from under them.
 *
 * Returns the cache unchanged unless the clock genuinely crossed a day boundary
 * *and* the selected day was the day that just ended — canon's two guards.
 */
export const planCachePreservingDayAcrossMidnight = (params: {
  readonly cache: PlanDayCache
  readonly selectedDate: Date
  readonly previousNow: Date
  readonly now: Date
  readonly authoritativeEvents: readonly Endeavor[]
}): PlanDayCache => {
  if (isSamePlanDay(params.previousNow, params.now)) return params.cache
  if (!isSamePlanDay(params.selectedDate, params.previousNow)) return params.cache
  const key = planDayKey(params.previousNow)
  return {
    ...params.cache,
    [key]: params.authoritativeEvents.filter(
      (event) => event.start !== null && isSamePlanDay(event.start, params.previousNow),
    ),
  }
}

/**
 * `rescheduleTimelineEvent`'s cache half — move one endeavor's cached copy to
 * the day matching its new start, dropping it from wherever it was.
 *
 * An event whose new day is the authoritative one leaves the cache entirely:
 * *"events leaving today are removed from the authoritative one-day snapshot so
 * each occurrence has one owner"*, and the same single-owner rule read from the
 * other side means the buffer must not keep a copy of an event the
 * authoritative array now holds.
 */
export const planCacheWithRescheduled = (params: {
  readonly cache: PlanDayCache
  readonly endeavor: Endeavor
  readonly authoritativeDayKey: PlanDayKey | null
}): PlanDayCache => {
  const next: Record<PlanDayKey, readonly Endeavor[]> = {}
  for (const [key, events] of Object.entries(params.cache)) {
    const remaining = events.filter((event) => event.id !== params.endeavor.id)
    if (remaining.length > 0) next[key] = remaining
  }
  const start = params.endeavor.start
  if (start === null) return next
  const key = planDayKey(start)
  if (key === params.authoritativeDayKey) return next
  next[key] = [...(next[key] ?? []), params.endeavor]
  return next
}

/**
 * Replace one endeavor wherever it appears in the cache, leaving day membership
 * alone — `applyMatrixResolvedEndeavor`'s buffer half, which replaces *"every
 * fetched representation of an endeavor together so the matrix, picker,
 * timeline, and caches cannot disagree."*
 */
export const planCacheReplacing = (
  cache: PlanDayCache,
  endeavor: Endeavor,
): PlanDayCache => {
  const next: Record<PlanDayKey, readonly Endeavor[]> = {}
  for (const [key, events] of Object.entries(cache)) {
    next[key] = events.map((event) =>
      event.id === endeavor.id ? endeavor : event,
    )
  }
  return next
}
