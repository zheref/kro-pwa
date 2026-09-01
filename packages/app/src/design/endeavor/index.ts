/**
 * `@kro/app` design — the ENDEAVOR component kit.
 *
 * The shared vocabulary every endeavor-bearing surface draws from: the card in
 * both its layouts, the list row, the chips, the banners, the empty states and
 * the three compact popovers. Ported from KroApple's `KroUI/Components/*` with
 * `docs/Features/EndeavorCard.md` as the binding spec for the Do-mode badge
 * geometry.
 *
 * `RC-14`: nothing under this directory imports `react-redux`, a slice or a
 * Producer. Components take plain values and intent closures; the caller
 * decides what an intent means. `endeavorBoundaries.test.ts` proves it by
 * reading every file in this directory, which is the same shape of check
 * `packages/app/scripts/check-uzf-boundaries.mjs` runs for the package.
 *
 * ## Where the domain tier is allowed in, and why
 *
 * Two kinds of `@kro/core` import appear here, both deliberate:
 *   · `EndeavorCapabilities` and its binding types — the vista's declaration of
 *     what a row affords. The epic makes that the props contract for the input
 *     duality, so the render tier has to read it.
 *   · `Endeavor` itself, in exactly ONE function: `endeavorCardModelFrom`. That
 *     is canon's own `EndeavorCardModel.init(from:)` seam, and everything else
 *     in this kit takes the resulting view model.
 *
 * ## Not exported from `design/index.ts` yet
 *
 * This kit is reachable as `…/design/endeavor` from inside `@kro/app`, and its
 * one-line re-export from `design/index.ts` (plus a `./design/endeavor` entry in
 * the package's `exports` map, if the shell ever needs it directly) belongs to
 * whichever child next touches those two files — neither is in this issue's
 * declared lane, and adding a line to a shared barrel is exactly the kind of
 * edit that turns three parallel children into one merge conflict.
 */

// Model, projections, formatting
export {
  DEFAULT_REWARD_POINTS,
  EndeavorUrgency,
  type EndeavorCardModel,
  FALLBACK_SYMBOL,
  computedReward,
  computedSymbol,
  computedUrgency,
  displayTitle,
  endeavorCardModelFrom,
  endeavorUrgencies,
  leadingEmoji,
  urgencyDisplayTitle,
  urgencyIconSymbol,
  urgencyShowsWarning,
} from './endeavorCardModel'
export {
  hostGlyph,
  hostTint,
  kindGlyph,
  kindShortLabel,
  kindTint,
  statusGlyph,
  statusShortLabel,
  statusTint,
} from './endeavorProjections'
export {
  formatDueCaption,
  formatDuration,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
} from './formatting'
export {
  ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
  type EndeavorSfSymbolName,
  type KitSymbolName,
  endeavorIcon,
  iconForBindingSymbol,
  isMappedSymbol,
} from './endeavorIcons'

// Input duality
export {
  POINTER_QUERY,
  type InputCapability,
  readInputCapability,
  useInputCapability,
} from './useInputCapability'
export {
  type OnEndeavorOperation,
  type ResolvedRowActions,
  bindingColorRole,
  resolveRowActions,
  tintColorRole,
} from './rowActions'
export {
  OVERFLOW_ACTIONS,
  type OverflowAction,
  type OverflowFlow,
  type OverflowHandlers,
  overflowFlowFor,
  selectOverflowAction,
} from './endeavorOverflow'
export {
  POINTER_CHROME,
  POINTER_GUTTER_VAR,
  SWIPE_COMMIT_PX,
  SWIPE_DRAG_THRESHOLD_PX,
  SWIPE_REVEAL_PX,
  type EndeavorActionSurfaceProps,
  EndeavorActionSurface,
  pointerChromeGutterPx,
} from './EndeavorActionSurface'

// Motion
export {
  WIGGLE_ANGLE_DEGREES,
  WIGGLE_HALF_PERIOD_MS,
  WIGGLE_SETTLE_MS,
  type Wiggle,
  useWiggle,
  wiggleStyle,
} from './useWiggle'

// Components
export {
  REWARD_BACKGROUND_ROLE,
  REWARD_FOREGROUND_ROLE,
  URGENCY_BACKGROUND_ROLE,
  type CardBadgeProps,
  CardBadge,
  RewardBadge,
  UrgencyBadge,
  urgencyForegroundRole,
} from './CardBadge'
export {
  type ChipEmphasis,
  type ChipSize,
  type ChipTint,
  type KroChipProps,
  ChipFlow,
  KroChip,
  chipTintVar,
  colorTint,
  semanticTint,
} from './KroChip'
export {
  type InlineBannerKind,
  type InlineBannerProps,
  InlineBanner,
} from './InlineBanner'
export {
  type SectionCardProps,
  type SurfaceCardProps,
  CardRow,
  CardRowStack,
  SectionCard,
  SurfaceCard,
} from './SurfaceCard'
export {
  type PropertyRowChip,
  type PropertyRowProps,
  type PropertyRowValue,
  PropertyRow,
  propertyRowAccessibilityText,
} from './PropertyRow'
export { type EmptyStateCardProps, EmptyStateCard } from './EmptyStateCard'
export {
  type EmptyDayStateViewProps,
  type InboxTrayEmptyStateProps,
  EmptyDayStateView,
  InboxTrayEmptyState,
} from './EmptyDayStateView'
export {
  type CompactHeaderLeadingAction,
  type CompactPresentationHeaderProps,
  CompactPresentationHeader,
} from './CompactPresentationHeader'
export {
  type SuggestionCardModel,
  type SuggestionCardProps,
  SuggestionCard,
  SuggestionSource,
  suggestionActionIcon,
  suggestionIcon,
  suggestionSources,
  suggestionTint,
} from './SuggestionCard'
export {
  MINUTES_PER_SESSION_POINT,
  type TaskRowModel,
  type TaskRowProps,
  TaskRow,
  completionLabel,
  sessionPointsCaption,
} from './TaskRow'
export {
  ENDEAVOR_ROW_CONFIGS,
  type EndeavorRowBadge,
  type EndeavorRowConfigName,
  type EndeavorRowConfiguration,
  type EndeavorRowProps,
  type EndeavorRowTimeInfo,
  EndeavorRow,
  RowBadge,
  endeavorRowPropsFromCardModel,
} from './EndeavorRow'
export {
  CARD_METRICS,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  HORIZONTAL_MIN_HEIGHT,
  type EndeavorCardIntent,
  type EndeavorCardLayout,
  type EndeavorCardMetrics,
  type EndeavorCardProps,
  type EndeavorCardSize,
  type EndeavorPreparationPresentation,
  EndeavorCard,
  usesDetailedMacOSPreparation,
} from './EndeavorCard'
export {
  type DeferPopoverProps,
  type DeleteConfirmationPopoverProps,
  type MarkCompletePopoverProps,
  DeferPopover,
  DeleteConfirmationPopover,
  MarkCompletePopover,
  defaultDeferTarget,
  localInputValue,
  parseLocalInput,
} from './endeavorPopovers'
