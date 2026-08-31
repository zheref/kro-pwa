/**
 * Endeavor Detail Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — canon's
 * `EndeavorEditProducer.produceSaveEndeavorEffect` and the four relation
 * features' add/remove effects.
 *
 * Every thunk reads its services from `extra`, takes `now` as an argument, and
 * **never throws**: each resolves `Result<Endeavor, EndeavorDetailException>`,
 * so the slice's `.rejected` arms are defensive fallbacks rather than the error
 * path.
 *
 * ## Offline-first, minus a remote that does not exist yet
 *
 * Canon saves locally, then pushes to Kro Cloud, then fans out one write-back
 * per external host. This build has the first step only — `#31` brings the
 * cloud client and `#33` the first provider adapter — so a save here is the
 * local upsert, and the two host operations refuse with a typed exception
 * rather than reporting a success they cannot deliver. Named, not dropped.
 *
 * ## The matrix refuses before persistence, not after
 *
 * Every relation mutation goes through the domain's guarded `with…` helper. A
 * refusal returns **the same object**, and this file then writes nothing and
 * resolves the unchanged endeavor — so a kind-irrelevant relation edit cannot
 * reach disk even if a caller dispatched it directly.
 */
import {
  type Defer,
  type Endeavor,
  type EndeavorHost,
  type EndeavorRecord,
  type LocalStore,
  type Perform,
  type ReconciliationContext,
  type Result,
  type Shadow,
  deferFromRecord,
  deferRecordFromDefer,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  livingChildRecords,
  makeReconciliationContext,
  ok,
  performFromRecord,
  performanceRecordFromPerform,
  resolvedKind,
  withAddedDefer,
  withAddedPerformance,
  withAddedShadow,
  withRemovedDefer,
  withRemovedPerformance,
  withRemovedShadow,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import type { EndeavorDetailException } from './EndeavorDetailException'
import {
  EndeavorDetailExceptions,
  detailExceptionMessage,
} from './EndeavorDetailException'
import { hostAdapterUnavailableReason } from './EndeavorRelations'

type DetailResult = Result<Endeavor, EndeavorDetailException>

/** Hydrates one stored endeavor with its two child relations. */
const readEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const record = await localStore.endeavors.get(endeavorId)
  if (record === null) return null
  const [deferRecords, performanceRecords] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])
  const hydrated = endeavorFromRecord(record, {
    defers: livingChildRecords(deferRecords).map(deferFromRecord),
    performances: livingChildRecords(performanceRecords).map(performFromRecord),
  })
  return hydrated.ok ? hydrated.value : null
}

/**
 * Rewrites one stored endeavor, preserving its sync watermark — dropping
 * `lastSyncedAtEpochMillis` would present an already-synced row to the next push
 * sweep as if it had never left the device.
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

/**
 * The offline-first save — canon's `produceSaveEndeavorEffect`, local half.
 *
 * The working copy is persisted exactly as given; the reducer resets its dirty
 * baseline to the snapshot that landed, not to whatever the user has typed
 * since.
 */
export const saveEndeavorThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavor: Endeavor; readonly now: Date },
  { extra: ThunkExtra }
>('endeavorDetail/onSaveCompleted', async ({ endeavor, now }, { extra }) => {
  try {
    await persistEndeavor(
      extra.localStore,
      endeavor,
      now,
      makeReconciliationContext({ now }),
    )
    return ok(endeavor)
  } catch (error) {
    return err(
      EndeavorDetailExceptions.localPersistenceFailed(
        detailExceptionMessage(error),
      ),
    )
  }
})

// ---------------------------------------------------------------------------
// Performances — a child table
// ---------------------------------------------------------------------------

/**
 * Log one performance by hand.
 *
 * Two writes: the child row, and the endeavor itself (whose `performances`
 * array the surface reads). The domain helper decides whether there is anything
 * to write at all — a kind the matrix excludes from `performances` returns the
 * same endeavor, and nothing is persisted.
 */
