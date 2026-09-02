'use client'

/**
 * The Plan LIST destination — the port of `TimelineDayView`'s `listCanvas`
 * (`RC-15`: it reads no store and dispatches nothing).
 *
 * Every value arrives as a prop and every intent leaves as a callback. The
 * sections arrive **already grouped and already ordered** by
 * `PlanListSelectors`, exactly as canon's own comment demands of its list —
 * *"rendered as received, not re-derived"* — so this file contains no bucket
 * test, no comparator and no grouping switch.
 *
 * ## The rows get their gestures from the CAPABILITIES, once
 *
 * `.planDay` declares Start Session on the leading edge, Delete on the trailing
 * one and both again in the context menu. `EndeavorRow` is handed the whole set
 * plus one `onOperation`, and the kit's `EndeavorActionSurface` resolves it per
 * input type: swipe surfaces on touch, a hover strip **and** a right-click menu
 * on pointer. That is acceptance criterion 1 ("swipe/context ops match canon per
 * input type") satisfied by the shared bridge rather than by a second grammar
 * written here — the same decision `FindFragment` records.
 *
 * ## The Open control, and the flag behind it
 *
 * Canon opens Detail with a whole-row tap, and the registry gates that tap on
 * `endeavorDetail` — a flag `statusQuoSet` ships **off**. Find hit this first
 * and answered it by adding a labelled `Open <title>` control beside the row
 * rather than weakening the gate; the same answer is used here so one endeavor
 * behaves the same way in both lists.
 *
 * ## The ongoing row, and why the pulse is on the SECTION
 *
 * Canon accents an ongoing row blue and pulses its section header
 * (`showsActivity: isOngoing`). The kit's row preset has no accent slot, so the
 * signal is carried where canon also carries it — the header — plus a text
 * marker on the row itself. A colour alone would be the one signal this repo's
 * contrast contract refuses to ship unpaired.
 */
import type {
  EndeavorCapabilities,
  PlanListGrouping,
  PlanListSort,
} from '@kro/core'
import {
  planListGroupingLabel,
  planListGroupings,
  planListSortLabel,
  planListSorts,
} from '@kro/core'
import type { ReactNode } from 'react'
import { EmptyDayStateView } from '../../../../design/endeavor/EmptyDayStateView'
import { EndeavorRow } from '../../../../design/endeavor/EndeavorRow'
import { endeavorIcon } from '../../../../design/endeavor/endeavorIcons'
import type { OnEndeavorOperation } from '../../../../design/endeavor/rowActions'
import type { InputCapability } from '../../../../design/endeavor/useInputCapability'
import { colorVar, radiusVar } from '../../../../design/system/tokens/roles'
import { cn } from '../../../../design/system/utils/cn'
import {
  type PlanListSection,
  planListBucketFor,
  PlanListBucket,
} from './planListModel'
import {
  planListRowBadges,
  planListRowOpenLabel,
  planListRowSymbol,
  planListRowTimeInfo,
} from './planListPresentation'

const ChevronRight = endeavorIcon('chevron.right')

export interface PlanListFragmentProps {
  /** Already grouped and already sorted — see the header. */
  readonly sections: readonly PlanListSection[]
  /** The flag-resolved capability set every row is adapted against. */
  readonly capabilities: EndeavorCapabilities
  readonly grouping: PlanListGrouping
  readonly sort: PlanListSort
  /** The instant every relative caption and the ongoing marker read (`RC-5`). */
  readonly now: Date
  /** Forces an input grammar. Stories and tests set it; production detects. */
  readonly input?: InputCapability
  readonly locale?: string
  /** The floating day picker, drawn over the scroll area exactly as the timeline draws it. */
  readonly overlay?: ReactNode
  /** Clearance for that overlay, and for the FAB below. */
  readonly topInsetPx: number
  readonly bottomInsetPx: number
  readonly onSelectGrouping: (grouping: PlanListGrouping) => void
  readonly onSelectSort: (sort: PlanListSort) => void
  readonly onOperation: OnEndeavorOperation
  readonly onOpenDetail: (endeavorId: string) => void
  readonly className?: string
}

