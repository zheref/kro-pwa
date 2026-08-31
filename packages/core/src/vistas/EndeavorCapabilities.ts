/**
 * `EndeavorCapabilities` — canon `KroCore/Vistas/EndeavorCapabilities.swift`.
 *
 * The third question a vista answers: **what can the user do to a card, and how
 * do they reach it?** An ordered list of bindings, each pairing one operation
 * from a closed catalog with one gesture, a role, an icon, a label, an optional
 * feature-flag gate and an optional tint.
 *
 * `EndeavorOperation` has no `custom` case, deliberately: extensibility would
 * undermine the gesture / role / flag-gating contract that makes the registry
 * reviewable in one diff.
 *
 * ## Gestures on the web
 *
 * The gesture names are canon's and describe **intent**, not a touch event.
 * They are declared here and *realized* by the UI children, which map them to
 * whatever the pointing device affords:
 *
 * | Declared | Touch (web mobile) | Pointer (web desktop) |
 * |---|---|---|
 * | `swipeLeading` / `swipeTrailing` | swipe from that edge | hover-revealed action button + the same entry in the context menu |
 * | `contextMenu` | long-press | right-click / `⌃`-click |
 * | `tap` | tap | click |
 * | `prepOverlay` | in the pre-execution overlay | same |
 * | `buttonRow(position)` | inline row, lower position first | same |
 *
 * That mapping is the epic's iPhone↔web-mobile / macOS↔web-desktop contract
 * applied to row actions; nothing in this file renders anything.
 *
 * ## Flag gating
 *
 * `requires` names a feature flag as a **string**. The flag registry — the
 * 28-flag `statusQuoSet` — is #11's lane; this file only records which flag a
 * binding waits on, and `resolveEndeavorCapabilities` drops the bindings whose
 * flag is off. Canon's own words: "Operations gated by a feature flag the user
 * doesn't have are simply not shown."
 */
import { assertNever } from '../library/assertNever'

/** Closed catalog. Every new operation is added here and reviewed. */
export const EndeavorOperation = {
  markComplete: 'markComplete',
  markIncomplete: 'markIncomplete',
  defer: 'defer',
  delete: 'delete',
  archive: 'archive',
  unarchive: 'unarchive',
  startSession: 'startSession',
  execute: 'execute',
  edit: 'edit',
  share: 'share',
  triage: 'triage',
  dismissSuggestion: 'dismissSuggestion',
  /** Navigate to the read-optimized Detail surface for the tapped endeavor. */
  viewDetail: 'viewDetail',
} as const

export type EndeavorOperation =
  (typeof EndeavorOperation)[keyof typeof EndeavorOperation]

/** `EndeavorOperation.allCases`, in canon declaration order. */
export const endeavorOperations: readonly EndeavorOperation[] = [
  EndeavorOperation.markComplete,
  EndeavorOperation.markIncomplete,
  EndeavorOperation.defer,
  EndeavorOperation.delete,
  EndeavorOperation.archive,
  EndeavorOperation.unarchive,
  EndeavorOperation.startSession,
  EndeavorOperation.execute,
  EndeavorOperation.edit,
  EndeavorOperation.share,
  EndeavorOperation.triage,
  EndeavorOperation.dismissSuggestion,
  EndeavorOperation.viewDetail,
]

/** `EndeavorOperation(rawValue:)` — narrows a raw string, or `null`. */
export const endeavorOperationFromRawValue = (
  raw: string,
): EndeavorOperation | null =>
  endeavorOperations.find((operation) => operation === raw) ?? null

/**
 * Where / how a binding is surfaced on a card. `buttonRow` carries a payload,
 * so canon's `OperationGesture` is an enum with an associated value and the
 * port is a discriminated union on `kind` (`RC-24`).
 */
export type OperationGesture =
  | { readonly kind: 'swipeLeading' }
  | { readonly kind: 'swipeTrailing' }
  | { readonly kind: 'contextMenu' }
  | { readonly kind: 'tap' }
  | { readonly kind: 'prepOverlay' }
  /** Inline button row; lower `position` renders first (leftmost). */
  | { readonly kind: 'buttonRow'; readonly position: number }

/** The discriminant alone — canon's `EndeavorCapabilities.GestureKind`. */
export type OperationGestureKind = OperationGesture['kind']

/** Every gesture kind, in canon declaration order. */
export const operationGestureKinds: readonly OperationGestureKind[] = [
  'swipeLeading',
  'swipeTrailing',
  'contextMenu',
  'tap',
  'prepOverlay',
  'buttonRow',
]

export const swipeLeadingGesture: OperationGesture = { kind: 'swipeLeading' }
export const swipeTrailingGesture: OperationGesture = { kind: 'swipeTrailing' }
export const contextMenuGesture: OperationGesture = { kind: 'contextMenu' }
export const tapGesture: OperationGesture = { kind: 'tap' }
export const prepOverlayGesture: OperationGesture = { kind: 'prepOverlay' }

/** `.buttonRow(position:)`. */
export const buttonRowGesture = (position: number): OperationGesture => ({
  kind: 'buttonRow',
  position,
})

