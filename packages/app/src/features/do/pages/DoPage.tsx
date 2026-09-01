'use client'

/**
 * The Do surface's stateful container (`RC-37`; implements `UZF-4`) — the port
 * of `DoScreen`.
 *
 * The only artifact in this feature that calls both `useAppSelector` and
 * `useAppDispatch`. It selects, it dispatches, and it renders exactly one
 * Fragment plus the toolbar Fragment that portals into the shell's slots.
 *
 * ## The clock is read once, at mount, and then comes from state
 *
 * Canon stamps `currentDateString` / `shortDateString` inside `onViewAppearing`
 * and every later view reads those. The same arrangement here: mount dispatches
 * `onViewLoaded({ now })`, the reducer parks that instant as `clockAnchor`, and
 * the header date, every card's urgency badge and every relative caption are
 * derived from it. So the lanes, the badges and the header can never disagree
 * about what time it is — and a render is a pure function of state rather than
 * of when React happened to run.
 *
 * ## What this Page dispatches into other slices, and why that is allowed
 *
 * `RC-37` names the Page as the one artifact that may dispatch across slices;
 * `MainShellPage` already does it for capture's routing one-shot. Three
 * hand-offs live here, each a single event carrying a domain value — never an
 * import of another slice's state shape (`RC-20`):
 *
 *   · the shell's `onDestinationRouteMounted`, so the URL stays the authority
 *     for which sidebar row is lit;
 *   · `endeavorDetail`'s `onDetailRequested`, which is the consumer side of
 *     canon's `viewDetail` intent — the sheet itself is `KC-IS-#30`'s;
 *   · `capture`'s `userDidRequestCapture`, the FAB's Quick Add — the prompt is
 *     `KC-IS-#24`'s.
 */
import { EndeavorKind } from '@kro/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ActivityRing } from '../../../design/chrome'
import type {
  EndeavorCardModel,
  SuggestionCardModel,
} from '../../../design/endeavor'
import { SuggestionSource } from '../../../design/endeavor'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { userDidRequestCapture } from '../../capture/CaptureFeature'
import { onDetailRequested } from '../../endeavorDetail/EndeavorDetailFeature'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { navigateToDestinationThunk } from '../../main/MainProducer'
import { selectLayout, selectShellShape } from '../../main/MainSelectors'
import { DestinationKind } from '../../main/SidebarDestination'
import {
  childVisibilityDelegatedSelectionChanged,
  onFeaturedCapacityChanged,
  onScrollRequestHandled,
  onViewLoaded,
  userDidDeselectCard,
  userDidDismissSuggestion,
  userDidMarkCardComplete,
  userDidTapCard,
  userDidTapNotifications,
  userDidToggleMarkCompleteMode,
} from '../DoFeature'
import {
  clearExpiredThunk,
  fetchDoEndeavorsThunk,
  loadDoPreferencesThunk,
} from '../DoProducer'
import { DoLane, type DoVisibility, doLensFor, laneCards } from '../DoRules'
import {
  selectAreDoRingsVisible,
  selectAreDoSuggestionsVisible,
  selectDoException,
  selectDoFeaturedNowLane,
  selectDoHabitsRing,
  selectDoLanes,
  selectDoRemainingTodayCount,
  selectDoSuggestions,
  selectDoTasksRing,
  selectHasNoDoEndeavors,
  selectIsDoLoading,
} from '../DoSelectors'
import { DoSurfaceFragment, type DoScrollTarget } from './DoSurfaceFragment'
import { DoToolbarFragment } from './DoToolbarFragment'
import type { DoCardHandlers, DoSuggestionHandlers } from './doCardHandlers'
import {
  deferEndeavorThunk,
  delegateEndeavorThunk,
  deleteEndeavorThunk,
  reopenEndeavorThunk,
  skipEndeavorThunk,
} from './DoOverflowProducer'
import { groupDoEvents } from './doEventLanes'
import { featuredCapacityForWidth } from './doFeaturedLaneLayout'
import {
  DO_TASK_SECTIONS,
  DoViewSection,
  doCardModels,
  doHeaderContent,
} from './doPresentation'

export interface DoPageProps {
  /**
   * The instant the surface mounted. Supplied by a story or a test so every
   * lane, badge and caption is deterministic; production omits it and the Page
   * reads the clock once.
   */
  readonly now?: Date
  readonly locale?: string
  /** A lane width for the first paint, before the browser has been measured. */
  readonly initialLaneWidth?: number
}

