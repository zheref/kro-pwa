'use client'

/**
 * The whole Do surface — the one Fragment `DoPage` renders (`RC-37`: a Page
 * owns no markup beyond its single Fragment call).
 *
 * It is the port of what `DoScreen` assembles around `DoView`: the scroll
 * container and its pull-to-refresh, the pinned day header (`safeAreaInset`),
 * the lane stack, the expanded section list `DoView` pushes to, and the
 * quick-action FAB `MainScreen` installs for the Do tab.
 *
 * ## Why this owns the scroller
 *
 * The shell's `<main>` scrolls, so nesting one more scroller looks redundant —
 * until three canon behaviours need it: the refresh *gesture* has to know the
 * container is at the top, the bell's jump has to scroll a known element, and
 * auto-advance has to bring a card into view. Canon gets all three from
 * `ScrollViewReader` + `.refreshable` on its own `ScrollView`. One scroller here
 * is the same arrangement; the shell's simply never scrolls because this one
 * fills it.
 *
 * ## `RC-15`
 *
 * Nothing here dispatches. The two pieces of local state are gesture progress
 * and which section is expanded — both view concerns, and the second one is
 * canon's own `@State private var tasksListDestination` on `DoScreen`, which
 * is *"Screen-owned state passed via Binding"* precisely because it does not
 * belong in the feature.
 */
import type { ActivityRing } from '../../../design/chrome'
import {
  CHROME_LAYOUT,
  FAB_INSETS,
  LiquidGlassFABMenu,
  useActiveToasts,
} from '../../../design/chrome'
import {
  type EndeavorCardModel,
  InlineBanner,
  type SuggestionCardModel,
} from '../../../design/endeavor'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DoSurfaceLayout, ShellShape } from '../../main/DoSurfaceLayout'
import type { DoSuggestionSource } from '../DoSuggestions'
import { DoHeaderFragment } from './DoHeaderFragment'
import { DoLanesFragment, type DoLanesFragmentProps } from './DoLanesFragment'
import {
  DoTasksListFragment,
  type DoTasksListDestination,
} from './DoTasksListFragment'
import {
  type DoCardHandlers,
  type DoSuggestionHandlers,
  withCompletionToast,
} from './doCardHandlers'
import type { DoHeaderContent } from './doPresentation'

/**
 * How far a finger must travel from the top before the release refreshes.
 *
 * Canon gets `.refreshable` from SwiftUI and never names a distance. 72px is
 * one toast-height of travel — far enough that a diagonal flick down a lane
 * does not trigger it, short enough to complete inside a thumb's arc.
 */
export const PULL_TO_REFRESH_THRESHOLD = 72

/** The gesture stops following the finger here, so it cannot drag the page open. */
const PULL_MAX = 120

/** Which one-shot scroll the surface has been asked to perform. */
export type DoScrollTarget = 'overdue' | 'currentCard' | null

export interface DoSurfaceFragmentProps
  extends Pick<
    DoLanesFragmentProps,
    | 'lanes'
    | 'reminders'
    | 'allDayEvents'
    | 'timedEventGroups'
    | 'showsSuggestions'
    | 'hasNoEndeavors'
    | 'selectedCardKey'
    | 'isInMarkCompleteMode'
    | 'initialLaneWidth'
    | 'onLaneWidthChanged'
    | 'onCreateEndeavor'
  > {
  readonly shape: ShellShape
  readonly layout: DoSurfaceLayout
  readonly header: DoHeaderContent
  readonly rings: readonly ActivityRing[]
  readonly showsRings: boolean
  readonly suggestions: readonly (SuggestionCardModel & {
    readonly source: DoSuggestionSource
  })[]
  /** `selectDoException`'s user copy, already derived in the domain tier. */
  readonly exceptionMessage: string | null
  readonly now: Date
  readonly locale?: string
  /** Every lane's cards by section tag — what an expanded section lists. */
  readonly cardsBySection: Readonly<
    Record<string, readonly EndeavorCardModel[]>
  >
  readonly scrollTarget: DoScrollTarget
  readonly onScrollHandled: () => void
  readonly onRefresh: () => void
  readonly handlers: DoCardHandlers
  /**
   * The Active Toast's primary action after a completion — canon's
   * `userDidTapUndoLastAction`. The toast itself is raised here, because the
   * host is mounted here and the intent is the Page's.
   */
  readonly onUndoCompletion: (card: EndeavorCardModel) => void
  readonly suggestionHandlers: DoSuggestionHandlers
  /** The FAB's four rows, each already bound to its intent. */
  readonly onEnterMarkCompleteMode: () => void
  readonly onClearExpired: () => void
  readonly onQuickAdd: () => void
  readonly onStartSession: () => void
  readonly className?: string
}

