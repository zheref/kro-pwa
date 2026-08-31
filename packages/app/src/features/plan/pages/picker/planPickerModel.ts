/**
 * The add-existing picker as pure logic — the port of
 * `Kro/Application/PickEndeavor/PickEndeavorSelectors.swift`.
 *
 * Search, section order, selection cap and the two enabling questions the
 * toolbar asks (`canConfirm`, `canSelectMore`). Nothing here renders and
 * nothing here reads a clock: the reference day arrives as an argument, which
 * is what makes the "Today" section testable.
 *
 * ## Task-only, by RESOLVED kind
 *
 * Canon filters `resolvedKind == .task && (nowDisplayType == .tasks ||
 * .tickets)` — the same pair `PlanMatrix.isEligibleMatrixKind` already ports,
 * so the picker offers exactly what the matrix would admit. Reusing it rather
 * than restating the test is what keeps "you may pick it" and "it will appear"
 * from ever disagreeing.
 *
 * Note the deliberate asymmetry with the board: the picker does **not** require
 * a due date and a value, because assigning them is the whole point of picking.
 * `selectPlanMatrixPickerCandidates` already applies that half.
 *
 * ## Three priority bands, then the active grouping inside each
 *
 * Canon's sections are the cross product of `PickerPriority` (Today → Has
 * triage data → No triage data) and the user's `plan.listGrouping`, titled
 * `"<priority> · <suffix>"`. With the default grouping (`none`) that collapses
 * to the three plain bands the issue names; with Project or Time of day the
 * user gets their own grouping *inside* each band, which is the behaviour that
 * makes the preference mean the same thing everywhere in Plan.
 */
import type { Endeavor, PlanListGrouping } from '@kro/core'
import { PlanListGrouping as Grouping, assertNever } from '@kro/core'
import { isSamePlanDay } from '../../PlanCalendar'
import { isEligibleMatrixKind } from '../../PlanMatrix'

/** `PickEndeavorFeature.State.selectionLimit` — canon's seven. */
export const PICK_ENDEAVOR_SELECTION_LIMIT = 7

/** Canon's `PickerPriority`, in canon's declaration (section) order. */
export const PickEndeavorPriority = {
  today: 'today',
  triaged: 'triaged',
  untriaged: 'untriaged',
} as const

export type PickEndeavorPriority =
  (typeof PickEndeavorPriority)[keyof typeof PickEndeavorPriority]

export const pickEndeavorPriorities: readonly PickEndeavorPriority[] = [
  PickEndeavorPriority.today,
  PickEndeavorPriority.triaged,
  PickEndeavorPriority.untriaged,
]

/** `PickerPriority.title`, verbatim. */
export const pickEndeavorPriorityTitle = (
  priority: PickEndeavorPriority,
): string => {
  switch (priority) {
    case PickEndeavorPriority.today:
      return 'Today'
    case PickEndeavorPriority.triaged:
      return 'Has triage data'
    case PickEndeavorPriority.untriaged:
      return 'No triage data'
    default:
      return assertNever(priority)
  }
}

/** Canon's `PickerTimeSection` — the list's three bands plus `unscheduled`. */
const PickerTimeSection = {
  unscheduled: 'unscheduled',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
} as const

type PickerTimeSection =
  (typeof PickerTimeSection)[keyof typeof PickerTimeSection]

const pickerTimeSections: readonly PickerTimeSection[] = [
  PickerTimeSection.unscheduled,
  PickerTimeSection.morning,
  PickerTimeSection.afternoon,
  PickerTimeSection.evening,
]

const pickerTimeSectionTitle = (section: PickerTimeSection): string => {
  switch (section) {
    case PickerTimeSection.unscheduled:
      return 'Unscheduled'
    case PickerTimeSection.morning:
      return 'Morning'
    case PickerTimeSection.afternoon:
      return 'Afternoon'
    case PickerTimeSection.evening:
      return 'Evening'
    default:
      return assertNever(section)
  }
}

