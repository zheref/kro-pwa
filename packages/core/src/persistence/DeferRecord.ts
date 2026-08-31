/**
 * `DeferRecord` — canon `Kro/Dependencies/LocalStore/DeferRecord.swift` and the
 * `Endeavor.Defer → DeferRecord` half of `EndeavorMapper.swift`.
 *
 * A child row: one deferral, foreign-keyed to its endeavor by `endeavorId`. Two
 * things about it differ from the parent row and are load-bearing.
 *
 * **1. Removal is a flag, not a tombstone.** `pendingDeletion` means the user
 * removed the deferral locally and the remote DELETE has not been confirmed.
 * The row stays on disk so the delete can be retried, and is excluded from
 * hydration — canon's `toEndeavor` filters `!$0.pendingDeletion`. The reason it
 * is a flag rather than a `deletedAtEpochMillis` is that a child row is
 * identified remotely by `serverId`, which a never-pushed row does not have; a
 * tombstone for a row the server has never heard of is not something the
 * protocol can express. Canon's `removeLocalDefer` says it directly: a row with
 * no `serverId` is hard-deleted immediately.
 *
 * **2. `target` is optional on the row and required in the domain.**
 * `Endeavor.Defer.target` is a non-optional `Date`; the column is `Date?`.
 * Canon's hydration writes `iso(d.target ?? d.made)` — an absent target falls
 * back to the moment the deferral was *made*. That is preserved here rather
 * than "fixed" to a failure: a legacy row with no target still describes a real
 * deferral, and refusing to hydrate it would hide the whole endeavor.
 */
import type { Defer } from '../domain/endeavor/Defer'
import { makeDefer } from '../domain/endeavor/Defer'
import type { EpochMillis } from './EpochMillis'
import type { PendingDeletable } from './SyncBookkeeping'

export interface DeferRecord extends PendingDeletable {
  /** Server-assigned id; `null` until this row has been pushed. */
  readonly serverId: string | null
  /** FK to `EndeavorRecord.id`. */
  readonly endeavorId: string
  readonly made: Date
  readonly reason: string | null
  /** The date the endeavor was pushed to. `null` on legacy rows. */
  readonly target: Date | null
}

/**
 * `DeferRecord.from(_:endeavorId:)`, with the extra arguments canon sets
 * immediately after construction in `upsertLocalDefer` (`serverId`, and the
 * `lastSyncedAtEpochMillis` that a server-assigned id implies).
 */
export const deferRecordFromDefer = (
  value: Defer,
  options: {
    readonly endeavorId: string
    readonly now: Date
    readonly nowMillis: EpochMillis
    readonly serverId?: string | null
    readonly lastSyncedAtEpochMillis?: EpochMillis | null
    readonly pendingDeletion?: boolean
  },
): DeferRecord => ({
  serverId: options.serverId ?? null,
  endeavorId: options.endeavorId,
  made: value.made,
  reason: value.reason,
  target: value.target,
  pendingDeletion: options.pendingDeletion ?? false,
  updatedAtEpochMillis: options.nowMillis,
  lastSyncedAtEpochMillis: options.lastSyncedAtEpochMillis ?? null,
})

/** The hydration direction — canon's `target ?? made` fallback included. */
export const deferFromRecord = (record: DeferRecord): Defer =>
  makeDefer({
    made: record.made,
    reason: record.reason,
    target: record.target ?? record.made,
  })

/**
 * The row's local identity — canon's upsert match tuple, verbatim:
 * `$0.endeavorId == endeavorId && $0.made == made && $0.target == target`.
 *
 * SwiftData gives every `@Model` an implicit persistent identifier, so canon
 * never needs to name a key. IndexedDB does need one, and inventing a
 * synthetic id would break canon's semantics: `upsertLocalDefer` deliberately
 * *updates in place* when those three fields match (only `reason` and the
 * watermarks change), and a random key would insert a duplicate instead.
 *
 * Deriving the key from the match tuple makes `put` do exactly what canon's
 * fetch-then-update does, with no read-modify-write race. `reason` is
 * deliberately **not** in the key, which is precisely why editing a reason
 * updates the row rather than forking it.
 *
 * The key is local-only and never crosses the wire — the server keys on
 * `serverId` — so it adds no column to the synced shape.
 *
 * It is built with `JSON.stringify` over an array rather than by joining on a
 * separator character: an `endeavorId` mirrored from an external provider is an
 * opaque string that may contain any character, so a `join('|')` key would let
 * two distinct rows collide — and therefore silently overwrite each other — the
 * first time one did. JSON escaping makes the encoding injective.
 */
export const deferRecordKey = (record: DeferRecord): string =>
  JSON.stringify([
    record.endeavorId,
    record.made.getTime(),
    record.target === null ? null : record.target.getTime(),
  ])
