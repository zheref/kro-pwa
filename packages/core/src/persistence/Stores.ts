/**
 * The persistence **ports** — one interface per store, plus the `LocalStore`
 * bundle that names them all.
 *
 * These are the `UZF-16` Service contracts for on-device storage. They live in
 * `@kro/core` because the *contract* is platform-free; the IndexedDB and
 * `localStorage` bindings that satisfy them live in
 * `packages/app/src/services/localStore`, which is the tier allowed to touch
 * DOM globals. Every port ships a live **and** a stubbed implementation there
 * (`RC-33`), and feature tests consume the stubs through `ThunkExtra`.
 *
 * ## Why the shapes look like this
 *
 * They are canon's `KroEndeavorRepository` surface, split by row rather than
 * kept as one 14-closure struct. The split is what the issue asks for
 * (`EndeavorStore`, `ProjectStore`, `DeferStore`, …) and it is also what lets a
 * feature depend on the one store it needs instead of on the whole repository
 * — `UZF-16`'s "segregation by feature, not by domain".
 *
 * Two conventions run through all of them:
 *
 * - **A read excludes removed rows by default.** `all()` skips tombstones and
 *   `pendingDeletion` children; the `…IncludingRemoved` variants exist for the
 *   sync engine, which is the only caller that has any business seeing them.
 *   The predicate itself is `SyncBookkeeping.liveRecords` /
 *   `livingChildRecords` — one implementation, shared by the live store and the
 *   stub, so the two cannot disagree.
 * - **A write is whole-record `put`.** No partial update method exists, because
 *   a partial update is a read-modify-write and IndexedDB gives no way to make
 *   that atomic across a caller's `await`. Callers build the next record with
 *   the pure helpers in `SyncBookkeeping` and put it.
 *
 * Everything returns a `Promise`, except `preferences`, which is KC-IS-#11's
 * `KeyValueStore` — synchronous because a reducer and a Selector read it
 * directly (`RC-47`), and neither can await. See `settings/KeyValueStore.ts`.
 */
import type { EndeavorsLensSnapshot } from '../vistas/EndeavorsLensSnapshot'
import type { PersistedRunningSession } from '../domain/session/PersistedRunningSession'
import type { DeferRecord } from './DeferRecord'
import type { EndeavorRecord } from './EndeavorRecord'
import type { EpochMillis } from './EpochMillis'
import type { PerformanceRecord } from './PerformanceRecord'
import type { KeyValueStore } from '../settings/KeyValueStore'
import type { ProjectRecord } from './ProjectRecord'
import type { UserProfileRecord } from './UserProfileRecord'