/**
 * Canon's `pickerTimeSection(for:)` — unlike the Plan list's band, an item with
 * neither a start nor a due date gets its own `Unscheduled` section here rather
 * than being folded into the evening.
 */
const pickerTimeSectionFor = (endeavor: Endeavor): PickerTimeSection => {
  const reference = endeavor.start ?? endeavor.due
  if (reference === null) return PickerTimeSection.unscheduled
  const hour = reference.getHours()
  if (hour < 12) return PickerTimeSection.morning
  if (hour < 17) return PickerTimeSection.afternoon
  return PickerTimeSection.evening
}

/** Canon's `pickerPriority(for:)`. */
export const pickEndeavorPriorityFor = (
  endeavor: Endeavor,
  referenceDate: Date,
): PickEndeavorPriority => {
  if (endeavor.due === null && endeavor.value === null) {
    return PickEndeavorPriority.untriaged
  }
  const moments = [endeavor.start, endeavor.due].filter(
    (moment): moment is Date => moment !== null,
  )
  const isToday = moments.some((moment) => isSamePlanDay(moment, referenceDate))
  return isToday ? PickEndeavorPriority.today : PickEndeavorPriority.triaged
}

/** Canon's `pickerOrder` — case-insensitive title, then a stable `id` tiebreak. */
const pickerOrder = (left: Endeavor, right: Endeavor): number => {
  const byTitle = left.title.localeCompare(right.title, undefined, {
    sensitivity: 'accent',
  })
  if (byTitle !== 0) return byTitle
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

/**
 * `filteredEndeavorsSelector` — supported kinds, matching the query, in
 * deterministic picker order.
 *
 * The query match is case- and diacritic-insensitive, which is what
 * `localizedStandardContains` means on the Apple side; `localeCompare` with
 * `sensitivity: 'base'` is the web's equivalent and is used here on a sliding
 * window rather than a naive `toLowerCase().includes`, so "café" matches
 * "cafe" exactly as it does upstream.
 */
export const pickEndeavorCandidates = (
  endeavors: readonly Endeavor[],
  query: string,
): readonly Endeavor[] => {
  const needle = query.trim()
  return endeavors
    .filter((endeavor) => isEligibleMatrixKind(endeavor))
    .filter((endeavor) => needle.length === 0 || titleContains(endeavor.title, needle))
    .sort(pickerOrder)
}

/** Diacritic- and case-insensitive substring test. */
const titleContains = (title: string, needle: string): boolean => {
  if (needle.length > title.length) return false
  for (let index = 0; index + needle.length <= title.length; index += 1) {
    const window = title.slice(index, index + needle.length)
    if (window.localeCompare(needle, undefined, { sensitivity: 'base' }) === 0) {
      return true
    }
  }
  return false
}

/** One rendered section of the picker. Canon's `PickEndeavorSection`. */
export interface PickEndeavorSection {
  readonly id: string
  readonly title: string
  readonly endeavors: readonly Endeavor[]
}

const sectionsWithinPriority = (
  endeavors: readonly Endeavor[],
  priority: PickEndeavorPriority,
  grouping: PlanListGrouping,
): readonly PickEndeavorSection[] => {
  if (endeavors.length === 0) return []
  const priorityTitle = pickEndeavorPriorityTitle(priority)
  const make = (
    items: readonly Endeavor[],
    suffix: string | null,
    idSuffix: string,
  ): PickEndeavorSection => ({
    id: `${priority}-${idSuffix}`,
    title: suffix === null ? priorityTitle : `${priorityTitle} · ${suffix}`,
    endeavors: items,
  })

  switch (grouping) {
    case Grouping.none:
      return [make(endeavors, null, 'all')]

    case Grouping.project: {
      const byProject = new Map<string, Endeavor[]>()
      const withoutProject: Endeavor[] = []
      for (const endeavor of endeavors) {
        const projectId = endeavor.projectId
        if (projectId === null) {
          withoutProject.push(endeavor)
          continue
        }
        const bucket = byProject.get(projectId)
        if (bucket === undefined) byProject.set(projectId, [endeavor])
        else bucket.push(endeavor)
      }
      const sections = [...byProject.keys()]
        .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
        .map((projectId) =>
          make(byProject.get(projectId) ?? [], projectId, projectId),
        )
      if (withoutProject.length === 0) return sections
      return [...sections, make(withoutProject, 'No project', 'noProject')]
    }

    case Grouping.timeOfDay:
      return pickerTimeSections
        .map((section) =>
          make(
            endeavors.filter(
              (endeavor) => pickerTimeSectionFor(endeavor) === section,
            ),
            pickerTimeSectionTitle(section),
            section,
          ),
        )
        .filter((section) => section.endeavors.length > 0)

    default:
      return assertNever(grouping)
  }
}

/** `sectionsSelector` — the three priority bands, each grouped as the user asked. */
export const pickEndeavorSections = (params: {
  readonly endeavors: readonly Endeavor[]
  readonly query: string
  readonly grouping: PlanListGrouping
  readonly referenceDate: Date
}): readonly PickEndeavorSection[] => {
  const candidates = pickEndeavorCandidates(params.endeavors, params.query)
  if (candidates.length === 0) return []
  return pickEndeavorPriorities.flatMap((priority) =>
    sectionsWithinPriority(
      candidates.filter(
        (endeavor) =>
          pickEndeavorPriorityFor(endeavor, params.referenceDate) === priority,
      ),
      priority,
      params.grouping,
    ),
  )
}

/**
 * `selectedEndeavorsSelector` — the selection, **capped**, and only over rows
 * the current search still shows.
 *
 * The cap is applied here rather than at the toggle, exactly as canon applies
 * it (`prefix(selectionLimit)`), so a selection made before a search narrowed
 * the list cannot silently confirm a row the user can no longer see.
 */
export const pickEndeavorSelection = (
  candidates: readonly Endeavor[],
  selectedIds: ReadonlySet<string>,
): readonly Endeavor[] =>
  candidates
    .filter((endeavor) => selectedIds.has(endeavor.id))
    .slice(0, PICK_ENDEAVOR_SELECTION_LIMIT)

/** `canSelectMoreSelector` — the cap, as the enabling question the cards ask. */
export const pickEndeavorCanSelectMore = (selectionCount: number): boolean =>
  selectionCount < PICK_ENDEAVOR_SELECTION_LIMIT

/** `canConfirmSelector` — at least one row. */
export const pickEndeavorCanConfirm = (selectionCount: number): boolean =>
  selectionCount > 0

/**
 * Why Confirm is disabled, in the user's words — the repo's rule that *"disabled
 * submit controls name what blocks them"*. `null` means it is enabled.
 */
export const pickEndeavorConfirmBlocker = (
  selectionCount: number,
): string | null =>
  pickEndeavorCanConfirm(selectionCount)
    ? null
    : 'Select at least one task to add.'

/** What the cap says once it is reached. `null` while there is room left. */
export const pickEndeavorCapNotice = (selectionCount: number): string | null =>
  pickEndeavorCanSelectMore(selectionCount)
    ? null
    : `You can add ${PICK_ENDEAVOR_SELECTION_LIMIT} tasks at a time. Deselect one to choose another.`

/** The running count, in the user's words. */
export const pickEndeavorSelectionCaption = (selectionCount: number): string =>
  `${selectionCount} of ${PICK_ENDEAVOR_SELECTION_LIMIT} selected`

/** `subtitleSelector`, verbatim. */
export const PICK_ENDEAVOR_SUBTITLE =
  'Choose up to seven tasks. Their due dates and values will be adjusted automatically.'
