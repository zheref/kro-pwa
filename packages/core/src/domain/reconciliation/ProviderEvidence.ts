/**
 * Reading a provider's own evidence off an endeavor.
 *
 * This is the seam between the `Endeavor` shape (#7's lane) and the
 * provider-neutral `SourceEvidence` the classification tables decide from.
 * Everything provider-specific about *where* evidence lives is here; nothing
 * provider-specific about *what it means* is.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import type { EndeavorHost } from '../endeavor/EndeavorHost'
import { isKroOwnedHost } from '../endeavor/EndeavorHost'
import type { Shadow } from '../endeavor/Shadow'
import {
  type ProviderClassificationRuleset,
  type SourceEvidence,
  isSeriesRecurrence,
} from './ProviderClassification'

/**
 * `EndeavorSourceResolution.isLinked(to:endeavor:)` — whether this row is tied
 * to `provider` at all, either because the provider hosts it *or* because it
 * carries a non-empty shadow pointing back at that provider.
 *
 * Both halves matter. A locally persisted mirror of an Apple reminder is
 * `hostedBy: [local]` with an Apple shadow, and the whole point of Apple
 * classification is that it still applies to that row.
 */
export const isLinkedToProvider = (
  endeavor: Endeavor,
  provider: string,
): boolean =>
  endeavor.hostedBy.some((host) => host === provider) ||
  (endeavor.shadows ?? []).some(
    (shadow) => shadow.source === provider && shadow.sourceIdentifier !== '',
  )

/** Every shadow this endeavor carries for one provider, in stored order. */
export const shadowsForProvider = (
  endeavor: Endeavor,
  provider: string,
): readonly Shadow[] =>
  (endeavor.shadows ?? []).filter((shadow) => shadow.source === provider)

/**
 * The provider's priority evidence, or `null` when no shadow carries any.
 *
 * **Field-name note.** `Shadow.appleReminderPriority` is canon's name and #7's
 * port of it, and this lane may not rename a field in `domain/endeavor`. It is
 * read here as *the provider's priority evidence* generally: the concept is
 * provider-neutral (Google Tasks has no priority; a provider that does would
 * populate the same slot), only the field's spelling is Apple-flavoured. A
 * rename is a `domain/endeavor` change and belongs to whichever child next
 * owns that lane.
 */
export const providerPriorityEvidence = (
  endeavor: Endeavor,
  provider: string,
): number | null =>
  shadowsForProvider(endeavor, provider).find(
    (shadow) => shadow.appleReminderPriority !== null,
  )?.appleReminderPriority ?? null

/**
 * Normalize an endeavor into the evidence a ruleset decides from.
 *
 * `hasScheduledDate` follows the spec's *"A date without a clock time still
 * counts as scheduled"* by asking only whether either instant exists — canon's
 * `endeavor.start != nil || endeavor.due != nil`.
 */
export const sourceEvidenceFor = (
  endeavor: Endeavor,
  provider: string,
): SourceEvidence => ({
  recurrenceBase: endeavor.repeatConfig?.base.type ?? null,
  priority: providerPriorityEvidence(endeavor, provider),
  hasScheduledDate: endeavor.start !== null || endeavor.due !== null,
})

/**
 * The first registered ruleset whose provider this row is linked to, or `null`
 * when no classifying provider claims it (a Kro-native row, or one from a
 * provider with no table yet).
 *
 * Registration order is precedence order, so a row linked to two classifying
 * providers resolves the same way every time.
 */
export const rulesetFor = (
  endeavor: Endeavor,
  rulesets: readonly ProviderClassificationRuleset[],
): ProviderClassificationRuleset | null =>
  rulesets.find((ruleset) => isLinkedToProvider(endeavor, ruleset.provider)) ??
  null

/**
 * `EndeavorSourceResolution.appleEvidenceRank` — generalized to any provider.
 *
 * When two rows stand in for one logical endeavor, this ranks how *strong*
 * each one's source evidence is, so the merge takes classification and
 * scheduling from the better-informed side. This is the mechanism behind the
 * spec's *"a late cached fetch cannot erase stronger source evidence already
 * received"*: a stale row simply ranks lower and loses the fields it would
 * have overwritten.
 *
 * The ladder, highest first:
 *
 * | Rank | Meaning |
 * |---|---|
 * | `3` | A **provider-native** row — hosted by the provider and by no Kro host. It came straight from the source in this fetch, so it is the freshest possible evidence. |
 * | `2` | Carries the provider's priority evidence — enough to run the full table. |
 * | `1` | Carries a series recurrence — enough to resolve a series kind, nothing more. |
 * | `0` | Linked but uninformative, or not linked at all. |
 *
 * Canon's rank-3 test is `hostedBy.contains(.appleReminders) &&
 * !hostedBy.contains(.local)` — it names `local` only. This port asks
 * `!hostedBy.some(isKroOwnedHost)`, which also excludes `supabase`. Canon's
 * own `isSourceNativeAppleOccurrence`, three functions away, checks **both**
 * Kro hosts for the identical concept, so the one-host version reads as an
 * oversight rather than a distinction; a cloud-persisted mirror is no more
 * "source native" than a local one. Pinned by test.
 */
export const sourceEvidenceRank = (
  endeavor: Endeavor,
  ruleset: ProviderClassificationRuleset,
): number => {
  if (!isLinkedToProvider(endeavor, ruleset.provider)) return 0
  if (isProviderNativeRow(endeavor, ruleset.provider)) return 3
  if (providerPriorityEvidence(endeavor, ruleset.provider) !== null) return 2
  if (isSeriesRecurrence(ruleset, endeavor.repeatConfig)) return 1
  return 0
}

/**
 * `isSourceNativeAppleOccurrence` — hosted by the provider and by no Kro host,
 * i.e. a row as the provider just handed it over, before any local mirror was
 * unioned into it.
 */
export const isProviderNativeRow = (
  endeavor: Endeavor,
  provider: string,
): boolean =>
  endeavor.hostedBy.some((host) => host === provider) &&
  !endeavor.hostedBy.some(isKroOwnedHost)

/**
 * `isKroPersistedAppleMirror` — Kro's own persisted copy of a provider row:
 * linked to the provider *and* stored in a Kro host. This is the row that
 * carries the user's enrichment and therefore the row that must survive a
 * merge.
 */
export const isKroPersistedMirror = (
  endeavor: Endeavor,
  provider: string,
): boolean =>
  isLinkedToProvider(endeavor, provider) &&
  endeavor.hostedBy.some(isKroOwnedHost)

/** The Kro hosts this endeavor is stored in, if any. */
export const kroHostsOf = (endeavor: Endeavor): readonly EndeavorHost[] =>
  endeavor.hostedBy.filter(isKroOwnedHost)

/** The external hosts this endeavor is stored in, if any. */
export const externalHostsOf = (endeavor: Endeavor): readonly EndeavorHost[] =>
  endeavor.hostedBy.filter((host) => !isKroOwnedHost(host))
