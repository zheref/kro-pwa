/**
 * The Kro-enhanced model — `docs/Features/KroEnhanced.md`.
 *
 * > Every endeavor in the user's pool falls into exactly one of three
 * > categories … An `Endeavor` whose `hostedBy` is `[.local]` or `[.supabase]`
 * > (or both) is a **Kro-citizen** … whose `hostedBy` includes an external
 * > host and **no** Kro-side host is a **Kro-tourist** … whose `hostedBy`
 * > includes BOTH an external host AND `.local` (or `.supabase`) is
 * > **Kro-enhanced**.
 *
 * The discriminator is therefore a pure read of `hostedBy` and nothing else —
 * not of the shadows, not of which fields happen to be set. That matters: a
 * tourist with a `value` set is not "sort of enhanced", it is a tourist whose
 * value has nowhere to live. Promotion is what changes the category, and
 * promotion is an explicit act.
 */
import { assertNever } from '../../library/assertNever'
import type { Endeavor } from '../endeavor/Endeavor'
import { withAddedHost } from '../endeavor/EndeavorMutations'
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { EndeavorHost } from '../endeavor/EndeavorHost'
import { isKroOwnedHost } from '../endeavor/EndeavorHost'
import { externalHostsOf, kroHostsOf } from './ProviderEvidence'
import type { ReconciliationContext } from './ReconciliationContext'
import { defaultReconciliationContext } from './ReconciliationContext'

/**
 * The category an endeavor occupies.
 *
 * **Four members, not the spec's three — a deliberate deviation.** The spec
 * says "exactly one of three", and over *persisted* endeavors that is true and
 * this type agrees. But `hostedBy` is `[]` for a row no store has accepted yet
 * — a draft from the capture prompt, an in-memory fixture — and `Endeavor`
 * models that state explicitly (`isOnlyInMemory`, `hasBeenPersisted`).
 *
 * Folding it into `citizen` was the alternative and is worse: `citizen` means
 * "Kro is the source of truth", and the promotion predicates below would then
 * report an unhosted draft as needing no promotion, when in fact it needs
 * persisting. A fourth member makes the gap visible to every `switch` instead
 * of hiding it in the most convenient neighbour.
 */
export const EndeavorCitizenship = {
  /** Kro owns everything. Hosted only by Kro stores. */
  citizen: 'citizen',
  /** An external host owns it; Kro mirrors it read-only. */
  tourist: 'tourist',
  /** External host owns the native fields; Kro carries the overlay. */
  enhanced: 'enhanced',
  /** Not persisted anywhere yet. See the note above. */
  unhosted: 'unhosted',
} as const

export type EndeavorCitizenship =
  (typeof EndeavorCitizenship)[keyof typeof EndeavorCitizenship]

export const endeavorCitizenships: readonly EndeavorCitizenship[] = [
  EndeavorCitizenship.citizen,
  EndeavorCitizenship.tourist,
  EndeavorCitizenship.enhanced,
  EndeavorCitizenship.unhosted,
]

/** The truth table over `hostedBy`, and nothing else. */
export const citizenshipOf = (endeavor: Endeavor): EndeavorCitizenship => {
  const hasKro = endeavor.hostedBy.some(isKroOwnedHost)
  const hasExternal = endeavor.hostedBy.some((host) => !isKroOwnedHost(host))
  if (hasKro && hasExternal) return EndeavorCitizenship.enhanced
  if (hasKro) return EndeavorCitizenship.citizen
  if (hasExternal) return EndeavorCitizenship.tourist
  return EndeavorCitizenship.unhosted
}

export const isKroCitizen = (endeavor: Endeavor): boolean =>
  citizenshipOf(endeavor) === EndeavorCitizenship.citizen

export const isKroTourist = (endeavor: Endeavor): boolean =>
  citizenshipOf(endeavor) === EndeavorCitizenship.tourist

export const isKroEnhanced = (endeavor: Endeavor): boolean =>
  citizenshipOf(endeavor) === EndeavorCitizenship.enhanced

/**
 * Whether Kro-specific fields have anywhere to live on this row.
 *
 * *"A Kro-tourist endeavor never carries Kro-specific fields. If the user
 * opens Triage on one and tries to set a value rating, the rating has nowhere
 * to live unless we promote the endeavor."*
 */
export const canCarryKroOverlay = (endeavor: Endeavor): boolean => {
  const citizenship = citizenshipOf(endeavor)
  switch (citizenship) {
    case EndeavorCitizenship.citizen:
    case EndeavorCitizenship.enhanced:
      return true
    case EndeavorCitizenship.tourist:
    case EndeavorCitizenship.unhosted:
      return false
    default:
      return assertNever(citizenship)
  }
}

/**
 * The fields whose presence marks an endeavor as carrying Kro enrichment —
 * `KroEnhanced.md`'s "**enhanced**" column, restricted to what `Endeavor`
 * actually stores.
 *
 * `quadrant` is in the spec's matrix but is not an `Endeavor` field; the
 * Eisenhower decision is carried by triage (#25), which is also where the
 * confirm-promotes rule is enforced at the UI boundary.
 */
