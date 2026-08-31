/**
 * `PlanSettingChoices` — canon `KroCore/Model/PlanSettingChoices.swift`.
 *
 * The enumerated choices backing the Plan preferences pickers. Same porting
 * shape as `SettingChoices`: raw value == case name == what persists, arrays
 * stand in for `CaseIterable.allCases` in canon declaration order.
 */

/**
 * The band of hours the Day timeline shows. Consumed by the timeline surface
 * (#19); the raw value is what persists.
 */
export const DayViewRange = {
  /** Full day, midnight to midnight. */
  full: 'full',
  /** Waking hours — 6am to midnight. */
  waking: 'waking',
  /** Business hours — 8am to 8pm. */
  business: 'business',
} as const

export type DayViewRange = (typeof DayViewRange)[keyof typeof DayViewRange]

/** `DayViewRange.allCases`, in canon declaration order. */
export const dayViewRanges: readonly DayViewRange[] = [
  DayViewRange.full,
  DayViewRange.waking,
  DayViewRange.business,
]

/** `var label: String`. */
export const dayViewRangeLabel = (range: DayViewRange): string => {
  switch (range) {
    case DayViewRange.full:
      return 'Full day'
    case DayViewRange.waking:
      return 'Waking hours'
    case DayViewRange.business:
      return 'Business hours'
  }
}

/**
 * `var hours: Range<Int>` — the **half-open** hour range `[start, end)` the
 * timeline renders. Ported as an explicit `{ start, end }` pair because
 * TypeScript has no range literal, and named `endExclusive` so the half-open
 * contract survives the translation: `full` is `0..<24`, so `endExclusive` is
 * 24 and hour 24 is never rendered.
 */
export const dayViewRangeHours = (
  range: DayViewRange,
): { readonly start: number; readonly endExclusive: number } => {
  switch (range) {
    case DayViewRange.full:
      return { start: 0, endExclusive: 24 }
    case DayViewRange.waking:
      return { start: 6, endExclusive: 24 }
    case DayViewRange.business:
      return { start: 8, endExclusive: 20 }
  }
}

/** Default sort for Plan lists. */
export const PlanListSort = {
  time: 'time',
  priority: 'priority',
  title: 'title',
} as const

export type PlanListSort = (typeof PlanListSort)[keyof typeof PlanListSort]

/** `PlanListSort.allCases`, in canon declaration order. */
export const planListSorts: readonly PlanListSort[] = [
  PlanListSort.time,
  PlanListSort.priority,
  PlanListSort.title,
]

/** `var label: String`. */
export const planListSortLabel = (sort: PlanListSort): string => {
  switch (sort) {
    case PlanListSort.time:
      return 'Time'
    case PlanListSort.priority:
      return 'Priority'
    case PlanListSort.title:
      return 'Title'
  }
}

/**
 * Default grouping for Plan lists.
 *
 * `none` is a real, stored raw value — canon's case is literally named `none`,
 * so the persisted string is `"none"` and *not* an absent key. A reader that
 * treats a missing value as `none` would be right by accident today and wrong
 * the moment the default changes.
 */
export const PlanListGrouping = {
  none: 'none',
  project: 'project',
  timeOfDay: 'timeOfDay',
} as const

export type PlanListGrouping =
  (typeof PlanListGrouping)[keyof typeof PlanListGrouping]

/** `PlanListGrouping.allCases`, in canon declaration order. */
export const planListGroupings: readonly PlanListGrouping[] = [
  PlanListGrouping.none,
  PlanListGrouping.project,
  PlanListGrouping.timeOfDay,
]

/** `var label: String`. */
export const planListGroupingLabel = (grouping: PlanListGrouping): string => {
  switch (grouping) {
    case PlanListGrouping.none:
      return 'None'
    case PlanListGrouping.project:
      return 'Project'
    case PlanListGrouping.timeOfDay:
      return 'Time of day'
  }
}
