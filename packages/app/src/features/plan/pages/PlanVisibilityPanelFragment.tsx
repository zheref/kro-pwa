'use client'

/**
 * The lens panel behind the visibility eye — the port of canon's
 * `EndeavorsLensFiltersSheet` as Plan presents it (`PlanScreen.sheetContent`,
 * `case .visibility`).
 *
 * Pure (`RC-15`): the eight hidden-sets arrive as the plain `PlanVisibility`
 * the slice stores, and every toggle leaves as one `PlanVisibilityToggle`.
 * The Page decides what that means; this Fragment only draws the rows.
 *
 * ## Three axes, and the fourth canon has that the web does not
 *
 * Canon's `VisibilityFilter.swift` declares four families — state, kind, host
 * and per-calendar. The first three are ported here. Per-calendar rows need
 * the Google calendar inventory (`listCalendars`), which no slice holds yet;
 * `PlanVisibility.hiddenCalendarIds` is already in state and
 * `userDidToggleVisibility` already accepts the `calendar` axis, so the row
 * set is the only missing piece and it arrives with whichever child fetches
 * that inventory. Nothing here pretends otherwise.
 *
 * ## The rows are stated in canon's vocabulary, not the domain's
 *
 * Canon's kind filter has four cases — Events, Tasks, Habits, Reminders — not
 * the domain's seven `EndeavorKind`s: `background`, `behavior` and `blueprint`
 * are internal shapes a user never chose. So the visible rows are canon's
 * four, expressed as the domain values they hide. Rendering all seven would
 * offer to hide two kinds the timeline cannot draw and one that is a template.
 *
 * The host rows are canon's minus the two Apple hosts, which the epic puts out
 * of scope outright — *"Apple EventKit hosts … impossible on web"*. Offering a
 * filter for a host that can never appear would be a control with no effect.
 *
 * ## A checkbox says "shown", the state stores "hidden"
 *
 * The slice keeps `hidden…` sets, because that is the lens's own shape and an
 * empty set is the honest default for "nothing is filtered". A user reads the
 * opposite — a ticked box means *shown* — so the row inverts once, here, at
 * the presentation boundary, and the inversion is a single named function so
 * it cannot be half-applied.
 */
import type {
  EndeavorComputedState,
  EndeavorHost,
  EndeavorKind,
} from '@kro/core'
import {
  EndeavorComputedState as ComputedState,
  EndeavorHost as Host,
  EndeavorKind as Kind,
} from '@kro/core'
import { ICON_SIZE, iconForSymbol } from '../../../design/system/icons/icons'
import { cn } from '../../../design/system/utils/cn'
import type { PlanVisibility, PlanVisibilityToggle } from '../PlanState'

export interface VisibilityRow {
  readonly id: string
  readonly label: string
  readonly toggle: PlanVisibilityToggle
  readonly isHidden: (visibility: PlanVisibility) => boolean
}

/** Canon's `VisibilityStateFilter.allCases`, in canon's order. */
export const stateRows: readonly VisibilityRow[] = [
  {
    id: 'state-expired',
    label: 'Expired',
    toggle: { axis: 'computedState', value: ComputedState.expired },
    isHidden: (visibility) =>
      visibility.hiddenComputedStates.includes(ComputedState.expired),
  },
  {
    id: 'state-overdue',
    label: 'Overdue',
    toggle: { axis: 'computedState', value: ComputedState.overdue },
    isHidden: (visibility) =>
      visibility.hiddenComputedStates.includes(ComputedState.overdue),
  },
  {
    id: 'state-completed',
    label: 'Completed',
    toggle: { axis: 'computedState', value: ComputedState.completedToday },
    isHidden: (visibility) =>
      visibility.hiddenComputedStates.includes(ComputedState.completedToday),
  },
]

const kindRow = (
  id: string,
  label: string,
  value: EndeavorKind,
): VisibilityRow => ({
  id,
  label,
  toggle: { axis: 'kind', value },
  isHidden: (visibility) => visibility.hiddenKinds.includes(value),
})

/** Canon's `VisibilityKindFilter.allCases`, in canon's order. */
export const kindRows: readonly VisibilityRow[] = [
  kindRow('kind-events', 'Events', Kind.calendarEvent),
  kindRow('kind-tasks', 'Tasks', Kind.task),
  kindRow('kind-habits', 'Habits', Kind.habit),
  kindRow('kind-reminders', 'Reminders', Kind.reminder),
]