/**
 * The surface.
 *
 * It used to mount its own `ActiveToastHost` (`position="absolute"`, inside the
 * `relative` wrapper below), because at the time the shell mounted none and
 * canon's `.activeToast(...)` modifier sits on `DoScreen`'s content rather than
 * on `MainScreen`. That is no longer true: `MainShellPage` mounts the one host
 * for the whole app (KC-IS-#71 item 15), so a completion toast raised here now
 * shares a lifetime with every other surface's — which is what canon's one-deep
 * replace means — and rises above the Session Pill, which a host scoped to this
 * surface could never be told about.
 *
 * `useActiveToasts()` still throws outside a host, so a story or a test that
 * mounts this Fragment on its own wraps it in one.
 */
export function DoSurfaceFragment(props: DoSurfaceFragmentProps) {
  return (
    <div
      data-testid="do-surface"
      data-shell-shape={props.shape}
      className={cn('relative flex h-full min-h-0 flex-col', props.className)}
    >
      <DoSurfaceBody {...props} />
    </div>
  )
}

function DoSurfaceBody(props: DoSurfaceFragmentProps) {
  const {
    shape,
    layout,
    header,
    rings,
    showsRings,
    suggestions,
    exceptionMessage,
    now,
    locale,
    cardsBySection,
    scrollTarget,
    onScrollHandled,
    onRefresh,
    handlers: rawHandlers,
    onUndoCompletion,
    suggestionHandlers,
  } = props

  const toasts = useActiveToasts()

  /**
   * Canon's completion toast, with Undo as its primary action.
   *
   * Decorating here rather than asking the Page to raise it keeps the toast
   * beside the host that owns it, and keeps `DoCardHandlers` a set of *intents*
   * — the Page still decides what completing means, and this decides what the
   * surface says about it. The decoration itself is pure and lives in
   * `doCardHandlers.ts`, so its contents are unit-tested.
   */
  const handlers = useMemo<DoCardHandlers>(
    () =>
      withCompletionToast(rawHandlers, {
        enqueue: toasts.enqueue,
        onUndo: onUndoCompletion,
      }),
    [rawHandlers, onUndoCompletion, toasts.enqueue],
  )

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const pullOrigin = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [expanded, setExpanded] = useState<DoTasksListDestination | null>(null)

  /*
    The two one-shots. Canon performs them in `.onChange(of:)` on
    `ScrollViewReader`'s proxy and then clears the flag; here the element is
    found by id — `#do-section-overdue` for the bell's jump, and the prepared
    card's own `"section:id"` for auto-advance, which is the very key the slice
    already mints.
  */
  useEffect(() => {
    if (scrollTarget === null) return
    const scroller = scrollerRef.current
    if (scroller === null) {
      onScrollHandled()
      return
    }

    /*
      Found by DATA ATTRIBUTE, never by id selector. A card key is
      `"section:endeavorId"` and both halves are caller-supplied, so an id
      selector would have to be `CSS.escape`d — an API jsdom does not implement,
      and one more thing to get wrong for a key that happens to contain a
      colon. Comparing `dataset` values needs no escaping at all.
    */
    const target =
      scrollTarget === 'overdue'
        ? scroller.querySelector<HTMLElement>('#do-section-overdue')
        : props.selectedCardKey === null
          ? null
          : (Array.from(
              scroller.querySelectorAll<HTMLElement>('[data-do-card-key]'),
            ).find(
              (node) => node.dataset.doCardKey === props.selectedCardKey,
            ) ?? null)

    // jsdom implements neither `scrollIntoView` nor smooth behaviour; the guard
    // is what lets the one-shot's CONTRACT (find, scroll, report handled) be
    // asserted without a browser.
    if (target !== null && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: 'smooth',
        block: scrollTarget === 'overdue' ? 'start' : 'center',
      })
    }
    onScrollHandled()
  }, [scrollTarget, props.selectedCardKey, onScrollHandled])

  /*
    Pull to refresh — the touch half of canon's `.refreshable`. Only on a
    touch-primary surface: the pointer surface refreshes from the toolbar,
    which is canon's own split (`macRefreshButton` exists precisely because a
    trackpad has no pull gesture).
  */
  const touch = layout.isTouchPrimary

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touch) return
    const scroller = scrollerRef.current
    if (scroller === null || scroller.scrollTop > 0) return
    pullOrigin.current = event.touches[0]?.clientY ?? null
  }

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const origin = pullOrigin.current
    if (origin === null) return
    const y = event.touches[0]?.clientY ?? origin
    // Never negative: an upward drag is an ordinary scroll, not a cancelled pull.
    setPull(Math.min(PULL_MAX, Math.max(0, y - origin)))
  }

  const endPull = () => {
    if (pullOrigin.current === null) return
    pullOrigin.current = null
    if (pull >= PULL_TO_REFRESH_THRESHOLD) onRefresh()
    setPull(0)
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the scroller's background
          is not a control — every action inside it is a real button, and Escape
          is not a dismissal here (nothing is presented). */}
      <div
        ref={scrollerRef}
        data-testid="do-scroller"
        className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endPull}
        onTouchCancel={endPull}
        onClick={(event) => {
          if (props.selectedCardKey === null) return
          const target = event.target
          if (
            target instanceof Element &&
            target.closest(
              '[data-slot="endeavor-card"], button, a, [role="dialog"]',
            )
          ) {
            return
          }
          handlers.onDeselect()
        }}
      >
        {/*
          The travel is state, and the settle-back is derived from it: at zero
          the content animates home, mid-drag it follows the finger frame for
          frame. Reading `pullOrigin.current` here instead would be a ref read
          during render — same picture, impure for no gain.
        */}
        <div
          style={{
            transform: pull > 0 ? `translateY(${pull}px)` : undefined,
            transition: pull === 0 ? 'transform 200ms' : undefined,
          }}
        >
          {touch ? (
            <div
              aria-hidden={pull === 0}
              data-testid="do-pull-indicator"
              data-armed={pull >= PULL_TO_REFRESH_THRESHOLD}
              className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2 text-xs"
              style={{
                opacity: Math.min(1, pull / PULL_TO_REFRESH_THRESHOLD),
                color: 'rgb(255 255 255 / 0.8)',
              }}
            >
              {pull >= PULL_TO_REFRESH_THRESHOLD
                ? 'Release to refresh'
                : 'Pull to refresh'}
            </div>
          ) : null}

          <DoHeaderFragment
            content={header}
            rings={rings}
            showsRings={showsRings}
          />

          {exceptionMessage === null ? null : (
            /*
              A WEB ADDITION, deliberately. Canon keeps the retained day and
              says nothing — on iOS a failed refresh is visible through the
              toolbar's spinner returning to its glyph. The web has no such
              affordance once the pull gesture has snapped back, so a silent
              failure would read as "nothing happened". The copy is the
              domain's (`DoException.message`), never assembled here (`RC-8`).
            */
            <div className="px-kro-medium pb-kro-small">
              <InlineBanner
                message={exceptionMessage}
                kind="error"
                actionTitle="Retry"
                onAction={onRefresh}
              />
            </div>
          )}

          <DoLanesFragment
            lanes={props.lanes}
            reminders={props.reminders}
            allDayEvents={props.allDayEvents}
            timedEventGroups={props.timedEventGroups}
            suggestions={suggestions}
            showsSuggestions={props.showsSuggestions}
            hasNoEndeavors={props.hasNoEndeavors}
            selectedCardKey={props.selectedCardKey}
            isInMarkCompleteMode={props.isInMarkCompleteMode}
            now={now}
            locale={locale}
            initialLaneWidth={props.initialLaneWidth}
            onLaneWidthChanged={props.onLaneWidthChanged}
            onExpandSection={setExpanded}
            onCreateEndeavor={props.onCreateEndeavor}
            handlers={handlers}
            suggestionHandlers={suggestionHandlers}
          />

          {/* Canon's `Spacer(minLength: 80)` — the last lane clears the FAB. */}
          <div aria-hidden className="h-20" />
        </div>
      </div>

      {/*
        `MainScreen.quickActionFAB`'s `.doTab` branch.

        GLYPH SUBSTITUTION, named rather than hidden: canon's four rows use
        `checkmark.circle`, `clock.badge.xmark`, `plus` and `play.fill`, and the
        disc itself uses `bolt.fill`. `LiquidGlassFABMenu` types its glyphs as
        `SfSymbolName` — the design SYSTEM's table — and that table carries
        neither `bolt.fill` nor `clock.badge.xmark` (the endeavor kit's own
        table does carry `bolt.fill`, and the two are asserted disjoint, so it
        cannot simply be added here). The nearest system symbols are used and
        the gap is filed as a cross-lane need in this PR.
      */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 z-20 flex justify-end p-0"
        /*
          Canon's trailing inset, and NOT canon's bottom one. `FAB_INSETS`
          carries 16 / 60 because iOS stacks the FAB over the whole screen,
          tab bar included, so 60pt is what clears the bar. Here the FAB lives
          inside the shell's `<main>`, which already ends above the tab bar —
          taking canon's 60 as well would count the bar twice and leave the
          disc floating in the middle of the last lane. 24 is the same
          bottom breathing room the Active Toast uses, and the two share this
          corner.
        */
        style={{
          paddingInlineEnd: FAB_INSETS.legacy.trailing,
          paddingBlockEnd: CHROME_LAYOUT.toastBottomPadding,
        }}
      >
        <div className="pointer-events-auto">
          <LiquidGlassFABMenu
            mainGlyph="target"
            mainAccessibilityLabel="Quick action"
            items={[
              {
                id: 'mark-complete',
                label: 'Mark Complete…',
                glyph: 'checkmark.circle.fill',
                onSelect: props.onEnterMarkCompleteMode,
              },
              {
                id: 'clear-expired',
                label: 'Clear Expired',
                glyph: 'clock',
                onSelect: props.onClearExpired,
              },
              {
                id: 'quick-add',
                label: 'Quick Add',
                glyph: 'plus',
                onSelect: props.onQuickAdd,
              },
              {
                id: 'start-session',
                label: 'Start Session',
                glyph: 'play',
                onSelect: props.onStartSession,
              },
            ]}
            glow={{ hues: ['ringEmerald', 'glowLime'] }}
          />
        </div>
      </div>

      {expanded === null ? null : (
        <div
          data-testid="do-tasks-list-overlay"
          className="absolute inset-0 z-30"
          style={{ backgroundColor: colorVar('back') }}
        >
          <DoTasksListFragment
            destination={expanded}
            tasks={cardsBySection[expanded.tag] ?? []}
            selectedCardKey={props.selectedCardKey}
            isInMarkCompleteMode={props.isInMarkCompleteMode}
            now={now}
            locale={locale}
            onBack={() => {
              // Canon: leaving the pushed list deselects, so returning to the
              // lanes never leaves a prepared card behind the user's back.
              handlers.onDeselect()
              setExpanded(null)
            }}
            handlers={handlers}
          />
        </div>
      )}
    </>
  )
}
