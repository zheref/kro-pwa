/**
 * Where the reward catalog and the claimed-reward set live on disk.
 *
 * ## The discovery (stated here so the choice below is traceable)
 *
 * `zheref/KroApple@2c1ee45`'s `Kro/Application/Earn/EarnFeature.swift` declares
 * a `RewardsStore` dependency whose `liveValue` is backed by **`UserDefaults`**
 * — two keys, `io.zheref.kro.rewards.catalog.v1` (the whole `[Reward]` array,
 * JSON-encoded) and `io.zheref.kro.rewards.claimed.v1` (a bare `[String]` of
 * claimed ids). There is **no** `RewardRecord` in `KroDatabase`/SwiftData, no
 * Supabase table, and nothing else in the app touches `rewardsStore` — Earn is
 * this dependency's only consumer. So canon's answer is: preferences-shaped
 * storage, not a full record store.
 *
 * ## The port, mirrored rather than re-invented
 *
 * `#10`'s `KeyValueStore` (`packages/core/src/settings/KeyValueStore.ts`) is
 * exactly `UserDefaults`'s shape on this stack — synchronous, key/value,
 * already namespaced under `kro:` by convention. This file reads/writes through
 * it (`extra.localStore.preferences`) rather than adding a new persistence
 * port: no `RewardStore` interface, no IndexedDB binding, nothing new in
 * `packages/core/src/persistence/` or `packages/app/src/services/localStore/`.
 * A `SettingOption` cannot carry an array, so the two keys below bypass
 * `Preferences`/`SettingOption` and call `KeyValueStore.get`/`set` directly,
 * with a small JSON **codec** in place of `SettingsCodec`'s scalar one — which
 * is the literal shape the issue asked for ("use #10's PreferenceStorage port
 * under a `kro:` key with a codec").
 *
 * **One behavioural divergence, flagged rather than silent.** Canon's two
 * `UserDefaults` keys sit outside `Preferences`'s `kro:` namespace, so nothing
 * wipes them on sign-out. These two keys are deliberately placed *inside* that
 * namespace (`kro:earn.rewards.catalog`, `kro:earn.rewards.claimed`), so they
 * participate in the existing, generic, prefix-based sign-out sweep
 * (`packages/app/src/services/localStore/signOutWipe.ts`) automatically — no
 * change to that file was needed or made. A reward catalog surviving sign-out
 * on a shared device is the one thing canon's own preferences-wipe rule
 * (`docs/Features/Preferences.md` § *Account lifecycle*) says every other piece
 * of device-stored state must not do; this port closes that gap rather than
 * reproducing it.
 */
import {
  PREFERENCES_NAMESPACE,
  type KeyValueStore,
  type Reward,
} from '@kro/core'
import { makeReward } from '@kro/core'

const REWARDS_CATALOG_KEY = `${PREFERENCES_NAMESPACE}earn.rewards.catalog`
const REWARDS_CLAIMED_KEY = `${PREFERENCES_NAMESPACE}earn.rewards.claimed`

/** The wire shape one `Reward` round-trips through `JSON.stringify`. */
interface StoredReward {
  readonly id: string
  readonly title: string
  readonly glyph: string
  readonly pointsRequired: number
  readonly notes: string | null
  readonly dateAddedEpochMillis: number
}

const toStoredReward = (reward: Reward): StoredReward => ({
  id: reward.id,
  title: reward.title,
  glyph: reward.glyph,
  pointsRequired: reward.pointsRequired,
  notes: reward.notes,
  dateAddedEpochMillis: reward.dateAdded.getTime(),
})

/**
 * `null` on anything that isn't a well-formed row — never thrown.
 *
 * Every numeric field is required to be **finite** (rules out `NaN`/
 * `Infinity`/`-Infinity`, which `typeof` alone would let through) and
 * `pointsRequired` additionally non-negative; `notes` is required to already
 * be `string | null | undefined`, never coerced from some other truthy value.
 * A row failing any of these degrades to "skip this row" (its caller filters
 * `null`s out), matching #10's own record-store posture: a malformed row
 * yields a smaller catalog, never a `Reward` carrying an invalid `Date` or a
 * non-finite number into selectors' sort/partition math.
 */
const fromStoredReward = (value: unknown): Reward | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<StoredReward>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.glyph !== 'string' ||
    typeof candidate.pointsRequired !== 'number' ||
    !Number.isFinite(candidate.pointsRequired) ||
    candidate.pointsRequired < 0 ||
    typeof candidate.dateAddedEpochMillis !== 'number' ||
    !Number.isFinite(candidate.dateAddedEpochMillis) ||
    !(
      candidate.notes === undefined ||
      candidate.notes === null ||
      typeof candidate.notes === 'string'
    )
  ) {
    return null
  }
  return makeReward({
    id: candidate.id,
    title: candidate.title,
    glyph: candidate.glyph,
    pointsRequired: candidate.pointsRequired,
    notes: candidate.notes ?? null,
    dateAdded: new Date(candidate.dateAddedEpochMillis),
  })
}

/**
 * The stored catalog, or `[]` for an unset/corrupt key — corrupt is treated as
 * empty rather than fatal, the same "skip, never blank the surface" posture
 * `#10`'s own record stores take for a malformed row.
 */
export const readRewardsCatalog = (store: KeyValueStore): readonly Reward[] => {
  const raw = store.get(REWARDS_CATALOG_KEY)
  if (typeof raw !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(fromStoredReward)
      .filter((reward): reward is Reward => reward !== null)
  } catch {
    return []
  }
}

/** Replaces the whole catalog — canon's `saveCatalog`, whole-array semantics. */
export const writeRewardsCatalog = (
  store: KeyValueStore,
  rewards: readonly Reward[],
): void => {
  store.set(REWARDS_CATALOG_KEY, JSON.stringify(rewards.map(toStoredReward)))
}

/** The claimed-id set, or `[]` for an unset/corrupt key. */
export const readClaimedRewardIds = (
  store: KeyValueStore,
): readonly string[] => {
  const raw = store.get(REWARDS_CLAIMED_KEY)
  if (typeof raw !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

/** Replaces the whole claimed-id set. */
export const writeClaimedRewardIds = (
  store: KeyValueStore,
  claimedRewardIds: readonly string[],
): void => {
  store.set(REWARDS_CLAIMED_KEY, JSON.stringify(claimedRewardIds))
}
