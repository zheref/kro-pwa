/**
 * The operations catalog — every `EndeavorOperation` a vista can declare,
 * paired with the concrete thing this repo does about it.
 *
 * `EndeavorCapabilities` (#9) is the *declaration*: a vista says a row can be
 * completed, deferred, archived, started, triaged. Canon realizes those in
 * `KroUI`'s `endeavorOperations(_:on:enabledFlags:onOperation:)` modifier, which
 * hands the operation up to the Screen, which routes it — to a local mutation,
 * or to `MainFeature` as a delegate. This file is that routing table, lifted out
 * of any view so it is **testable without one**: the capability-coverage suite
 * walks every vista in the registry and asserts that no declared operation is
 * unbound (acceptance criterion 1).
 *
 * ## Two handlings, and why the split is not a shortcut
 *
 * - **`local`** — the mutation is this feature's own: it rewrites the endeavor
 *   row through `extra.localStore` and the domain's guarded `with…` helpers.
 *   `FindProducer.performEndeavorOperationThunk` executes it.
 * - **`intent`** — the action belongs to *another* feature (a focus session,
 *   Triage, the Detail/Edit surface, Do's suggestion lane) or to a Service this
 *   repo has not stood up yet. A slice may not import a sibling slice (`RC-20`),
 *   and a Producer may not reach into one either, so the operation resolves into
 *   an **intent event** parked on the slice and consumed by whoever owns it. The
 *   queue is drained by a named event (`childIntentDelegatedConsumed`), never by
 *   a view noticing a boolean and resetting it (`UZF-3`, and the one-shot rule in
 *   `spec/architecture/web.md` § 4).
 *
 * An intent is **not** a silent drop: the operation still resolves `ok`, the
 * intent is observable through `selectFindPendingIntents`, and the coverage test
 * asserts every one of them lands. What each intent's consumer is (and which are
 * not built yet) is named per entry below and in the PR body.
 */
import {
  type Endeavor,
  type EndeavorOperation,
  EndeavorOperation as Operation,
  EndeavorStatus,
  type EndeavorsVista,
  assertNever,
  endeavorOperations,
  withDeferred,
} from '@kro/core'

/** Which of the two browse surfaces a request came from. */
export const FindSurface = {
  /** The `.find` vista — the all-endeavors browser. */
  find: 'find',
  /** Whichever `.tasks*` vista the All Tasks surface is installed with. */
  tasks: 'tasks',
} as const

export type FindSurface = (typeof FindSurface)[keyof typeof FindSurface]

/** Every surface key, for a suite that walks both. */
export const findSurfaces: readonly FindSurface[] = [
  FindSurface.find,
  FindSurface.tasks,
]

/** How this repo answers one declared operation. */
export const OperationHandling = {
  /** This feature persists it itself. */
  local: 'local',
  /** It resolves into a cross-feature intent event. */
  intent: 'intent',
} as const

export type OperationHandling =
  (typeof OperationHandling)[keyof typeof OperationHandling]

/** What a `local` operation writes to the installed row. */
export const OperationEffect = {
  /** Close the row and stamp `completed` (the backdate lands here). */
  complete: 'complete',
  /** Reopen a closed row: back to pending, completion timestamp cleared. */
  reopen: 'reopen',
  /** Move `due` and append the `Defer` audit entry, matrix-guarded. */
  defer: 'defer',
  /** Soft delete — tombstone the record, drop the row from the pool. */
  softDelete: 'softDelete',
  /** Archive: canon's Find sets `status = .closed` with no completion stamp. */
  archive: 'archive',
  /** Unarchive: back to pending, leaving any completion timestamp alone. */
  unarchive: 'unarchive',
} as const

export type OperationEffect =
  (typeof OperationEffect)[keyof typeof OperationEffect]