/**
 * Standard vs. destructive. Drives default tinting; a binding's own `icon` and
 * `label` still win at the render site.
 */
export const OperationRole = {
  standard: 'standard',
  destructive: 'destructive',
} as const

export type OperationRole = (typeof OperationRole)[keyof typeof OperationRole]

/** Every role, in canon declaration order. */
export const operationRoles: readonly OperationRole[] = [
  OperationRole.standard,
  OperationRole.destructive,
]

/**
 * Accent token for a binding's swipe/button rendering. A small closed set
 * rather than a colour value — canon keeps UI frameworks out of its core for
 * the same reason this tier keeps the DOM out. `null` means "use the role's
 * default" (destructive → red, standard → system default).
 */
export const OperationTint = {
  green: 'green',
  blue: 'blue',
  orange: 'orange',
  red: 'red',
  purple: 'purple',
  gray: 'gray',
} as const

export type OperationTint = (typeof OperationTint)[keyof typeof OperationTint]

/** `OperationTint.allCases`, in canon declaration order. */
export const operationTints: readonly OperationTint[] = [
  OperationTint.green,
  OperationTint.blue,
  OperationTint.orange,
  OperationTint.red,
  OperationTint.purple,
  OperationTint.gray,
]

/** `OperationTint(rawValue:)` — narrows a raw string, or `null`. */
export const operationTintFromRawValue = (raw: string): OperationTint | null =>
  operationTints.find((tint) => tint === raw) ?? null

export interface EndeavorOperationBinding {
  readonly operation: EndeavorOperation
  readonly gesture: OperationGesture
  readonly role: OperationRole
  /** SF Symbol name, mapped onto the web icon set by #6. */
  readonly icon: string
  /** Display title. Localization happens at the render layer, as in canon. */
  readonly label: string
  /** Feature-flag key this binding waits on; `null` = always available. */
  readonly requires: string | null
  /** Accent token; `null` = the role's default. */
  readonly tint: OperationTint | null
}

export const makeEndeavorOperationBinding = (params: {
  readonly operation: EndeavorOperation
  readonly gesture: OperationGesture
  readonly role?: OperationRole
  readonly icon: string
  readonly label: string
  readonly requires?: string | null
  readonly tint?: OperationTint | null
}): EndeavorOperationBinding => ({
  operation: params.operation,
  gesture: params.gesture,
  role: params.role ?? OperationRole.standard,
  icon: params.icon,
  label: params.label,
  requires: params.requires ?? null,
  tint: params.tint ?? null,
})

export interface EndeavorCapabilities {
  /**
   * Ordered bindings. **Order is significant** for `buttonRow` and both swipe
   * gestures, which honour declaration order — so a registry edit that
   * reshuffles this array is a behaviour change, not a tidy-up.
   */
  readonly operations: readonly EndeavorOperationBinding[]
}

export const makeEndeavorCapabilities = (
  operations: readonly EndeavorOperationBinding[],
): EndeavorCapabilities => ({ operations })

/** `EndeavorCapabilities.none` — a display-only vista. */
export const NO_ENDEAVOR_CAPABILITIES: EndeavorCapabilities = { operations: [] }

/**
 * `bindings(for:)` — the bindings matching one gesture kind, in declaration
 * order. `buttonRow` matches on the kind alone, ignoring `position`, exactly as
 * canon's `GestureKind.matches` does.
 */
export const bindingsForGesture = (
  capabilities: EndeavorCapabilities,
  kind: OperationGestureKind,
): readonly EndeavorOperationBinding[] =>
  capabilities.operations.filter((binding) => binding.gesture.kind === kind)

/**
 * Drop every binding whose required flag is off, preserving order.
 *
 * Pure by construction: the flag *state* arrives as `isEnabled`, so this
 * function reads no registry, no storage and no clock. #11 owns the resolver
 * that will be passed in; until it lands a caller can pass `() => false` for
 * the `statusQuoSet` baseline of a dark-launched flag.
 */
export const resolveEndeavorCapabilities = (
  capabilities: EndeavorCapabilities,
  isEnabled: (flag: string) => boolean,
): EndeavorCapabilities => ({
  operations: capabilities.operations.filter(
    (binding) => binding.requires === null || isEnabled(binding.requires),
  ),
})

/**
 * Every distinct flag key the capability set gates on, in first-declaration
 * order — the list #11's registry must be able to answer for this vista.
 */
export const requiredFlagsOf = (
  capabilities: EndeavorCapabilities,
): readonly string[] => {
  const seen: string[] = []
  for (const binding of capabilities.operations) {
    const flag = binding.requires
    if (flag !== null && !seen.includes(flag)) seen.push(flag)
  }
  return seen
}

/** The tint a binding renders at once the role's default is applied. */
export const effectiveTintOf = (
  binding: EndeavorOperationBinding,
): OperationTint | null => {
  if (binding.tint !== null) return binding.tint
  switch (binding.role) {
    case OperationRole.destructive:
      return OperationTint.red
    case OperationRole.standard:
      return null
    default:
      return assertNever(binding.role)
  }
}
