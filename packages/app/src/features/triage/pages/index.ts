/**
 * The Triage render tier (KC-IS-#26) — a pure re-export barrel.
 *
 * `apps/web` reaches **none** of these: Triage has no route, by canon's own
 * decision (*"presented via the Inbox sheet's custom carousel transition, not a
 * NavigationStack push"*). The only production consumer is the Inbox surface,
 * which mounts `TriageCarouselPage` into its `overlay` slot; everything else is
 * exported for stories, tests, and a sibling that composes one of the pieces.
 */

export {
  type TriageCarouselFragmentProps,
  TriageCarouselFragment,
} from './TriageCarouselFragment'
export {
  type TriageCarouselPageProps,
  TriageCarouselPage,
} from './TriageCarouselPage'
export { resolveTriageEditReachabilityThunk } from './TriageCapabilitiesProducer'
export {
  type TriageDurationChipModel,
  type TriageFormFragmentProps,
  type TriageQuadrantTileModel,
  type TriageRatingModel,
  TriageFormFragment,
} from './TriageFormFragment'
export {
  TRIAGE_SF_SYMBOL_TO_LUCIDE,
  type TriageSfSymbolName,
  type TriageSymbolName,
  isTriageMappedSymbol,
  triageIcon,
  triageIconFor,
} from './triageIcons'
export {
  TRIAGE_DISMISS_THRESHOLD_FRACTION,
  TRIAGE_DRAG_MINIMUM_DISTANCE,
  TRIAGE_EDGE_STRIP_WIDTH,
  TRIAGE_RATING_STEPS,
  dateTimeInputValue,
  formatTriageMoment,
  isTriageEdgeStripStart,
  isTriageRatingStepLit,
  parseDateTimeInput,
  triageCarouselCompletes,
  triageCarouselOffset,
} from './triagePresentation'
export {
  type TriageShareGateway,
  TriageShareOutcome,
  browserTriageShareGateway,
  performTriageShare,
  triageShareNotice,
} from './triageShare'
