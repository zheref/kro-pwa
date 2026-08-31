/**
 * Field-scoped ownership — canon `EndeavorSourceResolution.merge`.
 *
 * `docs/Features/SourceReconciliation.md`, "Reconciliation ownership":
 *
 * > When the local representation and source-native representation disagree:
 * > - fresh source title, status, scheduling, recurrence, and classification
 * >   evidence win;
 * > - Kro-only enrichment such as value, effort, expiry, reward, and local
 * >   project membership remains attached to the local representation;
 * > - all known hosts and source routes are retained;
 * > - a late cached fetch cannot erase stronger source evidence already
 * >   received;
 * > - unrelated rows remain separate and stable.
 *
 * and `KroEnhanced.md`'s integrity rule 3: *"Conflict resolution is
 * field-scoped, not record-scoped."*
 *
 * ## The shape that makes it field-scoped
 *
 * The merge does not pick a record and discard the other. It picks a
 * **carrier** — the row that will keep carrying the user's enrichment — and
 * then overwrites, on that carrier, only the fields the source owns. Every
 * field not in the host-native set is simply never written, so it survives by
 * construction rather than by being copied back.
 *
 * The two choices are independent, and that is the whole trick:
 *
 * - **Which row carries?** The most *authoritative store* — local over cloud
 *   over external. Kro's own row is where enrichment lives, so it must
 *   survive.
 * - **Which row's source fields win?** The strongest *evidence*, by
 *   `sourceEvidenceRank`. A provider-native row this fetch beats a cached
 *   mirror, whichever way round they were passed in.
 *
 * A stale row therefore loses the fields it would have clobbered without ever
 * being consulted about them — which is precisely *"a late cached fetch cannot
 * erase stronger source evidence already received"*, and, run the other way,
 * why a fresh Apple row cannot erase a `value` the user set last week.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import { EndeavorHost } from '../endeavor/EndeavorHost'
import type { Shadow } from '../endeavor/Shadow'
import type { ProviderClassificationRuleset } from './ProviderClassification'
import { rulesetFor, sourceEvidenceRank } from './ProviderEvidence'
import type { ReconciliationContext } from './ReconciliationContext'
import { resolvedKind } from './ResolvedKind'

/**
 * The fields a source owns when it has evidence — written onto the carrier by
 * `mergeReconciled`. Data, not prose, so a test can assert the set has not
 * quietly grown.
 */
export const hostNativeFields = [
  'kind',
  'title',
  'status',
  'start',
  'due',
  'repeatConfig',
] as const

/**
 * The Kro-only enrichment that stays on the carrier. Never written by the
 * merge, which is what keeps it safe.
 *
 * This is `KroEnhanced.md`'s "**enhanced**" column: `sessionPoints`, `value`,
 * `effort`, `expiry`, plus the assigned colour and local project membership.
 * (`quadrant` appears in that matrix but is not an `Endeavor` field — it is
 * carried by the triage decision, whose lane is #25.)
 */
export const kroOnlyFields = [
  'sessionPoints',
  'value',
  'effort',
  'expiry',
  'associatedColor',
  'projectId',
] as const

/**
 * Host-native fields that are nonetheless **not** overwritten by the general
 * merge, recorded so the omission reads as deliberate rather than missed.
 *
 * - `duration` — `KroEnhanced.md`'s matrix calls it host-owned for calendar
 *   providers, but canon's `merge` never copies it and neither does this. A
 *   reminders provider has no duration to offer, so copying it would let an
 *   evidence row with `null` erase a duration the carrier legitimately holds.
 * - `completed` — deliberately not a general-merge field. Completion crosses
 *   between rows only through the series path, which is the one place that
 *   can tell "this occurrence was completed today" from "some occurrence of
 *   this series was completed at some point". See `SeriesReconciliation.ts`.
 */
export const unmergedHostFields = ['duration', 'completed'] as const

