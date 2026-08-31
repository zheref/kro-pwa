/**
 * `ProjectRecord` — canon `Kro/Dependencies/LocalStore/ProjectRecord.swift`.
 *
 * The other soft-deletable row: same three watermarks and the same derived
 * `isDirty` as `EndeavorRecord`, over a much smaller shape.
 *
 * **Canon's row has no `color` column.** The domain `Project` carries a
 * `color` (canon's `colorHexString`), and the local row does not store it — so
 * a project hydrated from local storage has `color: null` until the Kro Cloud
 * `projects` row supplies it. That is canon's shape, ported as-is and named
 * here rather than quietly widened: adding a column would produce a row Apple's
 * `@Model` cannot read, which is the one thing the "sync round-trips
 * identically" requirement forbids. If the colour turns out to be needed
 * offline, the fix is a schema change on **both** platforms, not a unilateral
 * one here.
 *
 * Canon likewise ships no `Project ⇄ ProjectRecord` mapper — `ProjectRecord` is
 * declared in the schema and written by the sync engine. The two directions
 * below are this port's, built to the same rules as `EndeavorMapper`, so #31
 * has a seam to write against instead of inventing one.
 */
import type { Project } from '../domain/shared/EndeavorList'
import { makeProject } from '../domain/shared/EndeavorList'
import type { Owner } from '../domain/shared/Owner'
import { ownerFromRecord } from './EndeavorRecord'
import { type EpochMillis, epochMillisFromDate } from './EpochMillis'
import type { SoftDeletable } from './SyncBookkeeping'

export interface ProjectRecord extends SoftDeletable {
  /** Unique. Canon: `@Attribute(.unique) var id: String`. */
  readonly id: string
  readonly title: string
  readonly ownerUserId: string | null
  readonly ownerGroupId: string | null
  readonly createdAt: Date
}

/** Domain → row. `createdAt` falls back to `now`, as `EndeavorRecord` does. */
export const projectRecordFromProject = (
  project: Project,
  options: {
    readonly now: Date
    readonly createdAt?: Date | null
    readonly ownerUserId?: string | null
    readonly ownerGroupId?: string | null
    readonly lastSyncedAtEpochMillis?: EpochMillis | null
    readonly deletedAtEpochMillis?: EpochMillis | null
  },
): ProjectRecord => ({
  id: project.id,
  title: project.title,
  ownerUserId: options.ownerUserId ?? null,
  ownerGroupId: options.ownerGroupId ?? null,
  createdAt: options.createdAt ?? options.now,
  updatedAtEpochMillis: epochMillisFromDate(options.now),
  lastSyncedAtEpochMillis: options.lastSyncedAtEpochMillis ?? null,
  deletedAtEpochMillis: options.deletedAtEpochMillis ?? null,
})

/**
 * Row → domain. `color` is `null` because the row has no column for it (see the
 * file header), and `inActivity` is `false` because it is transient UI state
 * that is never persisted — the same rule `Endeavor.inActivity` follows.
 */
export const projectFromRecord = (record: ProjectRecord): Project =>
  makeProject({ id: record.id, title: record.title, color: null })

/** The owner the row's two id columns describe. */
export const projectOwner = (record: ProjectRecord): Owner | null =>
  ownerFromRecord(record)
