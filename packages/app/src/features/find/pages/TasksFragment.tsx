'use client'

/**
 * All Tasks — the port of `KroUI/Tasks/TasksView.swift` (`RC-15`).
 *
 * The grouped task list behind the sidebar's All Tasks row and behind every
 * Lists destination. Pure: no store read, no dispatch; every value is a prop.
 *
 * ## The three parts canon's macOS body has, in canon's order
 *
 * A heading with its glyph, a grouping control, then one block per group: a
 * header carrying the group's name and its **total** count, the group's rows,
 * and a footline that either offers "Show more…" or states how many are listed.
 * `GroupForTasks.state` is what the header's affordance keys on — *Show All*
 * while every group is clipped, *Collapse* on the one that is open, *Show* on
 * its siblings — and `EndeavorGroupDisplayState` is that same value, computed
 * by `#29`'s `groupDisplayState`.
 *
 * ## What canon has here and this port does not
 *
 * **The new-task box.** Canon's macOS body opens with a "Write a new task…"
 * field, and its iOS body with an "ADD NEW TASK" section. Creating an endeavor
 * is the capture feature's (KC-IS-#23 logic, KC-IS-#24 UI), and `findSlice`
 * declares no create event at all — so a field here would either dispatch
 * nothing or reach into a sibling slice (`RC-20`). Named in the PR body rather
 * than faked.
 *
 * **The Reminders banner.** Canon offers "Connect to Reminders"; Apple
 * Reminders has no web equivalent at all, which the epic states as out of
 * scope. There is nothing to connect to, so there is no banner.
 *
 * ## Selecting a row opens Detail
 *
 * Canon's macOS `TaskRow` raises `onSelected`, and the Tasks screen answers it
 * with a trailing detail panel. This build has no trailing panel — the epic
 * maps that content onto a sheet — so the row's selection raises
 * `onSelectEndeavor`, which the Page turns into the same Detail presentation
 * the `viewDetail` capability raises. That keeps Detail reachable from a
 * surface whose vista declares no `viewDetail` binding, which is exactly the
 * "opens from any endeavor row" contract, and it is the only reason a reader
 * will find a selection affordance here that canon's iOS body does not have.
 */
import {
  type EndeavorCapabilities,
  type EndeavorGroupingCriteria,
  endeavorGroupingCriteriaCases,
  endeavorGroupingCriteriaDisplayName,
} from '@kro/core'
import { EmptyStateCard } from '../../../design/endeavor/EmptyStateCard'
import { EndeavorRow } from '../../../design/endeavor/EndeavorRow'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { KroChip, semanticTint } from '../../../design/endeavor/KroChip'
import { endeavorIcon } from '../../../design/endeavor/endeavorIcons'
import type { OnEndeavorOperation } from '../../../design/endeavor/rowActions'
import type { InputCapability } from '../../../design/endeavor/useInputCapability'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { EndeavorRowAdapter } from '../FindAdapters'
import type { FindException } from '../FindException'
import {
  EndeavorGroupDisplayState,
  type EndeavorRowGroup,
  groupDisplayState,
} from '../FindGrouping'
import type { FindEmptyState } from '../FindState'
import {
  findEmptyCopy,
  findRowBadges,
  findRowSymbol,
  findRowTimeInfo,
} from './findPresentation'

const Search = endeavorIcon('magnifyingglass')
const Checklist = endeavorIcon('checklist')
const ChevronRight = endeavorIcon('chevron.right')

/** One group, already adapted — the shape `selectTasksGroupAdapters` returns. */
export interface TasksGroupModel {
  readonly group: EndeavorRowGroup
  readonly rows: readonly EndeavorRowAdapter[]
}

export interface TasksFragmentProps {
  /** Canon's `expectedHeading` — the caller's override, the list, or "Tasks". */
  readonly heading: string
  /** Canon's `expectedTitle` — the macOS subtitle. Empty means none. */
  readonly subtitle: string
  readonly query: string
  readonly grouping: EndeavorGroupingCriteria
  readonly groups: readonly TasksGroupModel[]
  readonly expandedGroupKey: string | null
  readonly capabilities: EndeavorCapabilities
  readonly emptyState: FindEmptyState | null
  readonly isLoading: boolean
  readonly exception: FindException | null
  readonly now: Date
  readonly input?: InputCapability
  readonly locale?: string
  readonly onChangeQuery: (query: string) => void
  readonly onSelectGrouping: (grouping: EndeavorGroupingCriteria) => void
  readonly onExpandGroup: (groupKey: string) => void
  readonly onCollapseGroups: () => void
  readonly onOperation: OnEndeavorOperation
  readonly onSelectEndeavor: (endeavorId: string) => void
  readonly onRetry: () => void
}

