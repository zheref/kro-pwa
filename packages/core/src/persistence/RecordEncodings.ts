/**
 * The flattened-column encodings — canon `Kro/Dependencies/LocalStore/
 * EndeavorMapper.swift` and `UserProfileRecord.swift`.
 *
 * A local row is **flat**: SwiftData stores scalars, so canon collapses every
 * collection onto a single column — a comma-separated string for a list of raw
 * values, a JSON string for anything structured. Those encodings are not this
 * port's design decisions; they are a **cross-platform data contract**, because
 * the Kro Cloud sync engine (#31) has to be able to write a row here and read
 * it back on iPhone unchanged.
 *
 * So each function below reproduces exactly what the Swift side produces, and
 * where the two could plausibly differ the difference is spelled out in the doc
 * comment and pinned by a test. The three that are easy to get wrong:
 *
 * 1. **`tagsCsv` cannot distinguish `null` from `[]`.** Canon writes
 *    `endeavor.tags?.map { $0.rawValue }.joined(separator: ",") ?? ""` — both
 *    `nil` and `[]` produce `""`. On the way back it writes the `tags` key only
 *    `if !tagsCsv.isEmpty`, and `Endeavor.init(from:)` leaves `tags` at its
 *    declared `nil` default when the key is absent. So `[] → "" → null`. That
 *    is a genuine, one-way normalization in the wire format itself; it is
 *    documented and tested here rather than "fixed", because widening the
 *    column would make a web-written row unreadable on Apple.
 * 2. **`shadowsJson` *does* distinguish them.** `encodedShadowsJson` maps over
 *    the optional, so `nil → null` and `[] → "[]"`. Shadows round-trip exactly.
 * 3. **`sessionFragmentsJson` uses Apple's *reference* epoch, not ISO-8601.**
 *    See `EpochMillis.APPLE_REFERENCE_EPOCH_SECONDS` for the full reason.
 *
 * Every decoder here is **lossy-tolerant in the same direction canon is**: an
 * unrecognised member is dropped rather than failing the row (canon's
 * `compactMap { Tag(rawValue: $0) }`), and a malformed JSON column is treated as
 * absent (canon's `if let … try? JSONSerialization.jsonObject`). A stricter web
 * reader would hide rows the phone still shows, which is the worse failure.
 */
import type { EndeavorTag } from '../domain/endeavor/EndeavorTag'
import { endeavorTagFromRawValue } from '../domain/endeavor/EndeavorTag'
import type { PerformFragment } from '../domain/endeavor/Perform'
import { makePerformFragment } from '../domain/endeavor/Perform'
import type { RepeatConfig } from '../domain/endeavor/RepeatConfig'
import {
  decodeRepeatConfig,
  encodeRepeatConfig,
} from '../domain/endeavor/RepeatConfigCodec'
import type { Shadow } from '../domain/endeavor/Shadow'
import { endeavorKindFromRawValue } from '../domain/endeavor/EndeavorKind'
import { makeShadow } from '../domain/endeavor/Shadow'
import type { AuthProvider } from '../domain/shared/User'
import { authProviders } from '../domain/shared/User'
import {
  appleTimeIntervalFromDate,
  dateFromAppleTimeInterval,
} from './EpochMillis'

// MARK: - CSV columns

/**
 * `endeavor.tags?.map { $0.rawValue }.joined(separator: ",") ?? ""`.
 *
 * The raw values are the **single letters** `EndeavorTag` carries (`"O"`,
 * `"D"`, …), never the case names, so the column reads `"O,D,S"` on every
 * platform.
 */
export const encodeTagsCsv = (tags: readonly EndeavorTag[] | null): string =>
  tags === null ? '' : tags.join(',')

/**
 * The inverse, with canon's two behaviours: an empty column means "no `tags`
 * key at all" (→ `null`, the domain's never-tagged state), and an unrecognised
 * letter is **dropped** rather than failing the row.
 */
export const decodeTagsCsv = (csv: string): readonly EndeavorTag[] | null => {
  if (csv.length === 0) return null
  const tags: EndeavorTag[] = []
  for (const raw of csv.split(',')) {
    const tag = endeavorTagFromRawValue(raw)
    if (tag !== null) tags.push(tag)
  }
  return tags
}

/**
 * `user.emails.joined(separator: ",")` — canon `UserProfileRecord.from(_:)`.
 *
 * Canon's decoder is `emailsCsv.isEmpty ? [] : components(separatedBy: ",")`,
 * so an empty column is an empty list (not `null`) — `User.emails` is
 * non-optional, unlike `Endeavor.tags`.
 */
