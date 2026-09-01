'use client'

/**
 * The **add-existing** picker — the port of `KroUI/PickEndeavor/PickEndeavorView.swift`
 * plus the toolbar `Kro/Application/PickEndeavor/PickEndeavorScreen.swift` puts
 * around it.
 *
 * Presented as a glass sheet on the handheld shell and a popover-sized panel on
 * the desktop one; the *presentation* is the Page's (it reads the shell's own
 * decision table), and this Fragment is only the content.
 *
 * ## The draft lives here, and that is the narrow case, not the general one
 *
 * Canon models the picker as a **presented child feature**
 * (`PickEndeavorFeature.State`) whose lifetime is exactly the sheet's: a search
 * string and a selected-id set, discarded on dismiss, read by nothing else.
 * On this stack a slice would have to be registered in `library/store.ts`,
 * which is outside this child's file lane, so the same two fields are held
 * here — the shape `RC-4` allows for state that is genuinely the dialog's own
 * (the precedent in this repo is `CapturePromptFragment`'s panel and
 * `FindFragment`'s menu). Nothing derived from them survives dismissal, and the
 * only thing that leaves is the confirmed id list. Promoting it to a real
 * `pickEndeavor` slice is a cross-lane follow-up, named in the PR body.
 *
 * ## Why the cap is enforced in TWO places, and both are canon's
 *
 * `pickEndeavorSelection` caps the confirmed list (canon's
 * `prefix(selectionLimit)`), and an unselected card is **disabled** once the cap
 * is reached (canon's `isEnabled: isSelected || canSelectMore`). The first makes
 * the cap true; the second makes it *visible*, which is the acceptance criterion
 * — a cap that only bites at confirm time reads as a bug. A notice states the
 * rule in words beside them, because a row that greys out with no explanation is
 * the failure this repo's disabled-control rule exists to prevent.
 */
import type { Endeavor, PlanListGrouping } from '@kro/core'
import { useCallback, useId, useMemo, useState } from 'react'
import { EmptyStateCard } from '../../../../design/endeavor/EmptyStateCard'
import { EndeavorRow } from '../../../../design/endeavor/EndeavorRow'
import { endeavorIcon } from '../../../../design/endeavor/endeavorIcons'
import { colorVar, radiusVar } from '../../../../design/system/tokens/roles'
import { cn } from '../../../../design/system/utils/cn'
import {
  planListRowSymbol,
  planListRowTimeInfo,
} from '../list/planListPresentation'
import {
  type PlanMatrixQuadrant,
  planMatrixQuadrantTitle,
} from '../matrix/planMatrixPresentation'
import {
  PICK_ENDEAVOR_SUBTITLE,
  pickEndeavorCandidates,
  pickEndeavorCanSelectMore,
  pickEndeavorCapNotice,
  pickEndeavorConfirmBlocker,
  pickEndeavorSections,
  pickEndeavorSelection,
  pickEndeavorSelectionCaption,
} from './planPickerModel'

const Search = endeavorIcon('magnifyingglass')
const Clear = endeavorIcon('xmark')
const ChevronRight = endeavorIcon('chevron.right')
const Check = endeavorIcon('checkmark')

export interface PickEndeavorFragmentProps {
  readonly quadrant: PlanMatrixQuadrant
  /** `selectPlanMatrixPickerCandidates` — everything already fetched that qualifies. */
  readonly endeavors: readonly Endeavor[]
  /** The active `plan.listGrouping`, which sections each priority band. */
  readonly grouping: PlanListGrouping
  /** The day "Today" is measured against, and the instant captions read. */
  readonly now: Date
  readonly locale?: string
  readonly onConfirm: (endeavorIds: readonly string[]) => void
  readonly onDismiss: () => void
  readonly onViewDetail: (endeavorId: string) => void
  readonly className?: string
}

