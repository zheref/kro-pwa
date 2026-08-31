/**
 * Epoch-millisecond conversions — canon `Kro/Dependencies/LocalStore/
 * KroDatabase.swift`, the `Date.epochMillis` extension.
 *
 * Every sync watermark in the local store is an **epoch-millisecond integer**,
 * not a `Date`. That is deliberate on Apple's side and is preserved here: a
 * watermark is compared (`updatedAt > lastSynced`) far more often than it is
 * displayed, and an integer compares identically on every platform, whereas two
 * `Date`s carry sub-millisecond float noise that makes `>` non-deterministic
 * across a Swift ⇄ TypeScript round-trip.
 *
 * Canon writes `Int64(timeIntervalSince1970 * 1000)`, which truncates toward
 * zero. JavaScript's `Date.prototype.getTime()` is already an integer count of
 * milliseconds since the same epoch, so the two agree exactly for every instant
 * a `Date` can represent — no rounding step is needed, and adding one would
 * only introduce a way to disagree.
 */

/** Milliseconds since the Unix epoch — canon's `Int64` watermark. */
export type EpochMillis = number

/** `Date.epochMillis`. */
export const epochMillisFromDate = (date: Date): EpochMillis => date.getTime()

/** `Date(epochMillis:)`. */
export const dateFromEpochMillis = (millis: EpochMillis): Date =>
  new Date(millis)

/**
 * Seconds between the Unix epoch (1970-01-01) and Apple's *reference* date
 * (2001-01-01) — `978_307_200`.
 *
 * This constant exists because of one specific canon behaviour, and it is the
 * single most breakable detail in this whole module. `PerformanceRecord`
 * serializes its session fragments with a **bare** `JSONEncoder()`
 * (`sessionFragmentsData`), and Swift's default `dateEncodingStrategy` is
 * `.deferredToDate` — which encodes a `Date` as
 * `timeIntervalSinceReferenceDate`, a `Double` count of seconds since
 * 2001-01-01T00:00:00Z. **Not** an ISO string, and **not** the Unix epoch.
 *
 * So a fragment written by KroApple reads `{"startedAt":776000000.0}`, and a
 * web writer that emitted `{"startedAt":"2026-08-31T…Z"}` would produce a blob
 * KroApple's `JSONDecoder()` rejects — the fragments would silently decode as
 * `[]` and the performance would lose its session history on the next sync.
 * `PerformanceRecord.ts` uses these two helpers so that cannot happen, and its
 * test pins a known instant against the number Swift produces for it.
 */
export const APPLE_REFERENCE_EPOCH_SECONDS = 978_307_200

/** `date.timeIntervalSinceReferenceDate` — seconds, fractional, Apple epoch. */
export const appleTimeIntervalFromDate = (date: Date): number =>
  date.getTime() / 1000 - APPLE_REFERENCE_EPOCH_SECONDS

/** `Date(timeIntervalSinceReferenceDate:)`. */
export const dateFromAppleTimeInterval = (seconds: number): Date =>
  new Date((seconds + APPLE_REFERENCE_EPOCH_SECONDS) * 1000)
