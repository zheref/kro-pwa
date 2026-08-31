/**
 * The grouping engine — the port of canon's `Array<Endeavor>.grouped(by:)`,
 * `ListGroup.sorted(using:)` and `.limited(by:)`
 * (`KroCore/Model/Endeavor/Endeavor.swift`) plus the `EndeavorGroupingCriteria`
 * group/comparison tables (`KroCore/Model/Endeavor/EndeavorCriteria.swift`).
 *
 * `@kro/core`'s `EndeavorCriteria.ts` ported the **declaration** of the four
 * criteria and said, in its own header, that the engine *"belongs to whichever
 * child first renders a grouped list (#16 / #29)"*. #16 built Do's lanes rather
 * than groups, so this is that child, and this is that engine. It lives in the
 * feature lane rather than in `@kro/core` because `domain/**` and `vistas/**`
 * are other children's lanes; if a later child moves it down, every call site
 * here imports it by name and nothing else changes.
 *
 * ## Everything here is pure
 *
 * No clock, no store, no service. `dueSection` reads only the due date's own
 * local hour — canon reads `Calendar.current.dateComponents([.hour], from: due)`
 * and never consults `now` — so a group is answerable at any instant.
 *
 * ## The two rules that surprise people
 *
 * - **`host` grouping puts one endeavor in several groups.** Canon's
 *   `groups(_:)` for `.host` zips `hostedBy` into one excerpt per host, so a
 *   task mirrored to Reminders *and* Kro appears under both. Every other
 *   criterion yields exactly one excerpt. A host-less endeavor therefore
 *   appears in **no** group under `.host` — canon's behaviour, preserved.
 * - **Sorting is chunked, not a single comparator.** Canon walks the sorting
 *   parameters in order; each parameter sorts only the rows that *have* a value
 *   for its criterion, appends them, and hands the value-less remainder to the
 *   next parameter. Rows with no value for any parameter keep their arrival
 *   order at the end. A plain `sort` with fallbacks would reorder them.
 */
import {
  type Endeavor,
  EndeavorGroupingCriteria,
  type EndeavorSortingCriteria,
  EndeavorSortingCriteria as SortBy,
  type EndeavorSortingParameter,
  assertNever,
  compareEndeavorStatuses,
  descendingBy,
  ascendingBy,
  endeavorHostDisplayName,
  endeavorKindDisplayName,
  endeavorStatusDisplayName,
  endeavorStatusFromRawValue,
} from '@kro/core'

// ---------------------------------------------------------------------------
// DaySection
// ---------------------------------------------------------------------------

/**
 * Canon's `DaySection` — the six wall-clock bands a due time falls into, plus
 * `anytime` for an endeavor with no due date at all.
 */
export const DaySection = {
  earlyMorning: 'earlyMorning',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night',
  lateNight: 'lateNight',
  anytime: 'anytime',
} as const

export type DaySection = (typeof DaySection)[keyof typeof DaySection]

/** Every band, in canon declaration order. */
export const daySections: readonly DaySection[] = [
  DaySection.earlyMorning,
  DaySection.morning,
  DaySection.afternoon,
  DaySection.evening,
  DaySection.night,
  DaySection.lateNight,
  DaySection.anytime,
]

/** `DaySection(rawValue:)` — narrows a raw group key, or `null`. */
export const daySectionFromRawValue = (raw: string): DaySection | null =>
  daySections.find((section) => section === raw) ?? null

/**
 * `DaySection.orderIndex` — the sort key. `anytime` is **-1**, so undated work
 * leads the list rather than trailing it; that is canon's ordering, not an
 * accident of declaration order.
 */
export const daySectionOrderIndex = (section: DaySection): number => {
  switch (section) {
    case DaySection.anytime:
      return -1
    case DaySection.earlyMorning:
      return 0
    case DaySection.morning:
      return 1
    case DaySection.afternoon:
      return 2
    case DaySection.evening:
      return 3
    case DaySection.night:
      return 4
    case DaySection.lateNight:
      return 5
    default:
      return assertNever(section)
  }
}

/** `DaySection.displayName`. */
export const daySectionDisplayName = (section: DaySection): string => {
  switch (section) {
    case DaySection.earlyMorning:
      return 'Early Morning'
    case DaySection.morning:
      return 'Morning'
    case DaySection.afternoon:
      return 'Afternoon'
    case DaySection.evening:
      return 'Evening'
    case DaySection.night:
      return 'Night'
    case DaySection.lateNight:
      return 'Late Night'
    case DaySection.anytime:
      return 'Anytime'
    default:
      return assertNever(section)
  }
}

