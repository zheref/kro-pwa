/**
 * The four card actions the overflow menu offers that the Do logic slice does
 * not already carry: **Defer**, **Skip**, **Delegate** and **Delete**.
 *
 * `KC-IS-#16` shipped the lane math, the rings, Clear Expired, auto-advance and
 * mark-complete. Canon's card menu is five rows, and the remaining four have no
 * Producer behind them — so a UI-only child would ship four menu items that
 * open a flow, take a confirmation, and do nothing. That is worse than not
 * offering them.
 *
 * ## Why they live in `pages/` rather than in `DoProducer.ts`
 *
 * This issue's declared file lane is `features/do/pages/**`, and `DoProducer.ts`
 * is `#16`'s. These four are additive — they register no reducer arm, change no
 * `DoState` field, and are consumed only by this surface — so they can sit
 * inside the lane without editing a file another child owns. The checker's
 * rule is satisfied on the filename (`…Producer.ts`), which is what makes the
 * `createAsyncThunk` legal here (`RC-3`). Folding them into `DoProducer.ts` is
 * a one-file follow-up named in this PR.
 *
 * ## The shape they all share
 *
 * Mutate one endeavor on disk, then **refetch the whole day** and let
 * `withEndeavorsInstalled` replace the snapshot atomically — the same
 * arrangement `clearExpiredThunk` uses, and for the same reason: no
 * intermediate state is ever observable, so a half-applied day cannot be
 * painted. The refetch runs on the failure path too: if the store itself is
 * broken the refetch fails as well and the existing `.fulfilled(err)` arm
 * paints the banner; if only the one write failed, the day comes back
 * unchanged, which is truthful rather than silent.
 *
 * Every one resolves a `Result` and never throws (`RC-7`, `UZF-14`).
 */
import {
  type Endeavor,
  type EndeavorRecord,
  EndeavorStatus,
  type LocalStore,
  type ReconciliationContext,
  type Result,
  deferRecordFromDefer,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  err,
  livingChildRecords,
  makeDefer,
  makeReconciliationContext,
  ok,
  performFromRecord,
  deferFromRecord,
  resolvedKind,
  withDeferred,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../../library/store'
import { type DoException, DoExceptions } from '../DoException'
import { fetchDoEndeavorsThunk } from '../DoProducer'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * One hydrated endeavor, by id.
 *
 * `DoProducer`'s `readStoredEndeavors` reads the whole day because every lane
 * needs it; these four need exactly one row, so they read one — and pay for its
 * two child stores rather than for the day's.
 */
const readEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const record: EndeavorRecord | null = await localStore.endeavors.get(endeavorId)
  if (record === null) return null

  const [defers, performances] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])

  const hydrated = endeavorFromRecord(record, {
    defers: livingChildRecords(defers).map(deferFromRecord),
    performances: livingChildRecords(performances).map(performFromRecord),
  })
  return hydrated.ok ? hydrated.value : null
}

/** `DoProducer.persistEndeavor` — the sync watermark is carried forward. */
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
 * The shared body: read one row, transform it, write it back, refetch the day.
 *
 * The transform is pure and is handed in, so each thunk below is one line of
 * intent — which is what keeps "Skip closes the row as skipped" reviewable
 * without reading four copies of the same I/O.
 */
const mutateAndRefetch = async (
  input: {
    readonly endeavorId: string
    readonly now: Date
    readonly extra: ThunkExtra
    readonly dispatch: (action: unknown) => unknown
    readonly notFound: () => DoException
    readonly failed: (reason: string) => DoException
  },
  transform: (
    endeavor: Endeavor,
    context: ReconciliationContext,
  ) => { readonly endeavor: Endeavor; readonly writeDefer?: Date },
): Promise<Result<Endeavor, DoException>> => {
  const context = makeReconciliationContext({ now: input.now })
  try {
    const target = await readEndeavor(input.extra.localStore, input.endeavorId)
    if (target === null) return err(input.notFound())

    const { endeavor, writeDefer } = transform(target, context)
    await persistEndeavor(input.extra.localStore, endeavor, input.now, context)

    if (writeDefer !== undefined) {
      // The audit row is a CHILD record and lives in its own store: the
      // endeavor codec carries `due`, never the `defers` history.
      await input.extra.localStore.defers.put(
        deferRecordFromDefer(
          makeDefer({ made: input.now, target: writeDefer }),
          {
            endeavorId: endeavor.id,
            now: input.now,
            nowMillis: input.now.getTime(),
          },
        ),
      )
    }

    return ok(endeavor)
  } catch (error) {
    return err(input.failed(messageOf(error)))
  } finally {
    // Always — see the header. A broken store surfaces through the refetch's
    // own exception arm; a healthy one simply re-installs the truth.
    input.dispatch(fetchDoEndeavorsThunk({ now: input.now }))
  }
}

