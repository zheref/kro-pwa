/**
 * `reconcile` — the pass, canon `EndeavorSourceResolution.reconcile`.
 *
 * One pure function from the raw fan-out of every enabled host to the list a
 * surface presents, with each logical endeavor appearing exactly once.
 *
 * ## Where it runs
 *
 * `docs/Features/SourceReconciliation.md`: *"Source-linked rows are reconciled
 * before filtering, grouping, or presentation so a local shadow and its
 * original source appear once."* This function is that step, and the ordering
 * is a contract on its **callers** — the vistas pipeline (`applyVista`) and
 * the surfaces built on it must reconcile first and filter second. Reconciling
 * after a filter would drop the very evidence that repairs a stale row: filter
 * out a "task" whose fresh Apple row proves it a habit, and no later pass can
 * reclassify it. Nothing in this lane can enforce that ordering — the fetching
 * tiers (#10, #16, #18) own their own call sites.
 *
 * ## The three stages, and why the order is load-bearing
 *
 * ```text
 *   rows ──▶ 1. series repair ──▶ 2. identity merge ──▶ 3. history collapse ──▶ out
 * ```
 *
 * **1 before 2.** Canon is explicit, and it is the subtlest ordering in the
 * file: *"Series reconciliation must inspect the raw fan-out first. Exact-ID
 * merging unions hosts, which would otherwise turn the source-native
 * occurrence into a local+Apple row before it can repair an older persisted
 * occurrence whose identifier has rotated."* Stage 1 recognizes the live
 * occurrence by it being provider-native — hosted by the provider and by no
 * Kro host. Stage 2 unions hosts. Run in the other order, that test can never
 * be true again, and a rotated identifier never gets repaired.
 *
 * **3 last.** Superseded history is decided by comparing surviving rows to
 * each other, so it must see the merged set, not the fan-out.
 *
 * ## Idempotence
 *
 * `reconcile(reconcile(rows)) === reconcile(rows)`, by design, because the
 * pass runs again on every refresh over a set that already contains its own
 * previous output. Stage 1 states it directly: *"A caller may supply the raw
 * row, or a prior reconciliation may already have unioned that row with its
 * local representation. Both carry the same current recurrence evidence."*
 */
import type { Endeavor } from '../endeavor/Endeavor'
import { mergeReconciled } from './FieldOwnership'
import { groupByIdentity } from './IdentityIndex'
import { identitiesOf, sourceIdentityKey } from './SourceIdentity'
import {
  type ReconciliationContext,
  defaultReconciliationContext,
} from './ReconciliationContext'
import {
  collapseSupersededOccurrences,
  reconcileSeriesOccurrences,
} from './SeriesReconciliation'

/**
 * Collapse a host fan-out into one row per logical endeavor.
 *
 * Output order is **first-appearance order** of each group's first member:
 * *"unrelated rows remain separate and stable"*. A reconciliation that
 * reordered the day would repaint every surface on every refresh.
 *
 * Merging within a group folds left to right, so a later row is the "incoming
 * update" in `mergeReconciled`'s same-origin rule — which is what makes
 * `[stale, fresh]` resolve to the fresh one.
 */
export const reconcile = (
  endeavors: readonly Endeavor[],
  context: ReconciliationContext = defaultReconciliationContext(),
): readonly Endeavor[] => {
  // Stage 1 — repair rotated identifiers against the raw fan-out.
  const seriesReconciled = reconcileSeriesOccurrences(endeavors, context)

  // A single row (or none) cannot have a duplicate; skip straight to stage 3,
  // which still applies — a lone completed occurrence is still history.
  if (seriesReconciled.length <= 1) {
    return collapseSupersededOccurrences(seriesReconciled, context)
  }

  // Stage 2 — one indexed pass over identity, then one merge per group.
  const groups = groupByIdentity(seriesReconciled)
  const merged = groups.map((group) => {
    const [first, ...rest] = group.memberIndices
    let carrier = seriesReconciled[first as number] as Endeavor
    for (const index of rest) {
      carrier = mergeReconciled(
        carrier,
        seriesReconciled[index] as Endeavor,
        context,
      )
    }
    return carrier
  })

  // Stage 3 — drop superseded occurrences, project a same-day completion.
  return collapseSupersededOccurrences(merged, context)
}

/**
 * The reconciled row a given endeavor ends up in, or `null` when the input
 * does not contain it.
 *
 * A convenience for a detail surface holding one endeavor and wanting the
 * reconciled view of it, without re-implementing identity matching. Identity
 * is by the reconciled row's group membership, so this answers correctly even
 * when the row was merged into a carrier with a different `id`.
 */
export const reconciledCounterpartOf = (
  endeavor: Endeavor,
  endeavors: readonly Endeavor[],
  context: ReconciliationContext = defaultReconciliationContext(),
): Endeavor | null => {
  if (!endeavors.includes(endeavor)) return null
  // Run the WHOLE pipeline, not just the identity stage: series repair can
  // merge two rows that share no identity key yet (a rotated identifier),
  // and skipping it here would answer with the wrong row. Membership in the
  // output is by id or by identity intersection — a merged carrier retains
  // every absorbed row's source routes (integrity rule), so the identities
  // of the input always survive into its carrier.
  const identityKeys = new Set(identitiesOf(endeavor).map(sourceIdentityKey))
  const reconciled = reconcile(endeavors, context)
  return (
    reconciled.find(
      (row) =>
        row.id === endeavor.id ||
        identitiesOf(row).some((identity) =>
          identityKeys.has(sourceIdentityKey(identity)),
        ),
    ) ?? null
  )
}
