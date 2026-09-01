/**
 * The Plan LIST canvas as pure logic — the port of `TimelineDayView`'s
 * `listCanvas` bucketing plus `PlanSelectors`' `listComparator` /
 * `groupedPlanListSectionsSelector`.
 *
 * Nothing here renders and nothing here reads a clock: every function takes the
 * instant it classifies against, which is what makes the four temporal buckets
 * and the three sort orders testable without mounting a surface (`UZF-10`,
 * `UZF-11`).
 *
 * ## Two grouping systems, not one, and canon means both
 *
 * `plan.listGrouping` has three values, and `.none` is **not** "no sections":
 * canon's own comment says *"`.none` renders today's four temporal buckets (All
 * Day / Past / Ongoing / Coming Next), preserving the pre-#176 look; `.project`
 * / `.timeOfDay` render `groupedSections` instead."* So `.none` runs the
 * `bucket(for:now:)` partition that lives in the VIEW, and the other two run the
 * `groupedPlanListSectionsSelector` partition that lives in the SELECTOR. Both
 * are ported here, behind one entry point, because on this stack a Fragment
 * renders what it is handed and re-deriving a grouping inside the view is what
 * `RC-15` exists to prevent.
 *
 * The consequence is visible in the section ORDER: the temporal buckets are
 * fixed (All Day → Past → Ongoing → Coming Next) and internally chronological
 * whatever the sort is, exactly as canon sorts them by `sortDate`; the
 * preference-driven sections arrive in the order canon's selector builds them
 * (projects by id then "No project"; morning → afternoon → evening) with their
 * rows in the ACTIVE sort, because they are built from an already-sorted list.
 *
 * ## An endeavor with no `end` is given one
 *
 * Canon reads `endeavor.end`; this domain has no such field — an event's end is
 * `start + duration`. `PlanEditSession` already settled the fallback for the
 * timeline (*"`end ?? start + (duration ?? 3600)`"*) and the same hour is used
 * here, so a durationless item occupies exactly the window the timeline drew it
 * in and the two canvases cannot disagree about what is "ongoing".
 */
import type { Endeavor } from '@kro/core'
import { assertNever } from '@kro/core'
import type { PlanListGrouping, PlanListSort } from '@kro/core'
import { PlanListGrouping as Grouping, PlanListSort as Sort } from '@kro/core'
import { EndeavorKind } from '@kro/core'
import { isSamePlanDay } from '../../PlanCalendar'

/** Canon's implied window for an item that carries no duration. */
export const PLAN_LIST_IMPLIED_DURATION_SECONDS = 3600

/* ------------------------------------------------------------------------ */
/* Temporal buckets (`TimelineDayView.ListBucket`)                           */
/* ------------------------------------------------------------------------ */

/** Canon's `ListBucket`. `recentlyAdded` was retired upstream and is not ported. */
export const PlanListBucket = {
  allDay: 'allDay',
  past: 'past',
  ongoing: 'ongoing',
  comingNext: 'comingNext',
} as const

export type PlanListBucket =
  (typeof PlanListBucket)[keyof typeof PlanListBucket]

/** Canon's section order for `PlanListGrouping.none`. */
export const planListBuckets: readonly PlanListBucket[] = [
  PlanListBucket.allDay,
  PlanListBucket.past,
  PlanListBucket.ongoing,
  PlanListBucket.comingNext,
]

/** Canon's `ListSection.title`. */
export const planListBucketTitle = (bucket: PlanListBucket): string => {
  switch (bucket) {
    case PlanListBucket.allDay:
      return 'All Day'
    case PlanListBucket.past:
      return 'Past Events'
    case PlanListBucket.ongoing:
      return 'Ongoing'
    case PlanListBucket.comingNext:
      return 'Coming Next'
    default:
      return assertNever(bucket)
  }
}

/**
 * Canon's `isAllDay` — *"All-day events have a `start` date but **no**
 * `duration`"*, and only for a calendar event. A task with a start and no
 * duration is an untimed task, not an all-day one.
 */
export const isPlanListAllDay = (endeavor: Endeavor): boolean =>
  endeavor.kind === EndeavorKind.calendarEvent &&
  endeavor.start !== null &&
  endeavor.duration === null

/** The instant a timed row stops occupying the clock. */
const impliedEnd = (start: Date, durationSeconds: number | null): Date =>
  new Date(
    start.getTime() +
      (durationSeconds ?? PLAN_LIST_IMPLIED_DURATION_SECONDS) * 1000,
  )

/**
 * Canon's `bucket(for:now:)`, rule for rule and in canon's order.
 *
 * All-day first (it is excluded from every temporal bucket), then the timed
 * branch on `start`, then the untimed branch treating `due` as a one-hour
 * anchor, then the unscheduled fallback.
 */