export const kroOverlayFields = [
  'sessionPoints',
  'value',
  'effort',
  'expiry',
  'associatedColor',
  'projectId',
] as const

/** Whether any Kro-only field is set on this row. */
export const hasKroOverlayValues = (endeavor: Endeavor): boolean =>
  endeavor.sessionPoints !== null ||
  endeavor.value !== null ||
  endeavor.effort !== null ||
  endeavor.expiry !== null ||
  endeavor.associatedColor !== null ||
  endeavor.projectId !== null

/** Whether a focus attempt has been recorded against this row. */
export const hasRecordedPerformance = (endeavor: Endeavor): boolean =>
  endeavor.performances.length > 0

/**
 * What the user just did. Promotion is gated on this and never inferred,
 * which is integrity rule 5: *"**Promote** without the user's intent."*
 */
export const PromotionTrigger = {
  /** The first Kro-specific field was set. */
  kroFieldSet: 'kroFieldSet',
  /** A focus performance was recorded and must live in Kro. */
  focusPerformanceRecorded: 'focusPerformanceRecorded',
  /** Triage was **confirmed**. Promotes. */
  triageConfirmed: 'triageConfirmed',
  /**
   * Triage was merely opened. Does **not** promote — *"Tapping into a triage
   * flow on a Kro-tourist is fine; *confirming* it is what promotes …
   * Cancelling out leaves it as a tourist."*
   */
  triageEntered: 'triageEntered',
} as const

export type PromotionTrigger =
  (typeof PromotionTrigger)[keyof typeof PromotionTrigger]

export const promotionTriggers: readonly PromotionTrigger[] = [
  PromotionTrigger.kroFieldSet,
  PromotionTrigger.focusPerformanceRecorded,
  PromotionTrigger.triageConfirmed,
  PromotionTrigger.triageEntered,
]

/** Whether this trigger expresses the intent promotion requires. */
export const triggerExpressesPromotionIntent = (
  trigger: PromotionTrigger,
): boolean => {
  switch (trigger) {
    case PromotionTrigger.kroFieldSet:
    case PromotionTrigger.focusPerformanceRecorded:
    case PromotionTrigger.triageConfirmed:
      return true
    case PromotionTrigger.triageEntered:
      return false
    default:
      return assertNever(trigger)
  }
}

/**
 * Whether this endeavor should be promoted to Kro-enhanced right now.
 *
 * Both halves are required: only a **tourist** can be promoted (a citizen
 * already owns everything; an enhanced row already has its overlay), and only
 * an intent-bearing trigger promotes.
 */
export const shouldPromoteToEnhanced = (
  endeavor: Endeavor,
  trigger: PromotionTrigger,
): boolean => isKroTourist(endeavor) && triggerExpressesPromotionIntent(trigger)

/**
 * Integrity rules 1 and 5 — promote a tourist by adding a Kro host.
 *
 * **Rule 1, "never duplicate the original on the host", is enforced by what
 * this function does not do.** It adds a Kro host and touches nothing else:
 * no shadow is created, no external host is added, no identifier is minted.
 * *"The Kro shadow is local-only / Supabase-only; it does not call back to the
 * host to create a copy."* The external row is left exactly as it was.
 *
 * **Rule 5** is the `shouldPromoteToEnhanced` gate: without an intent-bearing
 * trigger the **same object reference** comes back, so a caller cannot promote
 * by accident and a memoized selector sees no change.
 *
 * `kroHost` must be a Kro-owned store; anything else is refused the same way.
 */
export const withPromotedToEnhanced = (
  endeavor: Endeavor,
  params: {
    readonly kroHost: EndeavorHost
    readonly trigger: PromotionTrigger
  },
): Endeavor => {
  if (!isKroOwnedHost(params.kroHost)) return endeavor
  if (!shouldPromoteToEnhanced(endeavor, params.trigger)) return endeavor
  // `withAddedHost` is one of #7's five unguarded ingestion helpers, kept open
  // for exactly this path.
  return withAddedHost(endeavor, params.kroHost)
}

/**
 * Integrity rule 2 — remove the Kro overlay without touching the original.
 *
 * *"Deletion of a Kro-enhanced shadow only removes the overlay; the external
 * endeavor stays put."* So this drops the Kro hosts and clears the Kro-only
 * fields, leaving the external hosts and every shadow (the route back to the
 * original) in place. The result is a tourist projection of the same item.
 *
 * Refused — same reference back — for anything that is not currently enhanced.
 * On a **citizen** the refusal is the rule doing its job: Kro is the only
 * store, so "remove the overlay" would delete the endeavor itself, which is a
 * deletion and belongs to a deletion path, not to this one.
 */
