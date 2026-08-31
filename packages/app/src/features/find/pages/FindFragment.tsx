'use client'

/**
 * Find — the port of `KroUI/Find/FindView.swift` (`RC-15`).
 *
 * The user's all-endeavors browser: a search field, three rows of filter chips,
 * one bulk menu, and a list whose rows carry the vista's own operations. Pure:
 * it reads no store and dispatches nothing; every value arrives as a prop and
 * every intent leaves as a callback.
 *
 * ## The rows get their gestures from the CAPABILITIES, once
 *
 * `EndeavorRow` is handed `capabilities` + `onOperation` and the merged kit's
 * `EndeavorActionSurface` does the rest: on touch the vista's leading and
 * trailing swipe bindings become swipe surfaces; on pointer the same bindings
 * become a hover strip **and** context-menu entries. This surface therefore
 * declares no gesture of its own — canon's `endeavorOperations(_:on:…)`
 * modifier is exactly that single bridge, and building a second one here is the
 * duplication `FindAdapters`' own header refuses.
 *
 * ## The row's Open control, and the flag it works around
 *
 * Canon's Find row opens Detail with a whole-row tap, and the registry binds
 * that tap `requires: 'endeavorDetail'` — a flag `statusQuoSet` ships **off**,
 * because iOS is dark-launching Detail while its epic lands. This issue builds
 * that surface for the web, so with the tap alone it would be unreachable in a
 * shipping build and the issue's own acceptance criterion ("opens from any
 * endeavor row") could not be met at all.
 *
 * So the row carries a labelled `Open <title>` control of its own, and the
 * vista's tap keeps its flag untouched — the gate is not weakened, a second,
 * unflagged affordance is added beside it. That is a deliberate divergence from
 * canon's shipped Find, it is named in the PR body, and it is the human's to
 * keep or gate at G2.
 *
 * ## The ellipsis menu is a hand-built disclosure, not the kit's dropdown
 *
 * Every other menu in the kit is a Radix dropdown. This one is not, and the
 * reason is written up in `system/primitives/__tests__/radixEnvironment.tsx`:
 * mounting a Radix popper under jsdom costs 5–12 seconds, so those panels are
 * asserted only by a Storybook runner that this repo has not executed yet.
 * *Delete all visible* is irreversible and unconfirmed (canon's own choice, see
 * `findOverflowEntries`), which makes "covered by a runner nobody has run" the
 * wrong bar for it. So the menu is the same disclosure shape the chrome kit's
 * `LiquidGlassFABMenu` already ships — an `aria-expanded` trigger over a
 * labelled group of ordinary buttons, Escape to close, focus returned — and its
 * whole flow is exercised by an ordinary interaction test.
 *
 * ## Where the menu is drawn
 *
 * Canon puts it in the navigation bar (`.topBarTrailing`). The shell owns those
 * bars here and lends them out through `ToolbarSlot`, so the menu is portalled
 * into whichever placement the current shell renders — `primary` on the sidebar
 * shell, `trailing` on the tab-bar shell — and falls back to the surface's own
 * header when neither outlet exists, which is the case in a story, in a test,
 * and on any host that mounts this Fragment outside the shell.
 */