/** The surface every id-keyed row store shares. */
export interface KeyedRecordStore<Record> {
  /** Every row a normal query sees — removed rows excluded. */
  all(): Promise<readonly Record[]>
  /** Every row on disk, removed ones included. For the sync engine only. */
  allIncludingRemoved(): Promise<readonly Record[]>
  /** The row, or `null` when absent **or** removed. */
  get(id: string): Promise<Record | null>
  put(record: Record): Promise<void>
  /** Hard delete. Used by the sign-out wipe, never by user-facing removal. */
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

/** `EndeavorRecord` storage — canon's `KroEndeavorRepository`, endeavor half. */
export interface EndeavorStore extends KeyedRecordStore<EndeavorRecord> {
  /**
   * `fetchAll(ownerUserId:)`. `null` means "every owner", matching canon's
   * `ownerUserId == nil ? records : records.filter { … }`.
   */
  allForOwner(ownerUserId: string | null): Promise<readonly EndeavorRecord[]>
  /** `softDelete(_:)` — stamps the tombstone and marks the row dirty. */
  softDelete(id: string, nowMillis: EpochMillis): Promise<void>
  /** Stamps a server confirmation on one row. */
  markSynced(id: string, atMillis: EpochMillis): Promise<void>
  /** `pushPendingToCloud`'s candidate set — canon's watermark predicate. */
  pendingSync(ownerUserId: string | null): Promise<readonly EndeavorRecord[]>
  /** `countAnonymousOrphans()` — live rows with no owner. */
  countAnonymous(): Promise<number>
  /** `adoptAnonymousData(_:)` — returns how many rows were adopted. */
  adoptAnonymous(ownerUserId: string, nowMillis: EpochMillis): Promise<number>
}

/** `ProjectRecord` storage. Same soft-delete mechanics as `EndeavorStore`. */
export interface ProjectStore extends KeyedRecordStore<ProjectRecord> {
  softDelete(id: string, nowMillis: EpochMillis): Promise<void>
  markSynced(id: string, atMillis: EpochMillis): Promise<void>
  pendingSync(): Promise<readonly ProjectRecord[]>
}

/** The surface both child-row stores share — removal by flag, not tombstone. */
export interface ChildRecordStore<Record> {
  /** Living rows for one endeavor — `pendingDeletion` excluded. */
  forEndeavor(endeavorId: string): Promise<readonly Record[]>
  /** Every row for one endeavor, pending-deletion ones included. */
  forEndeavorIncludingRemoved(endeavorId: string): Promise<readonly Record[]>
  /** Every living row across every endeavor. */
  all(): Promise<readonly Record[]>
  put(record: Record): Promise<void>
  /**
   * `removeLocal…` — a never-synced row (no `serverId`) is hard-deleted; a
   * previously-synced one is flagged `pendingDeletion` so the remote DELETE can
   * still be retried. Returns the `serverId` the caller must delete remotely,
   * or `null` when there is nothing to sync.
   */
  removeLocal(record: Record, nowMillis: EpochMillis): Promise<string | null>
  /** `confirmLocal…Removed` — hard-deletes a row whose remote DELETE landed. */
  confirmRemoved(record: Record): Promise<void>
  /** The push sweep's candidate set — `pendingDeletion || serverId == null`. */
  pendingSync(): Promise<readonly Record[]>
  clear(): Promise<void>
}

export type DeferStore = ChildRecordStore<DeferRecord>
export type PerformanceStore = ChildRecordStore<PerformanceRecord>

/**
 * `UserProfileRecord` storage.
 *
 * No soft delete and no `pendingSync`: the profile is replaced wholesale on
 * sign-in rather than reconciled, so there is nothing to tombstone and nothing
 * to push. See `UserProfileRecord` for why.
 */
export interface UserProfileStore {
  get(id: string): Promise<UserProfileRecord | null>
  /** The cached profile, whoever it belongs to. At most one row is expected. */
  current(): Promise<UserProfileRecord | null>
  put(record: UserProfileRecord): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

/**
 * The running-session anchor — canon's `PersistedRunningSession.fileURL`.
 *
 * One document, replaced whole, **written only on a phase transition**. The
 * port has no partial-update method for exactly that reason: there is no
 * sanctioned write that is not a transition, so offering one would invite the
 * per-tick write canon's header comment forbids.
 */
export interface RunningSessionAnchorStore {
  /** The stored anchor, or `null` for no session **and** for a corrupt one. */
  read(): Promise<PersistedRunningSession | null>
  /** Replace the document. Call only from a phase transition. */
  write(session: PersistedRunningSession): Promise<void>
  /** Remove it — the session ended, and `null` is what "ready" means. */
  clear(): Promise<void>
}

/**
 * Versioned lens snapshots — canon's `EndeavorsLensPreferencesClient`, which
 * keeps one JSON file per vista id.
 *
 * The versioning ladder itself is #9's (`encodeLensSnapshot` /
 * `decodeLensSnapshot`); this port only moves the record. A read that cannot
 * decode answers `null` and leaves the bad row in place to be overwritten,
 * which is canon's behaviour: *"Persistence failure is non-fatal: the user's
 * filter UI still works for the current session."*
 */
export interface LensSnapshotStore {
  read(vistaId: string): Promise<EndeavorsLensSnapshot | null>
  write(vistaId: string, snapshot: EndeavorsLensSnapshot): Promise<void>
  clear(vistaId: string): Promise<void>
  clearAll(): Promise<void>
}

/**
 * Every on-device store, in one bundle.
 *
 * This is what the `ThunkExtra` manifest carries — one field rather than eight,
 * because the eight are always wired together (one database, one sign-out) and
 * a Producer that needs two of them should not have to declare both. `RC-21`'s
 * "single closed manifest" is satisfied either way; the bundle is what keeps
 * the manifest readable.
 */
export interface LocalStore {
  readonly endeavors: EndeavorStore
  readonly projects: ProjectStore
  readonly defers: DeferStore
  readonly performances: PerformanceStore
  readonly userProfiles: UserProfileStore
  /**
   * The namespaced key-value store — KC-IS-#11's `KeyValueStore`, not a second
   * port. #11 owns the contract and the `kro:` / `debug.ff.` predicates; this
   * issue owns the live `localStorage` binding, the stub, and the wipe.
   */
  readonly preferences: KeyValueStore
  readonly runningSessionAnchor: RunningSessionAnchorStore
  readonly lensSnapshots: LensSnapshotStore
}

/**
 * What a sign-out removed, so the caller can log it and a test can assert on it
 * rather than on "did not throw".
 */
export interface SignOutWipeReport {
  /** The `kro:` keys that were removed. */
  readonly preferenceKeys: readonly string[]
  /** The `debug.ff.` keys that were deliberately left alone. */
  readonly preservedKeys: readonly string[]
  /** The object stores that were emptied. */
  readonly clearedStores: readonly string[]
}

/**
 * The sign-out wipe — acceptance criterion 3.
 *
 * It is declared here, beside the ports, because it is the one operation that
 * spans all of them: every object store is emptied, every `kro:` preference is
 * removed, and every `debug.ff.` override survives.
 */
export type SignOutWipe = (store: LocalStore) => Promise<SignOutWipeReport>
