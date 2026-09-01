/**
 * Plan's render tier — the Page `apps/web`'s `/plan` route mounts, the
 * Fragments it composes, and the pure modules behind them.
 *
 * A pure re-export barrel: no logic, so the guard's new-source-file rule
 * exempts it by design.
 *
 * KC-IS-#20 added `list/`, `matrix/`, `picker/` and `visibility/` beside
 * `timeline/` and passes the first two into `PlanFragment`'s `destinations`
 * slots; nothing exported from `timeline/` changed when it did.
 */

export { type PlanPageProps, PLAN_TIMELINE_TOP_INSET, PlanPage } from './PlanPage'
export {
  PLAN_FAB_INSET,
  PLAN_SCROLL_BOTTOM_INSET,
  type PlanDestinationSlots,
  type PlanFragmentProps,
  PlanFragment,
} from './PlanFragment'
export {
  DAY_PICKER_HEIGHT,
  type PlanDayPickerFragmentProps,
  PlanDayPickerFragment,
  pickerWeekdayColor,
} from './PlanDayPickerFragment'
export {
  MODE_ITEM_SPACING,
  MODE_PICKER_SIZE,
  MODE_SELECTION_THRESHOLD,
  type PlanViewModePickerFragmentProps,
  PlanViewModePickerFragment,
  committedModeSteps,
  lensProminence,
  modeGlyphScale,
} from './PlanViewModePickerFragment'
export {
  type PlanBannersFragmentProps,
  PlanBannersFragment,
} from './PlanBannersFragment'
export {
  VISIBILITY_STATE_VALUES,
  type PlanVisibilityPanelFragmentProps,
  type VisibilityRow,
  PlanVisibilityPanelFragment,
  VisibilityFilterSection,
  areAllPlanFiltersEnabled,
  hostRows,
  kindRows,
  stateRows,
} from './PlanVisibilityPanelFragment'
export {
  PLAN_MODE_SLIDE_FRACTION,
  type PlanModeEdge,
  oppositePlanModeEdge,
  planModeEntryEdge,
  planModeOffsetPercent,
} from './planModeTransition'

export {
  HANDLE_KEYBOARD_STEP_PX,
  LABEL_ROW_HEIGHT,
  SLOT_DOUBLE_TAP_MS,
  type TimelineFragmentProps,
  TimelineFragment,
} from './timeline/TimelineFragment'
export {
  CARD_ACCENT_PALETTE,
  CardTier,
  RIPPLE_SETTLED_OPACITY,
  cardAccentColor,
  cardFillBackground,
  cardFillOpacity,
  cardTierFor,
  cardTierForMinutes,
  normalizedHexColor,
  paletteAccentFor,
  rippleDiameterCss,
} from './timeline/timelineCardStyle'
export {
  dayPickerAccessibleDate,
  dayPickerDayNumber,
  dayPickerWeekdayLetter,
  planEventCountLabel,
  planTitleDate,
  planTitleWeekday,
  slotAccessibilityLabel,
  timelineHourLabel,
} from './timeline/timelineFormat'
export {
  SLOT_INDEX_ATTRIBUTE,
  type BlockPress,
  type BlockPressHandlers,
  type SlotPressHandlers,
  type UseBlockPressOptions,
  type UseSlotPressOptions,
  type UseVerticalDragOptions,
  type VerticalDragHandlers,
  pointerDistance,
  useBlockPress,
  useReducedMotionPreference,
  useSlotPress,
  useVerticalDrag,
} from './timeline/useTimelineGestures'

export {
  PLAN_LIST_IMPLIED_DURATION_SECONDS,
  PlanListBucket,
  PlanTimeOfDayBand,
  type PlanListSection,
  isPlanListAllDay,
  planListBucketFor,
  planListBucketTitle,
  planListBuckets,
  planListComparator,
  planListPriorityTier,
  planListSections,
  planListSortDate,
  planListSorted,
  planTimeOfDayBandFor,
  planTimeOfDayBandTitle,
  planTimeOfDayBands,
} from './list/planListModel'
export {
  type PlanListRowSymbol,
  planListRowBadges,
  planListRowOpenLabel,
  planListRowSymbol,
  planListRowTimeInfo,
} from './list/planListPresentation'
export {
  selectIsPlanListEmpty,
  selectPlanListEndeavors,
  selectPlanListGrouping,
  selectPlanListSections,
  selectPlanListSort,
  selectPlanRowCapabilities,
} from './list/PlanListSelectors'
export {
  type PlanEndeavorDeletion,
  deletePlanEndeavorThunk,
} from './list/PlanListProducer'
export {
  type PlanListFragmentProps,
  PlanListFragment,
} from './list/PlanListFragment'

export {
  PlanMatrixQuadrant,
  eisenhowerQuadrantFor,
  planMatrixActionForeground,
  planMatrixAddExistingLabel,
  planMatrixAddLabel,
  planMatrixAddNewLabel,
  planMatrixItemSymbol,
  planMatrixQuadrantCaption,
  planMatrixQuadrantFor,
  planMatrixQuadrantTint,
  planMatrixQuadrantTitle,
  planMatrixQuadrants,
} from './matrix/planMatrixPresentation'
export {
  MATRIX_CARD_GAP,
  MATRIX_CARD_MIN_PX,
  MATRIX_QUADRANT_GAP,
  MATRIX_TINT_ALPHA,
  type PlanMatrixFragmentProps,
  PlanMatrixFragment,
} from './matrix/PlanMatrixFragment'

export {
  PICK_ENDEAVOR_SELECTION_LIMIT,
  PICK_ENDEAVOR_SUBTITLE,
  PickEndeavorPriority,
  type PickEndeavorSection,
  pickEndeavorCanConfirm,
  pickEndeavorCanSelectMore,
  pickEndeavorCandidates,
  pickEndeavorCapNotice,
  pickEndeavorConfirmBlocker,
  pickEndeavorPriorities,
  pickEndeavorPriorityFor,
  pickEndeavorPriorityTitle,
  pickEndeavorSections,
  pickEndeavorSelection,
  pickEndeavorSelectionCaption,
} from './picker/planPickerModel'
export {
  type PickEndeavorFragmentProps,
  PickEndeavorFragment,
} from './picker/PickEndeavorFragment'

export {
  ALL_PLAN_VISIBILITY_FILTERS,
  PLAN_VISIBILITY_FILTER_ORDER,
  PLAN_VISIBILITY_SUPPORTED_FILTERS,
  type PlanVisibilitySection,
  planVisibilityFilterTitle,
  planVisibilitySections,
} from './visibility/planVisibilitySections'
export {
  type PlanVisibilityCalendar,
  type PlanVisibilityFragmentProps,
  PlanVisibilityFragment,
} from './visibility/PlanVisibilityFragment'
