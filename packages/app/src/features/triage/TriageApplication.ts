/**
 * *"Persistence on confirm"* — the port of `MainShifters.applyTriageDecision`,
 * plus the Kro-enhanced promotion the same moment triggers.
 *
 * ## Where the matrix guard and canon disagree
 *
 * #7's `with…` helpers are **matrix-guarded**: they consult
 * `EndeavorFieldRelevance` and return the same object when the field is not
 * relevant to the endeavor's kind. Canon's `applyTriageDecision` is a plain
 * struct mutation with no guard at all, so for three of its writes the guarded
 * helper would silently drop a decision the user made:
 *
 * | canon writes | guarded on | no-ops for | so this port |
 * |---|---|---|---|
 * | `withDeferred(to:reason:)` | `.defers` → tracks `.due` | **habit**, calendarEvent | rebuilds explicitly |
 * | `withRescheduled(start:duration:)` | `.start` | the three meta kinds | rebuilds explicitly |
 * | `sessionPoints` | `.sessionPoints` | calendarEvent, meta kinds | rebuilds explicitly |
 * | `status` / `value` / `effort` / `expiry` | relevant to **every** kind | — | uses the guarded helper |
 *
 * The habit row is the one that bites: Pending Triage is full of habits, and
 * `withDeferred` on a habit is a no-op, so routing Triage's due-date write
 * through it would make "Schedule this habit" do nothing. That is the same
 * finding — and the same fix — as KC-IS-#23's `scheduledForToday`, and the same
 * reason #12's ingestion helpers stay unguarded: a guard written for a *user
 * editing a field on Detail* is not a guard for *the system applying a decision
 * the user already made*. Where the matrix and canon agree, the guarded helper
 * is used, so the agreement is asserted rather than assumed.
 *
 * ## Promotion happens here, and only on confirm
 *
 * *"Tapping into a triage flow on a Kro-tourist is fine; confirming it is what
 * promotes."* `triageConfirmed` is the only trigger this module passes, and it
 * passes it **before** applying the decision so the Kro-only fields land on a
 * row that already has somewhere to keep them (`KroEnhanced.md`: *"the rating
 * has nowhere to live unless we promote the endeavor"*). Entering Triage
 * carries `triageEntered`, which `triggerExpressesPromotionIntent` rejects —
 * `triageEntryPromotes` exists so that is a fact a test can state directly.
 */
import {
  type Defer,
  EisenhowerQuadrant,
  type Endeavor,
  EndeavorHost,
  EndeavorStatus,
  PromotionTrigger,
  makeDefer,
  shouldPromoteToEnhanced,
  withEffort,
  withExpiry,
  withPromotedToEnhanced,
  withStatus,
  withValue,
} from '@kro/core'
import type { TriageDecision } from './TriageRules'

/** `reason: "triage"` — canon's audit string on the appended `Defer`. */
export const TRIAGE_DEFER_REASON = 'triage'

/**
 * The Kro store a promotion adds. On web the durable store is IndexedDB, i.e.
 * `local`; `supabase` becomes reachable with the cloud-sync child (#31), and
 * promoting to a host with no client behind it would claim an overlay lives
 * somewhere it does not.
 */
export const TRIAGE_PROMOTION_HOST: EndeavorHost = EndeavorHost.local

/** Whether confirming this triage will promote a tourist to Kro-enhanced. */
export const triageWillPromote = (endeavor: Endeavor): boolean =>
  shouldPromoteToEnhanced(endeavor, PromotionTrigger.triageConfirmed)

/**
 * Whether **entering** Triage promotes. Always `false` — stated as a function
 * rather than a comment so the rule is asserted in the suite and would fail
 * loudly if `triggerExpressesPromotionIntent` ever changed.
 */
export const triageEntryPromotes = (endeavor: Endeavor): boolean =>
  shouldPromoteToEnhanced(endeavor, PromotionTrigger.triageEntered)

/**
 * The scheduling half of `applyTriageDecision`'s switch, verbatim in structure.
 *
 * Note what the **both-set** branch does *not* do: canon writes `start` and
 * `duration` and leaves `due` exactly as it was (`withRescheduled(start:
 * duration:)` touches two fields). The doc agrees — *"the endeavor is
 * rescheduled (start = due, duration = picked)"* — so an endeavor triaged with
 * both a date and a chip ends up with the picked moment as its **start**, not
 * as its due date. Ported as written; recorded in the PR because it is
 * surprising.
 */
