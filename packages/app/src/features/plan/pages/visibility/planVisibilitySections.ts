/**
 * Which filter sections the Plan visibility panel draws — the port of
 * `EndeavorsLensFiltersSheet`'s one structural rule: *"Renders only the
 * sections declared in `lens.exposes` (a UserFilterDescriptor), so each vista
 * controls its own filter surface from the centralized EndeavorsVistas
 * registry."*
 *
 * That sentence is acceptance criterion 3 ("the visibility sheet exposes
 * exactly the lens toggles the Plan vista declares"), and it is why this module
 * exists at all: KC-IS-#19's panel draws three fixed sections, which happen to
 * be three of the four `.planDay` declares. Three of four is right by accident,
 * not by construction — a vista change would not move it. This asks the lens.
 *
 * ## Two classes of declared filter, and the difference is honest
 *
 * Four of the eight `UserFilter` values are **axis-backed** on this surface:
 * `PlanVisibilityToggle` carries a `kind`, `host`, `status`, `computedState`
 * and `calendar` axis, and `userDidToggleVisibility` applies each. The other
 * three — `search`, `showArchived`, `grouping` — are stored on
 * `PlanVisibility` but have no toggle axis, so a vista declaring one would ask
 * for a control this surface cannot dispatch. `.planDay` declares **none** of
 * them (`planVisibilitySections.test.ts` asserts it against the shipped
 * registry), so the gap is unreachable today; `isSupported` names it rather
 * than letting a future vista silently lose a control.
 *
 * `statuses` is the fourth axis-backed value and is likewise undeclared by
 * `.planDay` — canon's own sheet has no status section either, because the
 * curated `VisibilityStateFilter` subset (Expired / Overdue / Completed) is the
 * state vocabulary a user reads. It is marked unsupported here for the same
 * reason: no row set exists, and inventing nine status rows no vista asks for
 * would be code with no caller.
 */
import type { EndeavorsLens, UserFilter } from '@kro/core'
import { UserFilter as Filter, lensExposes, userFilters } from '@kro/core'

/**
 * Canon's section order inside `EndeavorsLensFiltersSheet.sections` — Search,
 * State, Kind, Calendars, Hosts, Archived, Group by. `statuses` has no place in
 * canon's sheet at all and is appended last so the order below is still total
 * over `UserFilter`.
 */
export const PLAN_VISIBILITY_FILTER_ORDER: readonly UserFilter[] = [
  Filter.search,
  Filter.computedStates,
  Filter.kinds,
  Filter.calendars,
  Filter.hosts,
  Filter.showArchived,
  Filter.grouping,
  Filter.statuses,
]

/** Every `UserFilter` this surface can actually dispatch a toggle for. */
export const PLAN_VISIBILITY_SUPPORTED_FILTERS: readonly UserFilter[] = [
  Filter.computedStates,
  Filter.kinds,
  Filter.calendars,
  Filter.hosts,
]

/** The section heading canon gives each filter family. */
export const planVisibilityFilterTitle = (filter: UserFilter): string => {
  switch (filter) {
    case Filter.search:
      return 'Search'
    case Filter.computedStates:
      // Canon's iOS sheet titles it "State"; #19's panel shipped "Show" and the
      // rows are the same three. The shipped string is kept so the swap is
      // invisible to a user and to the existing render tests.
      return 'Show'
    case Filter.kinds:
      return 'Kinds'
    case Filter.calendars:
      return 'Calendars'
    case Filter.hosts:
      return 'Sources'
    case Filter.showArchived:
      return 'Archived'
    case Filter.grouping:
      return 'Group by'
    case Filter.statuses:
      return 'Statuses'
    default:
      return filter
  }
}

/** One declared section: which family, its heading, and whether it can be drawn. */
export interface PlanVisibilitySection {
  readonly filter: UserFilter
  readonly title: string
  /** `false` for a family this surface has no toggle axis for — see the header. */
  readonly isSupported: boolean
}

/**
 * The sections a lens declares, in canon's order.
 *
 * Total over `UserFilter` by construction: `PLAN_VISIBILITY_FILTER_ORDER` is
 * asserted to contain every value in `userFilters`, so a filter added to the
 * domain cannot slip past this list unnoticed.
 */
export const planVisibilitySections = (
  lens: EndeavorsLens,
): readonly PlanVisibilitySection[] =>
  PLAN_VISIBILITY_FILTER_ORDER.filter((filter) => lensExposes(lens, filter)).map(
    (filter) => ({
      filter,
      title: planVisibilityFilterTitle(filter),
      isSupported: PLAN_VISIBILITY_SUPPORTED_FILTERS.includes(filter),
    }),
  )

/** Every `UserFilter`, so the order list above can be proven exhaustive. */
export const ALL_PLAN_VISIBILITY_FILTERS: readonly UserFilter[] = userFilters