export const planListBucketFor = (
  endeavor: Endeavor,
  now: Date,
): PlanListBucket => {
  if (isPlanListAllDay(endeavor)) return PlanListBucket.allDay

  const start = endeavor.start
  if (start !== null) {
    const end = impliedEnd(start, endeavor.duration)
    if (start.getTime() <= now.getTime() && now.getTime() < end.getTime()) {
      return PlanListBucket.ongoing
    }
    if (end.getTime() <= now.getTime()) return PlanListBucket.past
    return PlanListBucket.comingNext
  }

  const due = endeavor.due
  if (due !== null) {
    if (isSamePlanDay(due, now)) {
      const dueEnd = impliedEnd(due, null)
      if (due.getTime() <= now.getTime() && now.getTime() < dueEnd.getTime()) {
        return PlanListBucket.ongoing
      }
      if (dueEnd.getTime() <= now.getTime()) return PlanListBucket.past
      return PlanListBucket.comingNext
    }
    return due.getTime() < now.getTime()
      ? PlanListBucket.past
      : PlanListBucket.comingNext
  }

  return PlanListBucket.comingNext
}

/**
 * Canon's `sortDate(for:)` — `start`, then `due`, then "the end of time" so an
 * unscheduled row floats to the bottom of its section.
 */
export const planListSortDate = (endeavor: Endeavor): number =>
  endeavor.start?.getTime() ??
  endeavor.due?.getTime() ??
  Number.POSITIVE_INFINITY

/* ------------------------------------------------------------------------ */
/* Sort (`PlanSelectors.listComparator`)                                     */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `priorityTier` — *"`0` = overdue, `1` = due today, `2` = everything
 * else (due later, or no due date at all)"*. Lower sorts first.
 */
export const planListPriorityTier = (endeavor: Endeavor, now: Date): number => {
  const due = endeavor.due
  if (due === null) return 2
  if (due.getTime() < now.getTime()) return 0
  return isSamePlanDay(due, now) ? 1 : 2
}

/** Case-insensitive title order, as canon's `localizedCaseInsensitiveCompare`. */
const titleOrder = (left: Endeavor, right: Endeavor): number =>
  left.title.localeCompare(right.title, undefined, { sensitivity: 'accent' })

/** A stable last resort, so equal elements never depend on the sort's stability. */
const idOrder = (left: Endeavor, right: Endeavor): number =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0

/**
 * Canon's `listComparator(for:now:)` as a JS comparator.
 *
 * Every branch ends in the `id` tiebreak canon ends in, so two rows that agree
 * on everything visible still order deterministically — which is what makes a
 * story's rendered order a fact rather than an engine detail.
 */
export const planListComparator = (
  sort: PlanListSort,
  now: Date,
): ((left: Endeavor, right: Endeavor) => number) => {
  switch (sort) {
    case Sort.time:
      return (left, right) => {
        const leftStart = left.start?.getTime() ?? Number.POSITIVE_INFINITY
        const rightStart = right.start?.getTime() ?? Number.POSITIVE_INFINITY
        if (leftStart !== rightStart) return leftStart - rightStart
        // Canon: both untimed (or an exact tie) falls back to title, then id.
        const byTitle =
          left.title < right.title ? -1 : left.title > right.title ? 1 : 0
        return byTitle !== 0 ? byTitle : idOrder(left, right)
      }
    case Sort.title:
      return (left, right) => {
        const byTitle = titleOrder(left, right)
        return byTitle !== 0 ? byTitle : idOrder(left, right)
      }
    case Sort.priority:
      return (left, right) => {
        const byTier =
          planListPriorityTier(left, now) - planListPriorityTier(right, now)
        if (byTier !== 0) return byTier
        const leftProximity =
          left.due?.getTime() ??
          left.start?.getTime() ??
          Number.POSITIVE_INFINITY
        const rightProximity =
          right.due?.getTime() ??
          right.start?.getTime() ??
          Number.POSITIVE_INFINITY
        if (leftProximity !== rightProximity)
          return leftProximity - rightProximity
        return idOrder(left, right)
      }
    default:
      return assertNever(sort)
  }
}

/** The list's rows in the active order. Pure; the input array is never mutated. */
export const planListSorted = (
  endeavors: readonly Endeavor[],
  sort: PlanListSort,
  now: Date,
): readonly Endeavor[] => [...endeavors].sort(planListComparator(sort, now))

/* ------------------------------------------------------------------------ */
/* Time-of-day bands (`PlanTimeOfDayBand`)                                   */
/* ------------------------------------------------------------------------ */

/** Canon's `PlanTimeOfDayBand` — Morning < 12:00 ≤ Afternoon < 17:00 ≤ Evening. */
export const PlanTimeOfDayBand = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
} as const

export type PlanTimeOfDayBand =
  (typeof PlanTimeOfDayBand)[keyof typeof PlanTimeOfDayBand]

/** `allCases`, in canon declaration order — the section order. */
export const planTimeOfDayBands: readonly PlanTimeOfDayBand[] = [
  PlanTimeOfDayBand.morning,
  PlanTimeOfDayBand.afternoon,
  PlanTimeOfDayBand.evening,
]

/** `PlanTimeOfDayBand.title`. */
export const planTimeOfDayBandTitle = (band: PlanTimeOfDayBand): string => {
  switch (band) {
    case PlanTimeOfDayBand.morning:
      return 'Morning'
    case PlanTimeOfDayBand.afternoon:
      return 'Afternoon'
    case PlanTimeOfDayBand.evening:
      return 'Evening'
    default:
      return assertNever(band)
  }
}

