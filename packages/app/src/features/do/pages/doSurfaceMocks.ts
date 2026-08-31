/**
 * The render tier's canned props (`RC-31`, `UZF-18`).
 *
 * Every story and every render test in this folder consumes these. Nothing here
 * is hand-assembled: each value is the real projection of `DoMocks`'
 * `doStateMocks` — themselves produced by running the real Shifters over
 * `doEndeavorFixtures` — at the fixed instant `DO_MOCK_NOW`. So a story cannot
 * show a lane the reducer could not produce, and a snapshot is a function of
 * the fixtures rather than of when the suite ran.
 *
 * `DO_MOCK_NOW` is Tuesday 17 March 2026, 10:00 local, which is why the header
 * fixtures read "Mar 17" / "Tuesday" and every relative caption is stable.
 */
import {
  DoSurfaceIdiom,
  DoSurfaceWidth,
  doSurfaceLayout,
  shellShapeFor,
} from '../../main/DoSurfaceLayout'
import type { ActivityRing } from '../../../design/chrome'
import type {
  EndeavorCardModel,
  SuggestionCardModel,
} from '../../../design/endeavor'
import { SuggestionSource } from '../../../design/endeavor'
import { DO_MOCK_NOW, doStateMocks } from '../DoMocks'
import type { DoState } from '../DoFeature'
import { doLensFor, laneCards, DoLane } from '../DoRules'
import { centredFeaturedWindow } from '../DoFeaturedNow'
import { habitsRing, tasksRing } from '../DoRings'
import { groupDoEvents } from './doEventLanes'
import {
  DO_TASK_SECTIONS,
  DoViewSection,
  doCardModels,
  doHeaderContent,
} from './doPresentation'
import type { DoSurfaceFragmentProps } from './DoSurfaceFragment'
import type { DoLanesFragmentProps } from './DoLanesFragment'
import { noopDoCardHandlers } from './doCardHandlers'

/** The instant every fixture below is projected at. */
export const DO_SURFACE_MOCK_NOW = DO_MOCK_NOW

/** `en-US` pins the date and clock strings so a snapshot is machine-independent. */
export const DO_SURFACE_MOCK_LOCALE = 'en-US'

/** The two surfaces the acceptance criteria are read against. */
export const desktopDoSurface = {
  idiom: DoSurfaceIdiom.desktop,
  width: DoSurfaceWidth.regular,
} as const

export const handheldDoSurface = {
  idiom: DoSurfaceIdiom.handheld,
  width: DoSurfaceWidth.compact,
} as const

export const desktopDoLayout = doSurfaceLayout(desktopDoSurface)
export const handheldDoLayout = doSurfaceLayout(handheldDoSurface)
export const desktopShellShape = shellShapeFor(desktopDoSurface)
export const handheldShellShape = shellShapeFor(handheldDoSurface)

const noop = () => {}

/** Every lane of one `DoState`, as card models. */
export const laneCardsOf = (
  state: DoState,
): DoLanesFragmentProps['lanes'] => ({
  featuredNow: doCardModels(
    centredFeaturedWindow(state.lanes.featuredNow, state.featuredCapacity),
    DO_SURFACE_MOCK_NOW,
  ),
  overdue: doCardModels(state.lanes.overdue, DO_SURFACE_MOCK_NOW),
  now: doCardModels(state.lanes.now, DO_SURFACE_MOCK_NOW),
  expired: doCardModels(state.lanes.expired, DO_SURFACE_MOCK_NOW),
  next: doCardModels(state.lanes.next, DO_SURFACE_MOCK_NOW),
  anytime: doCardModels(state.lanes.anytime, DO_SURFACE_MOCK_NOW),
  completedToday: doCardModels(
    state.lanes.completedToday,
    DO_SURFACE_MOCK_NOW,
  ),
})

/** The reminder capsules one state shows. */
export const reminderCardsOf = (state: DoState): readonly EndeavorCardModel[] =>
  doCardModels(state.reminders, DO_SURFACE_MOCK_NOW)

/** The Calendar lane, grouped exactly as the surface groups it. */
export const eventCardsOf = (state: DoState) => {
  const grouped = groupDoEvents({
    events: state.events,
    lens: doLensFor(state.visibility),
    now: DO_SURFACE_MOCK_NOW,
  })
  return {
    allDay: doCardModels(grouped.allDay, DO_SURFACE_MOCK_NOW),
    timedGroups: grouped.timedGroups.map((group) =>
      doCardModels(group, DO_SURFACE_MOCK_NOW),
    ),
  }
}

/** The rings one state draws — `null` denominators are absent, never empty. */
export const ringsOf = (state: DoState): readonly ActivityRing[] => {
  const list: ActivityRing[] = []
  const habits = habitsRing(state.habits, DO_SURFACE_MOCK_NOW)
  const tasks = tasksRing(
    { tasks: state.tasks, reminders: state.reminders },
    DO_SURFACE_MOCK_NOW,
  )
  if (habits !== null) {
    list.push({
      id: 'habits',
      progress: habits.progress,
      role: 'ringGold',
      accessibilityLabel: `Habits, ${habits.completed} of ${habits.expected} complete`,
    })
  }
  if (tasks !== null) {
    list.push({
      id: 'tasks',
      progress: tasks.progress,
      role: 'ringEmerald',
      accessibilityLabel: `Tasks, ${tasks.completed} of ${tasks.expected} complete`,
    })
  }
  return list
}

