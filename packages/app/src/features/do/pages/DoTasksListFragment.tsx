'use client'

/**
 * One Do section, expanded into a vertical list — the port of
 * `KroUI/Do/DoTasksListView.swift` (canon's `DoTasksListDestination` +
 * `DoTasksListView`), reached by tapping a lane's count badge.
 *
 * Canon pushes this onto the Screen's `NavigationStack`. Route files belong to
 * the shell child here (`KC-IS-#13` owns `apps/web/src/app/**`), and inventing a
 * `/my-day/overdue` route would put navigation for one lane's badge into a lane
 * this issue does not own. So the expansion is presented **in place**, over the
 * surface, with the local back affordance canon requires of a nested
 * destination: *"Any nested destination retains a local back affordance, so
 * users can move within the modal and always return or dismiss."* The
 * divergence is named in the PR.
 *
 * Everything else is canon's, including the two behaviours that are easy to
 * drop: the list uses `EndeavorCard(layout: 'horizontal')` — **the same
 * component** as the carousel, which is why canon retired its private
 * `DoTaskListRow` — and a tap on the background deselects, so the prepared card
 * can be dismissed without hitting a control.
 */
import {
  CompactPresentationHeader,
  EndeavorCard,
  type EndeavorCardModel,
  type EndeavorPreparationPresentation,
} from '../../../design/endeavor'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { DoCardHandlers } from './doCardHandlers'

/** Canon's `DoTasksListDestination` — title, glyph and the section's tag. */
export interface DoTasksListDestination {
  readonly title: string
  readonly tag: string
}

export interface DoTasksListFragmentProps {
  readonly destination: DoTasksListDestination
  readonly tasks: readonly EndeavorCardModel[]
  readonly selectedCardKey: string | null
  readonly isInMarkCompleteMode: boolean
  readonly now: Date
  readonly locale?: string
  readonly onBack: () => void
  readonly handlers: DoCardHandlers
  readonly className?: string
  readonly preparationPresentation?: EndeavorPreparationPresentation
}

export function DoTasksListFragment({
  destination,
  tasks,
  selectedCardKey,
  isInMarkCompleteMode,
  now,
  locale,
  onBack,
  handlers,
  className,
  preparationPresentation = 'automatic',
}: DoTasksListFragmentProps) {
  return (
    <section
      data-testid="do-tasks-list"
      data-section={destination.tag}
      aria-label={destination.title}
      className={cn('flex h-full flex-col', className)}
      style={{ backgroundColor: colorVar('back') }}
    >
      <CompactPresentationHeader
        title={destination.title}
        leadingAction={{ kind: 'back', onPress: onBack }}
      />

      {/*
        Canon's `.onTapGesture { if selectedCardKey != nil { onTapDeselect() } }`
        on the content stack. A plain `div` handler rather than a button: the
        target is the empty space *between* cards, which is not a control and
        must not appear in the tab order. Every action inside is a real button,
        so nothing here is pointer-only.
      */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the background is not a
          control — Escape closes the panel and every action inside is a button. */}
      <div
        data-testid="do-tasks-list-scroller"
        className="min-h-0 flex-1 overflow-y-auto px-kro-medium pt-3"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          if (selectedCardKey !== null) handlers.onDeselect()
        }}
      >
        {tasks.length === 0 ? (
          <p
            data-testid="do-tasks-list-empty"
            className="pt-14 text-center font-semibold text-base"
            style={{ color: colorVar('foreSecondary') }}
          >
            All clear!
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {tasks.map((task) => (
              <li key={task.id}>
                <EndeavorCard
                  model={task}
                  layout="horizontal"
                  now={now}
                  locale={locale}
                  preparationPresentation={preparationPresentation}
                  isSelected={
                    selectedCardKey === `${destination.tag}:${task.id}`
                  }
                  isInMarkCompleteMode={isInMarkCompleteMode}
                  onPrepare={
                    isInMarkCompleteMode
                      ? undefined
                      : (id) => handlers.onPrepare(destination.tag, id)
                  }
                  onExecute={() => handlers.onExecute(task)}
                  onMarkComplete={handlers.onMarkComplete}
                  onSkip={() => handlers.onSkip(task)}
                  onDefer={(target) => handlers.onDefer(task, target)}
                  onDelegate={() => handlers.onDelegate(task)}
                  onShowDetails={() => handlers.onShowDetails(task)}
                  onDelete={() => handlers.onDelete(task)}
                />
              </li>
            ))}
          </ul>
        )}
        {/* Canon's `Spacer(minLength: 80)` — room under the last card for the FAB. */}
        <div aria-hidden className="h-20" />
      </div>
    </section>
  )
}
