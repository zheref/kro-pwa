/**
 * `EndeavorsLensSnapshot` — canon `KroCore/Vistas/EndeavorsLensSnapshot.swift`,
 * and the schema-evolution contract in `docs/Features/EndeavorsVista.md`
 * ("Saved-preference schema evolution").
 *
 * The persistable subset of a lens: only the **user-mutable** fields, so what
 * goes to storage stays small and stable across runtime changes to the lens's
 * own config (`sort`, `exposes`, which belong to the vista and are never
 * persisted).
 *
 * ## The versioning contract, restated exactly
 *
 * Every save carries a `schemaVersion` stamp, and there are two kinds of change:
 *
 * 1. **Additive** — a new optional setting. Decode it with a default and **do
 *    not** bump the version. An older save gets the default; a newer save read
 *    by an older build simply drops the keys it does not know. This is the
 *    common case and needs nothing from the ladder below.
 * 2. **Breaking** — removing, renaming, or changing the *meaning* of a stored
 *    setting. This bumps `CURRENT_LENS_SNAPSHOT_VERSION`, appends one
 *    `LensSnapshotUpgrade` to `lensSnapshotUpgrades` that maps the old shape
 *    onto the new one, and ships a test feeding a pre-bump save and asserting
 *    the upgraded shape.
 *
 * The upgrade runs **once**, in place, the first time an old save is read; the
 * value is then re-encoded at the current version, so every subsequent read
 * round-trips with no step applied. `decodeLensSnapshot` reports which steps it
 * ran precisely so a test can prove "exactly once".
 *
 * ## What canon has shipped, and what that means here
 *
 * Canon has made **no breaking change to date** — its `migrate(from:)` is an
 * explicit no-op, and `currentSchemaVersion` is `1`. So the live ladder has one
 * step, `0 → 1`, which normalizes a *pre-versioning* save (one written before
 * the `schemaVersion` key existed) and remaps no field, because canon states
 * such blobs are already field-compatible with v1. That step is real and
 * exercised; the ladder's ability to chain a genuine rename is proven by
 * injecting a step into `upgradeLensSnapshotRecord`, which is why the
 * `upgrades` parameter exists.
 *
 * ## What the port changes, and why
 *
 * Swift gets versioned decoding from a custom `init(from:)`; TypeScript has no
 * `Codable`, so the wire form is spelled out as `LensSnapshotRecord` (a plain
 * JSON object) and the two directions are explicit functions. Three behaviours
 * are carried over deliberately:
 *
 * - **`schemaVersion` is never a settable field on the value.** It is read
 *   transiently during decode to drive the ladder and written unconditionally
 *   at the current version on encode, so no caller can inject or persist an
 *   arbitrary version.
 * - **A corrupt blob is "no snapshot", not a throw.** `decodeLensSnapshot`
 *   returns `null`; the storage client's contract is that defaults are used
 *   silently and the bad file is left to be overwritten.
 * - **Unknown enum members are dropped, not fatal.** Swift's `Set<Endeavor.Kind>`
 *   decode would throw on an unrecognized raw value and take the whole snapshot
 *   with it. Here each member is narrowed through its own `…FromRawValue` and
 *   an unrecognized one is skipped, so a save written by a newer build (or one
 *   naming a since-removed case) still restores everything it can.
 */
