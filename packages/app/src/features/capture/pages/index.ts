/**
 * The Capture & Inbox render tier (KC-IS-#24) — a pure re-export barrel.
 *
 * `apps/web` reaches exactly two of these: `CaptureOverlays` (one anchor in the
 * shell wrapper) and `InboxDestinationPage` (the `/inbox` route). Everything
 * else is exported for stories, tests and the feature children that reuse the
 * open-prompt intent (KC-IS-#17, KC-IS-#19, KC-IS-#26).
 */

export {
  CAPTURE_PROMPT_POPOVER_WIDTH,
  type CapturePresentationKind,
  type CaptureRecurrencePreset,
  type InboxRowLayout,
  capturePromptPresentation,
  captureRecurrencePresets,
  captureRepeatChipLabel,
  dateInputValue,
  formatCaptureDate,
  formatCaptureTime,
  inboxCountCaption,
  inboxRowConfigFor,
  inboxRowLayoutFor,
  parseDateInput,
  parseTimeInput,
  schedulingToastMessage,
  timeInputValue,
  weekDayFromDate,
} from './capturePresentation'
export {
  CAPTURE_SF_SYMBOL_TO_LUCIDE,
  type CaptureSfSymbolName,
  type CaptureSymbolName,
  captureIcon,
  captureIconFor,
  isCaptureMappedSymbol,
} from './captureIcons'
export {
  type CapturePromptFragmentProps,
  CapturePromptFragment,
  captureRewardStep,
} from './CapturePromptFragment'
export { CapturePromptPage } from './CapturePromptPage'
export {
  type CaptureQuickActionFragmentProps,
  CaptureQuickActionFragment,
  captureQuickActionShows,
} from './CaptureQuickActionFragment'
export { CaptureQuickActionPage } from './CaptureQuickActionPage'
export {
  type InboxFragmentProps,
  type InboxPresentation,
  InboxFragment,
} from './InboxFragment'
export { InboxOverlayPage } from './InboxOverlayPage'
export { InboxDestinationPage } from './InboxDestinationPage'
export { CaptureOverlays } from './CaptureOverlays'
export {
  type InboxSurfaceViewModel,
  useInboxSurface,
} from './useInboxSurface'