const hostRow = (
  id: string,
  label: string,
  value: EndeavorHost,
): VisibilityRow => ({
  id,
  label,
  toggle: { axis: 'host', value },
  isHidden: (visibility) => visibility.hiddenHosts.includes(value),
})

/** Canon's `VisibilityHostFilter`, minus the two Apple hosts the epic excludes. */
export const hostRows: readonly VisibilityRow[] = [
  hostRow('host-kro-cloud', 'Kro Cloud', Host.supabase),
  hostRow('host-local', 'This device', Host.local),
  hostRow('host-google', 'Google Calendar', Host.googleCalendar),
]

/** Every computed state a row can hide, so a caller can assert the set. */
export const VISIBILITY_STATE_VALUES: readonly EndeavorComputedState[] = [
  ComputedState.expired,
  ComputedState.overdue,
  ComputedState.completedToday,
]

/**
 * Canon's `areAllVisibilityFiltersEnabled` — the eye's own glyph.
 *
 * `true` means nothing is filtered, so the control draws an open eye; anything
 * hidden draws the struck-through one. Exported because the toolbar control
 * reads it and this Fragment is not always mounted.
 */
export const areAllPlanFiltersEnabled = (visibility: PlanVisibility): boolean =>
  visibility.hiddenKinds.length === 0 &&
  visibility.hiddenHosts.length === 0 &&
  visibility.hiddenStatuses.length === 0 &&
  visibility.hiddenComputedStates.length === 0 &&
  visibility.hiddenCalendarIds.length === 0

export interface PlanVisibilityPanelFragmentProps {
  readonly visibility: PlanVisibility
  readonly onToggle: (toggle: PlanVisibilityToggle) => void
  readonly className?: string
}

export function PlanVisibilityPanelFragment({
  visibility,
  onToggle,
  className,
}: PlanVisibilityPanelFragmentProps) {
  return (
    <div
      data-testid="plan-visibility-panel"
      className={cn('flex flex-col gap-kro-medium', className)}
    >
      <VisibilityFilterSection
        title="Show"
        rows={stateRows}
        visibility={visibility}
        onToggle={onToggle}
      />
      <VisibilityFilterSection
        title="Kinds"
        rows={kindRows}
        visibility={visibility}
        onToggle={onToggle}
      />
      <VisibilityFilterSection
        title="Sources"
        rows={hostRows}
        visibility={visibility}
        onToggle={onToggle}
      />
    </div>
  )
}

export function VisibilityFilterSection({
  title,
  rows,
  emptyMessage,
  visibility,
  onToggle,
}: {
  readonly title: string
  readonly rows: readonly VisibilityRow[]
  /**
   * What a section with no rows says instead of drawing nothing — canon's own
   * `emptyState(...)`, needed by the Calendars family whose inventory no slice
   * holds yet (KC-IS-#20). Omitting it keeps the pre-existing behaviour: a
   * row-less section renders as a bare heading.
   */
  readonly emptyMessage?: string
  readonly visibility: PlanVisibility
  readonly onToggle: (toggle: PlanVisibilityToggle) => void
}) {
  const Check = iconForSymbol('checkmark')

  return (
    <section aria-label={title} className="flex flex-col gap-kro-tiny">
      <h3 className="px-kro-tiny font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide">
        {title}
      </h3>
      {rows.length === 0 && emptyMessage !== undefined ? (
        <p
          data-testid="plan-visibility-empty"
          className="m-0 px-kro-small py-kro-small text-kro-fore-secondary text-sm"
        >
          {emptyMessage}
        </p>
      ) : null}
      {rows.map((row) => {
        const isShown = !row.isHidden(visibility)
        return (
          <button
            key={row.id}
            type="button"
            role="switch"
            aria-checked={isShown}
            data-testid="plan-visibility-row"
            data-row={row.id}
            onClick={() => onToggle(row.toggle)}
            className={cn(
              'flex w-full items-center justify-between gap-kro-small',
              'cursor-pointer rounded-kro-field border-none bg-transparent',
              'px-kro-small py-kro-small text-left text-kro-fore text-sm',
              'hover:bg-kro-back-inner',
            )}
          >
            <span>{row.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 items-center justify-center rounded-kro-small',
                isShown
                  ? 'bg-kro-accent text-kro-on-accent'
                  : 'border border-kro-hairline',
              )}
            >
              {isShown && <Check size={ICON_SIZE.small} />}
            </span>
          </button>
        )
      })}
    </section>
  )
}