export function DoPage({ now, locale, initialLaneWidth }: DoPageProps) {
  const dispatch = useAppDispatch()

  // Read once. `useState`'s lazy initialiser is the standard idiom for "a value
  // this component was born with"; it is not feature state, and the instant it
  // produces is immediately handed to the reducer, which is where it lives.
  const [mountedAt] = useState<Date>(() => now ?? new Date())

  const layout = useAppSelector(selectLayout)
  const shape = useAppSelector(selectShellShape)

  const isLoading = useAppSelector(selectIsDoLoading)
  const exception = useAppSelector(selectDoException)
  const hasNoEndeavors = useAppSelector(selectHasNoDoEndeavors)
  const lanes = useAppSelector(selectDoLanes)
  const featuredWindow = useAppSelector(selectDoFeaturedNowLane)
  const remainingCount = useAppSelector(selectDoRemainingTodayCount)
  const tasksRing = useAppSelector(selectDoTasksRing)
  const habitsRing = useAppSelector(selectDoHabitsRing)
  const showsRings = useAppSelector(selectAreDoRingsVisible)
  const suggestions = useAppSelector(selectDoSuggestions)
  const showsSuggestions = useAppSelector(selectAreDoSuggestionsVisible)

  // O(1) field reads — the only thing `RC-5` allows in a `useAppSelector`
  // callback. Everything derived from them is a named function below.
  const selectedCardKey = useAppSelector((state) => state.do.selectedCardKey)
  const isInMarkCompleteMode = useAppSelector(
    (state) => state.do.isInMarkCompleteMode,
  )
  const visibility = useAppSelector((state) => state.do.visibility)
  const reminders = useAppSelector((state) => state.do.reminders)
  const events = useAppSelector((state) => state.do.events)
  const tasks = useAppSelector((state) => state.do.tasks)
  const clockAnchor = useAppSelector((state) => state.do.clockAnchor)
  const shouldScrollToOverdue = useAppSelector(
    (state) => state.do.shouldScrollToOverdue,
  )
  const shouldScrollToCurrentCard = useAppSelector(
    (state) => state.do.shouldScrollToCurrentCard,
  )

  /** The instant every projection below is evaluated at — see the header. */
  const anchor = clockAnchor ?? mountedAt

  // -- lifecycle ----------------------------------------------------------

  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.myDay },
      }),
    )
  }, [dispatch])

  useEffect(() => {
    // Canon's `onViewAppearing`: classify the retained day first (so a
    // returning user sees the laid-out day immediately), then read the
    // preferences and the day itself.
    dispatch(onViewLoaded({ now: mountedAt }))
    dispatch(loadDoPreferencesThunk())
    const effect = dispatch(fetchDoEndeavorsThunk({ now: mountedAt }))
    return () => effect.abort()
  }, [dispatch, mountedAt])

  // -- projections --------------------------------------------------------

  const laneCardModels = useMemo(
    () => ({
      featuredNow: doCardModels(featuredWindow, anchor),
      overdue: doCardModels(lanes.overdue, anchor),
      now: doCardModels(lanes.now, anchor),
      expired: doCardModels(lanes.expired, anchor),
      next: doCardModels(lanes.next, anchor),
      anytime: doCardModels(lanes.anytime, anchor),
      completedToday: doCardModels(lanes.completedToday, anchor),
    }),
    [featuredWindow, lanes, anchor],
  )

  const reminderCards = useMemo(
    () => doCardModels(reminders, anchor),
    [reminders, anchor],
  )

  const eventLanes = useMemo(
    () =>
      groupDoEvents({
        events,
        lens: doLensFor(visibility),
        now: anchor,
      }),
    [events, visibility, anchor],
  )

  const allDayEventCards = useMemo(
    () => doCardModels(eventLanes.allDay, anchor),
    [eventLanes, anchor],
  )

  const timedEventGroups = useMemo(
    () => eventLanes.timedGroups.map((group) => doCardModels(group, anchor)),
    [eventLanes, anchor],
  )

  /**
   * Every section's full list, keyed by its tag — what an expanded section
   * shows. Canon's `DoTasksListScreen` resolves the same map, including the
   * `"events"` row that concatenates both event lanes.
   */
  const cardsBySection = useMemo(() => {
    const map: Record<string, readonly EndeavorCardModel[]> = {}
    for (const section of DO_TASK_SECTIONS) {
      map[section.tag] = doCardModels(laneCards(lanes, section.lane), anchor)
    }
    map[DoLane.featured] = laneCardModels.featuredNow
    map[DoViewSection.reminders] = reminderCards
    map.events = [...allDayEventCards, ...timedEventGroups.flat()]
    return map
  }, [
    lanes,
    anchor,
    laneCardModels.featuredNow,
    reminderCards,
    allDayEventCards,
    timedEventGroups,
  ])

  const header = useMemo(
    () =>
      doHeaderContent({
        now: anchor,
        locale,
        usesExpandedDayTitle: layout.usesExpandedDayTitle,
        isInMarkCompleteMode,
        remainingCount,
      }),
    [anchor, locale, layout, isInMarkCompleteMode, remainingCount],
  )

  const rings = useMemo<readonly ActivityRing[]>(() => {
    const list: ActivityRing[] = []
    // Gold outside, emerald inside — and a ring with no denominator is ABSENT,
    // never an empty track (`DayProgressRings.md` flow 4). The Selectors
    // already answer `null` for that case, which is why this is a push, not a
    // clamp.
    if (habitsRing !== null) {
      list.push({
        id: 'habits',
        progress: habitsRing.progress,
        role: 'ringGold',
        accessibilityLabel: `Habits, ${habitsRing.completed} of ${habitsRing.expected} complete`,
      })
    }
    if (tasksRing !== null) {
      list.push({
        id: 'tasks',
        progress: tasksRing.progress,
        role: 'ringEmerald',
        accessibilityLabel: `Tasks, ${tasksRing.completed} of ${tasksRing.expected} complete`,
      })
    }
    return list
  }, [habitsRing, tasksRing])

  const suggestionCards = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        title: suggestion.title,
        subtitle: suggestion.subtitle,
        actionTitle: suggestion.actionTitle,
        // The two enums agree by construction: the Do slice's only source is
        // `googleCalendar`, which the kit's `SuggestionSource` also names.
        source: SuggestionSource.googleCalendar,
      })) as readonly (SuggestionCardModel & { source: 'googleCalendar' })[],
    [suggestions],
  )

  const scrollTarget: DoScrollTarget = shouldScrollToOverdue
    ? 'overdue'
    : shouldScrollToCurrentCard
      ? 'currentCard'
      : null

  // -- intent -------------------------------------------------------------

  /** The domain row behind a card, for the hand-offs that carry an `Endeavor`. */
  const endeavorFor = useCallback(
    (card: EndeavorCardModel) =>
      tasks.find((endeavor) => endeavor.id === card.id) ??
      reminders.find((endeavor) => endeavor.id === card.id) ??
      events.find((endeavor) => endeavor.id === card.id) ??
      null,
    [tasks, reminders, events],
  )

  const handlers = useMemo<DoCardHandlers>(
    () => ({
      onPrepare: (section, endeavorId) => {
        /*
          `userDidTapCard` mints `"section:id"` and a second tap un-prepares —
          both the slice's, so the surface never decides what a tap means.

          The cast is deliberate and narrow. Canon's own signature is
          `userDidTapCard(_:section: String)`, and two of its sections —
          `"events-allday"` and `"events-timed"` — are view groupings that were
          never `DoLane` members (`KC-IS-#16` installs the events channel but
          partitions no event lane). `withCardSelected` only ever interpolates
          the value into `"lane:id"`, so every one of canon's tags round-trips
          correctly today. Widening the payload to `string` is a one-line
          `DoFeature` change named in this PR.
        */
        dispatch(userDidTapCard({ lane: section as DoLane, endeavorId }))
      },
      onDeselect: () => dispatch(userDidDeselectCard()),
      onExecute: () => {
        // The session hand-off carrying the endeavor is `KC-IS-#22`'s; the
        // navigation to the surface that will receive it exists today.
        void dispatch(
          navigateToDestinationThunk({
            destination: { kind: DestinationKind.session },
          }),
        )
      },
      onMarkComplete: (card, completedAt) => {
        dispatch(
          userDidMarkCardComplete({
            endeavorId: card.id,
            completionDate: completedAt,
            now: new Date(),
          }),
        )
      },
      onSkip: (card) => {
        void dispatch(
          skipEndeavorThunk({ endeavorId: card.id, now: new Date() }),
        )
      },
      onDefer: (card, target) => {
        void dispatch(
          deferEndeavorThunk({
            endeavorId: card.id,
            target,
            now: new Date(),
          }),
        )
      },
      onDelegate: (card) => {
        void dispatch(
          delegateEndeavorThunk({ endeavorId: card.id, now: new Date() }),
        )
      },
      onShowDetails: (card) => {
        const endeavor = endeavorFor(card)
        // Canon's long-press / secondary-click / menu "Details" all land here.
        // A card with no domain row behind it is a stale key, and asking for
        // Detail on nothing would open an empty sheet.
        if (endeavor !== null) dispatch(onDetailRequested({ endeavor }))
      },
      onDelete: (card) => {
        void dispatch(
          deleteEndeavorThunk({ endeavorId: card.id, now: new Date() }),
        )
      },
    }),
    [dispatch, endeavorFor],
  )

  const suggestionHandlers = useMemo<DoSuggestionHandlers>(
    () => ({
      // The Google connect flow is `KC-IS-#33`'s; the surface that owns it is
      // the Integrations settings pane, which is where canon's action lands.
      onAction: () => {
        void dispatch(
          navigateToDestinationThunk({
            destination: { kind: DestinationKind.settings },
          }),
        )
      },
      onDismiss: (source) => dispatch(userDidDismissSuggestion({ source })),
    }),
    [dispatch],
  )

  const onLaneWidthChanged = useCallback(
    (width: number) => {
      dispatch(
        onFeaturedCapacityChanged({
          capacity: featuredCapacityForWidth(width),
        }),
      )
    },
    [dispatch],
  )

  const onRefresh = useCallback(() => {
    void dispatch(fetchDoEndeavorsThunk({ now: new Date() }))
  }, [dispatch])

  const onChangeVisibility = useCallback(
    (next: DoVisibility) => {
      dispatch(
        childVisibilityDelegatedSelectionChanged({
          visibility: next,
          now: new Date(),
        }),
      )
    },
    [dispatch],
  )

  return (
    <>
      <DoToolbarFragment
        shape={shape}
        layout={layout}
        isInMarkCompleteMode={isInMarkCompleteMode}
        isLoading={isLoading}
        overdue={laneCardModels.overdue}
        expired={laneCardModels.expired}
        visibility={visibility}
        now={anchor}
        locale={locale}
        onToggleMarkCompleteMode={() =>
          dispatch(userDidToggleMarkCompleteMode())
        }
        onTapNotifications={() => dispatch(userDidTapNotifications())}
        onRefresh={onRefresh}
        onChangeVisibility={onChangeVisibility}
      />

      <DoSurfaceFragment
        shape={shape}
        layout={layout}
        header={header}
        rings={rings}
        showsRings={showsRings}
        lanes={laneCardModels}
        reminders={reminderCards}
        allDayEvents={allDayEventCards}
        timedEventGroups={timedEventGroups}
        suggestions={suggestionCards}
        showsSuggestions={showsSuggestions}
        hasNoEndeavors={hasNoEndeavors}
        selectedCardKey={selectedCardKey}
        isInMarkCompleteMode={isInMarkCompleteMode}
        exceptionMessage={exception?.message ?? null}
        now={anchor}
        locale={locale}
        cardsBySection={cardsBySection}
        scrollTarget={scrollTarget}
        initialLaneWidth={initialLaneWidth}
        onLaneWidthChanged={onLaneWidthChanged}
        onScrollHandled={() => dispatch(onScrollRequestHandled())}
        onRefresh={onRefresh}
        handlers={handlers}
        onUndoCompletion={(card) => {
          void dispatch(
            reopenEndeavorThunk({ endeavorId: card.id, now: new Date() }),
          )
        }}
        suggestionHandlers={suggestionHandlers}
        onCreateEndeavor={() =>
          dispatch(
            userDidRequestCapture({
              kind: EndeavorKind.task,
              now: new Date(),
            }),
          )
        }
        onEnterMarkCompleteMode={() =>
          dispatch(userDidToggleMarkCompleteMode())
        }
        onClearExpired={() => {
          void dispatch(clearExpiredThunk({ now: new Date() }))
        }}
        onQuickAdd={() =>
          dispatch(
            userDidRequestCapture({
              kind: EndeavorKind.task,
              now: new Date(),
            }),
          )
        }
        onStartSession={() => {
          void dispatch(
            navigateToDestinationThunk({
              destination: { kind: DestinationKind.session },
            }),
          )
        }}
      />
    </>
  )
}
