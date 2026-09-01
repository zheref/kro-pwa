/**
 * The Earn surface's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`) — canon's
 * `RewardsStore.liveValue` reads/writes plus `EarnProducer.swift`'s two
 * persistence effects, folded into one atomic shape per operation.
 *
 * Every thunk here reads its own fresh state from `extra.localStore` rather
 * than trusting whatever the caller's copy of Redux state currently holds —
 * the same reason `DoProducer.ts`'s `markEndeavorCompleteThunk` re-reads
 * storage instead of taking the target as an argument: a snapshot that went
 * stale between the tap and the dispatch must never overwrite storage with a
 * write built from that stale snapshot. None of them reads a clock — `now`
 * and `id` are always caller-supplied arguments (`RC-4`; ids are minted by the
 * UI, exactly as `CaptureProducer.ts`'s `submitCaptureThunk` documents for
 * itself: "none mints an id").
 */
import {
  type Reward,
  type Result,
  earnDefaultRewardThresholdOption,
  earnPointsFormulaOption,
  err,
  makePreferences,
  makeReward,
  ok,
  performFromRecord,
  pointsFormulaFromRawValue,
  preferenceInt,
  preferencePick,
  rewardForInsertion,
} from '@kro/core'
import type { Perform } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import { type EarnException, EarnExceptions } from './EarnException'
import type { EarnPreferences, EarnRewardDraft } from './EarnFeature'
import {
  readClaimedRewardIds,
  readRewardsCatalog,
  writeClaimedRewardIds,
  writeRewardsCatalog,
} from './EarnRewardsStorage'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/** What `loadEarnCatalogThunk` installs in one pass. */
export interface EarnCatalogSnapshot {
  readonly rewards: readonly Reward[]
  readonly claimedRewardIds: readonly string[]
  readonly performances: readonly Perform[]
}

/**
 * `earn.pointsFormula` + `earn.defaultRewardThreshold`, read in one pass.
 * Independent of the catalog read below — either can succeed while the other
 * fails, exactly as `DoProducer.ts`'s `loadDoPreferencesThunk` /
 * `fetchDoEndeavorsThunk` split does for the same reason.
 */
export const loadEarnPreferencesThunk = createAsyncThunk<
  Result<EarnPreferences, EarnException>,
  void,
  { extra: ThunkExtra }
>('earn/onEarnPreferencesLoadCompleted', async (_arg, { extra }) => {
  try {
    const preferences = makePreferences(extra.localStore.preferences)
    return ok({
      defaultRewardThreshold: preferenceInt(
        preferences,
        earnDefaultRewardThresholdOption,
      ),
      pointsFormula: pointsFormulaFromRawValue(
        preferencePick(preferences, earnPointsFormulaOption),
      ),
    })
  } catch (error) {
    return err(EarnExceptions.preferencesLoadFailed(messageOf(error)))
  }
})

/**
 * The reward catalog, the claimed-id set and every recorded performance — the
 * balance's one source (`EarnRules.ts`). `performances.all()` already excludes
 * soft-deleted/pending-deletion rows (`#10`'s `livingChildRecords`), so a
 * removed performance can never inflate the balance.
 *
 * The claimed-id set is **filtered to ids present in the loaded catalog**
 * before it is installed. The two are persisted independently, and
 * `addRewardThunk` never checks a new id against the claimed-id history — so
 * without this, a reward deleted after being claimed, followed by a
 * *coincidentally* id-colliding new reward, would install as pre-claimed. The
 * filter is defensive only: it changes nothing about the ordinary "delete a
 * claimed reward and its cost stops counting as spent" behaviour
 * (`EarnRules.ts`'s `spentPoints` already derives that from the same
 * intersection on every read).
 */
export const loadEarnCatalogThunk = createAsyncThunk<
  Result<EarnCatalogSnapshot, EarnException>,
  void,
  { extra: ThunkExtra }
>('earn/onEarnCatalogLoadCompleted', async (_arg, { extra }) => {
  try {
    const rewards = readRewardsCatalog(extra.localStore.preferences)
    const rewardIds = new Set(rewards.map((reward) => reward.id))
    const claimedRewardIds = readClaimedRewardIds(
      extra.localStore.preferences,
    ).filter((id) => rewardIds.has(id))
    const performanceRecords = await extra.localStore.performances.all()
    return ok({
      rewards,
      claimedRewardIds,
      performances: performanceRecords.map(performFromRecord),
    })
  } catch (error) {
    return err(EarnExceptions.catalogLoadFailed(messageOf(error)))
  }
})

