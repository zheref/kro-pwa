/**
 * The Adapter layer — the port of canon's `KroUI/Find/FindAdapters.swift` and
 * the `endeavorOperations(_:on:enabledFlags:onOperation:)` modifier it composes
 * with (`KroUI`).
 *
 * Canon's Adapter is a *view* artifact: it turns one `Endeavor` into a row and
 * attaches the vista's capability bindings as swipe actions, a context menu and
 * a tap. Only the second half is business logic, and it is the half `#29` owns —
 * `#30` renders the row. So this file is the **row action model**: given an
 * endeavor and its vista's (already flag-resolved) capabilities, which actions
 * exist, under which gesture, in which order.
 *
 * It is the only bridge from a vista to an operation. A surface never reads
 * `vista.capabilities` and builds its own gesture list — that is exactly the
 * duplication the issue's "adapters as the only vista→row bridge" constraint
 * exists to prevent.
 *
 * ## Order is behaviour, not tidiness
 *
 * `EndeavorCapabilities.operations` is ordered, and `#9`'s own doc says a
 * registry edit that reshuffles it *is a behaviour change*: declaration order is
 * swipe-button order, and `buttonRow` carries an explicit `position`. Every
 * accessor here preserves declaration order; only `buttonRowActions` re-sorts,
 * and only by the position the binding itself declares (**stably** — two
 * bindings sharing a position keep declaration order between them).
 *
 * ## Flag gating happens once, upstream
 *
 * A binding's `requires` is resolved by `resolveEndeavorCapabilities` (#9) at
 * install time, against the flags cached on the slice. This file therefore takes
 * capabilities that are **already** resolved and never sees a flag — which is
 * what keeps it pure and keeps "the flag was on when we fetched" from becoming
 * "the flag is on right now, at render time", a value a Selector cannot read.
 */
import {
  type Endeavor,
  type EndeavorCapabilities,
  type EndeavorOperation,
  type EndeavorOperationBinding,
  type OperationGestureKind,
  type OperationRole,
  type OperationTint,
  bindingsForGesture,
  effectiveTintOf,
} from '@kro/core'

/** One actionable affordance on a row, with everything a renderer needs. */
export interface EndeavorRowAction {
  readonly operation: EndeavorOperation
  readonly label: string
  /** The SF Symbol name canon declares; #6 maps it onto the web icon set. */
  readonly icon: string
  readonly role: OperationRole
  /** The tint after the role's default is applied (`effectiveTintOf`). */
  readonly tint: OperationTint | null
  /** `buttonRow` position; `null` for every other gesture. */
  readonly position: number | null
}

/**
 * One row, adapted: the endeavor plus the actions each gesture surfaces.
 *
 * Every list is present even when empty, so a renderer can read any gesture
 * without an optional — the same reason `#9`'s Detail selectors give an empty
 * array per section rather than omitting the key.
 */
export interface EndeavorRowAdapter {
  /** The row's stable identity — the endeavor's id, so a keyed list is stable. */
  readonly id: string
  readonly endeavor: Endeavor
  readonly leadingSwipeActions: readonly EndeavorRowAction[]
  readonly trailingSwipeActions: readonly EndeavorRowAction[]
  readonly contextMenuActions: readonly EndeavorRowAction[]
  readonly buttonRowActions: readonly EndeavorRowAction[]
  readonly prepOverlayActions: readonly EndeavorRowAction[]
  /**
   * The tap binding, or `null` when the vista declares none (or its flag is
   * off). Canon allows at most one meaningful tap per row; where a vista
   * declares several, the **first** wins, matching declaration order.
   */
  readonly tapAction: EndeavorRowAction | null
}

/** One binding, flattened into the render-ready action shape. */
export const rowActionFrom = (
  binding: EndeavorOperationBinding,
): EndeavorRowAction => ({
  operation: binding.operation,
  label: binding.label,
  icon: binding.icon,
  role: binding.role,
  tint: effectiveTintOf(binding),
  position: binding.gesture.kind === 'buttonRow' ? binding.gesture.position : null,
})

/** Every action a capability set surfaces under one gesture, in declaration order. */
export const rowActionsForGesture = (
  capabilities: EndeavorCapabilities,
  gesture: OperationGestureKind,
): readonly EndeavorRowAction[] =>
  bindingsForGesture(capabilities, gesture).map(rowActionFrom)

/**
 * `buttonRow` actions ordered by declared position, lowest first ("lower
 * `position` renders first (leftmost)"). `Array.prototype.sort` is stable in
 * every runtime this targets, so equal positions keep declaration order.
 */
const buttonRowActions = (
  capabilities: EndeavorCapabilities,
): readonly EndeavorRowAction[] =>
  [...rowActionsForGesture(capabilities, 'buttonRow')].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  )

/** Adapt one endeavor against one (already flag-resolved) capability set. */
export const endeavorRowAdapter = (
  endeavor: Endeavor,
  capabilities: EndeavorCapabilities,
): EndeavorRowAdapter => {
  const tapActions = rowActionsForGesture(capabilities, 'tap')
  return {
    id: endeavor.id,
    endeavor,
    leadingSwipeActions: rowActionsForGesture(capabilities, 'swipeLeading'),
    trailingSwipeActions: rowActionsForGesture(capabilities, 'swipeTrailing'),
    contextMenuActions: rowActionsForGesture(capabilities, 'contextMenu'),
    buttonRowActions: buttonRowActions(capabilities),
    prepOverlayActions: rowActionsForGesture(capabilities, 'prepOverlay'),
    tapAction: tapActions[0] ?? null,
  }
}

/** Adapt a whole list. One capability set, one pass. */
export const endeavorRowAdapters = (
  endeavors: readonly Endeavor[],
  capabilities: EndeavorCapabilities,
): readonly EndeavorRowAdapter[] =>
  endeavors.map((endeavor) => endeavorRowAdapter(endeavor, capabilities))

/**
 * Every operation the adapted row can actually raise, de-duplicated in
 * declaration order. The coverage suite uses this to prove the adapter surfaces
 * exactly what the vista declared — no more (an invented gesture) and no less
 * (a declared binding the adapter forgot to expose).
 */
export const adaptedOperations = (
  adapter: EndeavorRowAdapter,
): readonly EndeavorOperation[] => {
  const seen: EndeavorOperation[] = []
  const all = [
    ...adapter.leadingSwipeActions,
    ...adapter.trailingSwipeActions,
    ...adapter.contextMenuActions,
    ...adapter.buttonRowActions,
    ...adapter.prepOverlayActions,
    ...(adapter.tapAction === null ? [] : [adapter.tapAction]),
  ]
  for (const action of all) {
    if (!seen.includes(action.operation)) seen.push(action.operation)
  }
  return seen
}