/**
 * Store authority, lowest = most authoritative. Canon's `hostRank`.
 *
 * Kro's own stores outrank every provider because they are where enrichment
 * is persisted; among providers the order is canon's declaration order and
 * carries no product meaning beyond determinism.
 */
export const hostAuthorityRank = (host: EndeavorHost): number => {
  switch (host) {
    case EndeavorHost.local:
      return 0
    case EndeavorHost.supabase:
      return 1
    case EndeavorHost.appleCalendar:
      return 2
    case EndeavorHost.appleReminders:
      return 3
    case EndeavorHost.googleCalendar:
      return 4
    case EndeavorHost.outlookCalendar:
      return 5
    default:
      return Number.MAX_SAFE_INTEGER
  }
}

/**
 * A row's authority: its most authoritative host. An unhosted row ranks last,
 * canon's `Int.max` — it is in memory only and has no store to speak for it.
 */
export const carrierRank = (endeavor: Endeavor): number =>
  endeavor.hostedBy.reduce(
    (best, host) => Math.min(best, hostAuthorityRank(host)),
    Number.MAX_SAFE_INTEGER,
  )

/**
 * `mergeShadows` — union by `(source, sourceIdentifier)`, keeping the first
 * occurrence but **upgrading** it when a later duplicate carries priority
 * evidence the first lacked.
 *
 * That upgrade is what lets a fresh fetch teach a cached shadow the provider
 * metadata it predates, without disturbing the shadow's position or identity.
 * Returns `null` for "no shadows", never `[]` — the distinction `Shadow.ts`
 * and `withRemovedShadow` both preserve.
 */
export const mergeShadows = (
  lhs: readonly Shadow[] | null,
  rhs: readonly Shadow[] | null,
): readonly Shadow[] | null => {
  const all = [...(lhs ?? []), ...(rhs ?? [])]
  if (all.length === 0) return null

  const result: Shadow[] = []
  const indexByKey = new Map<string, number>()
  for (const shadow of all) {
    const key = `${shadow.source} ${shadow.sourceIdentifier}`
    const existing = indexByKey.get(key)
    if (existing === undefined) {
      indexByKey.set(key, result.length)
      result.push(shadow)
      continue
    }
    const current = result[existing] as Shadow
    if (
      current.appleReminderPriority === null &&
      shadow.appleReminderPriority !== null
    ) {
      result[existing] = shadow
    }
  }
  return result
}

/** Union of two host lists, first-appearance order, no duplicates. */
export const mergeHosts = (
  base: readonly EndeavorHost[],
  ...additional: readonly (readonly EndeavorHost[])[]
): readonly EndeavorHost[] => {
  const result = [...base]
  for (const hosts of additional) {
    for (const host of hosts) {
      if (!result.includes(host)) result.push(host)
    }
  }
  return result
}

/**
 * Write the source-owned fields onto a carrier.
 *
 * **Why this does not go through `EndeavorMutations`.** #7 guards `withDue`,
 * `withStart` and `withRepeatConfig` on the kind-relevance matrix, which
 * encodes what a *user* may edit: `due` is irrelevant to a habit, so
 * `withDue` on a habit is a no-op. That is right for an edit screen and wrong
 * here — a daily Apple reminder resolves to a habit and still has a due
 * instant the provider assigned, which every surface needs. #7's PR draws
 * exactly this line, keeping `withKind`, `withCompleted`, `withAddedHost`,
 * `withAddedShadow` and `withId` unguarded *"for the source-reconciliation
 * path (#12) … a provider re-classifying its own item … is describing what
 * the host says is true"*. Canon agrees: its own field setters are unguarded,
 * and its `merge` writes `title` and `status` by direct assignment.
 *
 * So ingestion writes the scheduling fields directly, in this lane, and the
 * guarded helpers stay reserved for user edits.
 */