export const withKroOverlayRemoved = (endeavor: Endeavor): Endeavor => {
  if (!isKroEnhanced(endeavor)) return endeavor
  return {
    ...endeavor,
    hostedBy: externalHostsOf(endeavor),
    sessionPoints: null,
    value: null,
    effort: null,
    expiry: null,
    associatedColor: null,
    projectId: null,
  }
}

/**
 * What to do about a shadow whose original has gone missing from its host —
 * integrity rule 4.
 *
 * *"A reconcile pass detects missing originals and cleans up their shadows
 * after a quarantine window (so a transient sync failure doesn't immediately
 * purge user data)."*
 *
 * The disposition is deliberately a **decision, not an action**: this tier
 * cannot know whether the original is truly gone or the provider is merely
 * unreachable, and the spec's failure section is explicit that *"When a
 * provider is temporarily unavailable, Kro may present its cached local
 * representation."* The caller supplies `missingSince` — the first moment the
 * original was observed absent — and the pass decides.
 */
export const OrphanDisposition = {
  /** Not orphaned, or still inside the quarantine window. Keep it. */
  retain: 'retain',
  /** Absent for longer than the window. Safe to clean up. */
  cleanUp: 'cleanUp',
} as const

export type OrphanDisposition =
  (typeof OrphanDisposition)[keyof typeof OrphanDisposition]

export const orphanDispositionFor = (params: {
  /** When the original was first observed missing; `null` = not missing. */
  readonly missingSince: Date | null
  readonly now: Date
  readonly quarantineSeconds: TimeIntervalSeconds
}): OrphanDisposition => {
  const { missingSince, now, quarantineSeconds } = params
  if (missingSince === null) return OrphanDisposition.retain
  const elapsedSeconds = (now.getTime() - missingSince.getTime()) / 1000
  // Strictly greater: at exactly the window's edge the shadow is still inside
  // it. A boundary has to fall on one side, and retaining is the conservative
  // one for a rule whose whole purpose is not purging user data early.
  return elapsedSeconds > quarantineSeconds
    ? OrphanDisposition.cleanUp
    : OrphanDisposition.retain
}

/**
 * Apply rule 4 to one endeavor: drop the shadows for a provider whose original
 * has been gone longer than the quarantine window.
 *
 * Returns the **same reference** when nothing is dropped. When the last shadow
 * goes, `shadows` normalizes back to `null` rather than `[]`, matching
 * `withRemovedShadow`'s contract in #7.
 *
 * Note what this does *not* do: it never removes a host and never deletes the
 * endeavor. An enhanced row whose external original vanished becomes a citizen
 * only when its external host is dropped, which is the sync engine's call
 * (#31), not this predicate's.
 */
export const withOrphanedShadowsCleaned = (
  endeavor: Endeavor,
  params: {
    /** First-observed-missing instant per provider. Absent = present. */
    readonly missingSinceByProvider: ReadonlyMap<string, Date>
    readonly now: Date
    readonly context?: ReconciliationContext
  },
): Endeavor => {
  const context = params.context ?? defaultReconciliationContext()
  const shadows = endeavor.shadows
  if (shadows === null) return endeavor

  const retained = shadows.filter(
    (shadow) =>
      orphanDispositionFor({
        missingSince: params.missingSinceByProvider.get(shadow.source) ?? null,
        now: params.now,
        quarantineSeconds: context.orphanQuarantineSeconds,
      }) === OrphanDisposition.retain,
  )
  if (retained.length === shadows.length) return endeavor
  return { ...endeavor, shadows: retained.length === 0 ? null : retained }
}

/**
 * Integrity rule 3, stated as a predicate — *"Conflict resolution is
 * field-scoped, not record-scoped."*
 *
 * Answers whether a proposed write would overwrite a host-native field on a
 * row whose host owns it. `FieldOwnership.mergeReconciled` is the enforcement;
 * this is the check a mutation path (#31's sync engine) can run before
 * writing, and what a test asserts against.
 */
export const wouldOverwriteHostNativeField = (
  endeavor: Endeavor,
  field: string,
): boolean =>
  !kroOwnsField(endeavor, field) && citizenshipOf(endeavor) !== 'unhosted'

/**
 * Whether Kro owns `field` on this endeavor.
 *
 * Kro owns every field on a citizen; on a tourist or an enhanced row it owns
 * exactly the overlay fields. Anything else belongs to the host.
 */
export const kroOwnsField = (endeavor: Endeavor, field: string): boolean => {
  const citizenship = citizenshipOf(endeavor)
  switch (citizenship) {
    case EndeavorCitizenship.citizen:
    case EndeavorCitizenship.unhosted:
      return true
    case EndeavorCitizenship.enhanced:
    case EndeavorCitizenship.tourist:
      return (kroOverlayFields as readonly string[]).includes(field)
    default:
      return assertNever(citizenship)
  }
}

/** The Kro stores backing this endeavor's overlay, if any. */
export const overlayHostsOf = kroHostsOf