export const encodeEmailsCsv = (emails: readonly string[]): string =>
  emails.join(',')

/** The inverse — canon's `isEmpty ? [] : components(separatedBy:)`. */
export const decodeEmailsCsv = (csv: string): readonly string[] =>
  csv.length === 0 ? [] : csv.split(',')

/**
 * `user.connectedProviders.map { $0.rawValue }.joined(separator: ",")`.
 *
 * Note the asymmetry with `emailsCsv`, which canon has and this port keeps: the
 * column is **optional** (`String?`), and its decoder `compactMap`s, so an
 * unrecognised provider is dropped rather than failing the profile.
 */
export const encodeConnectedProvidersCsv = (
  providers: readonly AuthProvider[],
): string => providers.join(',')

/** The inverse, dropping unrecognised raw values (canon's `compactMap`). */
export const decodeConnectedProvidersCsv = (
  csv: string | null,
): readonly AuthProvider[] => {
  if (csv === null || csv.length === 0) return []
  const providers: AuthProvider[] = []
  for (const raw of csv.split(',')) {
    const found = authProviders.find((provider) => provider === raw)
    if (found !== undefined) providers.push(found)
  }
  return providers
}

// MARK: - JSON columns

/** Parses a JSON column, answering `null` for absent **or** malformed. */
const parseJsonColumn = (json: string | null): unknown => {
  if (json === null) return null
  try {
    return JSON.parse(json) as unknown
  } catch {
    return null
  }
}

/**
 * The encoded form of one `Shadow` — Swift's **synthesized** `Codable`, so the
 * keys are the stored property names in declaration order, and the two optional
 * properties are written with `encodeIfPresent`: a `nil` `group` or
 * `appleReminderPriority` is **omitted from the object**, not written as
 * `null`. Emitting `"group": null` instead would still decode on Apple, but it
 * would make a byte-comparison of two equivalent rows fail, and byte-identity
 * is the property this module exists to hold.
 */
export type EncodedShadow = {
  readonly originalTitle: string
  readonly sourceIdentifier: string
  readonly kind: string
  readonly source: string
  readonly group?: string
  readonly appleReminderPriority?: number
}

/** One shadow, in canon's synthesized shape. */
export const encodeShadow = (shadow: Shadow): EncodedShadow => {
  const encoded: {
    originalTitle: string
    sourceIdentifier: string
    kind: string
    source: string
    group?: string
    appleReminderPriority?: number
  } = {
    originalTitle: shadow.originalTitle,
    sourceIdentifier: shadow.sourceIdentifier,
    kind: shadow.kind,
    source: shadow.source,
  }
  if (shadow.group !== null) encoded.group = shadow.group
  if (shadow.appleReminderPriority !== null) {
    encoded.appleReminderPriority = shadow.appleReminderPriority
  }
  return encoded
}

/**
 * One shadow back, or `null` when the entry is not a decodable shadow.
 *
 * `kind` is the one required narrowing: an unknown kind makes the whole shadow
 * meaningless (it is what the reconciliation pass keys on), so the entry is
 * dropped rather than defaulted to `task` — a wrong provenance is worse than a
 * missing one.
 */
export const decodeShadow = (raw: unknown): Shadow | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const entry = raw as Record<string, unknown>
  if (
    typeof entry.originalTitle !== 'string' ||
    typeof entry.sourceIdentifier !== 'string' ||
    typeof entry.kind !== 'string' ||
    typeof entry.source !== 'string'
  ) {
    return null
  }
  const kind = endeavorKindFromRawValue(entry.kind)
  if (kind === null) return null
  return makeShadow({
    originalTitle: entry.originalTitle,
    sourceIdentifier: entry.sourceIdentifier,
    kind,
    source: entry.source,
    group: typeof entry.group === 'string' ? entry.group : null,
    appleReminderPriority:
      typeof entry.appleReminderPriority === 'number'
        ? entry.appleReminderPriority
        : null,
  })
}

/**
 * `EndeavorRecord.encodedShadowsJson(_:)` — `nil → null`, `[] → "[]"`.
 *
 * The `[]` case is what makes shadows round-trip losslessly where tags do not:
 * the JSON column can hold an empty array, the CSV column cannot hold an empty
 * list distinguishably from an absent one.
 */