export interface FindOperationBinding {
  readonly operation: EndeavorOperation
  readonly handling: OperationHandling
  /** The write, for a `local` binding; `null` for an intent. */
  readonly effect: OperationEffect | null
  /**
   * Who consumes the intent, for an `intent` binding; `null` for a local one.
   * Free text on purpose — it is documentation the coverage report prints, not
   * a key anything dispatches on.
   */
  readonly consumer: string | null
}

const local = (
  operation: EndeavorOperation,
  effect: OperationEffect,
): FindOperationBinding => ({
  operation,
  handling: OperationHandling.local,
  effect,
  consumer: null,
})

const intent = (
  operation: EndeavorOperation,
  consumer: string,
): FindOperationBinding => ({
  operation,
  handling: OperationHandling.intent,
  effect: null,
  consumer,
})

/**
 * The whole catalog, keyed by operation.
 *
 * `Record<EndeavorOperation, …>` makes it **structurally total**: adding a case
 * to the closed `EndeavorOperation` catalog in `@kro/core` fails this file's
 * typecheck before it fails a test. The coverage suite then proves the same
 * thing at runtime against the vista registry, so a capability declared by a
 * vista that this table forgot cannot reach a user as a dead gesture.
 */
export const findOperationBindings: Record<
  EndeavorOperation,
  FindOperationBinding
> = {
  [Operation.markComplete]: local(Operation.markComplete, OperationEffect.complete),
  [Operation.markIncomplete]: local(Operation.markIncomplete, OperationEffect.reopen),
  [Operation.defer]: local(Operation.defer, OperationEffect.defer),
  [Operation.delete]: local(Operation.delete, OperationEffect.softDelete),
  [Operation.archive]: local(Operation.archive, OperationEffect.archive),
  [Operation.unarchive]: local(Operation.unarchive, OperationEffect.unarchive),
  // The focus-session domain (#8) exists; the session *surface* that owns
  // starting one does not live in this lane, and a slice never imports a
  // sibling slice.
  [Operation.startSession]: intent(Operation.startSession, 'session surface'),
  // Do's pre-execution overlay "Start now" — the same hand-off as
  // `startSession`, raised from the overlay rather than a row gesture.
  [Operation.execute]: intent(Operation.execute, 'session surface (Do prep overlay)'),
  // The editor is the Endeavor Detail slice's, registered beside this one.
  [Operation.edit]: intent(Operation.edit, 'endeavorDetail slice'),
  // Web has `navigator.share`, but a platform capability is a Service behind
  // `ThunkExtra` (`RC-6`) and none is wired yet. Named rather than dropped.
  [Operation.share]: intent(Operation.share, 'share Service (not wired yet)'),
  [Operation.triage]: intent(Operation.triage, 'triage surface'),
  // The suggestion lane is Do's own state; Find can only ask.
  [Operation.dismissSuggestion]: intent(Operation.dismissSuggestion, 'do slice'),
  [Operation.viewDetail]: intent(Operation.viewDetail, 'endeavorDetail slice'),
}

/** The binding for one operation. Total by construction. */
export const findOperationBinding = (
  operation: EndeavorOperation,
): FindOperationBinding => findOperationBindings[operation]

/** Whether this feature persists the operation itself. */
export const isLocallyHandledOperation = (
  operation: EndeavorOperation,
): boolean =>
  findOperationBinding(operation).handling === OperationHandling.local

/**
 * Every distinct operation a set of vistas declares, in first-declaration
 * order — the exact set the coverage assertion must find a binding for.
 */
export const vistaDeclaredOperations = (
  vistas: readonly EndeavorsVista[],
): readonly EndeavorOperation[] => {
  const seen: EndeavorOperation[] = []
  for (const vista of vistas) {
    for (const binding of vista.capabilities.operations) {
      if (!seen.includes(binding.operation)) seen.push(binding.operation)
    }
  }
  return seen
}

/**
 * The coverage assertion's subject: declared operations with no entry in the
 * catalog. **Always empty** — a non-empty result is the defect.
 */
