'use client'

/**
 * Plan's visibility panel, driven by the VISTA — the structural half of
 * `EndeavorsLensFiltersSheet` that KC-IS-#19's panel left for this child
 * (`RC-15`: it reads no store and dispatches nothing).
 *
 * #19 shipped the rows; this adds the two things acceptance criterion 3 asks
 * for and a fixed three-section panel cannot give:
 *
 *  1. **the sections come from `lens.exposes`**, so the panel is exactly what
 *     `.planDay` declares rather than three families that happen to match; and
 *  2. **the Calendars family is present**, which `.planDay` declares and #19's
 *     panel does not draw — with canon's own empty state while no slice holds
 *     the calendar inventory.
 *
 * The rows themselves are #19's (`stateRows` / `kindRows` / `hostRows` and its
 * `VisibilityFilterSection` renderer), imported rather than restated: a second
 * copy of the kind vocabulary is how two panels end up offering different
 * filters for the same lens. Making them importable was a four-line additive
 * edit to that file — the only one this child makes outside its lane, and named
 * in the PR body.
 *
 * ## The rings are not this panel's business, and it touches nothing that is
 *
 * The filters narrow what the Plan surface *lists*; the activity rings are
 * KC-IS-#16/#17's and are computed from their own source. This Fragment emits
 * one `PlanVisibilityToggle` per press and nothing else, so there is no path
 * from here to a ring — which is what the "filters never alter rings" criterion
 * asks, and what its render test asserts with the header visible.
 */
import type { EndeavorsVista } from '@kro/core'
import { UserFilter } from '@kro/core'
import { cn } from '../../../../design/system/utils/cn'
import { colorVar } from '../../../../design/system/tokens/roles'
import type { PlanVisibility, PlanVisibilityToggle } from '../../PlanState'
import {
  VisibilityFilterSection,
  hostRows,
  kindRows,
  stateRows,
} from '../PlanVisibilityPanelFragment'
import { planVisibilitySections } from './planVisibilitySections'

/** One calendar the user may hide. Canon's `VisibilityCalendarItem`. */
export interface PlanVisibilityCalendar {
  readonly id: string
  readonly name: string
}

export interface PlanVisibilityFragmentProps {
  /** The live `.planDay` vista — `selectPlanVista`'s answer. */
  readonly vista: EndeavorsVista
  readonly visibility: PlanVisibility
  /**
   * The calendars the user could hide. Empty until a slice holds the Google
   * calendar inventory (`listCalendars`), which is why canon's sheet ships an
   * empty state for exactly this case rather than omitting the section.
   */
  readonly calendars?: readonly PlanVisibilityCalendar[]
  readonly onToggle: (toggle: PlanVisibilityToggle) => void
  readonly className?: string
}

export function PlanVisibilityFragment({
  vista,
  visibility,
  calendars = [],
  onToggle,
  className,
}: PlanVisibilityFragmentProps) {
  const sections = planVisibilitySections(vista.lens)

  return (
    <div
      data-testid="plan-visibility-panel"
      className={cn('flex flex-col gap-kro-medium', className)}
    >
      {sections.map((section) => {
        if (!section.isSupported) {
          // A family the vista declares that this surface has no toggle axis
          // for. Stated rather than skipped: a silently missing control is the
          // failure this exposes-driven panel exists to make impossible.
          return (
            <UnsupportedSection
              key={section.filter}
              title={section.title}
              filter={section.filter}
            />
          )
        }

        switch (section.filter) {
          case UserFilter.computedStates:
            return (
              <VisibilityFilterSection
                key={section.filter}
                title={section.title}
                rows={stateRows}
                visibility={visibility}
                onToggle={onToggle}
              />
            )
          case UserFilter.kinds:
            return (
              <VisibilityFilterSection
                key={section.filter}
                title={section.title}
                rows={kindRows}
                visibility={visibility}
                onToggle={onToggle}
              />
            )
          case UserFilter.hosts:
            return (
              <VisibilityFilterSection
                key={section.filter}
                title={section.title}
                rows={hostRows}
                visibility={visibility}
                onToggle={onToggle}
              />
            )
          case UserFilter.calendars:
            return (
              <VisibilityFilterSection
                key={section.filter}
                title={section.title}
                rows={calendars.map((calendar) => ({
                  id: `calendar-${calendar.id}`,
                  label: calendar.name,
                  toggle: { axis: 'calendar', value: calendar.id },
                  isHidden: (current: PlanVisibility) =>
                    current.hiddenCalendarIds.includes(calendar.id),
                }))}
                emptyMessage="No calendars loaded yet"
                visibility={visibility}
                onToggle={onToggle}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function UnsupportedSection({
  title,
  filter,
}: {
  readonly title: string
  readonly filter: string
}) {
  return (
    <section
      aria-label={title}
      data-testid="plan-visibility-unsupported"
      data-filter={filter}
      className="flex flex-col gap-kro-tiny"
    >
      <h3
        className="px-kro-tiny font-semibold text-xs uppercase tracking-wide"
        style={{ color: colorVar('foreSecondary') }}
      >
        {title}
      </h3>
      <p
        className="m-0 px-kro-small text-sm"
        style={{ color: colorVar('foreSecondary') }}
      >
        This filter is not available on Plan yet.
      </p>
    </section>
  )
}