export const encodeShadowsJson = (
  shadows: readonly Shadow[] | null,
): string | null =>
  shadows === null ? null : JSON.stringify(shadows.map(encodeShadow))

/** The inverse, dropping undecodable entries and treating bad JSON as absent. */
export const decodeShadowsJson = (
  json: string | null,
): readonly Shadow[] | null => {
  const parsed = parseJsonColumn(json)
  if (!Array.isArray(parsed)) return null
  const shadows: Shadow[] = []
  for (const entry of parsed) {
    const shadow = decodeShadow(entry)
    if (shadow !== null) shadows.push(shadow)
  }
  return shadows
}

/**
 * `EndeavorRecord.encodedRepeatConfigJson(_:)`.
 *
 * The object shape is `RepeatConfigCodec`'s, which #7 already pinned against
 * Swift's hand-written `Base.encode(to:)` — `{"base":{"type":…},"everyOther":N}`
 * with a **numeric** `month` and lowercase weekday **names**. Nothing is
 * re-derived here; this is the storage column wrapped around that codec, so the
 * two cannot drift.
 */
export const encodeRepeatConfigJson = (
  repeatConfig: RepeatConfig | null,
): string | null =>
  repeatConfig === null
    ? null
    : JSON.stringify(encodeRepeatConfig(repeatConfig))

/** The inverse. A malformed rule reads as "no recurrence", never as a throw. */
export const decodeRepeatConfigJson = (
  json: string | null,
): RepeatConfig | null => {
  const parsed = parseJsonColumn(json)
  if (parsed === null) return null
  const decoded = decodeRepeatConfig(parsed)
  return decoded.ok ? decoded.value : null
}

/**
 * The encoded form of one `PerformFragment` — canon's `Perform.SessionFragment`
 * under a **bare** `JSONEncoder()`, i.e. `.deferredToDate`, i.e. seconds since
 * Apple's reference date as a `Double`. `endedAt` is optional and is omitted
 * when `nil` (synthesized `encodeIfPresent`).
 */
export type EncodedPerformFragment = {
  readonly startedAt: number
  readonly endedAt?: number
}

export const encodePerformFragment = (
  fragment: PerformFragment,
): EncodedPerformFragment =>
  fragment.endedAt === null
    ? { startedAt: appleTimeIntervalFromDate(fragment.startedAt) }
    : {
        startedAt: appleTimeIntervalFromDate(fragment.startedAt),
        endedAt: appleTimeIntervalFromDate(fragment.endedAt),
      }

export const decodePerformFragment = (raw: unknown): PerformFragment | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const entry = raw as Record<string, unknown>
  if (typeof entry.startedAt !== 'number') return null
  return makePerformFragment({
    startedAt: dateFromAppleTimeInterval(entry.startedAt),
    endedAt:
      typeof entry.endedAt === 'number'
        ? dateFromAppleTimeInterval(entry.endedAt)
        : null,
  })
}

/**
 * `PerformanceRecord.sessionFragments`'s setter — `try? JSONEncoder().encode`.
 *
 * **An empty list encodes as `"[]"`, not as `null`**, because that is what the
 * setter produces: `PerformanceRecord.from(_:)` assigns `record.sessionFragments
 * = performance.sessionFragments` for every performance, and `JSONEncoder`
 * encodes `[]` to the two bytes `[]`, never to a nil `Data`.
 *
 * Canon does also write a genuinely `nil` column, but from exactly one path —
 * `PerformanceService.recordQuickComplete`, which passes
 * `sessionFragmentsData: nil` directly. The domain has no third state to
 * distinguish the two, and canon's own getter collapses them (`guard let data
 * … else { return [] }`), so a `nil` column read here re-encodes as `"[]"`.
 * That is the one non-identity in this column, it is invisible on both
 * platforms because both decode to `[]`, and choosing the *mapper's* encoding
 * over the quick-complete path's keeps every ordinary row byte-identical.
 */
export const encodeSessionFragmentsJson = (
  fragments: readonly PerformFragment[],
): string => JSON.stringify(fragments.map(encodePerformFragment))

/** `guard let data … ?? []` — an absent or malformed column is no fragments. */
export const decodeSessionFragmentsJson = (
  json: string | null,
): readonly PerformFragment[] => {
  const parsed = parseJsonColumn(json)
  if (!Array.isArray(parsed)) return []
  const fragments: PerformFragment[] = []
  for (const entry of parsed) {
    const fragment = decodePerformFragment(entry)
    if (fragment !== null) fragments.push(fragment)
  }
  return fragments
}