const withSourceOwnedFields = (
  carrier: Endeavor,
  evidence: Endeavor,
  context: ReconciliationContext,
): Endeavor => ({
  ...carrier,
  kind: resolvedKind(evidence, context),
  title: evidence.title,
  status: evidence.status,
  start: evidence.start,
  due: evidence.due,
  repeatConfig: evidence.repeatConfig,
  shadows: mergeShadows(carrier.shadows, evidence.shadows),
})

/**
 * Merge two rows already known to be one logical endeavor.
 *
 * Order of business, following canon exactly:
 *
 * 1. **Pick the carrier.** Normally the more authoritative store. The one
 *    exception is a *same-origin update* — identical non-empty id **and**
 *    identical host set — which is not two competing sources at all but one
 *    record at two points in time. There the later row (`rhs`, since
 *    `reconcile` folds left to right) wins outright, so completing a task
 *    cannot be shadowed by the stale copy still sitting in the set.
 * 2. **Pick the evidence** — the higher `sourceEvidenceRank`, ties to `lhs`,
 *    matching Swift's `max(by:)`. Rank `0` means neither side has anything to
 *    say and the carrier is left alone.
 * 3. **Overwrite the source-owned fields** on the carrier, and nothing else.
 * 4. **Union hosts and shadows** from both inputs — *"all known hosts and
 *    source routes are retained"*, which is what keeps a locally cached Apple
 *    reminder visible under either host's filter.
 *
 * Step 1's authority comparison uses `<=`, so with equal ranks the carrier is
 * `lhs`; combined with step 2's tie-to-`lhs`, a merge of two indistinguishable
 * rows is stable rather than order-sensitive.
 */
export const mergeReconciled = (
  lhs: Endeavor,
  rhs: Endeavor,
  context: ReconciliationContext,
): Endeavor => {
  const isSameOriginUpdate =
    lhs.id !== '' &&
    lhs.id === rhs.id &&
    sameHostSet(lhs.hostedBy, rhs.hostedBy)

  let carrier = isSameOriginUpdate
    ? rhs
    : carrierRank(lhs) <= carrierRank(rhs)
      ? lhs
      : rhs

  const evidence = strongerEvidence(lhs, rhs, context.rulesets)
  if (evidence !== null) {
    carrier = withSourceOwnedFields(carrier, evidence, context)
  }

  return {
    ...carrier,
    hostedBy: mergeHosts(carrier.hostedBy, lhs.hostedBy, rhs.hostedBy),
    shadows: mergeShadows(
      mergeShadows(lhs.shadows, rhs.shadows),
      carrier.shadows,
    ),
  }
}

/**
 * The row whose source evidence should win, or `null` when neither has any.
 *
 * Each side is ranked against **its own** provider's ruleset, so a Google row
 * and an Apple row are still comparable once #33 registers Google's table.
 */
const strongerEvidence = (
  lhs: Endeavor,
  rhs: Endeavor,
  rulesets: readonly ProviderClassificationRuleset[],
): Endeavor | null => {
  const lhsRank = evidenceRankOf(lhs, rulesets)
  const rhsRank = evidenceRankOf(rhs, rulesets)
  const best = Math.max(lhsRank, rhsRank)
  if (best <= 0) return null
  // Ties go to `lhs`, matching Swift's `max(by:)`, which only replaces on a
  // strict increase. Order-independence is then a property of the caller
  // passing the same pair consistently, and is pinned by test.
  return lhsRank >= rhsRank ? lhs : rhs
}

const evidenceRankOf = (
  endeavor: Endeavor,
  rulesets: readonly ProviderClassificationRuleset[],
): number => {
  const ruleset = rulesetFor(endeavor, rulesets)
  return ruleset === null ? 0 : sourceEvidenceRank(endeavor, ruleset)
}

const sameHostSet = (
  lhs: readonly EndeavorHost[],
  rhs: readonly EndeavorHost[],
): boolean => {
  const lhsSet = new Set(lhs)
  const rhsSet = new Set(rhs)
  if (lhsSet.size !== rhsSet.size) return false
  for (const host of lhsSet) {
    if (!rhsSet.has(host)) return false
  }
  return true
}