/**
 * `Endeavor.dueSection` — canon's hour bands, boundaries included:
 * 4–7 early morning, 7–12 morning, 12–17 afternoon, 17–20 evening,
 * 20–24 night, 0–4 late night. No due date at all is `anytime`.
 */
export const dueSectionOf = (endeavor: Endeavor): DaySection => {
  const due = endeavor.due
  if (due === null) return DaySection.anytime
  const hour = due.getHours()
  if (hour >= 4 && hour < 7) return DaySection.earlyMorning
  if (hour >= 7 && hour < 12) return DaySection.morning
  if (hour >= 12 && hour < 17) return DaySection.afternoon
  if (hour >= 17 && hour < 20) return DaySection.evening
  if (hour >= 20 && hour < 24) return DaySection.night
  if (hour >= 0 && hour < 4) return DaySection.lateNight
  return DaySection.anytime
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * One rendered group. `totalCount` is the size **before** any display limit, so
 * a trimmed group can still say "7 of 23" without re-deriving it, and
 * `isTrimmed` is what the "Show all" affordance keys on.
 */
export interface EndeavorRowGroup {
  /** The stable group key — canon's raw value (a status, a host, a kind, a band). */
  readonly key: string
  /** The group's display title. */
  readonly title: string
  readonly endeavors: readonly Endeavor[]
  /** How many rows the group holds before the display limit. */
  readonly totalCount: number
  /** True when the display limit dropped at least one row. */
  readonly isTrimmed: boolean
}

/**
 * Canon's `GroupForTasks.state`: `clipped` while every group shows at most the
 * limit, `expanded` for the one group the user opened, `collapsed` for its
 * siblings while it is open.
 */
export const EndeavorGroupDisplayState = {
  clipped: 'clipped',
  expanded: 'expanded',
  collapsed: 'collapsed',
} as const

export type EndeavorGroupDisplayState =
  (typeof EndeavorGroupDisplayState)[keyof typeof EndeavorGroupDisplayState]

/**
 * Canon's `GroupForTasks.sortingParameters` default: most recently completed
 * first, then soonest due, then most recently created. The chunked walk in
 * `sortEndeavorsByParameters` is what makes that sequence meaningful.
 */
export const DEFAULT_GROUP_SORTING: readonly EndeavorSortingParameter[] = [
  descendingBy(SortBy.completedOn),
  ascendingBy(SortBy.due),
  descendingBy(SortBy.createdAt),
]

/** Canon's `EndeavorSortingCriteria.valuePath` — `null` when the row has none. */
const sortingValueOf = (
  criteria: EndeavorSortingCriteria,
  endeavor: Endeavor,
): number | null => {
  switch (criteria) {
    case SortBy.due:
      return endeavor.due?.getTime() ?? null
    case SortBy.duration:
      return endeavor.duration
    case SortBy.createdAt:
      return endeavor.createdAt?.getTime() ?? null
    case SortBy.completedOn:
      return endeavor.completed?.getTime() ?? null
    default:
      return assertNever(criteria)
  }
}

/**
 * Canon's chunked sort. Each parameter orders only the rows that carry a value
 * for its criterion; the rest fall through to the next parameter, and whatever
 * no parameter could order keeps its arrival order at the end.
 */
export const sortEndeavorsByParameters = (
  endeavors: readonly Endeavor[],
  parameters: readonly EndeavorSortingParameter[] = DEFAULT_GROUP_SORTING,
): readonly Endeavor[] => {
  let remaining = [...endeavors]
  const sorted: Endeavor[] = []

  for (const parameter of parameters) {
    if (remaining.length === 0) break
    const withValue = remaining.filter(
      (endeavor) => sortingValueOf(parameter.criteria, endeavor) !== null,
    )
    withValue.sort((left, right) => {
      const leftValue = sortingValueOf(parameter.criteria, left) ?? 0
      const rightValue = sortingValueOf(parameter.criteria, right) ?? 0
      return parameter.direction === 'ascending'
        ? leftValue - rightValue
        : rightValue - leftValue
    })
    sorted.push(...withValue)
    remaining = remaining.filter(
      (endeavor) => sortingValueOf(parameter.criteria, endeavor) === null,
    )
  }

  sorted.push(...remaining)
  return sorted
}

/** One `(key, title)` membership. Canon's `EndeavorGroupingExcerpt`. */
interface GroupingExcerpt {
  readonly key: string
  readonly title: string
}

/** Canon's `EndeavorGroupingCriteria.groups(_:)`. `.host` yields one per host. */
const excerptsFor = (
  criteria: EndeavorGroupingCriteria,
  endeavor: Endeavor,
): readonly GroupingExcerpt[] => {
  switch (criteria) {
    case EndeavorGroupingCriteria.status:
      return [
        {
          key: endeavor.status,
          title: endeavorStatusDisplayName(endeavor.status),
        },
      ]
    case EndeavorGroupingCriteria.host:
      return endeavor.hostedBy.map((host) => ({
        key: host,
        title: endeavorHostDisplayName(host),
      }))
    case EndeavorGroupingCriteria.kind:
      return [
        { key: endeavor.kind, title: endeavorKindDisplayName(endeavor.kind) },
      ]
    case EndeavorGroupingCriteria.dueSection: {
      const section = dueSectionOf(endeavor)
      return [{ key: section, title: daySectionDisplayName(section) }]
    }
    default:
      return assertNever(criteria)
  }
}

/** Canon's `EndeavorGroupingCriteria.comparison` over two group keys. */
const compareGroupKeys = (
  criteria: EndeavorGroupingCriteria,
  left: string,
  right: string,
): number => {
  switch (criteria) {
    case EndeavorGroupingCriteria.status: {
      const leftStatus = endeavorStatusFromRawValue(left)
      const rightStatus = endeavorStatusFromRawValue(right)
      if (leftStatus === null || rightStatus === null) return 0
      return compareEndeavorStatuses(leftStatus, rightStatus)
    }
    case EndeavorGroupingCriteria.host:
    case EndeavorGroupingCriteria.kind:
      return left < right ? -1 : left > right ? 1 : 0
    case EndeavorGroupingCriteria.dueSection: {
      const leftSection = daySectionFromRawValue(left)
      const rightSection = daySectionFromRawValue(right)
      if (leftSection === null || rightSection === null) return 0
      return (
        daySectionOrderIndex(leftSection) - daySectionOrderIndex(rightSection)
      )
    }
    default:
      return assertNever(criteria)
  }
}

/**
 * `grouped(by:)` then `sorted()` — partition into groups in first-appearance
 * order, sort each group's rows by `parameters`, then order the groups
 * themselves by the criterion's own comparison.
 */
export const groupEndeavors = (
  endeavors: readonly Endeavor[],
  criteria: EndeavorGroupingCriteria,
  parameters: readonly EndeavorSortingParameter[] = DEFAULT_GROUP_SORTING,
): readonly EndeavorRowGroup[] => {
  const buckets = new Map<string, { title: string; rows: Endeavor[] }>()

  for (const endeavor of endeavors) {
    for (const excerpt of excerptsFor(criteria, endeavor)) {
      const bucket = buckets.get(excerpt.key)
      if (bucket === undefined) {
        buckets.set(excerpt.key, { title: excerpt.title, rows: [endeavor] })
      } else {
        bucket.rows.push(endeavor)
      }
    }
  }

  return [...buckets.entries()]
    .map(([key, bucket]): EndeavorRowGroup => {
      const rows = sortEndeavorsByParameters(bucket.rows, parameters)
      return {
        key,
        title: bucket.title,
        endeavors: rows,
        totalCount: rows.length,
        isTrimmed: false,
      }
    })
    .sort((left, right) => compareGroupKeys(criteria, left.key, right.key))
}

/**
 * `limited(by:)` — keep the first `limit` rows and record that the rest exist.
 * A `null` limit is "no limit", matching `PresentationStyle.itemLimit`.
 */
export const limitGroup = (
  group: EndeavorRowGroup,
  limit: number | null,
): EndeavorRowGroup => {
  if (limit === null || group.endeavors.length <= limit) {
    return { ...group, isTrimmed: false }
  }
  return {
    ...group,
    endeavors: group.endeavors.slice(0, limit),
    isTrimmed: true,
  }
}

/**
 * The display rule canon's `applyReprocess` step 4/5 encodes: while **no**
 * group is expanded every group is clipped to the vista's `itemLimit`; once one
 * group is expanded it shows in full and the limit is lifted from its siblings
 * too — canon skips `limited(by:)` entirely when `currentFocusGroup != nil`.
 */
export const limitGroups = (
  groups: readonly EndeavorRowGroup[],
  limit: number | null,
  expandedGroupKey: string | null,
): readonly EndeavorRowGroup[] =>
  expandedGroupKey === null
    ? groups.map((group) => limitGroup(group, limit))
    : groups.map((group) => ({ ...group, isTrimmed: false }))

/** Canon's `GroupForTasks.state` for one group, given the expanded key. */
export const groupDisplayState = (
  group: EndeavorRowGroup,
  expandedGroupKey: string | null,
): EndeavorGroupDisplayState => {
  if (expandedGroupKey === null) return EndeavorGroupDisplayState.clipped
  return group.key === expandedGroupKey
    ? EndeavorGroupDisplayState.expanded
    : EndeavorGroupDisplayState.collapsed
}