/**
 * **Defer** — move the due moment and record why, at the instant the kit's
 * `DeferPopover` confirmed.
 *
 * `withDeferred` is guarded on the `defers` relation, so deferring a calendar
 * event or a habit is a domain-level no-op rather than a special case here —
 * the row is written back unchanged and the refetch shows the same day.
 */
export const deferEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; target: Date; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorDeferCompleted', async ({ endeavorId, target, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't defer that endeavor: ${reason}`),
    },
    (endeavor) => {
      const moved = withDeferred(endeavor, { target, made: now })
      // `withDeferred` refuses on a guarded kind and returns the row untouched;
      // writing an audit entry for a deferral that did not happen would be a
      // history the schedule contradicts.
      return moved === endeavor
        ? { endeavor }
        : { endeavor: moved, writeDefer: target }
    },
  ),
)

/**
 * **Skip** — canon's `userDidSkipCard`. The row closes as `skipped`, which
 * `hasBeenCompleted` counts, so it leaves every actionable lane; Completed
 * Today requires `closed`, so it does **not** appear there and fills no ring.
 * That asymmetry is canon's and is exactly why skipping is not completing.
 */
export const skipEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorSkipCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't skip that endeavor: ${reason}`),
    },
    (endeavor) => ({
      endeavor: { ...endeavor, status: EndeavorStatus.skipped },
    }),
  ),
)

/**
 * **Delegate** — the row moves to `delegated`.
 *
 * Canon's menu row opens a picker for *who* it was delegated to; there is no
 * person model in this build, so the status change is the whole action and the
 * assignee is named in this PR as the follow-up. A status the design system
 * already draws (`statusDelegated`) is a smaller lie than a menu row that does
 * nothing.
 */
export const delegateEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorDelegateCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't delegate that endeavor: ${reason}`),
    },
    (endeavor) => ({
      endeavor: { ...endeavor, status: EndeavorStatus.delegated },
    }),
  ),
)

/**
 * **Undo a completion** — canon's `userDidTapUndoLastAction`, the primary
 * action on the Active Toast a completion raises.
 *
 * The row returns to `pending` and its completion timestamp is cleared, which
 * is what takes it out of Completed Today, back into its actionable lane, and
 * out of the ring's numerator — the exact inverse of `withOptimisticallyCompleted`.
 * `due` is untouched: undoing a completion is not a reschedule.
 */
export const reopenEndeavorThunk = createAsyncThunk<
  Result<Endeavor, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>('do/onEndeavorReopenCompleted', async ({ endeavorId, now }, api) =>
  mutateAndRefetch(
    {
      endeavorId,
      now,
      extra: api.extra,
      dispatch: api.dispatch,
      notFound: () => DoExceptions.endeavorNotFound(endeavorId),
      failed: (reason) =>
        DoExceptions.unknown(`Couldn't undo that completion: ${reason}`),
    },
    (endeavor) => ({
      endeavor: {
        ...endeavor,
        status: EndeavorStatus.pending,
        completed: null,
      },
    }),
  ),
)

/**
 * **Delete** — the soft delete the store already owns.
 *
 * `softDelete` stamps the tombstone and marks the row dirty, so a later push
 * can still carry the removal to the cloud. A hard delete here would lose that
 * and the row would return on the next pull.
 */
export const deleteEndeavorThunk = createAsyncThunk<
  Result<string, DoException>,
  { endeavorId: string; now: Date },
  { extra: ThunkExtra }
>(
  'do/onEndeavorDeleteCompleted',
  async ({ endeavorId, now }, { extra, dispatch }) => {
    try {
      await extra.localStore.endeavors.softDelete(endeavorId, now.getTime())
      return ok(endeavorId)
    } catch (error) {
      return err(
        DoExceptions.unknown(`Couldn't delete that endeavor: ${messageOf(error)}`),
      )
    } finally {
      dispatch(fetchDoEndeavorsThunk({ now }))
    }
  },
)
