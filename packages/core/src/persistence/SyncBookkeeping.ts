/**
 * The sync bookkeeping every local row carries — canon
 * `Kro/Dependencies/LocalStore/*.swift`, the "Sync Watermarks (epoch
 * milliseconds)" block repeated on every `@Model`.
 *
 * Three columns and one derivation, stated once here rather than five times
 * across the record files, because the whole offline-first contract rests on
 * them agreeing exactly:
 *
 * - `updatedAtEpochMillis` — when this device last wrote the row.
 * - `lastSyncedAtEpochMillis` — when the server last confirmed it. `null` means
 *   never confirmed.
 * - `deletedAtEpochMillis` — the **soft-delete tombstone**. A deleted row is not
 *   removed: the tombstone has to survive long enough to be pushed, or the
 *   deletion silently un-happens on the next pull.
 *
 * `isDirty` is **derived, never stored** (canon: `var isDirty: Bool { guard let
 * lastSynced … return updatedAtEpochMillis > lastSynced }`). Storing it would
 * create a second source of truth that a missed write can desynchronise from
 * the watermarks it is supposed to summarise.
 *
 * ## Two shapes, not one
 *
 * Canon does **not** put all three columns on every row, and this port does not
 * either:
 *
 * | Row | updatedAt | lastSyncedAt | deletedAt | removal mechanism |
 * |---|---|---|---|---|
 * | `EndeavorRecord` | ✅ | ✅ | ✅ | soft delete (tombstone) |
 * | `ProjectRecord` | ✅ | ✅ | ✅ | soft delete (tombstone) |
 * | `DeferRecord` | ✅ | ✅ | — | `pendingDeletion` flag |
 * | `PerformanceRecord` | ✅ | ✅ | — | `pendingDeletion` flag |
 * | `UserProfileRecord` | ✅ | — | — | none (one row, replaced) |
 *
 * The child rows use a boolean rather than a tombstone because they are
 * identified remotely by `serverId`, not by a stable id the server can be told
 * to forget — canon's comment says so directly ("the row stays on disk (needed
 * to retry the remote delete) but is excluded from `toEndeavor`'s hydration").
 * Modelling them with a nullable tombstone would suggest a capability the sync
 * protocol does not have.
 */
import type { EpochMillis } from './EpochMillis'

/** The two watermarks every synced row carries. */
export interface SyncWatermarks {
  readonly updatedAtEpochMillis: EpochMillis
  /** `null` until the server has confirmed this row at least once. */
  readonly lastSyncedAtEpochMillis: EpochMillis | null
}

/** A row that is removed by tombstone rather than by deletion. */
export interface SoftDeletable extends SyncWatermarks {
  /** Non-`null` = tombstone. The row stays on disk; queries skip it. */
  readonly deletedAtEpochMillis: EpochMillis | null
}

/** A child row that is removed by flag rather than by tombstone. */
export interface PendingDeletable extends SyncWatermarks {
  readonly pendingDeletion: boolean
}

/**
 * `var isDirty: Bool` — local changes the server has not confirmed.
 *
 * A never-synced row (`lastSyncedAtEpochMillis === null`) is dirty by
 * definition, which is what makes a freshly created row push on the next sweep
 * without anyone having to remember to flag it.
 *
 * The comparison is **strictly** greater-than, exactly as canon writes it. A
 * row written and confirmed in the same millisecond is *clean*: `>=` would make
 * every synced row permanently dirty and the push sweep would never converge.
 */
export const isRecordDirty = (row: SyncWatermarks): boolean =>
  row.lastSyncedAtEpochMillis === null ||
  row.updatedAtEpochMillis > row.lastSyncedAtEpochMillis

/** Whether a tombstone has been stamped. */
export const isRecordSoftDeleted = (row: SoftDeletable): boolean =>
  row.deletedAtEpochMillis !== null

/**
 * Stamp a local write — canon's `upsertLocal` update branch, which sets
 * `updatedAtEpochMillis` and clears `lastSyncedAtEpochMillis` in the same
 * breath with the comment `// mark dirty`.
 *
 * Clearing the confirmation rather than merely bumping the write is the point:
 * it makes the row dirty even against a clock that went backwards (NTP step,
 * timezone-naive device, a row pulled with a future stamp).
 */
