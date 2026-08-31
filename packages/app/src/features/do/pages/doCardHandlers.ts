/**
 * The intent callbacks every Do card form raises, as one contract.
 *
 * Canon's `DoView` declares fourteen closures and threads them, one by one,
 * through `EndeavorLane` into `EndeavorCard` — and `DoTasksListView` declares a
 * near-identical set of nine for the expanded list. Two declarations of the
 * same intent set is how a card in the carousel and the same card in the list
 * end up doing different things on Skip.
 *
 * So the set is named once. Every Fragment below takes `handlers`, every one
 * passes the same object down, and the Page builds it in one place from
 * dispatches (`RC-15`: a Fragment receives intent as callbacks and dispatches
 * nothing itself).
 *
 * ## `onPrepare` carries the section, not just the id
 *
 * `selectedCardKey` is `"sectionTag:endeavorId"` — the *same* endeavor can sit
 * in Due Soon and in the featured lane at once, and canon prepares exactly the
 * one that was tapped. The card kit's `onPrepare` only knows the id (it does
 * not know what lane it is in), so the section is bound at each lane's call
 * site and arrives here as the first argument.
 */
import type { ActiveToastInput } from '../../../design/chrome'
import type { EndeavorCardModel } from '../../../design/endeavor'
import type { DoSuggestionSource } from '../DoSuggestions'

export interface DoCardHandlers {
  /** A short tap: prepare (or un-prepare) the card in `section`. */
  readonly onPrepare: (section: string, endeavorId: string) => void
  /** A tap on the surface's own background, with something prepared. */
  readonly onDeselect: () => void
  /** The green Start control — the session-start intent (`KC-IS-#22`). */
  readonly onExecute: (card: EndeavorCardModel) => void
  /**
   * A confirmed completion, at the instant the popover carried. Passed straight
   * through from the card kit, which already owns the backdating popover.
   */
  readonly onMarkComplete: (
    card: EndeavorCardModel,
    completedAt: Date,
  ) => void
  /** Skip a task, or skip an event occurrence — canon splits these by `isEvent`. */
  readonly onSkip: (card: EndeavorCardModel) => void
  readonly onDefer: (card: EndeavorCardModel, target: Date) => void
  readonly onDelegate: (card: EndeavorCardModel) => void
  /** Long-press, secondary click, or the overflow menu's Details row. */
  readonly onShowDetails: (card: EndeavorCardModel) => void
  readonly onDelete: (card: EndeavorCardModel) => void
}

/** The suggestion lane's two intents, kept apart from the card set. */
export interface DoSuggestionHandlers {
  readonly onAction: (source: DoSuggestionSource) => void
  readonly onDismiss: (source: DoSuggestionSource) => void
}

/**
 * The completion toast, as a pure decoration over a handler set.
 *
 * Canon's `DoScreen` attaches `.activeToast(store.activeToast, onPrimaryAction:
 * { store.send(.userDidTapUndoLastAction) })` to its content, so a completion
 * always leaves an Undo affordance behind. Expressing it as a function rather
 * than as three lines inside the Fragment buys the thing that matters: the
 * toast's *contents* — its copy, its reward badge, and the fact that its
 * primary action carries the completed card — are assertable without mounting
 * the Radix popper the card's own check button opens (which the design system
 * measured at 5–12 seconds per mount under jsdom).
 *
 * Every other intent passes through untouched.
 */
export const withCompletionToast = (
  handlers: DoCardHandlers,
  options: {
    readonly enqueue: (input: ActiveToastInput) => string
    readonly onUndo: (card: EndeavorCardModel) => void
  },
): DoCardHandlers => ({
  ...handlers,
  onMarkComplete: (card, completedAt) => {
    handlers.onMarkComplete(card, completedAt)
    options.enqueue({
      message: `${card.title} completed`,
      icon: 'checkmark.circle.fill',
      iconColor: 'green',
      rewardAmount: card.reward,
      primaryAction: { title: 'Undo', onSelect: () => options.onUndo(card) },
    })
  },
})

/**
 * A no-op handler set, for a story or a test that renders a surface it does not
 * intend to drive.
 *
 * It lives here rather than in each story file for the reason `RC-31` gives
 * about `State`: a fixture assembled inline in six places is six fixtures.
 */
export const noopDoCardHandlers: DoCardHandlers = {
  onPrepare: () => {},
  onDeselect: () => {},
  onExecute: () => {},
  onMarkComplete: () => {},
  onSkip: () => {},
  onDefer: () => {},
  onDelegate: () => {},
  onShowDetails: () => {},
  onDelete: () => {},
}