/**
 * Canon's `timeOfDayBand(for:)` — bucketed by the endeavor's OWN scheduled
 * hour (`start`, else `due`), never by the wall clock, which is what keeps this
 * pure. An item with neither lands in the evening band, matching canon's
 * `.distantFuture` default arm.
 */
export const planTimeOfDayBandFor = (endeavor: Endeavor): PlanTimeOfDayBand => {
  const reference = endeavor.start ?? endeavor.due
  if (reference === null) return PlanTimeOfDayBand.evening
  const hour = reference.getHours()
  if (hour < 12) return PlanTimeOfDayBand.morning
  if (hour < 17) return PlanTimeOfDayBand.afternoon
  return PlanTimeOfDayBand.evening
}

/* ------------------------------------------------------------------------ */
/* Sections                                                                  */
/* ------------------------------------------------------------------------ */

/** Canon's `PlanListSection`, plus the one flag the header renders from. */
export interface PlanListSection {
  readonly id: string
  readonly title: string
  readonly endeavors: readonly Endeavor[]
  /** Canon's `showsActivity` — only the Ongoing bucket pulses. */
  readonly isOngoing: boolean
}

/** Canon's `projectSections(from:)` — projects by id, then a "No project" tail. */
const projectSections = (
  endeavors: readonly Endeavor[],
): readonly PlanListSection[] => {
  const byProject = new Map<string, Endeavor[]>()
  const noProject: Endeavor[] = []
  for (const endeavor of endeavors) {
    const projectId = endeavor.projectId
    if (projectId === null) {
      noProject.push(endeavor)
      continue
    }
    const bucket = byProject.get(projectId)
    if (bucket === undefined) byProject.set(projectId, [endeavor])
    else bucket.push(endeavor)
  }

  const sections: PlanListSection[] = [...byProject.keys()]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((projectId) => ({
      id: projectId,
      // Canon's own note: *"project-name resolution is a follow-up"* — the id
      // IS the title upstream too, so the web shows the same string rather
      // than inventing a lookup the domain does not have.
      title: projectId,
      endeavors: byProject.get(projectId) ?? [],
      isOngoing: false,
    }))

  if (noProject.length === 0) return sections
  return [
    ...sections,
    {
      id: 'noProject',
      title: 'No project',
      endeavors: noProject,
      isOngoing: false,
    },
  ]
}

/** Canon's `timeOfDaySections(from:)` — empty bands are omitted, not shown empty. */
const timeOfDaySections = (
  endeavors: readonly Endeavor[],
): readonly PlanListSection[] =>
  planTimeOfDayBands
    .map((band) => ({
      id: band,
      title: planTimeOfDayBandTitle(band),
      endeavors: endeavors.filter(
        (endeavor) => planTimeOfDayBandFor(endeavor) === band,
      ),
      isOngoing: false,
    }))
    .filter((section) => section.endeavors.length > 0)

/**
 * Canon's `.none` presentation: the four temporal buckets, each internally
 * CHRONOLOGICAL whatever the active sort is.
 *
 * That is canon's behaviour and not an oversight — `listCanvas` sorts every
 * bucket by `sortDate`, because a bucket named "Coming Next" that is ordered
 * alphabetically stops meaning "next". The active sort still decides the order
 * of the two grouped presentations, where the section headers carry no temporal
 * promise.
 */
const temporalSections = (
  endeavors: readonly Endeavor[],
  now: Date,
): readonly PlanListSection[] =>
  planListBuckets
    .map((bucket) => ({
      id: bucket,
      title: planListBucketTitle(bucket),
      endeavors: endeavors
        .filter((endeavor) => planListBucketFor(endeavor, now) === bucket)
        // All Day keeps the order it arrived in — canon does not sort it,
        // because an all-day row has no clock time to sort by.
        .sort((left, right) =>
          bucket === PlanListBucket.allDay
            ? 0
            : planListSortDate(left) - planListSortDate(right),
        ),
      isOngoing: bucket === PlanListBucket.ongoing,
    }))
    .filter((section) => section.endeavors.length > 0)

/**
 * `groupedPlanListSectionsSelector` and `listCanvas`'s temporal partition,
 * behind one entry point.
 *
 * An empty list yields NO sections, matching canon's
 * `guard !items.isEmpty else { return [] }` — the surface draws its empty state
 * instead of four empty headers.
 */
export const planListSections = (params: {
  readonly endeavors: readonly Endeavor[]
  readonly grouping: PlanListGrouping
  readonly now: Date
}): readonly PlanListSection[] => {
  if (params.endeavors.length === 0) return []
  switch (params.grouping) {
    case Grouping.none:
      return temporalSections(params.endeavors, params.now)
    case Grouping.project:
      return projectSections(params.endeavors)
    case Grouping.timeOfDay:
      return timeOfDaySections(params.endeavors)
    default:
      return assertNever(params.grouping)
  }
}