const withTriageScheduling = (
  endeavor: Endeavor,
  decision: TriageDecision,
  now: Date,
): Endeavor => {
  const { dueDate, durationSeconds } = decision

  if (dueDate !== null && durationSeconds !== null) {
    // `withRescheduled` — rebuilt: guarded on `.start`, which is irrelevant to
    // the three meta kinds, and canon guards nothing here.
    return { ...endeavor, start: dueDate, duration: durationSeconds }
  }

  if (dueDate !== null) {
    // `withDeferred(to:reason:)` — rebuilt: guarded on `.defers`, which tracks
    // `.due` and is therefore false for a **habit**, the kind the Inbox is full
    // of. See the module note.
    return {
      ...endeavor,
      due: dueDate,
      defers: [
        ...endeavor.defers,
        makeDefer({ made: now, reason: TRIAGE_DEFER_REASON, target: dueDate }),
      ],
    }
  }

  if (durationSeconds !== null && endeavor.start !== null) {
    // "Keep start, new duration" — same rebuild, same reason.
    return { ...endeavor, start: endeavor.start, duration: durationSeconds }
  }

  return endeavor
}

/**
 * `applyTriageDecision(_:)` — the in-memory decision, applied atomically.
 *
 * **Archive returns early**, exactly as canon does: the endeavor's status goes
 * to `closed` and *none* of the Kro-enhanced fields are written. That is not an
 * oversight to tidy up — the doc's persistence branch diagram routes
 * `Eliminate` straight to the save with nothing but the status change, and a
 * reward or expiry written onto an archived row would be a value the user can
 * never see again.
 *
 * For every other quadrant, `null` on a decision field means *"leaves the
 * existing value untouched"* (canon's `if let`), never "clear it". Triage can
 * therefore raise a rating but never clear one, which the PR records.
 */
export const endeavorWithTriageDecision = (
  endeavor: Endeavor,
  decision: TriageDecision,
  options: { readonly now: Date },
): Endeavor => {
  if (decision.quadrant === EisenhowerQuadrant.delete) {
    // `.status` is relevant to every kind, so the guarded helper and canon's
    // bare assignment are the same write.
    return withStatus(endeavor, EndeavorStatus.closed)
  }

  let updated = withTriageScheduling(endeavor, decision, options.now)

  if (decision.rewardPoints !== null) {
    // `sessionPoints` — rebuilt: guarded to task/reminder/habit, so the helper
    // would drop the reward on a calendar event or a meta kind.
    updated = { ...updated, sessionPoints: decision.rewardPoints }
  }
  if (decision.value !== null) {
    updated = withValue(updated, decision.value)
  }
  if (decision.effort !== null) {
    updated = withEffort(updated, decision.effort)
  }
  if (decision.expiryDate !== null) {
    updated = withExpiry(updated, decision.expiryDate)
  }

  return updated
}

/**
 * The whole confirm-time mutation: promote first, then apply.
 *
 * `withPromotedToEnhanced` returns the **same reference** for anything that is
 * not a tourist, so a citizen or an already-enhanced row pays nothing and no
 * caller can promote by accident (`KroEnhanced.md` integrity rule 5). It adds a
 * Kro host and touches nothing else — no shadow, no external host, no new
 * identifier — which is integrity rule 1 holding by omission.
 */
export const endeavorWithTriageConfirmed = (
  endeavor: Endeavor,
  decision: TriageDecision,
  options: { readonly now: Date },
): Endeavor => {
  const promoted = withPromotedToEnhanced(endeavor, {
    kroHost: TRIAGE_PROMOTION_HOST,
    trigger: PromotionTrigger.triageConfirmed,
  })
  return endeavorWithTriageDecision(promoted, decision, options)
}

/**
 * The `Defer` rows a triage appended — the ones the Producer has to write
 * alongside the endeavor row.
 *
 * Persisting the endeavor without them would leave a reload showing the new due
 * date with no record of how it got there, which is the same reason
 * `scheduleForTodayThunk` writes both.
 */
export const defersAddedByTriage = (
  before: Endeavor,
  after: Endeavor,
): readonly Defer[] => after.defers.slice(before.defers.length)
