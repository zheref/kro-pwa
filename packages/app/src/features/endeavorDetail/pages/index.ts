/**
 * The Endeavor Detail render tier's public surface — a pure re-export barrel.
 *
 * `apps/web` imports exactly one name from here: `DetailOverlays`, which the
 * shell mounts once beside its content.
 */
export {
  DETAIL_INTENT_OPERATIONS,
  type DetailIntentRequest,
  selectDetailIntentRequest,
} from './DetailOverlaySelectors'
export { type DetailOverlaysProps, DetailOverlays } from './DetailOverlays'
export {
  HIDDEN_SCROLLBAR_STYLE,
  type EndeavorDetailFragmentProps,
  EndeavorDetailFragment,
} from './EndeavorDetailFragment'
export {
  DURATION_MAX_SECONDS,
  type EndeavorDurationFragmentProps,
  EndeavorDurationFragment,
} from './EndeavorDurationFragment'
export {
  type EndeavorEditFragmentProps,
  EndeavorEditFragment,
} from './EndeavorEditFragment'
export {
  type EndeavorRelationFragmentProps,
  EndeavorRelationFragment,
  relationEntryFromDraft,
} from './EndeavorRelationFragment'
export {
  deferTitle,
  detailDateTime,
  fieldIcon,
  fieldLabel,
  fieldValue,
  headerChips,
  hostChip,
  kindChip,
  normalizedHex,
  performanceChips,
  performanceSummaryChips,
  relationIcon,
  relationLabel,
  relationSubtitle,
  relationSummary,
  repeatSummary,
  resolutionIcon,
  resolutionLabel,
  resolutionTint,
  shadowChips,
  shadowTitle,
  tagLabel,
} from './endeavorDetailDisplay'
