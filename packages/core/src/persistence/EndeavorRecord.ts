/**
 * `EndeavorRecord` — canon `Kro/Dependencies/LocalStore/EndeavorRecord.swift`,
 * plus the two directions of `EndeavorMapper.swift`.
 *
 * The flattened local row: one column per scalar, `tagsCsv` / `shadowsJson` /
 * `repeatConfigJson` for the three collections, the five Kro-enhanced fields,
 * and the three sync watermarks. Column-for-column with the `@Model`, in canon's
 * declaration order, so a reviewer can diff the two files side by side.
 *
 * ## What the row deliberately does NOT carry
 *
 * Acceptance criterion 1 asks for a lossless domain → record → domain
 * round-trip. It is lossless **over the columns the row has**, and the columns
 * it does not have are canon's choice, not an omission here. Enumerated once,
 * because a reader who does not know this will read the round-trip test as
 * broken:
 *
 * | Domain field | Fate | Why |
 * |---|---|---|
 * | `hostedBy` | → `[]` | No column exists. `toEndeavor` decodes `hostedBy = []` unconditionally; hosting is re-derived from the shadows + the reconciliation pass (#12), not stored. |
 * | `list` | → `null` | No column. The row keeps `projectId`; the list itself is looked up from `ProjectStore`. |
 * | `errorMessages` | → `[]` | Transient UI bookkeeping — `Endeavor.ts` says "never persisted". |
 * | `inActivity` | → `false` | Same. |
 * | `tags: []` | → `null` | The CSV column cannot tell an empty list from an absent one. See `RecordEncodings.encodeTagsCsv`. |
 * | `createdAt: null` | → the `now` passed in | The column is non-optional (`var createdAt: Date`); canon fills it with `Date()`. |
 *
 * Everything else — including all five Kro-enhanced fields, all four repeat
 * bases, shadows (empty list included), defers and performances — round-trips
 * exactly, and `__tests__/EndeavorRecord.test.ts` proves it against every #7
 * fixture rather than against a value written for the occasion.
 *
 * ## Two deliberate departures from `EndeavorMapper`
 *
 * 1. **`owner` survives the round trip, in both directions.** Canon's
 *    `EndeavorRecord.from(_:)` takes `ownerUserId` as a *parameter* (the
 *    signed-in user) and ignores `endeavor.owner`; `toEndeavor` then never
 *    writes an `owner` key at all, so a decoded endeavor always has
 *    `owner == nil` even though the row carries `ownerUserId` and
 *    `ownerGroupId`. The columns exist and hold the answer, so this port fills
 *    them from `endeavor.owner` when the caller supplies no override, and
 *    reconstructs `owner` from them on the way back. Canon's override still
 *    wins where a caller passes one, which is the case that matters (adopting
 *    an anonymous row at sign-in). No byte on disk changes; only the two
 *    mapper directions stop dropping a value the schema already stores.
 * 2. **The result is a `Result`, not a throw.** See `PersistenceException`.
 *
 * Neither changes the stored bytes, which is the property #31 depends on.
 */
