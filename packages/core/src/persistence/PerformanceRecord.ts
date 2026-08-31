/**
 * `PerformanceRecord` — canon `Kro/Dependencies/LocalStore/
 * PerformanceRecord.swift` and the `Endeavor.Perform → PerformanceRecord` half
 * of `EndeavorMapper.swift`.
 *
 * The other child row. Same `pendingDeletion` removal mechanism as
 * `DeferRecord`, and one column that carries structure:
 * `sessionFragmentsJson`, whose encoding is the single most breakable detail in
 * this module (Apple's *reference* epoch, not ISO-8601 — see
 * `EpochMillis.APPLE_REFERENCE_EPOCH_SECONDS`).
 *
 * ## The quick-complete resolution decision (routed on KC-IS-#10)
 *
 * The routed comment asks this issue to decide, knowingly, what a quick
 * complete stores. The two sources disagree:
 *
 * - **Code** — `PerformanceService.recordQuickComplete` writes
 *   `resolution: "complete"`, `durationSeconds: 0`, `notes: "Quick complete"`,
 *   `startedAt == endedAt == completedAt`, `wasCompletedInSession: false`.
 * - **Spec** — `docs/Features/Performances.md`, the resolution table: *Quick
 *   complete · 0% elapsed · `finished` · **100%** of base.*
 *
 * The decision, and its two halves:
 *
 * **1. This codec never rewrites a resolution.** All three raw values
 * round-trip verbatim in both directions, and an unknown or absent value
 * decodes to `complete` — canon's `Resolution(rawValue:) ?? .complete`. So a
 * row written by KroApple reads back as `complete` *unchanged*. Silently
 * upgrading it to `finished` on read would rewrite another platform's data
 * during a sync, which is the one thing a persistence layer must not do.
 *
 * **2. A web quick complete WRITES `finished`** — `QUICK_COMPLETE_RESOLUTION`
 * below. The web reward formula already shipped that way in #8
 * (`RewardCalculator`, "sliding scale · quick complete, no session → 100 %"
 * asserts `finished` + zero target ⇒ full base), and the doc is the shared
 * cross-platform spec while `recordQuickComplete` is one platform's code. Had
 * this port stored `complete` instead, the web's own formula would award
 * **zero** points for a quick complete — `complete` with elapsed 0 against a
 * non-zero target is the proportional branch — so storing `complete` would be a
 * user-visible bug on this platform, not merely a divergence.
 *
 * **The consequence, stated rather than hidden:** until KroApple's own doc
 * issue is resolved, a quick complete syncs across platforms as a *different
 * resolution value*, and each platform scores it by its own rule. Both score it
 * as a full completion; the raw value differs. `isQuickCompleteRecord` below
 * recognises **both** encodings, so a reader on either side can classify the
 * other's row correctly in the meantime. Watch the upstream KroApple docs issue
 * and collapse this the moment it rules.
 */
import type { Perform, PerformResolution } from '../domain/endeavor/Perform'
import {
  PerformResolution as Resolution,
  makePerform,
  performResolutionFromRawValue,
} from '../domain/endeavor/Perform'
import type { TimeIntervalSeconds } from '../domain/shared/TimeInterval'
import type { EpochMillis } from './EpochMillis'
import {
  decodeSessionFragmentsJson,
  encodeSessionFragmentsJson,
} from './RecordEncodings'
import type { PendingDeletable } from './SyncBookkeeping'

export interface PerformanceRecord extends PendingDeletable {
  /** Server-assigned id; `null` until pushed. */
  readonly serverId: string | null
  /** FK to `EndeavorRecord.id`. */
  readonly endeavorId: string
  readonly startedAt: Date
  readonly endedAt: Date | null
  readonly durationSeconds: TimeIntervalSeconds | null
  readonly notes: string | null
  /** `"complete"` | `"aborted"` | `"finished"`. */
  readonly resolution: string
  /** JSON-encoded `[Perform.SessionFragment]`, Apple reference-epoch dates. */
  readonly sessionFragmentsJson: string
  readonly rewardPoints: number
  readonly followUpNotes: string | null
  readonly completedAt: Date | null
  readonly wasCompletedInSession: boolean
}

/**
 * The resolution a **web** quick complete writes. See the decision at the top
 * of this file; `docs/Features/Performances.md` is the source.
 */
export const QUICK_COMPLETE_RESOLUTION: PerformResolution = Resolution.finished

/**
 * The note canon stamps on a quick-complete performance, verbatim. It is the
 * only field that distinguishes an Apple quick complete from an ordinary
 * zero-duration `complete`, which is why `isQuickCompleteRecord` reads it.
 */
export const QUICK_COMPLETE_NOTES = 'Quick complete'

