/**
 * What choosing an entry in the card's overflow menu MEANS.
 *
 * Canon's `moreActionsMenu` lists Defer, Skip, Delegate, Details and Delete.
 * Two of those five are not acts at all — they are shortcuts INTO a flow the
 * card already owns:
 *
 *   · **Defer** opens `DeferPopover`, so the user picks a time. Firing
 *     `onDefer(defaultDeferTarget(…))` straight from the menu silently decides
 *     the time for them, and `DeferPopover`'s own doc says Skip is offered on
 *     the overflow route — which only makes sense if that route presents the
 *     popover.
 *   · **Delete** opens `DeleteConfirmationPopover`, which warns that the
 *     endeavor is removed from every source and cannot be undone. A menu entry
 *     that deletes on select has no equivalent step.
 *
 * **An overflow entry is a shortcut to the flow, never past it.** The rule is
 * stated here, as a pure function, rather than inline in the menu's JSX, for
 * one reason: this module cannot see `onDefer` or `onDelete` at all, so the
 * routing decision has no way to reach them. The bug the reviewer found is not
 * fixed here so much as made unrepresentable.
 */

import { assertNever } from '@kro/core'

/** The five entries canon's overflow menu carries, in canon's order. */
export type OverflowAction =
  | 'defer'
  | 'skip'
  | 'delegate'
  | 'details'
  | 'delete'

/** The two entries that open a flow instead of acting. */
export type OverflowFlow = 'defer' | 'delete'

export const OVERFLOW_ACTIONS: readonly OverflowAction[] = [
  'defer',
  'skip',
  'delegate',
  'details',
  'delete',
]

/**
 * What the menu can do when an entry is chosen.
 *
 * Note what is ABSENT: there is no `defer` and no `delete` handler. The only
 * route to either is `openFlow`, which is the invariant this module exists to
 * hold.
 */
export interface OverflowHandlers {
  /** Present the flow's popover. The flow decides; the menu never does. */
  readonly openFlow: (flow: OverflowFlow) => void
  readonly skip?: () => void
  readonly delegate?: () => void
  readonly showDetails?: () => void
}

/**
 * Which flow an entry opens, or `null` when the entry is the act itself.
 *
 * Skip, Delegate and Details are one-step intents on every surface in the kit —
 * the dedicated Skip control fires directly too — so routing them through a
 * confirmation would be a second, invented step rather than the same flow.
 */
export function overflowFlowFor(action: OverflowAction): OverflowFlow | null {
  switch (action) {
    case 'defer':
      return 'defer'
    case 'delete':
      return 'delete'
    case 'skip':
    case 'delegate':
    case 'details':
      return null
    default:
      // `assertNever` returns `never`, so this is unreachable — but the
      // function's own return type is `void`, and returning a `never`
      // expression from it reads as returning a value.
      assertNever(action)
  }
}

/** Perform a chosen entry: open its flow, or raise its intent. */
export function selectOverflowAction(
  action: OverflowAction,
  handlers: OverflowHandlers,
): void {
  const flow = overflowFlowFor(action)
  if (flow !== null) {
    handlers.openFlow(flow)
    return
  }

  switch (action) {
    case 'skip':
      handlers.skip?.()
      return
    case 'delegate':
      handlers.delegate?.()
      return
    case 'details':
      handlers.showDetails?.()
      return
    // `defer` and `delete` are unreachable: `overflowFlowFor` returned above.
    case 'defer':
    case 'delete':
      return
    default:
      // `assertNever` returns `never`, so this is unreachable — but this
      // function returns `void`, and `return assertNever(...)` reads as
      // returning a value from it.
      assertNever(action)
  }
}