/** The Google Calendar nudge, in the card kit's own shape. */
export const suggestionCardsOf = (
  state: DoState,
): readonly (SuggestionCardModel & { source: 'googleCalendar' })[] =>
  state.suggestions.map((suggestion) => ({
    title: suggestion.title,
    subtitle: suggestion.subtitle,
    actionTitle: suggestion.actionTitle,
    source: SuggestionSource.googleCalendar,
  }))

/** Canon's `"N left today"` count for one state. */
export const remainingCountOf = (state: DoState): number =>
  state.lanes.overdue.length +
  state.lanes.expired.length +
  state.lanes.now.length +
  state.lanes.next.length +
  state.lanes.anytime.length

const cardsBySectionOf = (
  state: DoState,
): Readonly<Record<string, readonly EndeavorCardModel[]>> => {
  const events = eventCardsOf(state)
  const map: Record<string, readonly EndeavorCardModel[]> = {}
  for (const section of DO_TASK_SECTIONS) {
    map[section.tag] = doCardModels(
      laneCards(state.lanes, section.lane),
      DO_SURFACE_MOCK_NOW,
    )
  }
  map[DoLane.featured] = laneCardsOf(state).featuredNow
  map[DoViewSection.reminders] = reminderCardsOf(state)
  map.events = [...events.allDay, ...events.timedGroups.flat()]
  return map
}

/**
 * A complete `DoSurfaceFragment` prop set for one state and one surface.
 *
 * Handlers default to the no-op set; a story or a test that drives an intent
 * passes its own through `overrides`.
 */
export const doSurfaceProps = (
  state: DoState,
  surface: 'desktop' | 'handheld' = 'desktop',
  overrides: Partial<DoSurfaceFragmentProps> = {},
): DoSurfaceFragmentProps => {
  const layout = surface === 'desktop' ? desktopDoLayout : handheldDoLayout
  const events = eventCardsOf(state)

  return {
    shape: surface === 'desktop' ? desktopShellShape : handheldShellShape,
    layout,
    header: doHeaderContent({
      now: DO_SURFACE_MOCK_NOW,
      locale: DO_SURFACE_MOCK_LOCALE,
      usesExpandedDayTitle: layout.usesExpandedDayTitle,
      isInMarkCompleteMode: state.isInMarkCompleteMode,
      remainingCount: remainingCountOf(state),
    }),
    rings: ringsOf(state),
    showsRings:
      state.preferences.activityRingsEnabled && !state.isInMarkCompleteMode,
    lanes: laneCardsOf(state),
    reminders: reminderCardsOf(state),
    allDayEvents: events.allDay,
    timedEventGroups: events.timedGroups,
    suggestions: suggestionCardsOf(state),
    showsSuggestions:
      state.preferences.showSuggestions && state.suggestions.length > 0,
    hasNoEndeavors:
      state.tasks.length === 0 &&
      state.reminders.length === 0 &&
      state.events.length === 0,
    selectedCardKey: state.selectedCardKey,
    isInMarkCompleteMode: state.isInMarkCompleteMode,
    exceptionMessage:
      state.load.kind === 'failed' ? state.load.exception.message : null,
    now: DO_SURFACE_MOCK_NOW,
    locale: DO_SURFACE_MOCK_LOCALE,
    cardsBySection: cardsBySectionOf(state),
    scrollTarget: null,
    // A measured width is never available on a first paint or under jsdom, so
    // the fixtures pin one — 1120px is a 1440px window minus the sidebar, which
    // is the seven-card case.
    initialLaneWidth: surface === 'desktop' ? 1120 : 358,
    onLaneWidthChanged: noop,
    onScrollHandled: noop,
    onRefresh: noop,
    handlers: noopDoCardHandlers,
    onUndoCompletion: noop,
    suggestionHandlers: { onAction: noop, onDismiss: noop },
    onCreateEndeavor: noop,
    onEnterMarkCompleteMode: noop,
    onClearExpired: noop,
    onQuickAdd: noop,
    onStartSession: noop,
    ...overrides,
  }
}

/** The states this surface's stories and tests are read against. */
export const doSurfaceMocks = {
  typicalDay: doStateMocks.loadedTypicalDay,
  emptyDay: doStateMocks.loadedEmptyDay,
  loading: doStateMocks.loading,
  failedRefresh: doStateMocks.failedRefreshKeepingTheDay,
  markCompleteMode: doStateMocks.inMarkCompleteMode,
  ringsEnabled: doStateMocks.ringsEnabled,
  suggestionOffered: doStateMocks.suggestionOffered,
} as const
