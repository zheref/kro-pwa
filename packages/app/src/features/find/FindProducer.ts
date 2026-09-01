/**
 * Find/Tasks Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — canon's
 * `produceFetchEndeavorsEffect`, `produceRestoreLensEffect` /
 * `producePersistLensEffect` (`FindProducer.swift`) and the mutation effects
 * `TasksProducer.swift` fans out.
 *
 * Five thunks, one shape: read services through `extra`, never throw, always
 * resolve a `Result`. None reads a clock — `now` is an argument, so the reducer
 * classifies against the same instant the effect used.
 *
 * ## One entry point for every operation
 *
 * `performEndeavorOperationThunk` is the single door every capability the vista
 * registry declares goes through. That is what makes acceptance criterion 1
 * checkable without a view: the coverage suite walks the registry, dispatches
 * each declared operation, and asserts none of them lands on "unbound". A
 * per-operation thunk set would have made the same assertion a list somebody has
 * to remember to extend.
 *
 * ## Raw pass-through, reconcile at install
 *
 * The fetch returns the **stored** rows untouched; `withEndeavorsInstalled` owns
 * the single reconcile pass (`#12`'s reconcile-before-grouping contract, applied
 * exactly once — the `#49`-round pattern this repo settled on for Do).
 */
import {
  type Defer,
  type Endeavor,
  type EndeavorRecord,
  EndeavorStatus,
  type LocalStore,
  type ReconciliationContext,
  type Result,
  deferFromRecord,
  deferRecordFromDefer,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  liveRecords,
  livingChildRecords,
  makeDefer,
  makeEndeavorsLensSnapshot,
  makeReconciliationContext,
  ok,
  performFromRecord,
  projectFromRecord,
  resolvedKind,
  type ShareOutcome,
  endeavorShareText,
  withDeferred,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import type { FindException } from './FindException'
import { FindExceptions, findExceptionMessage } from './FindException'
import type { EndeavorOperationRequest, FindSurface } from './FindOperations'
import {
  OperationEffect,
  OperationHandling,
  endeavorAfterOperation,
  findOperationBinding,
} from './FindOperations'
import type { FindLensState } from './FindState'

export type { EndeavorOperationRequest } from './FindOperations'

/** A whole-surface snapshot and the instant it was read at. */
export interface FindSnapshot {
  readonly surface: FindSurface
  readonly endeavors: readonly Endeavor[]
  readonly now: Date
}

/** What one operation resolved into, for the reducer to install. */
export type FindOperationOutcome =
  /** The row was rewritten and persisted; install the authoritative copy. */
  | {
      readonly kind: 'mutated'
      readonly surface: FindSurface
      readonly endeavor: Endeavor
    }
  /** The row was soft-deleted; it is gone from the surface. */
  | {
      readonly kind: 'removed'
      readonly surface: FindSurface
      readonly endeavorId: string
    }
  /** The operation belongs elsewhere; the reducer parks it as an intent. */
  | {
      readonly kind: 'intent'
      readonly surface: FindSurface
      readonly operation: EndeavorOperationRequest['operation']
      readonly endeavorId: string
    }
  /**
   * The row's blurb was handed to the platform. Nothing was written — canon's
   * Share leaves the endeavor exactly as it was — so the outcome is the whole
   * result (KC-IS-#71 item 18).
   */
  | {
      readonly kind: 'shared'
      readonly surface: FindSurface
      readonly endeavorId: string
      readonly outcome: ShareOutcome
    }

/**
 * Every stored endeavor, hydrated with its relations.
 *
 * The two child stores are read **once each** and grouped in memory rather than
 * queried per endeavor: a list of a hundred rows would otherwise cost two
 * hundred extra round-trips. A row that fails to decode is skipped, never
 * fatal — canon's caller *"treats the failure as skip this row"*, and one
 * corrupt row must not blank the whole surface.
 */
const readStoredEndeavors = async (
  localStore: LocalStore,
): Promise<readonly Endeavor[]> => {
  const [endeavorRecords, deferRecords, performanceRecords, projectRecords] =
    await Promise.all([
      localStore.endeavors.all(),
      localStore.defers.all(),
      localStore.performances.all(),
      localStore.projects.all(),
    ])

  /*
    The list, looked up (KC-IS-#71 item 11).

    `EndeavorRecord` has no list column — its own header says the row keeps
    `projectId` and *"the list itself is looked up from `ProjectStore`"* — and
    nothing looked it up, so every hydrated endeavor came back with
    `list: null`. `tasksForList(id)` filters on `endeavor.list?.id`, which meant
    every Lists destination in the app honestly showed **Nothing Here** while
    holding rows.

    One read of the whole project table rather than one per endeavor, for the
    same reason the defers and performances above are read whole: a list of a
    hundred rows would otherwise cost a hundred extra round-trips.
  */
  const projectsById = new Map(
    // `liveRecords`, not `livingChildRecords`: a project is a top-level row
    // with a tombstone, not a child row awaiting a remote DELETE.
    liveRecords(projectRecords).map((record) => [
      record.id,
      projectFromRecord(record),
    ]),
  )

  const defersByEndeavor = new Map<string, Defer[]>()
  for (const record of livingChildRecords(deferRecords)) {
    const bucket = defersByEndeavor.get(record.endeavorId) ?? []
    bucket.push(deferFromRecord(record))
    defersByEndeavor.set(record.endeavorId, bucket)
  }

  const performancesByEndeavor = new Map<
    string,
    ReturnType<typeof performFromRecord>[]
  >()
  for (const record of livingChildRecords(performanceRecords)) {
    const bucket = performancesByEndeavor.get(record.endeavorId) ?? []
    bucket.push(performFromRecord(record))
    performancesByEndeavor.set(record.endeavorId, bucket)
  }

  const endeavors: Endeavor[] = []
  for (const record of endeavorRecords) {
    const hydrated = endeavorFromRecord(record, {
      defers: defersByEndeavor.get(record.id) ?? [],
      performances: performancesByEndeavor.get(record.id) ?? [],
      // A `projectId` naming a project that is gone — deleted while the row
      // kept pointing at it — leaves `list: null`, which is what an unfiled row
      // is, never a dangling half-list.
      list:
        record.projectId === null
          ? null
          : (projectsById.get(record.projectId) ?? null),
    })
    if (hydrated.ok) endeavors.push(hydrated.value)
  }
  return endeavors
}

/**
 * Rewrites one stored endeavor, preserving its sync watermark.
 *
 * Dropping `lastSyncedAtEpochMillis` would present an already-synced row to the
 * next push sweep as if it had never left the device.
 */
const persistEndeavor = async (
  localStore: LocalStore,
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): Promise<void> => {
  const existing: EndeavorRecord | null = await localStore.endeavors.get(
    endeavor.id,
  )
  await localStore.endeavors.put(
    endeavorRecordFromEndeavor(endeavor, {
      now,
      lastSyncedAtEpochMillis: existing?.lastSyncedAtEpochMillis ?? null,
      resolvedKind: resolvedKind(endeavor, context),
    }),
  )
}

const findEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const stored = await readStoredEndeavors(localStore)
  return stored.find((endeavor) => endeavor.id === endeavorId) ?? null
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * The surface's fetch. One read for the whole vista; the query and the lens
 * narrow it downstream, so the "no data" and "filtered out" empty states stay
 * distinguishable.
 */
export const fetchFindEndeavorsThunk = createAsyncThunk<
  Result<FindSnapshot, FindException>,
  { readonly surface: FindSurface; readonly now: Date },
  { extra: ThunkExtra }
>('find/onEndeavorsFetchCompleted', async ({ surface, now }, { extra }) => {
  try {
    const stored = await readStoredEndeavors(extra.localStore)
    // Raw pass-through: the install shifter owns the single reconcile pass.
    return ok({ surface, endeavors: stored, now })
  } catch (error) {
    return err(FindExceptions.fetchFailed(findExceptionMessage(error)))
  }
})

/**
 * Restore the persisted lens for a vista id.
 *
 * A miss and a failure both resolve `ok(null)` — canon's restore is *"silent
 * (nil → use defaults)"*, because a filter preference that cannot be read is
 * not a reason to show the user an error over a screen that works fine.
 */
export const restoreFindLensThunk = createAsyncThunk<
  Result<FindLensState | null, FindException>,
  { readonly surface: FindSurface; readonly vistaId: string },
  { extra: ThunkExtra }
>('find/onLensRestoreCompleted', async ({ vistaId }, { extra }) => {
  try {
    const snapshot = await extra.localStore.lensSnapshots.read(vistaId)
    if (snapshot === null) return ok(null)
    return ok({
      hiddenKinds: [...snapshot.hiddenKinds],
      hiddenHosts: [...snapshot.hiddenHosts],
      hiddenStatuses: [...snapshot.hiddenStatuses],
      hiddenComputedStates: [...snapshot.hiddenComputedStates],
      hiddenCalendarIds: [...snapshot.hiddenCalendarIds],
      searchQuery: snapshot.searchQuery,
      showArchived: snapshot.showArchived,
      grouping: snapshot.grouping,
    })
  } catch {
    return ok(null)
  }
})

/**
 * Persist the current lens. Fire-and-forget by design: canon says *"Persistence
 * failure is non-fatal: the user's filter UI still works for the current
 * session"*, so a failure resolves `ok` and nothing reaches the surface.
 */
export const persistFindLensThunk = createAsyncThunk<
  Result<null, FindException>,
  {
    readonly surface: FindSurface
    readonly vistaId: string
    readonly lens: FindLensState
  },
  { extra: ThunkExtra }
>('find/onLensPersistCompleted', async ({ vistaId, lens }, { extra }) => {
  try {
    await extra.localStore.lensSnapshots.write(
      vistaId,
      makeEndeavorsLensSnapshot(lens),
    )
  } catch {
    // Deliberately swallowed — see the doc comment.
  }
  return ok(null)
})

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * The defer audit row that goes with a `defer`, or `null` when the domain
 * refused the edit (the matrix said this kind has no due date to push).
 */
const newDeferOf = (
  before: Endeavor,
  after: Endeavor,
  request: EndeavorOperationRequest,
): Defer | null => {
  if (after.defers.length === before.defers.length) return null
  return makeDefer({
    made: request.now,
    reason: request.deferReason ?? null,
    target: request.deferTarget ?? request.now,
  })
}

/**
 * Perform one vista-declared operation.
 *
 * Local effects write through `extra.localStore`; everything else resolves into
 * an intent the reducer parks for its owner. Both paths resolve `ok` — an
 * operation that is *handled elsewhere* has not failed, and reporting it as a
 * failure would make the surface show an error for a working hand-off.
 */
export const performEndeavorOperationThunk = createAsyncThunk<
  Result<FindOperationOutcome, FindException>,
  EndeavorOperationRequest,
  { extra: ThunkExtra }
>('find/onEndeavorOperationCompleted', async (request, { extra }) => {
  const binding = findOperationBinding(request.operation)

  if (binding.handling === OperationHandling.intent) {
    return ok({
      kind: 'intent',
      surface: request.surface,
      operation: request.operation,
      endeavorId: request.endeavorId,
    })
  }

  try {
    const context = makeReconciliationContext({ now: request.now })
    const target = await findEndeavor(extra.localStore, request.endeavorId)
    if (target === null) {
      return err(FindExceptions.endeavorNotFound(request.endeavorId))
    }

    if (binding.effect === OperationEffect.share) {
      // Writes nothing: canon's Share hands the row's blurb to the platform
      // and leaves the endeavor exactly as it was.
      const outcome = await extra.shareService.share(
        endeavorShareText(target.title),
      )
      return ok({
        kind: 'shared',
        surface: request.surface,
        endeavorId: target.id,
        outcome,
      })
    }

    if (binding.effect === OperationEffect.softDelete) {
      await extra.localStore.endeavors.softDelete(
        target.id,
        epochMillisFromDate(request.now),
      )
      return ok({
        kind: 'removed',
        surface: request.surface,
        endeavorId: target.id,
      })
    }

    const updated = endeavorAfterOperation(target, request)
    await persistEndeavor(extra.localStore, updated, request.now, context)

    // A defer is two rows: the endeavor's moved `due` above, and the audit
    // entry in its own child table. The entry is written only when the domain
    // actually appended one, so a matrix-refused defer writes neither.
    const appended = newDeferOf(target, updated, request)
    if (appended !== null) {
      await extra.localStore.defers.put(
        deferRecordFromDefer(appended, {
          endeavorId: updated.id,
          now: request.now,
          nowMillis: epochMillisFromDate(request.now),
        }),
      )
    }

    return ok({ kind: 'mutated', surface: request.surface, endeavor: updated })
  } catch (error) {
    return err(FindExceptions.operationFailed(findExceptionMessage(error)))
  }
})

/** Which bulk operation the ellipsis menu raised. */
export type FindBulkOperation = 'delete' | 'archive'

export interface FindBulkRequest {
  readonly surface: FindSurface
  readonly operation: FindBulkOperation
  /** Exactly the rows currently visible — the count the menu label shows. */
  readonly endeavorIds: readonly string[]
  readonly now: Date
}

/**
 * Delete-all-visible / Archive-all-visible.
 *
 * Canon's ellipsis menu raises these with **no confirmation step** — the
 * destructive *role* on "Delete all visible (N)" is the only affordance, and
 * both apply immediately and optimistically. That is ported as-is rather than
 * "improved" with a confirm dialog: adding one would be a new business rule and
 * would put the two platforms' Find menus out of step (named in the PR body).
 *
 * Rows are written one at a time and the first failure stops the walk, so a
 * partial result is reported as a failure rather than silently claimed as
 * success. The surface has already applied the whole set optimistically; the
 * next fetch reconciles whatever actually landed.
 */
export const performBulkOperationThunk = createAsyncThunk<
  Result<FindBulkRequest, FindException>,
  FindBulkRequest,
  { extra: ThunkExtra }
>('find/onBulkOperationCompleted', async (request, { extra }) => {
  try {
    const context = makeReconciliationContext({ now: request.now })
    const nowMillis = epochMillisFromDate(request.now)
    const stored = await readStoredEndeavors(extra.localStore)
    const byId = new Map(stored.map((endeavor) => [endeavor.id, endeavor]))

    for (const endeavorId of request.endeavorIds) {
      const target = byId.get(endeavorId)
      if (target === undefined) continue
      if (request.operation === 'delete') {
        await extra.localStore.endeavors.softDelete(endeavorId, nowMillis)
      } else {
        await persistEndeavor(
          extra.localStore,
          { ...target, status: EndeavorStatus.closed },
          request.now,
          context,
        )
      }
    }
    return ok(request)
  } catch (error) {
    return err(FindExceptions.bulkOperationFailed(findExceptionMessage(error)))
  }
})