export function PickEndeavorFragment({
  quadrant,
  endeavors,
  grouping,
  now,
  locale,
  onConfirm,
  onDismiss,
  onViewDetail,
  className,
}: PickEndeavorFragmentProps) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const candidates = useMemo(
    () => pickEndeavorCandidates(endeavors, query),
    [endeavors, query],
  )
  const sections = useMemo(
    () =>
      pickEndeavorSections({ endeavors, query, grouping, referenceDate: now }),
    [endeavors, grouping, now, query],
  )
  const selection = useMemo(
    () => pickEndeavorSelection(candidates, selectedSet),
    [candidates, selectedSet],
  )

  const selectionCount = selection.length
  const canSelectMore = pickEndeavorCanSelectMore(selectionCount)
  const capNotice = pickEndeavorCapNotice(selectionCount)
  const confirmBlocker = pickEndeavorConfirmBlocker(selectionCount)
  const blockerId = useId()

  const onToggle = useCallback((endeavorId: string) => {
    setSelectedIds((current) =>
      current.includes(endeavorId)
        ? current.filter((id) => id !== endeavorId)
        : [...current, endeavorId],
    )
  }, [])

  const title = `Add to ${planMatrixQuadrantTitle(quadrant)}`

  return (
    <div
      data-testid="pick-endeavor"
      data-quadrant={quadrant}
      aria-label={title}
      className={cn('flex h-full min-h-0 flex-col gap-kro-small', className)}
    >
      <header className="flex shrink-0 items-start justify-between gap-kro-small">
        <div className="min-w-0">
          <h2 className="m-0 font-semibold text-lg" style={{ color: colorVar('fore') }}>
            {title}
          </h2>
          <p
            data-testid="pick-endeavor-subtitle"
            className="m-0 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {PICK_ENDEAVOR_SUBTITLE}
          </p>
        </div>
        <button
          type="button"
          data-testid="pick-endeavor-close"
          aria-label="Close"
          onClick={onDismiss}
          className="inline-flex shrink-0 items-center justify-center rounded-kro-pill border-none bg-transparent outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{
            minWidth: 'var(--kro-size-min-touch-target)',
            minHeight: 'var(--kro-size-min-touch-target)',
            color: colorVar('foreSecondary'),
          }}
        >
          <Clear size={14} strokeWidth={3} aria-hidden />
        </button>
      </header>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex shrink-0 items-center gap-kro-small rounded-kro-field px-kro-small"
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
          data-testid="pick-endeavor-search"
          aria-label="Search tasks"
          placeholder="Search tasks"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: colorVar('fore') }}
        />
        {query.length === 0 ? null : (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-kro-pill border-none bg-transparent outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{ color: colorVar('foreSecondary') }}
          >
            <Clear size={12} strokeWidth={3} aria-hidden />
          </button>
        )}
      </form>

      <div className="flex shrink-0 flex-col gap-kro-tiny">
        <p
          data-testid="pick-endeavor-count"
          className="m-0 font-semibold text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          {pickEndeavorSelectionCaption(selectionCount)}
        </p>
        {capNotice === null ? null : (
          <p
            data-testid="pick-endeavor-cap-notice"
            role="status"
            className="m-0 text-xs"
            style={{ color: colorVar('bannerWarning') }}
          >
            {capNotice}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <div
            data-testid="pick-endeavor-empty"
            data-empty-kind={query.length === 0 ? 'noTasks' : 'noMatches'}
            className="flex h-full items-center justify-center py-kro-x-large"
          >
            <EmptyStateCard
              icon={query.length === 0 ? 'tray' : 'magnifyingglass'}
              title={query.length === 0 ? 'No tasks available' : 'No matches'}
              message={
                query.length === 0
                  ? 'Tasks will appear here.'
                  : 'Try a different search term.'
              }
            />
          </div>
        ) : (
          sections.map((section) => (
            <section
              key={section.id}
              data-testid="pick-endeavor-section"
              data-section={section.id}
              aria-label={section.title}
              className="flex flex-col gap-kro-small pb-kro-medium"
            >
              <h3
                className="m-0 py-kro-tiny font-semibold text-xs uppercase tracking-wide"
                style={{ color: colorVar('foreSecondary') }}
              >
                {section.title}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-kro-small p-0">
                {section.endeavors.map((endeavor) => {
                  const isSelected = selectedSet.has(endeavor.id)
                  const isEnabled = isSelected || canSelectMore
                  const lead = planListRowSymbol(endeavor.title)
                  const name = lead.title.length === 0 ? 'Untitled' : lead.title
                  return (
                    <li
                      key={endeavor.id}
                      data-testid="pick-endeavor-row"
                      data-endeavor-id={endeavor.id}
                      className="flex items-center gap-kro-small"
                    >
                      {/*
                        A LABEL around a visually-hidden checkbox, not a
                        `<button role="checkbox">` wrapping the row: a button's
                        content model is phrasing content, and the kit's row is
                        a `<div>`/`<p>` tree. The label is valid, gives the
                        native space/enter handling for free, and keeps the
                        whole row a hit target.
                      */}
                      <label
                        className={cn(
                          'flex min-w-0 flex-1 cursor-pointer items-center gap-kro-small',
                          'text-left',
                          !isEnabled &&
                            'cursor-not-allowed opacity-[var(--kro-opacity-disabled)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          data-testid="pick-endeavor-toggle"
                          aria-label={name}
                          checked={isSelected}
                          disabled={!isEnabled}
                          onChange={() => onToggle(endeavor.id)}
                        />
                        <span
                          aria-hidden
                          className="flex size-5 shrink-0 items-center justify-center"
                          style={{
                            borderRadius: radiusVar('small'),
                            backgroundColor: isSelected
                              ? colorVar('accent')
                              : 'transparent',
                            color: colorVar('onAccent'),
                            boxShadow: isSelected
                              ? undefined
                              : `inset 0 0 0 1px ${colorVar('hairline')}`,
                          }}
                        >
                          {isSelected ? <Check size={12} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          {/*
                            No kind badge: every row here is a task by
                            construction, so a "Task" chip is noise that costs
                            the title its width on a phone. Canon's own picker
                            card prints the glyph, the title and the schedule
                            and nothing else.
                          */}
                          <EndeavorRow
                            config="find"
                            symbol={lead.symbol}
                            isGenericSymbol={lead.isGeneric}
                            title={lead.title}
                            timeInfo={planListRowTimeInfo(endeavor)}
                            now={now}
                            locale={locale}
                          />
                        </span>
                      </label>
                      <button
                        type="button"
                        data-testid="pick-endeavor-detail"
                        aria-label={`Open ${name}`}
                        onClick={() => onViewDetail(endeavor.id)}
                        className="inline-flex shrink-0 items-center justify-center rounded-kro-pill border-none bg-transparent outline-none focus-visible:shadow-[var(--kro-ring)]"
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

      <footer className="flex shrink-0 flex-col gap-kro-tiny">
        {confirmBlocker === null ? null : (
          <p
            id={blockerId}
            data-testid="pick-endeavor-blocker"
            className="m-0 text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {confirmBlocker}
          </p>
        )}
        <button
          type="button"
          data-testid="pick-endeavor-confirm"
          disabled={confirmBlocker !== null}
          aria-describedby={confirmBlocker === null ? undefined : blockerId}
          onClick={() => onConfirm(selection.map((endeavor) => endeavor.id))}
          className={cn(
            'inline-flex w-full items-center justify-center border-none',
            'font-semibold text-sm outline-none focus-visible:shadow-[var(--kro-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          style={{
            borderRadius: radiusVar('field'),
            minHeight: 'var(--kro-size-min-touch-target)',
            backgroundColor: colorVar('accent'),
            color: colorVar('onAccent'),
          }}
        >
          Confirm
        </button>
      </footer>
    </div>
  )
}