import type {
  EndeavorCapabilities,
  EndeavorComputedState,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
} from '@kro/core'
import {
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { EmptyStateCard } from '../../../design/endeavor/EmptyStateCard'
import { EndeavorRow } from '../../../design/endeavor/EndeavorRow'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { KroChip } from '../../../design/endeavor/KroChip'
import { endeavorIcon } from '../../../design/endeavor/endeavorIcons'
import type { OnEndeavorOperation } from '../../../design/endeavor/rowActions'
import type { InputCapability } from '../../../design/endeavor/useInputCapability'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import {
  ToolbarSlot,
  useToolbarOutletPresent,
} from '../../main/ToolbarSlots'
import type { EndeavorRowAdapter } from '../FindAdapters'
import type { FindException } from '../FindException'
import type { FindEmptyState, FindFilterToggle } from '../FindState'
import {
  type FindFilterChip,
  findEmptyCopy,
  findFilterRows,
  findOverflowEntries,
  findRowBadges,
  findRowSymbol,
  findRowTimeInfo,
  isFilterChipSelected,
} from './findPresentation'

const Search = endeavorIcon('magnifyingglass')
const Ellipsis = endeavorIcon('ellipsis')
const Clear = endeavorIcon('xmark')
const ChevronRight = endeavorIcon('chevron.right')

export interface FindFragmentProps {
  readonly query: string
  readonly rows: readonly EndeavorRowAdapter[]
  /** The flag-resolved capability set every row is adapted against. */
  readonly capabilities: EndeavorCapabilities
  /** `null` while the list has rows to show. */
  readonly emptyState: FindEmptyState | null
  readonly selectedKinds: readonly EndeavorKind[]
  readonly selectedHosts: readonly EndeavorHost[]
  readonly selectedStatuses: readonly EndeavorStatus[]
  readonly selectedComputedStates?: readonly EndeavorComputedState[]
  readonly showArchived: boolean
  /** Exactly the number the bulk menu's counted labels print. */
  readonly visibleCount: number
  readonly isLoading: boolean
  readonly exception: FindException | null
  /** The instant every relative caption is written against (`RC-5`). */
  readonly now: Date
  /** Forces an input grammar. Stories and tests set it; production detects. */
  readonly input?: InputCapability
  readonly locale?: string
  readonly onChangeQuery: (query: string) => void
  readonly onToggleFilter: (toggle: FindFilterToggle) => void
  readonly onToggleShowArchived: () => void
  readonly onOperation: OnEndeavorOperation
  /**
   * The row's Detail affordance.
   *
   * Canon's Find row opens Detail with a whole-row TAP, and the registry
   * declares that binding `requires: 'endeavorDetail'` — a flag that is OFF in
   * the shipping baseline. So on the web the row carries a labelled control of
   * its own, outside the action surface, and the vista's tap keeps its flag.
   * See the header note on the divergence.
   */
  readonly onOpenDetail: (endeavorId: string) => void
  readonly onDeleteAllVisible: () => void
  readonly onArchiveAllVisible: () => void
  readonly onRetry: () => void
}

export function FindFragment(props: FindFragmentProps) {
  const {
    query,
    rows,
    capabilities,
    emptyState,
    selectedKinds,
    selectedHosts,
    selectedStatuses,
    selectedComputedStates,
    showArchived,
    visibleCount,
    isLoading,
    exception,
    now,
    input,
    locale,
    onChangeQuery,
    onToggleFilter,
    onToggleShowArchived,
    onOperation,
    onOpenDetail,
    onDeleteAllVisible,
    onArchiveAllVisible,
    onRetry,
  } = props

  const hasPrimaryOutlet = useToolbarOutletPresent('primary')
  const hasTrailingOutlet = useToolbarOutletPresent('trailing')
  const placement = hasPrimaryOutlet
    ? 'primary'
    : hasTrailingOutlet
      ? 'trailing'
      : null

  const menu = (
    <FindOverflowMenu
      visibleCount={visibleCount}
      onDeleteAllVisible={onDeleteAllVisible}
      onArchiveAllVisible={onArchiveAllVisible}
    />
  )

  return (
    <section
      data-testid="find-surface"
      aria-label="Find"
      className="flex h-full min-h-0 flex-col"
    >
      {placement === null ? null : (
        <ToolbarSlot placement={placement}>{menu}</ToolbarSlot>
      )}

      <div className="flex flex-col gap-kro-small px-kro-medium pt-kro-medium">
        <div className="flex items-center gap-kro-small">
          <FindSearchField
            query={query}
            onChangeQuery={onChangeQuery}
            className="flex-1"
          />
          {placement === null ? menu : null}
        </div>

        <FindFilterBar
          selectedKinds={selectedKinds}
          selectedHosts={selectedHosts}
          selectedStatuses={selectedStatuses}
          selectedComputedStates={selectedComputedStates}
          showArchived={showArchived}
          onToggleFilter={onToggleFilter}
          onToggleShowArchived={onToggleShowArchived}
        />

        {exception === null ? null : (
          <InlineBanner
            message={exception.message}
            actionTitle={exception.recoverable ? 'Try again' : undefined}
            onAction={exception.recoverable ? onRetry : undefined}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-kro-medium pt-kro-small pb-kro-x-large">
        {emptyState !== null ? (
          <FindEmptyView state={emptyState} />
        ) : (
          <>
            <h2
              className="sticky top-0 z-1 m-0 py-kro-small font-bold text-base"
              style={{
                color: colorVar('fore'),
                backgroundColor: colorVar('back'),
              }}
            >
              All Endeavors
            </h2>
            <ul
              aria-busy={isLoading}
              className="m-0 flex list-none flex-col gap-kro-small p-0"
            >
              {rows.map((adapter) => {
                const lead = findRowSymbol(adapter.endeavor.title)
                const name = lead.title.length === 0 ? 'Untitled' : lead.title
                return (
                  <li
                    key={adapter.id}
                    className="flex items-center gap-kro-small"
                  >
                    <div className="min-w-0 flex-1">
                      <EndeavorRow
                        config="find"
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
                      data-testid="find-row-open"
                      onClick={() => onOpenDetail(adapter.id)}
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
          </>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Search field                                                              */
/* ------------------------------------------------------------------------ */

/**
 * The surface's own search field.
 *
 * Canon has none: iOS attaches `.searchable` to the navigation stack and hands
 * the binding down. The web's two shells answer differently — the sidebar shell
 * already carries a field (the shell's, which routes *to* this destination) and
 * the tab-bar shell carries none at all — so the destination owns one, which is
 * also what makes the surface usable when it is opened by URL rather than by
 * typing into the sidebar.
 */
function FindSearchField({
  query,
  onChangeQuery,
  className,
}: {
  readonly query: string
  readonly onChangeQuery: (query: string) => void
  readonly className?: string
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className={cn(
        'flex items-center gap-kro-small rounded-kro-field px-kro-small',
        className,
      )}
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
        aria-label="Search endeavors"
        placeholder="Search endeavors"
        value={query}
        onChange={(event) => onChangeQuery(event.target.value)}
        className="w-full bg-transparent text-sm outline-none"
        style={{ color: colorVar('fore') }}
      />
      {query.length === 0 ? null : (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChangeQuery('')}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{ color: colorVar('foreSecondary') }}
        >
          <Clear size={12} strokeWidth={3} aria-hidden />
        </button>
      )}
    </form>
  )
}

/* ------------------------------------------------------------------------ */
/* Filter chips                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Canon's three horizontal chip scrollers.
 *
 * Each row is a `group` with an accessible name, because canon's rows are
 * visually unlabelled and a screen reader would otherwise read twenty-one
 * unrelated toggles in a run. The chips themselves are `aria-pressed` buttons —
 * a filter chip is a toggle, not a link, and canon's selected/unselected fill
 * is exactly that state.
 */
function FindFilterBar({
  selectedKinds,
  selectedHosts,
  selectedStatuses,
  selectedComputedStates,
  showArchived,
  onToggleFilter,
  onToggleShowArchived,
}: {
  readonly selectedKinds: readonly EndeavorKind[]
  readonly selectedHosts: readonly EndeavorHost[]
  readonly selectedStatuses: readonly EndeavorStatus[]
  readonly selectedComputedStates?: readonly EndeavorComputedState[]
  readonly showArchived: boolean
  readonly onToggleFilter: (toggle: FindFilterToggle) => void
  readonly onToggleShowArchived: () => void
}) {
  const selected = {
    kinds: selectedKinds,
    hosts: selectedHosts,
    statuses: selectedStatuses,
    computedStates: selectedComputedStates,
    showArchived,
  }

  return (
    <div className="flex flex-col gap-kro-tiny">
      {findFilterRows.map((row) => (
        <div
          key={row.id}
          role="group"
          aria-label={row.label}
          data-filter-row={row.id}
          className="flex gap-kro-small overflow-x-auto pb-kro-tiny"
        >
          {row.chips.map((chip) => (
            <FilterChipButton
              key={chip.id}
              chip={chip}
              isSelected={isFilterChipSelected(chip, selected)}
              onPress={() =>
                chip.toggle === null
                  ? onToggleShowArchived()
                  : onToggleFilter(chip.toggle)
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function FilterChipButton({
  chip,
  isSelected,
  onPress,
}: {
  readonly chip: FindFilterChip
  readonly isSelected: boolean
  readonly onPress: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onPress}
      data-filter-chip={chip.id}
      className={cn(
        'inline-flex shrink-0 items-center rounded-kro-pill',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{ minHeight: 'var(--kro-size-min-touch-target)' }}
    >
      <KroChip
        title={chip.label}
        icon={chip.icon}
        tint={chip.tint}
        emphasis={isSelected ? 'prominent' : 'outline'}
        size="small"
      />
    </button>
  )
}

/* ------------------------------------------------------------------------ */
/* Empty states                                                              */
/* ------------------------------------------------------------------------ */

function FindEmptyView({ state }: { readonly state: FindEmptyState }) {
  const copy = findEmptyCopy(state)
  return (
    <div
      data-testid="find-empty-state"
      data-empty-kind={state.kind}
      className="flex h-full items-center justify-center py-kro-x-large"
    >
      <EmptyStateCard
        icon={copy.icon}
        title={copy.title}
        message={copy.message}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* The bulk menu                                                             */
/* ------------------------------------------------------------------------ */

function FindOverflowMenu({
  visibleCount,
  onDeleteAllVisible,
  onArchiveAllVisible,
}: {
  readonly visibleCount: number
  readonly onDeleteAllVisible: () => void
  readonly onArchiveAllVisible: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const choose = useCallback(
    (id: 'deleteAllVisible' | 'archiveAllVisible') => {
      if (id === 'deleteAllVisible') onDeleteAllVisible()
      else onArchiveAllVisible()
      close()
    },
    [close, onArchiveAllVisible, onDeleteAllVisible],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || !isOpen) return
      event.stopPropagation()
      close()
    },
    [close, isOpen],
  )

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Endeavor actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-kro-small outline-none focus-visible:shadow-[var(--kro-ring)]"
        style={{
          minWidth: 'var(--kro-size-min-touch-target)',
          minHeight: 'var(--kro-size-min-touch-target)',
          color: colorVar('fore'),
        }}
      >
        <Ellipsis size={18} aria-hidden />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Endeavor actions"
          className="kro-glass absolute top-full right-0 z-50 mt-kro-tiny flex min-w-60 flex-col p-kro-tiny"
          style={{ borderRadius: radiusVar('field') }}
        >
          {findOverflowEntries(visibleCount).map((entry) => {
            const Icon = endeavorIcon(entry.icon)
            return (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                onClick={() => choose(entry.id)}
                className={cn(
                  'flex h-11 items-center gap-kro-small rounded-kro-small px-kro-small',
                  'text-left text-base outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  color: entry.isDestructive
                    ? colorVar('bannerDanger')
                    : colorVar('fore'),
                }}
              >
                <Icon size={18} aria-hidden />
                {entry.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