export const markRecordDirty = <Row extends SyncWatermarks>(
  row: Row,
  nowMillis: EpochMillis,
): Row => ({
  ...row,
  updatedAtEpochMillis: nowMillis,
  lastSyncedAtEpochMillis: null,
})

/** Stamp a server confirmation — canon's post-push `lastSyncedAtEpochMillis`. */
export const markRecordSynced = <Row extends SyncWatermarks>(
  row: Row,
  atMillis: EpochMillis,
): Row => ({ ...row, lastSyncedAtEpochMillis: atMillis })

/**
 * `softDelete` — stamp the tombstone **and** mark the row dirty, so the
 * deletion itself is something the next push carries. Canon does all three
 * writes together for exactly that reason.
 */
export const markRecordSoftDeleted = <Row extends SoftDeletable>(
  row: Row,
  nowMillis: EpochMillis,
): Row => ({
  ...row,
  deletedAtEpochMillis: nowMillis,
  updatedAtEpochMillis: nowMillis,
  lastSyncedAtEpochMillis: null,
})

/**
 * The rows a normal query sees: everything without a tombstone.
 *
 * This is the single implementation of acceptance criterion 2 ("queries exclude
 * soft-deleted rows"). Both the IndexedDB store and the in-memory stub call it,
 * so the two cannot drift — a predicate written twice is a predicate that will
 * eventually be written twice differently.
 */
export const liveRecords = <Row extends SoftDeletable>(
  rows: readonly Row[],
): readonly Row[] => rows.filter((row) => !isRecordSoftDeleted(row))

/** The rows a child-row query sees: everything not awaiting a remote DELETE. */
export const livingChildRecords = <Row extends PendingDeletable>(
  rows: readonly Row[],
): readonly Row[] => rows.filter((row) => !row.pendingDeletion)

/** Every dirty row, tombstones included. */
export const dirtyRecords = <Row extends SyncWatermarks>(
  rows: readonly Row[],
): readonly Row[] => rows.filter(isRecordDirty)

/**
 * The rows the push sweep sends — canon's watermark predicate, quoted verbatim
 * at the top of `KroEndeavorRepository.swift`:
 *
 * ```
 * deletedAtEpochMillis == nil
 *   AND (lastSyncedAtEpochMillis == nil OR updatedAtEpochMillis > lastSyncedAtEpochMillis)
 * ```
 *
 * **A canon inconsistency, ported as written and named rather than quietly
 * fixed.** `softDelete` stamps the tombstone and marks the row dirty with the
 * comment "mark dirty so tombstone gets pushed", but this predicate then
 * excludes every tombstoned row — so the tombstone it just prepared is the one
 * thing the sweep will not send. Both halves are canon; they disagree.
 *
 * This port keeps the *stated* predicate here (it is the one Android mirrors,
 * per the same comment) and exposes `dirtyRecords` separately, which does
 * include tombstones. The sync engine (#31) is where the contradiction has to
 * be resolved, because only it knows whether the server takes a tombstone as an
 * upsert or as a DELETE. Naming the choice at the seam is what stops #31 from
 * picking one by accident.
 */
export const pendingSyncRecords = <Row extends SoftDeletable>(
  rows: readonly Row[],
): readonly Row[] => liveRecords(rows).filter(isRecordDirty)

/** The child rows the push sweep sends — canon's `pendingDeletion || serverId == nil`. */
export const pendingSyncChildRecords = <
  Row extends PendingDeletable & { readonly serverId: string | null },
>(
  rows: readonly Row[],
): readonly Row[] =>
  rows.filter((row) => row.pendingDeletion || row.serverId === null)

/**
 * Last-write-wins — the conflict rule the whole offline-first design rests on.
 *
 * Higher `updatedAtEpochMillis` wins. **A tie resolves to `remote`**, matching
 * canon's pull branch, whose comment is unambiguous: *"Cloud is authoritative
 * after a pull — overwrite local."* Resolving a tie to `local` instead would
 * let a device that never advances its clock pin a row forever.
 */
export const lastWriteWins = <Row extends SyncWatermarks>(
  local: Row,
  remote: Row,
): Row =>
  local.updatedAtEpochMillis > remote.updatedAtEpochMillis ? local : remote