import type { Endeavor } from '../domain/endeavor/Endeavor'
import { makeEndeavor } from '../domain/endeavor/Endeavor'
import type { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import { endeavorKindFromRawValue } from '../domain/endeavor/EndeavorKind'
import { endeavorStatusFromRawValue } from '../domain/endeavor/EndeavorStatus'
import type { Defer } from '../domain/endeavor/Defer'
import type { Perform } from '../domain/endeavor/Perform'
import type { Owner } from '../domain/shared/Owner'
import { groupOwner, userOwner } from '../domain/shared/Owner'
import type { TimeIntervalSeconds } from '../domain/shared/TimeInterval'
import { type Result, err, ok } from '../library/result'
import { type EpochMillis, epochMillisFromDate } from './EpochMillis'
import {
  type PersistenceException,
  PersistenceExceptions,
} from './PersistenceException'
import {
  decodeRepeatConfigJson,
  decodeShadowsJson,
  decodeTagsCsv,
  encodeRepeatConfigJson,
  encodeShadowsJson,
  encodeTagsCsv,
} from './RecordEncodings'
import type { SoftDeletable } from './SyncBookkeeping'

/** The flattened endeavor row, column-for-column with canon's `@Model`. */
export interface EndeavorRecord extends SoftDeletable {
  /** Unique. Canon: `@Attribute(.unique) var id: String`. */
  readonly id: string
  readonly title: string
  /** `Endeavor.Kind.rawValue`. See `endeavorRecordFromEndeavor` on *which* kind. */
  readonly kind: string
  /** `Endeavor.Status.rawValue`. */
  readonly status: string
  readonly isDraft: boolean
  /** Comma-separated `Tag.rawValue`s, e.g. `"O,D,S"`. */
  readonly tagsCsv: string
  /** JSON-encoded `[Endeavor.Shadow]`. */
  readonly shadowsJson: string | null
  /** JSON-encoded `Endeavor.RepeatConfig`. */
  readonly repeatConfigJson: string | null
  readonly start: Date | null
  readonly due: Date | null
  /** `TimeInterval` — seconds. */
  readonly duration: TimeIntervalSeconds | null
  readonly minimumDuration: TimeIntervalSeconds | null
  readonly maximumDuration: TimeIntervalSeconds | null
  readonly projectId: string | null
  readonly ownerUserId: string | null
  readonly ownerGroupId: string | null
  /** Non-null value is the timestamp of completion. */
  readonly completed: Date | null
  /** Non-optional in canon — the write direction supplies a fallback. */
  readonly createdAt: Date
  readonly updatedAt: Date | null
  /** Kro-enhanced: subjective 1–5 importance. `null` = unrated. */
  readonly value: number | null
  /** Kro-enhanced: subjective 1–5 difficulty. `null` = unrated. */
  readonly effort: number | null
  /** Kro-enhanced: moment after which the endeavor stops being relevant. */
  readonly expiry: Date | null
  /** Kro-enhanced: RGB hex, no alpha. */
  readonly associatedColor: string | null
  /** Kro-enhanced: reward points the endeavor is worth. */
  readonly sessionPoints: number | null
}

/** The relation rows an endeavor hydrates from — canon's `toEndeavor` arguments. */
export interface EndeavorRelations {
  readonly defers: readonly Defer[]
  readonly performances: readonly Perform[]
}

const NO_RELATIONS: EndeavorRelations = { defers: [], performances: [] }

/**
 * `EndeavorRecord.from(_:ownerUserId:lastSyncedAtEpochMillis:)`.
 *
 * `now` is a parameter because this tier has no clock (`types: []`, the
 * precedent #7 set): canon reads `Date()` twice — once for the watermark and
 * once as the `createdAt` fallback — and both are supplied here so a test can
 * state the instant it is asking about.
 *
 * `resolvedKind` is a parameter for a different reason. Canon writes
 * `endeavor.resolvedKind.rawValue`, i.e. the kind **after** source resolution,
 * which needs a `ReconciliationContext` (#12) this tier must not reach for. A
 * caller that has one passes the resolved kind; one that does not gets
 * `endeavor.kind`, which is what resolution returns when nothing overrides it.
 * Making it explicit is what stops a caller from silently storing the
 * *unresolved* kind and having a mirrored reminder come back as the wrong shape.
 */
export const endeavorRecordFromEndeavor = (
  endeavor: Endeavor,
  options: {
    readonly now: Date
    readonly ownerUserId?: string | null
    readonly ownerGroupId?: string | null
    readonly lastSyncedAtEpochMillis?: EpochMillis | null
    readonly deletedAtEpochMillis?: EpochMillis | null
    readonly resolvedKind?: EndeavorKind
  },
): EndeavorRecord => ({
  id: endeavor.id,
  title: endeavor.title,
  kind: options.resolvedKind ?? endeavor.kind,
  status: endeavor.status,
  isDraft: endeavor.isDraft,
  tagsCsv: encodeTagsCsv(endeavor.tags),
  shadowsJson: encodeShadowsJson(endeavor.shadows),
  repeatConfigJson: encodeRepeatConfigJson(endeavor.repeatConfig),
  start: endeavor.start,
  due: endeavor.due,
  duration: endeavor.duration,
  minimumDuration: endeavor.minimumDuration,
  maximumDuration: endeavor.maximumDuration,
  projectId: endeavor.projectId,
  ownerUserId:
    options.ownerUserId ??
    (endeavor.owner?.type === 'user' ? endeavor.owner.userId : null),
  ownerGroupId:
    options.ownerGroupId ??
    (endeavor.owner?.type === 'group' ? endeavor.owner.groupId : null),
  completed: endeavor.completed,
  createdAt: endeavor.createdAt ?? options.now,
  updatedAt: endeavor.updatedAt,
  value: endeavor.value,
  effort: endeavor.effort,
  expiry: endeavor.expiry,
  associatedColor: endeavor.associatedColor,
  sessionPoints: endeavor.sessionPoints,
  updatedAtEpochMillis: epochMillisFromDate(options.now),
  lastSyncedAtEpochMillis: options.lastSyncedAtEpochMillis ?? null,
  deletedAtEpochMillis: options.deletedAtEpochMillis ?? null,
})

/** The owner a row's two id columns describe, or `null` when neither is set. */
export const ownerFromRecord = (record: {
  readonly ownerUserId: string | null
  readonly ownerGroupId: string | null
}): Owner | null => {
  if (record.ownerUserId !== null) return userOwner(record.ownerUserId)
  if (record.ownerGroupId !== null) return groupOwner(record.ownerGroupId)
  return null
}

/**
 * `record.toEndeavor(defers:performances:)`.
 *
 * Fails only on the two columns whose value cannot be defaulted without
 * inventing meaning: `kind` and `status`. Canon fails the same two (its JSON
 * round-trip `throw`s when `Kind(rawValue:)` returns nil) and its one caller
 * treats the failure as *skip this row*, which is why the failure is a value
 * here rather than an exception.
 *
 * Everything else degrades: a malformed `repeatConfigJson` reads as no
 * recurrence, an unrecognised tag letter is dropped, an undecodable shadow entry
 * is skipped. A stricter reader would hide rows the phone still shows.
 */
export const endeavorFromRecord = (
  record: EndeavorRecord,
  relations: EndeavorRelations = NO_RELATIONS,
): Result<Endeavor, PersistenceException> => {
  const kind = endeavorKindFromRawValue(record.kind)
  if (kind === null) {
    return err(
      PersistenceExceptions.malformedRecord(
        `endeavor '${record.id}' has unknown kind '${record.kind}'`,
      ),
    )
  }
  const status = endeavorStatusFromRawValue(record.status)
  if (status === null) {
    return err(
      PersistenceExceptions.malformedRecord(
        `endeavor '${record.id}' has unknown status '${record.status}'`,
      ),
    )
  }

  return ok(
    makeEndeavor({
      id: record.id,
      title: record.title,
      kind,
      status,
      sessionPoints: record.sessionPoints,
      start: record.start,
      duration: record.duration,
      minimumDuration: record.minimumDuration,
      maximumDuration: record.maximumDuration,
      repeatConfig: decodeRepeatConfigJson(record.repeatConfigJson),
      due: record.due,
      defers: relations.defers,
      performances: relations.performances,
      completed: record.completed,
      value: record.value,
      effort: record.effort,
      expiry: record.expiry,
      associatedColor: record.associatedColor,
      projectId: record.projectId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isDraft: record.isDraft,
      tags: decodeTagsCsv(record.tagsCsv),
      shadows: decodeShadowsJson(record.shadowsJson),
      owner: ownerFromRecord(record),
      // No column exists for either — see the table at the top of this file.
      list: null,
      hostedBy: [],
    }),
  )
}
