/**
 * One props contract, two input types — the render-tier half of
 * `EndeavorCapabilities`.
 *
 * `@kro/core`'s `EndeavorCapabilities` declares WHAT the user may do to a row
 * and BY WHICH GESTURE, and its doc-comment carries the mapping this module
 * implements:
 *
 * | Declared            | Touch (web mobile)      | Pointer (web desktop)            |
 * |---------------------|-------------------------|----------------------------------|
 * | `swipeLeading`      | swipe from the leading  | hover-revealed button + context  |
 * | `swipeTrailing`     | swipe from the trailing | hover-revealed button + context  |
 * | `contextMenu`       | long-press              | right-click                      |
 * | `tap`               | tap                     | click                            |
 * | `prepOverlay`       | prep overlay            | prep overlay                     |
 * | `buttonRow(n)`      | inline row              | inline row                       |
 *
 * THE POINT OF THIS FILE is the second column pair: a swipe binding is not a
 * touch-only feature that pointer users lose, and it is not duplicated by the
 * caller into a second prop. The SAME binding is read twice — once as a swipe
 * surface, once as a hover action *and* a context-menu entry — so a row that
 * "supports swipe to complete" is, on a desktop, a row that shows a Complete
 * button on hover and lists Complete in its right-click menu. That is the
 * acceptance criterion "rows expose swipe surfaces on touch and hover/context
 * actions on pointer from the same props", expressed as a function.
 *
 * Nothing here renders. Nothing here reads a store (`RC-14`): the caller passes
 * resolved bindings and one `onOperation` closure.
 */

import {
  type EndeavorCapabilities,
  type EndeavorOperation,
  type EndeavorOperationBinding,
  type OperationTint,
  bindingsForGesture,
  effectiveTintOf,
} from '@kro/core'
import type { ColorRole } from '../system/tokens/roles'
import type { InputCapability } from './useInputCapability'

/**
 * The one callback a row raises. Intent, never mechanism (`RC-2`): the row
 * reports which operation the user asked for and which endeavor it was, and has
 * no opinion about what happens next.
 */
export type OnEndeavorOperation = (
  operation: EndeavorOperation,
  endeavorId: string,
) => void

/** How one binding is surfaced for the current input type. */
export interface ResolvedRowActions {
  /** Swipe from the leading edge. Empty on pointer. */
  readonly leadingSwipe: readonly EndeavorOperationBinding[]
  /** Swipe from the trailing edge. Empty on pointer. */
  readonly trailingSwipe: readonly EndeavorOperationBinding[]
  /** Revealed on hover. Empty on touch. */
  readonly hoverActions: readonly EndeavorOperationBinding[]
  /**
   * The context menu. Long-press on touch, right-click on pointer — and on
   * pointer it also carries the swipe bindings, so a right-click reaches
   * everything a swipe would.
   */
  readonly contextMenu: readonly EndeavorOperationBinding[]
  /** Inline buttons, ordered by `position`. Identical on both input types. */
  readonly buttonRow: readonly EndeavorOperationBinding[]
  /** The prep overlay's action set. Identical on both input types. */
  readonly prepOverlay: readonly EndeavorOperationBinding[]
  /** The whole-row tap binding, if the vista declares one. */
  readonly tap: EndeavorOperationBinding | null
}

/** `buttonRow` honours `position`; every other gesture honours declaration order. */
function orderedButtonRow(
  bindings: readonly EndeavorOperationBinding[],
): readonly EndeavorOperationBinding[] {
  return [...bindings].sort((left, right) => {
    const leftPosition =
      left.gesture.kind === 'buttonRow' ? left.gesture.position : 0
    const rightPosition =
      right.gesture.kind === 'buttonRow' ? right.gesture.position : 0
    return leftPosition - rightPosition
  })
}

/**
 * Split one capability set into the surfaces this input type actually affords.
 *
 * Pure, and total: every binding lands in at least one bucket for both input
 * types, which is what `rowActions.test.ts` asserts. A binding that reached
 * neither would be an operation the user simply cannot perform on one of the
 * two platforms — the exact defect this function exists to make impossible.
 */
export function resolveRowActions(
  capabilities: EndeavorCapabilities,
  input: InputCapability,
): ResolvedRowActions {
  const leading = bindingsForGesture(capabilities, 'swipeLeading')
  const trailing = bindingsForGesture(capabilities, 'swipeTrailing')
  const declaredContextMenu = bindingsForGesture(capabilities, 'contextMenu')
  const isPointer = input === 'pointer'

  return {
    leadingSwipe: isPointer ? [] : leading,
    trailingSwipe: isPointer ? [] : trailing,
    hoverActions: isPointer ? [...leading, ...trailing] : [],
    contextMenu: isPointer
      ? [...declaredContextMenu, ...leading, ...trailing]
      : declaredContextMenu,
    buttonRow: orderedButtonRow(bindingsForGesture(capabilities, 'buttonRow')),
    prepOverlay: bindingsForGesture(capabilities, 'prepOverlay'),
    tap: bindingsForGesture(capabilities, 'tap')[0] ?? null,
  }
}

/**
 * `OperationTint` → a design-system colour role.
 *
 * Canon keeps a six-value tint enum in its core "for the same reason this tier
 * keeps the DOM out" (its words), so the enum→colour step has to happen
 * somewhere in the render tier. Here, once — not at six call sites.
 *
 * `null` (a standard-role binding with no explicit tint) resolves to the live
 * accent, which is the web equivalent of SwiftUI's "system default".
 */
export function tintColorRole(tint: OperationTint | null): ColorRole {
  switch (tint) {
    case 'green':
      return 'badgeGreen'
    case 'blue':
      return 'badgeBlue'
    case 'orange':
      return 'badgeOrange'
    case 'red':
      return 'badgeRed'
    case 'purple':
      return 'badgePurple'
    case 'gray':
      return 'badgeNeutral'
    case null:
      return 'accent'
  }
}

/** The colour role a binding actually paints, role default applied. */
export function bindingColorRole(binding: EndeavorOperationBinding): ColorRole {
  return tintColorRole(effectiveTintOf(binding))
}

/**
 * The label colour to put ON a fill role.
 *
 * Two different contracts, and getting them backwards is invisible in light
 * mode and unreadable in dark:
 *   · a BADGE fill is a deep variant in light and a bright variant in dark, so
 *     its label follows the scheme — white on the deep one, black on the
 *     bright one. `absolute` is the token whose declaration says exactly that,
 *     and it is the pairing the design system's chip contract measures.
 *   · the ACCENT is user-tunable, so its label is `onAccent`, which
 *     `useAccentColor` recomputes whenever the accent changes. Using `absolute`
 *     there would freeze a label the accent no longer suits.
 */
export function onFillRole(fill: ColorRole): ColorRole {
  return fill === 'accent' ? 'onAccent' : 'absolute'
}