/**
 * Whether a row describes a quick complete — a task marked done with no session
 * at all — under **either** platform's encoding.
 *
 * - Web: `finished` with no fragments and zero duration.
 * - Apple: `complete` with zero duration and canon's `"Quick complete"` note.
 *
 * This exists so a cross-platform reader classifies the other side's row
 * correctly while the upstream spec/code disagreement is open. It reads the
 * note only for the Apple shape, because on that side the note is the *only*
 * discriminator; a web row is unambiguous from its resolution alone.
 */
export const isQuickCompleteRecord = (record: PerformanceRecord): boolean => {
  const noElapsed =
    (record.durationSeconds ?? 0) === 0 && record.sessionFragmentsJson === '[]'
  if (!noElapsed) return false
  if (record.resolution === Resolution.finished) return true
  return (
    record.resolution === Resolution.complete &&
    record.notes === QUICK_COMPLETE_NOTES
  )
}

/**
 * `PerformanceRecord.from(_:endeavorId:)`, plus the `serverId` /
 * `lastSyncedAtEpochMillis` canon assigns immediately afterwards in
 * `upsertLocalPerformance`.
 *
 * `endedAt` deserves a note: canon's `.from(_:)` leaves it `nil` and only
 * `recordSessionPerformance` fills it (from the last fragment's end). The
 * domain `Perform` has no `endedAt` of its own — it has `date` and `duration` —
 * so the column is passed in rather than derived, and defaults to canon's
 * `nil`. Deriving `date + duration` would look tidier and would silently
 * disagree with the row Apple wrote for the same performance.
 */
export const performanceRecordFromPerform = (
  value: Perform,
  options: {
    readonly endeavorId: string
    readonly nowMillis: EpochMillis
    readonly serverId?: string | null
    readonly endedAt?: Date | null
    readonly lastSyncedAtEpochMillis?: EpochMillis | null
    readonly pendingDeletion?: boolean
  },
): PerformanceRecord => ({
  serverId: options.serverId ?? null,
  endeavorId: options.endeavorId,
  startedAt: value.date,
  endedAt: options.endedAt ?? null,
  durationSeconds: value.duration,
  notes: value.notes,
  resolution: value.resolution,
  sessionFragmentsJson: encodeSessionFragmentsJson(value.sessionFragments),
  rewardPoints: value.rewardPoints,
  followUpNotes: value.followUpNotes,
  completedAt: value.completedAt,
  wasCompletedInSession: value.wasCompletedInSession,
  pendingDeletion: options.pendingDeletion ?? false,
  updatedAtEpochMillis: options.nowMillis,
  lastSyncedAtEpochMillis: options.lastSyncedAtEpochMillis ?? null,
})

/**
 * The hydration direction — canon's two defaults included:
 * `durationSeconds ?? 0` (the domain's `duration` is non-optional) and
 * `Resolution(rawValue:) ?? .complete`.
 *
 * The resolution fallback is why an Apple quick complete is never silently
 * rewritten: an unrecognised value becomes `complete`, and a recognised one
 * (including `"complete"`) is passed through untouched.
 */
export const performFromRecord = (record: PerformanceRecord): Perform =>
  makePerform({
    date: record.startedAt,
    duration: record.durationSeconds ?? 0,
    notes: record.notes,
    resolution:
      performResolutionFromRawValue(record.resolution) ?? Resolution.complete,
    sessionFragments: decodeSessionFragmentsJson(record.sessionFragmentsJson),
    rewardPoints: record.rewardPoints,
    followUpNotes: record.followUpNotes,
    completedAt: record.completedAt,
    wasCompletedInSession: record.wasCompletedInSession,
  })

/**
 * The row's local identity — canon's upsert match tuple for performances,
 * which is nine fields wide:
 *
 * ```swift
 * $0.endeavorId == endeavorId && $0.startedAt == startedAt
 *   && $0.resolution == resolution && $0.durationSeconds == durationSeconds
 *   && $0.notes == notes && $0.rewardPoints == rewardPoints
 *   && $0.followUpNotes == followUpNotes && $0.completedAt == completedAt
 *   && $0.wasCompletedInSession == wasCompletedInSession
 * ```
 *
 * Narrowing it would merge rows canon keeps apart — two 25-minute sessions on
 * the same task that differ only in their notes are two performances, and a
 * `(endeavorId, startedAt)` key would silently collapse them into one. So the
 * whole tuple is the key, and the two fields canon leaves *out*
 * (`sessionFragments`, `pendingDeletion`) are left out here too: that is
 * exactly what makes `upsertLocalPerformance`'s update branch — which rewrites
 * the fragments in place — hit the existing row instead of forking it.
 *
 * `JSON.stringify` over an array, for the injectivity reason spelled out on
 * `deferRecordKey`.
 */
export const performanceRecordKey = (record: PerformanceRecord): string =>
  JSON.stringify([
    record.endeavorId,
    record.startedAt.getTime(),
    record.resolution,
    record.durationSeconds,
    record.notes,
    record.rewardPoints,
    record.followUpNotes,
    record.completedAt === null ? null : record.completedAt.getTime(),
    record.wasCompletedInSession,
  ])