/**
 * A typed Add-Reward confirm. Validated **before** any storage touch — a
 * blank title never reaches `readRewardsCatalog`/`writeRewardsCatalog`, so a
 * rejected draft can never partially write.
 */
export const addRewardThunk = createAsyncThunk<
  Result<{ reward: Reward }, EarnException>,
  { draft: EarnRewardDraft; id: string; now: Date },
  { extra: ThunkExtra }
>('earn/onRewardAddCompleted', async ({ draft, id, now }, { extra }) => {
  const title = draft.title.trim()
  if (title.length === 0) return err(EarnExceptions.blankTitle())

  try {
    const store = extra.localStore.preferences
    const reward = makeReward({
      id,
      title,
      glyph: draft.glyph.length === 0 ? '🎁' : draft.glyph,
      pointsRequired: Math.max(0, draft.pointsRequired),
      notes: draft.notes,
      dateAdded: now,
    })
    const catalog = readRewardsCatalog(store)
    writeRewardsCatalog(store, [reward, ...catalog])
    return ok({ reward })
  } catch (error) {
    return err(EarnExceptions.addRewardFailed(messageOf(error)))
  }
})

/** Quick-add from a suggestion card — canon's `Reward.copyForInsertion()`. */
export const addSuggestionThunk = createAsyncThunk<
  Result<{ reward: Reward }, EarnException>,
  { suggestion: Reward; id: string; now: Date },
  { extra: ThunkExtra }
>(
  'earn/onSuggestionAddCompleted',
  async ({ suggestion, id, now }, { extra }) => {
    try {
      const store = extra.localStore.preferences
      const reward = rewardForInsertion(suggestion, { id, dateAdded: now })
      const catalog = readRewardsCatalog(store)
      writeRewardsCatalog(store, [reward, ...catalog])
      return ok({ reward })
    } catch (error) {
      return err(EarnExceptions.addRewardFailed(messageOf(error)))
    }
  },
)

/** Context-menu delete — persists the catalog with the row removed. */
export const deleteRewardThunk = createAsyncThunk<
  Result<{ id: string }, EarnException>,
  { id: string },
  { extra: ThunkExtra }
>('earn/onRewardDeleteCompleted', async ({ id }, { extra }) => {
  try {
    const store = extra.localStore.preferences
    const catalog = readRewardsCatalog(store)
    writeRewardsCatalog(
      store,
      catalog.filter((reward) => reward.id !== id),
    )
    return ok({ id })
  } catch (error) {
    return err(EarnExceptions.deleteRewardFailed(messageOf(error)))
  }
})

/**
 * The atomic claim. The write happens **before** anything is returned, and
 * the reducer only ever applies the id on `ok` (`EarnFeature.ts`'s header) —
 * a stubbed store whose `set` throws leaves both the persisted and the
 * in-memory claimed set exactly as they were.
 *
 * Idempotent on the already-claimed case, matching canon's
 * `guard !stored.contains(id) else return`.
 *
 * **Refuses to claim an id absent from the persisted catalog** (a second
 * Copilot round, against this fix's own first head). Without this, a claim
 * dispatched for a stale/deleted id would still write a "ghost" entry into
 * the claimed set — and because `loadEarnCatalogThunk` (above) only checks
 * "does *some* current reward have this id", a later reward that happened to
 * mint the same id would load as pre-claimed. Checking existence here, not
 * only at load, closes that the whole way rather than only after the fact.
 */
export const claimRewardThunk = createAsyncThunk<
  Result<{ id: string }, EarnException>,
  { id: string },
  { extra: ThunkExtra }
>('earn/onRewardClaimCompleted', async ({ id }, { extra }) => {
  try {
    const store = extra.localStore.preferences
    const rewards = readRewardsCatalog(store)
    if (!rewards.some((reward) => reward.id === id)) {
      return err(EarnExceptions.rewardNotFound(id))
    }
    const claimedRewardIds = readClaimedRewardIds(store)
    if (!claimedRewardIds.includes(id)) {
      writeClaimedRewardIds(store, [...claimedRewardIds, id])
    }
    return ok({ id })
  } catch (error) {
    return err(EarnExceptions.claimRewardFailed(messageOf(error)))
  }
})
