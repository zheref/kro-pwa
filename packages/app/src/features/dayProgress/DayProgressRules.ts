/**
 * Pure calendar and activity rules for Day Progress — the port of the date
 * arithmetic in canon's `KroUI/DayProgress/DayProgressView.swift` and
 * `DayProgressWindow`.
 *
 * Nothing here reads a clock: every function takes the instant it reasons
 * about, so the Shifters and Selectors built on it stay pure (`UZF-10`,
 * `UZF-11`).
 */
import {
  type Endeavor,
  type Perform,
  type PerformResolution,
  isSameCalendarDay,
} from '@kro/core'

/** Canon's `DayProgressWindow.days` — how far back the screen loads. */
export const DAY_PROGRESS_WINDOW_DAYS = 45

/** Days per weekday-lane row. */
export const DAYS_PER_WEEK = 7

/**
 * The earliest week the lane can page to: the last week that still overlaps
 * the loaded window. Paging further would only show empty rings for days the
 * screen never read.
 */
export const MINIMUM_WEEK_OFFSET = -Math.floor(
  (DAY_PROGRESS_WINDOW_DAYS - 1) / DAYS_PER_WEEK,
)

/** Local midnight of `date`'s calendar day. */
export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** `date`'s calendar day shifted by `days` (DST-safe: calendar, not ms). */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/** Clamps a week offset into `MINIMUM_WEEK_OFFSET…0` (no future weeks). */
export const clampWeekOffset = (offset: number): number =>
  // `+ 0` folds a `-0` (from negating a zero) back to `0`.
  Math.min(0, Math.max(MINIMUM_WEEK_OFFSET, Math.trunc(offset))) + 0

/**
 * The seven days of the lane at `weekOffset`, oldest first. The last cell of
 * week 0 is `today`, so no future day is ever offered.
 */
export const weekDays = (today: Date, weekOffset: number): readonly Date[] => {
  const end = addDays(startOfDay(today), weekOffset * DAYS_PER_WEEK)
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
    addDays(end, index - (DAYS_PER_WEEK - 1)),
  )
}

/**
 * When a performance happened, for the purpose of which day it belongs to:
 * the last session fragment's end, else the completion stamp, else its start
 * plus its duration.
 */
export const performanceCompletionTime = (performance: Perform): Date => {
  const fragments = performance.sessionFragments
  const lastEnded =
    fragments.length > 0
      ? (fragments[fragments.length - 1]?.endedAt ?? null)
      : null
  if (lastEnded !== null) return lastEnded
  if (performance.completedAt !== null) return performance.completedAt
  return new Date(performance.date.getTime() + performance.duration * 1000)
}

/** When a performance started: its first fragment, else its own date. */
export const performanceStartTime = (performance: Perform): Date =>
  performance.sessionFragments[0]?.startedAt ?? performance.date

/**
 * Trims every endeavor's performances to the loaded window
 * (`today - 44 days … now`). Endeavors themselves are all kept: the rings need
 * every task and habit, not just the ones with recent activity.
 */
export const withinDayProgressWindow = (
  endeavors: readonly Endeavor[],
  now: Date,
): readonly Endeavor[] => {
  const floor = addDays(startOfDay(now), -(DAY_PROGRESS_WINDOW_DAYS - 1))
  return endeavors.map((endeavor) => ({
    ...endeavor,
    performances: endeavor.performances.filter((performance) => {
      const at = performanceCompletionTime(performance).getTime()
      return at >= floor.getTime() && at <= now.getTime()
    }),
  }))
}

/** One activity card: a performance, flattened with its endeavor. */
export interface DayProgressActivity {
  /** Stable key: endeavor id + completion instant + index. */
  readonly id: string
  readonly endeavorTitle: string
  readonly startedAt: Date
  readonly endedAt: Date
  /** Seconds; `null` when no timer ran. */
  readonly timedSeconds: number | null
  readonly resolution: PerformResolution
  readonly rewardPoints: number
}

/**
 * Every performance completed on `day`, across all endeavors, newest first.
 *
 * Canon also renders *deferred* and *missed* virtual rows. The web stores no
 * record of either (a defer is a relation on the endeavor, not a dated
 * activity, and a miss is never persisted), so those rows are skipped here.
 */
export const activitiesOnDay = (
  endeavors: readonly Endeavor[],
  day: Date,
): readonly DayProgressActivity[] => {
  const rows: DayProgressActivity[] = []
  for (const endeavor of endeavors) {
    endeavor.performances.forEach((performance, index) => {
      const endedAt = performanceCompletionTime(performance)
      if (!isSameCalendarDay(endedAt, day)) return
      rows.push({
        id: `${endeavor.id}:${endedAt.getTime()}:${index}`,
        endeavorTitle: endeavor.title,
        startedAt: performanceStartTime(performance),
        endedAt,
        timedSeconds:
          performance.sessionFragments.length === 0 && performance.duration <= 0
            ? null
            : performance.duration,
        resolution: performance.resolution,
        rewardPoints: performance.rewardPoints,
      })
    })
  }
  return rows.sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
}
