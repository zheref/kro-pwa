/**
 * The Do surface's render tier — what `apps/web`'s `/my-day` route mounts.
 *
 * A pure re-export barrel: the logic tier (`../DoFeature`, `../DoSelectors`, …)
 * stays reachable through the feature folder, and nothing here re-exports it,
 * so a route file cannot reach a slice by accident.
 */
export { type DoPageProps, DoPage } from './DoPage'
export {
  type DoSurfaceFragmentProps,
  type DoScrollTarget,
  DoSurfaceFragment,
  PULL_TO_REFRESH_THRESHOLD,
} from './DoSurfaceFragment'
export {
  type DoHeaderFragmentProps,
  DoHeaderFragment,
} from './DoHeaderFragment'
export { type DoLanesFragmentProps, DoLanesFragment } from './DoLanesFragment'
export {
  type DoToolbarFragmentProps,
  DoToolbarFragment,
} from './DoToolbarFragment'
export {
  DO_NOTIFICATIONS_PANEL,
  type DoNotificationsFragmentProps,
  DoNotificationsFragment,
} from './DoNotificationsFragment'
export {
  type DoTasksListDestination,
  type DoTasksListFragmentProps,
  DoTasksListFragment,
} from './DoTasksListFragment'
export {
  type DoCardHandlers,
  type DoSuggestionHandlers,
  noopDoCardHandlers,
} from './doCardHandlers'
export {
  DO_TASK_SECTIONS,
  DO_MARK_COMPLETE_SUBTITLE,
  DO_MARK_COMPLETE_TITLE,
  type DoHeaderContent,
  type DoHeaderContentInput,
  type DoSectionDescriptor,
  type DoSectionGlyph,
  DoViewSection,
  doAllFiltersVisible,
  doCardModels,
  doComputedStateLabel,
  doEventsBadgeText,
  doHeaderContent,
  doNotificationsAccessibilityValue,
  doNotificationsSummary,
  doRemindersBadgeText,
  doSectionBadgeText,
  doShortDateString,
  doVisibilityToggled,
  doWeekdayString,
} from './doPresentation'
export {
  DO_LANE_CARD_SPACING,
  FEATURED_LANE_METRICS,
  FEATURED_ODD_COUNTS,
  featuredCapacityForWidth,
  featuredCardWidths,
  featuredHeroIndex,
  featuredRequiredWidth,
  featuredVisibleCount,
} from './doFeaturedLaneLayout'
export {
  MAX_EVENTS_PER_COLUMN,
  type DoEventLanes,
  type DoEventLanesInput,
  eligibleDoEvents,
  emptyDoEventLanes,
  groupDoEvents,
} from './doEventLanes'
export {
  deferEndeavorThunk,
  delegateEndeavorThunk,
  deleteEndeavorThunk,
  reopenEndeavorThunk,
  skipEndeavorThunk,
} from './DoOverflowProducer'