export function PlanListFragment({
  sections,
  capabilities,
  grouping,
  sort,
  now,
  input,
  locale,
  overlay,
  topInsetPx,
  bottomInsetPx,
  onSelectGrouping,
  onSelectSort,
  onOperation,
  onOpenDetail,
  className,
}: PlanListFragmentProps) {
  const isEmpty = sections.length === 0

  return (
    <section
      data-testid="plan-list"
      data-grouping={grouping}
      data-sort={sort}
      aria-label="Plan list"
      className={cn('relative flex h-full min-h-0 flex-col', className)}
    >
      {overlay === undefined ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div className="pointer-events-auto">{overlay}</div>
        </div>
      )}

      <div
        data-testid="plan-list-scroll"
        className="min-h-0 flex-1 overflow-y-auto px-kro-medium"
        style={{ paddingTop: topInsetPx, paddingBottom: bottomInsetPx }}
      >
        <PlanListModeBar
          grouping={grouping}
          sort={sort}
          onSelectGrouping={onSelectGrouping}
          onSelectSort={onSelectSort}
        />

        {isEmpty ? (
          <EmptyDayStateView
            title="Nothing on this day"
            message="No endeavors for this day. Add one from the button below, or pick another day above."
            actionTitle={undefined}
          />
        ) : (
          sections.map((section) => (
            <section
              key={section.id}
              data-testid="plan-list-section"
              data-section={section.id}
              aria-label={section.title}
              className="flex flex-col gap-kro-small pb-kro-medium"
            >
              <h3
                data-testid="plan-list-section-header"
                className="sticky top-0 z-1 m-0 flex items-center gap-kro-tiny py-kro-small font-bold text-sm uppercase tracking-wide"
                style={{
                  color: colorVar('fore'),
                  backgroundColor: colorVar('back'),
                }}
              >
                {section.title}
                {section.isOngoing ? (
                  <span
                    data-testid="plan-list-section-activity"
                    className="inline-flex items-center gap-1 rounded-kro-pill px-2 py-0.5 font-semibold text-[10px] normal-case"
                    style={{
                      backgroundColor: colorVar('badgeBlue'),
                      color: colorVar('absolute'),
                    }}
                  >
                    Now
                  </span>
                ) : null}
              </h3>

              <ul className="m-0 flex list-none flex-col gap-kro-small p-0">
                {section.endeavors.map((endeavor) => {
                  const lead = planListRowSymbol(endeavor.title)
                  const isOngoing =
                    planListBucketFor(endeavor, now) === PlanListBucket.ongoing
                  return (
                    <li
                      key={endeavor.id}
                      data-testid="plan-list-row"
                      data-endeavor-id={endeavor.id}
                      data-ongoing={isOngoing ? 'true' : 'false'}
                      className="flex items-center gap-kro-small"
                    >
                      <div className="min-w-0 flex-1">
                        <EndeavorRow
                          config="default"
                          endeavorId={endeavor.id}
                          capabilities={capabilities}
                          onOperation={onOperation}
                          input={input}
                          symbol={lead.symbol}
                          isGenericSymbol={lead.isGeneric}
                          title={lead.title}
                          timeInfo={planListRowTimeInfo(endeavor)}
                          badges={planListRowBadges(endeavor)}
                          now={now}
                          locale={locale}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={planListRowOpenLabel(lead.title)}
                        data-testid="plan-list-row-open"
                        onClick={() => onOpenDetail(endeavor.id)}
                        className="inline-flex shrink-0 items-center justify-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)]"
                        style={{
                          minWidth: 'var(--kro-size-min-touch-target)',
                          minHeight: 'var(--kro-size-min-touch-target)',
                          color: colorVar('foreSecondary'),
                        }}
                      >
                        <ChevronRight size={16} aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Grouping and sort                                                         */
/* ------------------------------------------------------------------------ */

/**
 * The two preference controls, on the surface they govern.
 *
 * A DIVERGENCE, stated: canon has no in-list control — `plan.listGrouping` and
 * `plan.listSort` are reached through the Settings app only, because on iOS the
 * Plan list is one of several screens the preference governs. The web ships
 * the same Settings rows (the Plan preferences section already lists both keys)
 * **and** these, because leaving the tab to regroup the day is a round trip the
 * phone shell makes expensive, and because a mode a user cannot reach is a mode
 * that is not really shipped. They write the same two preference keys, so the
 * two surfaces cannot disagree.
 *
 * Chips rather than a dropdown: a popper under jsdom costs seconds to mount
 * (`system/primitives/__tests__/radixEnvironment.tsx`), and this repo's Plan
 * suite asserts these controls directly.
 */
function PlanListModeBar({
  grouping,
  sort,
  onSelectGrouping,
  onSelectSort,
}: {
  readonly grouping: PlanListGrouping
  readonly sort: PlanListSort
  readonly onSelectGrouping: (grouping: PlanListGrouping) => void
  readonly onSelectSort: (sort: PlanListSort) => void
}) {
  return (
    <div className="flex flex-col gap-kro-tiny pb-kro-small">
      <ModeRow
        testId="plan-list-grouping"
        label="Group by"
        options={planListGroupings.map((value) => ({
          value,
          label: planListGroupingLabel(value),
          isSelected: value === grouping,
        }))}
        onSelect={(value) => onSelectGrouping(value as PlanListGrouping)}
      />
      <ModeRow
        testId="plan-list-sort"
        label="Sort by"
        options={planListSorts.map((value) => ({
          value,
          label: planListSortLabel(value),
          isSelected: value === sort,
        }))}
        onSelect={(value) => onSelectSort(value as PlanListSort)}
      />
    </div>
  )
}

function ModeRow({
  testId,
  label,
  options,
  onSelect,
}: {
  readonly testId: string
  readonly label: string
  readonly options: readonly {
    readonly value: string
    readonly label: string
    readonly isSelected: boolean
  }[]
  readonly onSelect: (value: string) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className="flex items-center gap-kro-small overflow-x-auto"
    >
      <span
        className="shrink-0 font-semibold text-xs uppercase tracking-wide"
        style={{ color: colorVar('foreSecondary') }}
      >
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.isSelected}
          data-option={option.value}
          onClick={() => onSelect(option.value)}
          className={cn(
            'inline-flex shrink-0 items-center px-kro-small py-1',
            'border-none text-xs outline-none',
            'focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            borderRadius: radiusVar('pill'),
            backgroundColor: option.isSelected
              ? colorVar('accent')
              : colorVar('backInner'),
            color: option.isSelected ? colorVar('onAccent') : colorVar('fore'),
            // The 44px floor, same as Find's filter chips: these are the only
            // controls between the day picker and the rows, and a 28px chip
            // there is a miss on a phone.
            minHeight: 'var(--kro-size-min-touch-target)',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