export function TasksFragment(props: TasksFragmentProps) {
  const {
    heading,
    subtitle,
    query,
    grouping,
    groups,
    expandedGroupKey,
    capabilities,
    emptyState,
    isLoading,
    exception,
    now,
    input,
    locale,
    onChangeQuery,
    onSelectGrouping,
    onExpandGroup,
    onCollapseGroups,
    onOperation,
    onSelectEndeavor,
    onRetry,
  } = props

  return (
    <section
      data-testid="tasks-surface"
      aria-label={heading}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex flex-col gap-kro-small px-kro-medium pt-kro-medium">
        <div className="flex items-center gap-kro-small">
          <Checklist
            size={26}
            aria-hidden
            style={{ color: colorVar('accent') }}
          />
          <div className="flex min-w-0 flex-col">
            <h2
              className="m-0 truncate font-bold text-2xl"
              style={{ color: colorVar('fore') }}
            >
              {heading}
            </h2>
            {subtitle.length === 0 ? null : (
              <p
                className="m-0 truncate text-sm"
                style={{ color: colorVar('foreSecondary') }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="flex items-center gap-kro-small rounded-kro-field px-kro-small"
          style={{
            backgroundColor: colorVar('backInner'),
            minHeight: 'var(--kro-size-min-touch-target)',
          }}
        >
          <Search
            size={16}
            aria-hidden
            className="shrink-0"
            style={{ color: colorVar('foreSecondary') }}
          />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks"
            value={query}
            onChange={(event) => onChangeQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: colorVar('fore') }}
          />
        </form>

        <GroupingControl
          grouping={grouping}
          onSelectGrouping={onSelectGrouping}
        />

        {exception === null ? null : (
          <InlineBanner
            message={exception.message}
            actionTitle={exception.recoverable ? 'Try again' : undefined}
            onAction={exception.recoverable ? onRetry : undefined}
          />
        )}
      </div>

      <div
        aria-busy={isLoading}
        className="min-h-0 flex-1 overflow-y-auto px-kro-medium pt-kro-small pb-kro-x-large"
      >
        {emptyState !== null ? (
          <div
            data-testid="tasks-empty-state"
            data-empty-kind={emptyState.kind}
            className="flex h-full items-center justify-center py-kro-x-large"
          >
            <EmptyStateCard {...findEmptyCopy(emptyState)} />
          </div>
        ) : (
          <div className="flex flex-col gap-kro-medium">
            {groups.map((model) => (
              <TasksGroupBlock
                key={model.group.key}
                model={model}
                state={groupDisplayState(model.group, expandedGroupKey)}
                capabilities={capabilities}
                now={now}
                input={input}
                locale={locale}
                onExpandGroup={onExpandGroup}
                onCollapseGroups={onCollapseGroups}
                onOperation={onOperation}
                onSelectEndeavor={onSelectEndeavor}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Grouping control                                                          */
/* ------------------------------------------------------------------------ */

/**
 * The lens's `grouping` toggle — the control canon exposes through
 * `UserFilter.grouping` on every `.tasks*` vista.
 *
 * A `radiogroup` rather than a menu: the four criteria are mutually exclusive
 * and all four fit, so a segmented control states the whole choice at a glance,
 * which a menu hides behind a tap.
 */
function GroupingControl({
  grouping,
  onSelectGrouping,
}: {
  readonly grouping: EndeavorGroupingCriteria
  readonly onSelectGrouping: (grouping: EndeavorGroupingCriteria) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Group by"
      data-testid="tasks-grouping-control"
      className="flex gap-kro-small overflow-x-auto pb-kro-tiny"
    >
      {endeavorGroupingCriteriaCases.map((criteria) => {
        const isSelected = criteria === grouping
        return (
          <button
            key={criteria}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectGrouping(criteria)}
            data-grouping-option={criteria}
            className="inline-flex shrink-0 items-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{ minHeight: 'var(--kro-size-min-touch-target)' }}
          >
            <KroChip
              title={endeavorGroupingCriteriaDisplayName(criteria)}
              tint={semanticTint('chipNeutral')}
              emphasis={isSelected ? 'prominent' : 'outline'}
              size="small"
            />
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* One group                                                                 */
/* ------------------------------------------------------------------------ */

function TasksGroupBlock({
  model,
  state,
  capabilities,
  now,
  input,
  locale,
  onExpandGroup,
  onCollapseGroups,
  onOperation,
  onSelectEndeavor,
}: {
  readonly model: TasksGroupModel
  readonly state: EndeavorGroupDisplayState
  readonly capabilities: EndeavorCapabilities
  readonly now: Date
  readonly input?: InputCapability
  readonly locale?: string
  readonly onExpandGroup: (groupKey: string) => void
  readonly onCollapseGroups: () => void
  readonly onOperation: OnEndeavorOperation
  readonly onSelectEndeavor: (endeavorId: string) => void
}) {
  const { group, rows } = model
  const isCollapsed = state === EndeavorGroupDisplayState.collapsed

  return (
    <section
      data-testid="tasks-group"
      data-group-key={group.key}
      data-group-state={state}
      className="flex flex-col gap-kro-small"
    >
      <header className="flex items-center gap-kro-small px-kro-tiny">
        <h3
          className="m-0 font-semibold text-base"
          style={{ color: colorVar('fore') }}
        >
          {group.title} ({group.totalCount})
        </h3>
        <span className="flex-1" />
        <GroupAffordance
          state={state}
          groupKey={group.key}
          onExpandGroup={onExpandGroup}
          onCollapseGroups={onCollapseGroups}
        />
      </header>

      {isCollapsed ? null : (
        <>
          <ul className="m-0 flex list-none flex-col gap-kro-small p-0">
            {rows.map((adapter) => {
              const lead = findRowSymbol(adapter.endeavor.title)
              const name = lead.title.length === 0 ? 'Untitled' : lead.title
              return (
                /*
                  The Open control is a SIBLING of the row, not its `trailing`
                  slot and not a wrapper around it. Three real reasons, all of
                  which only show up in a browser:

                  · a `<button>` may hold only phrasing content, so wrapping the
                    row would be invalid markup;
                  · on POINTER the kit's hover strip is an absolutely-positioned
                    overlay on the row's trailing edge with `pointer-events` on
                    while hovered — anything inside the row underneath it is
                    unclickable, which is exactly what a mouse hovering the row
                    would find;
                  · on TOUCH the action surface takes a POINTER CAPTURE on
                    `pointerdown` so a swipe cannot be lost mid-gesture; a
                    control inside the captured element therefore never sees its
                    click.

                  Outside the surface, the control is reachable by both input
                  types and the swipe still owns the row itself.
                */
                <li
                  key={adapter.id}
                  className="flex items-center gap-kro-small"
                >
                  <div className="min-w-0 flex-1">
                    <EndeavorRow
                      endeavorId={adapter.id}
                      capabilities={capabilities}
                      onOperation={onOperation}
                      input={input}
                      symbol={lead.symbol}
                      isGenericSymbol={lead.isGeneric}
                      title={lead.title}
                      timeInfo={findRowTimeInfo(adapter.endeavor)}
                      badges={findRowBadges(adapter.endeavor)}
                      now={now}
                      locale={locale}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Open ${name}`}
                    data-testid="tasks-row-open"
                    onClick={() => onSelectEndeavor(adapter.id)}
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
          <p
            data-testid="tasks-group-footline"
            className="m-0 px-kro-tiny text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {group.isTrimmed ? (
              <button
                type="button"
                onClick={() => onExpandGroup(group.key)}
                className="underline underline-offset-2 outline-none focus-visible:shadow-[var(--kro-ring)]"
                style={{ color: colorVar('accent') }}
              >
                Show more…
              </button>
            ) : (
              `${rows.length} tasks listed`
            )}
          </p>
        </>
      )}
    </section>
  )
}

/**
 * Canon's `sectionHeader` link, one affordance per state: *Show All* while
 * every group is clipped, *Collapse* on the group that is open, *Show* on the
 * siblings it collapsed.
 */
function GroupAffordance({
  state,
  groupKey,
  onExpandGroup,
  onCollapseGroups,
}: {
  readonly state: EndeavorGroupDisplayState
  readonly groupKey: string
  readonly onExpandGroup: (groupKey: string) => void
  readonly onCollapseGroups: () => void
}) {
  const label =
    state === EndeavorGroupDisplayState.expanded
      ? 'Collapse'
      : state === EndeavorGroupDisplayState.collapsed
        ? 'Show'
        : 'Show All'

  return (
    <button
      type="button"
      onClick={() =>
        state === EndeavorGroupDisplayState.expanded
          ? onCollapseGroups()
          : onExpandGroup(groupKey)
      }
      className="inline-flex items-center rounded-kro-small px-kro-tiny text-xs font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        color: colorVar('accent'),
        minHeight: 'var(--kro-size-min-touch-target)',
      }}
    >
      {label}
    </button>
  )
}