import type { EndeavorHost } from '../domain/endeavor/EndeavorHost'
import {
  endeavorHostFromRawValue,
  endeavorHosts,
} from '../domain/endeavor/EndeavorHost'
import type { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import {
  endeavorKindFromRawValue,
  endeavorKinds,
} from '../domain/endeavor/EndeavorKind'
import type { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import {
  endeavorStatusFromRawValue,
  endeavorStatuses,
} from '../domain/endeavor/EndeavorStatus'
import type { EndeavorComputedState } from './EndeavorComputedState'
import {
  endeavorComputedStateFromRawValue,
  endeavorComputedStates,
} from './EndeavorComputedState'
import type { EndeavorGroupingCriteria } from './EndeavorCriteria'
import {
  EndeavorGroupingCriteria as Grouping,
  endeavorGroupingCriteriaFromRawValue,
} from './EndeavorCriteria'

/**
 * The version this build writes. Bump **only** for a breaking change, and add
 * the matching `LensSnapshotUpgrade` in the same commit — the two are asserted
 * to agree in the test suite.
 */
export const CURRENT_LENS_SNAPSHOT_VERSION = 1

export interface EndeavorsLensSnapshot {
  readonly hiddenKinds: ReadonlySet<EndeavorKind>
  readonly hiddenHosts: ReadonlySet<EndeavorHost>
  readonly hiddenStatuses: ReadonlySet<EndeavorStatus>
  readonly hiddenComputedStates: ReadonlySet<EndeavorComputedState>
  readonly hiddenCalendarIds: ReadonlySet<string>
  readonly searchQuery: string
  readonly showArchived: boolean
  readonly grouping: EndeavorGroupingCriteria
}

export const makeEndeavorsLensSnapshot = (params?: {
  readonly hiddenKinds?: Iterable<EndeavorKind>
  readonly hiddenHosts?: Iterable<EndeavorHost>
  readonly hiddenStatuses?: Iterable<EndeavorStatus>
  readonly hiddenComputedStates?: Iterable<EndeavorComputedState>
  readonly hiddenCalendarIds?: Iterable<string>
  readonly searchQuery?: string
  readonly showArchived?: boolean
  readonly grouping?: EndeavorGroupingCriteria
}): EndeavorsLensSnapshot => ({
  hiddenKinds: new Set(params?.hiddenKinds ?? []),
  hiddenHosts: new Set(params?.hiddenHosts ?? []),
  hiddenStatuses: new Set(params?.hiddenStatuses ?? []),
  hiddenComputedStates: new Set(params?.hiddenComputedStates ?? []),
  hiddenCalendarIds: new Set(params?.hiddenCalendarIds ?? []),
  searchQuery: params?.searchQuery ?? '',
  showArchived: params?.showArchived ?? false,
  grouping: params?.grouping ?? Grouping.status,
})

/**
 * The wire form — one plain JSON object, which is what the persistence child
 * (#10) hands to storage. Typed loosely on purpose: an upgrade step operates on
 * whatever shape the *old* build wrote, which by definition is not the current
 * interface.
 */
export type LensSnapshotRecord = Readonly<Record<string, unknown>>

/**
 * One breaking-change step. `to` is the version the step **produces**, so a
 * ladder reads as `0 → 1 → 2 …` and a save at version `n` runs every step whose
 * `to` is greater than `n`.
 */
export interface LensSnapshotUpgrade {
  readonly to: number
  /** Why the bump was breaking — this text is the reviewable part. */
  readonly reason: string
  readonly apply: (record: LensSnapshotRecord) => LensSnapshotRecord
}

/**
 * The live ladder. Ordered by `to`, ascending, append-only.
 *
 * The single step normalizes a **pre-versioning** save — one written before the
 * `schemaVersion` key existed, which decodes with a stored version of `0`. It
 * remaps no field, because canon states such saves are already field-compatible
 * with v1 (`hiddenComputedStates`, added in Phase 3, is an *additive* change and
 * is handled by its decode default, not by an upgrade).
 */
export const lensSnapshotUpgrades: readonly LensSnapshotUpgrade[] = [
  {
    to: 1,
    reason:
      'Pre-versioning save (no schemaVersion key). Field-compatible with v1: ' +
      'stamp the version, remap nothing.',
    apply: (record) => record,
  },
]

/** The version a ladder upgrades to — the highest `to`, or `0` when empty. */
export const latestLensSnapshotVersion = (
  upgrades: readonly LensSnapshotUpgrade[] = lensSnapshotUpgrades,
): number => upgrades.reduce((highest, step) => Math.max(highest, step.to), 0)

export interface UpgradedLensSnapshotRecord {
  readonly record: LensSnapshotRecord
  /** The `to` of every step that ran, in the order it ran. */
  readonly applied: readonly number[]
}

/**
 * Run every ladder step newer than `storedVersion`, in ascending order, exactly
 * once each. A save already at (or ahead of) the latest version runs nothing —
 * which is what makes the second read of an upgraded save a plain round-trip.
 *
 * `upgrades` is injectable so a test can prove the chaining behaviour against a
 * synthetic rename without a fabricated step shipping in the live ladder.
 */
export const upgradeLensSnapshotRecord = (
  record: LensSnapshotRecord,
  storedVersion: number,
  upgrades: readonly LensSnapshotUpgrade[] = lensSnapshotUpgrades,
): UpgradedLensSnapshotRecord => {
  const pending = [...upgrades]
    .filter((step) => step.to > storedVersion)
    .sort((left, right) => left.to - right.to)
  let current = record
  const applied: number[] = []
  for (const step of pending) {
    current = step.apply(current)
    applied.push(step.to)
  }
  return { record: current, applied }
}

/** The members of `raw` that narrow successfully, as a Set (unordered). */
const decodeSet = <T extends string>(
  raw: unknown,
  narrow: (value: string) => T | null,
): Set<T> => {
  const result = new Set<T>()
  if (!Array.isArray(raw)) return result
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const narrowed = narrow(entry)
    if (narrowed !== null) result.add(narrowed)
  }
  return result
}

/** `allCases` filtered by membership — a stable, review-friendly wire order. */
const encodeSet = <T extends string>(
  members: ReadonlySet<T>,
  allCases: readonly T[],
): readonly T[] => allCases.filter((value) => members.has(value))

const decodeStringSet = (raw: unknown): Set<string> => {
  const result = new Set<string>()
  if (!Array.isArray(raw)) return result
  for (const entry of raw) {
    if (typeof entry === 'string') result.add(entry)
  }
  return result
}

/**
 * The persistable form of a snapshot. Always stamps
 * `CURRENT_LENS_SNAPSHOT_VERSION` — a save is always written in the shape this
 * build produces.
 */
export const encodeLensSnapshot = (
  snapshot: EndeavorsLensSnapshot,
): LensSnapshotRecord => ({
  schemaVersion: CURRENT_LENS_SNAPSHOT_VERSION,
  hiddenKinds: encodeSet(snapshot.hiddenKinds, endeavorKinds),
  hiddenHosts: encodeSet(snapshot.hiddenHosts, endeavorHosts),
  hiddenStatuses: encodeSet(snapshot.hiddenStatuses, endeavorStatuses),
  hiddenComputedStates: encodeSet(
    snapshot.hiddenComputedStates,
    endeavorComputedStates,
  ),
  hiddenCalendarIds: [...snapshot.hiddenCalendarIds].sort(),
  searchQuery: snapshot.searchQuery,
  showArchived: snapshot.showArchived,
  grouping: snapshot.grouping,
})

export interface DecodedLensSnapshot {
  readonly snapshot: EndeavorsLensSnapshot
  /**
   * The version the save was written at. A save with no `schemaVersion` key
   * decodes as `0` — canon's "pre-versioning blob" reading.
   */
  readonly storedVersion: number
  /** The `to` of every upgrade step that ran, in order. Empty on a fresh save. */
  readonly upgradesApplied: readonly number[]
}

/**
 * Read a persisted save, running the upgrade ladder first.
 *
 * Returns `null` when the blob is not an object — a corrupt file is "no
 * snapshot", never a throw, so a screen falls back to its default lens and the
 * bad file is left in place to be overwritten by the next successful write.
 * Everything past that point is best-effort: a missing key takes its default,
 * an unknown key is ignored, and an unrecognized enum member is dropped.
 */
export const decodeLensSnapshot = (
  raw: unknown,
  upgrades: readonly LensSnapshotUpgrade[] = lensSnapshotUpgrades,
): DecodedLensSnapshot | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const stored = raw as LensSnapshotRecord
  const rawVersion = stored.schemaVersion
  const storedVersion = typeof rawVersion === 'number' ? rawVersion : 0

  const { record, applied } = upgradeLensSnapshotRecord(
    stored,
    storedVersion,
    upgrades,
  )

  const grouping =
    typeof record.grouping === 'string'
      ? endeavorGroupingCriteriaFromRawValue(record.grouping)
      : null

  return {
    snapshot: {
      hiddenKinds: decodeSet(record.hiddenKinds, endeavorKindFromRawValue),
      hiddenHosts: decodeSet(record.hiddenHosts, endeavorHostFromRawValue),
      hiddenStatuses: decodeSet(
        record.hiddenStatuses,
        endeavorStatusFromRawValue,
      ),
      hiddenComputedStates: decodeSet(
        record.hiddenComputedStates,
        endeavorComputedStateFromRawValue,
      ),
      hiddenCalendarIds: decodeStringSet(record.hiddenCalendarIds),
      searchQuery:
        typeof record.searchQuery === 'string' ? record.searchQuery : '',
      showArchived:
        typeof record.showArchived === 'boolean' ? record.showArchived : false,
      grouping: grouping ?? Grouping.status,
    },
    storedVersion,
    upgradesApplied: applied,
  }
}