export const addPerformanceThunk = createAsyncThunk<
  DetailResult,
  {
    readonly endeavorId: string
    readonly performance: Perform
    readonly now: Date
  },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onPerformanceAddCompleted',
  async ({ endeavorId, performance, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withAddedPerformance(target, performance)
      if (updated === target) return ok(target)

      await extra.localStore.performances.put(
        performanceRecordFromPerform(performance, {
          endeavorId,
          nowMillis: epochMillisFromDate(now),
        }),
      )
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

/**
 * Remove one performance.
 *
 * The index addresses the **living** child rows for this endeavor — the same
 * order the hydrated `performances` array was built from, which is why the
 * surface's index and the store's agree. An out-of-range index is the domain's
 * no-op, so nothing is written.
 */
export const removePerformanceThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavorId: string; readonly index: number; readonly now: Date },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onPerformanceRemoveCompleted',
  async ({ endeavorId, index, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withRemovedPerformance(target, index)
      if (updated === target) return ok(target)

      const rows = livingChildRecords(
        await extra.localStore.performances.forEndeavor(endeavorId),
      )
      const row = rows[index]
      if (row !== undefined) {
        await extra.localStore.performances.removeLocal(
          row,
          epochMillisFromDate(now),
        )
      }
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Defers — a child table, plus the endeavor's own `due`
// ---------------------------------------------------------------------------

/**
 * Append one defer.
 *
 * `withAddedDefer` records the audit entry **without** moving `due` — canon
 * keeps that split, and the due move belongs to the deferral *operation* (the
 * Find surface's `defer`), not to editing the history. Removing an entry
 * likewise does not undo the due move it recorded.
 */
export const addDeferThunk = createAsyncThunk<
  DetailResult,
  {
    readonly endeavorId: string
    readonly entry: Defer
    readonly now: Date
  },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onDeferAddCompleted',
  async ({ endeavorId, entry, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withAddedDefer(target, entry)
      if (updated === target) return ok(target)

      await extra.localStore.defers.put(
        deferRecordFromDefer(entry, {
          endeavorId,
          now,
          nowMillis: epochMillisFromDate(now),
        }),
      )
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

/** Remove one defer audit entry. `due` is deliberately left where it is. */
export const removeDeferThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavorId: string; readonly index: number; readonly now: Date },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onDeferRemoveCompleted',
  async ({ endeavorId, index, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withRemovedDefer(target, index)
      if (updated === target) return ok(target)

      const rows = livingChildRecords(
        await extra.localStore.defers.forEndeavor(endeavorId),
      )
      const row = rows[index]
      if (row !== undefined) {
        await extra.localStore.defers.removeLocal(
          row,
          epochMillisFromDate(now),
        )
      }
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Shadows — embedded on the endeavor record
// ---------------------------------------------------------------------------

/**
 * Add one shadow.
 *
 * Shadows embed on the endeavor row, so there is one write. `withAddedShadow`
 * is one of canon's **unguarded** ingestion helpers — a provider describing its
 * own item — so the kind gate is the reducer's here, not the domain's, and the
 * reducer applies exactly the same `isRelationEditable(.shadows, …)` call.
 */
export const addShadowThunk = createAsyncThunk<
  DetailResult,
  {
    readonly endeavorId: string
    readonly shadow: Shadow
    readonly now: Date
  },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onShadowAddCompleted',
  async ({ endeavorId, shadow, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withAddedShadow(target, shadow)
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

/** Remove one shadow. Guarded by the matrix inside `withRemovedShadow`. */
export const removeShadowThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavorId: string; readonly index: number; readonly now: Date },
  { extra: ThunkExtra }
>(
  'endeavorDetail/onShadowRemoveCompleted',
  async ({ endeavorId, index, now }, { extra }) => {
    try {
      const target = await readEndeavor(extra.localStore, endeavorId)
      if (target === null) {
        return err(EndeavorDetailExceptions.endeavorNotFound(endeavorId))
      }
      const updated = withRemovedShadow(target, index)
      if (updated === target) return ok(target)
      await persistEndeavor(
        extra.localStore,
        updated,
        now,
        makeReconciliationContext({ now }),
      )
      return ok(updated)
    } catch (error) {
      return err(
        EndeavorDetailExceptions.relationSyncFailed(
          detailExceptionMessage(error),
        ),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Hosts — declared by canon, unbindable on this build
// ---------------------------------------------------------------------------

/**
 * Attach a provider.
 *
 * Canon creates the endeavor's copy **on the provider** and only then records
 * the host and the shadow it returned. There is no provider adapter in this
 * build, so recording the host locally would claim a mirror that does not
 * exist — every later write-back would then aim at a record no provider has.
 * The operation therefore refuses, with the reason the surface already shows
 * beside the candidate.
 */
export const attachHostThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavorId: string; readonly host: EndeavorHost },
  { extra: ThunkExtra }
>('endeavorDetail/onHostAttachCompleted', async ({ host }) =>
  err(
    EndeavorDetailExceptions.hostAdapterUnavailable(
      hostAdapterUnavailableReason(host) ??
        'This provider has no web adapter yet.',
    ),
  ),
)

/**
 * Detach a provider.
 *
 * Symmetrically refused: canon deletes the provider-side copy first, and
 * dropping the host locally without that call would orphan the provider record
 * — the endeavor would look un-mirrored while the copy lived on.
 */
export const detachHostThunk = createAsyncThunk<
  DetailResult,
  { readonly endeavorId: string; readonly host: EndeavorHost },
  { extra: ThunkExtra }
>('endeavorDetail/onHostDetachCompleted', async ({ host }) =>
  err(
    EndeavorDetailExceptions.hostAdapterUnavailable(
      hostAdapterUnavailableReason(host) ??
        'This provider has no web adapter yet.',
    ),
  ),
)