export const unboundVistaOperations = (
  vistas: readonly EndeavorsVista[],
): readonly EndeavorOperation[] =>
  vistaDeclaredOperations(vistas).filter(
    (operation) => findOperationBindings[operation] === undefined,
  )

/** Every operation in the closed catalog that this table did not bind. */
export const unboundOperations = (): readonly EndeavorOperation[] =>
  endeavorOperations.filter(
    (operation) => findOperationBindings[operation] === undefined,
  )

// ---------------------------------------------------------------------------
// The request, and the effect it has on a row
// ---------------------------------------------------------------------------

/**
 * Everything one operation can need. The optional fields belong to one effect
 * each, so a request that carries none is still valid for the ten operations
 * that need none.
 */
export interface EndeavorOperationRequest {
  readonly surface: FindSurface
  readonly operation: EndeavorOperation
  readonly endeavorId: string
  readonly now: Date
  /**
   * `markComplete` only — when the work was actually done. Separate from `now`
   * because the user may have **backdated** it, and the row must record when it
   * was done, not when it was saved.
   */
  readonly completionDate?: Date
  /** `defer` only — the moment the endeavor is pushed to. */
  readonly deferTarget?: Date
  /** `defer` only — why, when the user gave a reason. */
  readonly deferReason?: string | null
}

/**
 * The row after one operation — the **single** definition of what each local
 * effect does.
 *
 * The reducer applies it optimistically the moment the request is dispatched,
 * and the Producer applies the same function before persisting, so the row the
 * user sees and the row that lands on disk cannot drift. An `intent` operation
 * and a `softDelete` both return the endeavor untouched: the first is somebody
 * else's write, the second removes the row rather than rewriting it.
 *
 * `defer` goes through the domain's guarded `withDeferred`, so a kind the
 * matrix says has no due date gets **the same object back** — the refusal is
 * the domain's, not a check restated here.
 */
export const endeavorAfterOperation = (
  endeavor: Endeavor,
  request: EndeavorOperationRequest,
): Endeavor => {
  const { effect } = findOperationBinding(request.operation)
  switch (effect) {
    case OperationEffect.complete:
      return {
        ...endeavor,
        status: EndeavorStatus.closed,
        completed: request.completionDate ?? request.now,
      }
    case OperationEffect.reopen:
      return { ...endeavor, status: EndeavorStatus.pending, completed: null }
    case OperationEffect.defer:
      return withDeferred(endeavor, {
        target: request.deferTarget ?? request.now,
        made: request.now,
        reason: request.deferReason ?? null,
      })
    case OperationEffect.archive:
      // Canon's Find archives by closing the row — deliberately with **no**
      // completion stamp: archiving is a filing action, not an achievement.
      return { ...endeavor, status: EndeavorStatus.closed }
    case OperationEffect.unarchive:
      return { ...endeavor, status: EndeavorStatus.pending }
    default:
      return endeavor
  }
}

/** Whether the operation removes the row rather than rewriting it. */
export const isRemovingOperation = (operation: EndeavorOperation): boolean =>
  findOperationBinding(operation).effect === OperationEffect.softDelete

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

/**
 * A cross-feature request, parked in slice state until its owner consumes it.
 *
 * `id` is a slice-issued sequence number, not a timestamp: it needs to be
 * unique and orderable, and a reducer has no clock (`RC-4`). The consumer
 * acknowledges by id, so two identical requests for the same row are two
 * distinct intents rather than one that silently swallows the second.
 */
export interface EndeavorIntent {
  readonly id: number
  readonly operation: EndeavorOperation
  readonly endeavorId: string
  readonly surface: FindSurface
}

/**
 * Whether an operation resolves into an intent rather than a local write.
 * `assertNever` on the handling keeps this honest if a third handling is ever
 * added.
 */
export const isIntentOperation = (operation: EndeavorOperation): boolean => {
  const { handling } = findOperationBinding(operation)
  switch (handling) {
    case OperationHandling.intent:
      return true
    case OperationHandling.local:
      return false
    default:
      return assertNever(handling)
  }
}
