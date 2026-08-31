/**
 * Plan's render tier — the Page `apps/web`'s `/plan` route mounts, the
 * Fragments it composes, and the pure modules behind them.
 *
 * A pure re-export barrel: no logic, so the guard's new-source-file rule
 * exempts it by design.
 *
 * KC-IS-#20 adds `list/` and `matrix/` beside `timeline/` and passes them into
 * `PlanFragment`'s `destinations` slots; nothing exported from `timeline/`
 * changes when it does.
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
  PlanVisibilityPanelFragment,
  areAllPlanFiltersEnabled,
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
