/**
 * The Triage surface's typed failure union (`RC-8`, `UZF-8`).
 *
 * Canon declares no exception type for Triage at all: `TriageFeature` has no
 * effects (`TriageProducer.swift` is an empty extension with a comment saying
 * so), and the durable save lives in `MainFeature`, which reuses
 * `EndeavorEditException`. This port keeps the save in the Triage lane — the
 * decision and its persistence are one behaviour and splitting them would put
 * acceptance criterion 3 in a feature that does not exist yet — so the failure
 * union is Triage's own.
 *
 * ## What is deliberately **not** in this union
 *
 * There is no `remotePushFailed` case, and that is the whole point of the
 * durable-save contract. Canon: *"A remote failure surfaces to the user through
 * the app's existing operation-status indicator; it does not roll back or
 * re-prompt the just-completed triage decision."* A failed push is therefore a
 * **status**, not a failure of the save — it rides on the successful outcome as
 * a `TriagePushOutcome` (see `TriageSave.ts`). Modelling it as an exception
 * would make the slice's `save` lifecycle land in `failed` for a decision that
 * is durably on disk, which is exactly the lie canon's shape avoids.
 *
 * `localSaveFailed` is the mirror image: canon's
 * `EndeavorEditException.localPersistenceFailed`, and *"the only case where the
 * triage decision truly wasn't captured"*.
 */
import { type Exception, exception } from '@kro/core'

export type TriageException =
  /** Reading the endeavor (or the day's pool) to open Triage failed. */
  | Exception<'sessionLoadFailed'>
  /** The endeavor being triaged is not on disk — a stale row id. */
  | Exception<'endeavorNotFound'>
  /** Confirm fired while the gate still blocked it. Carries the reason. */
  | Exception<'incompleteDecision'>
  /** The local upsert failed — the decision was **not** captured. */
  | Exception<'localSaveFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const TriageExceptions = {
  sessionLoadFailed: (reason: string): TriageException =>
    exception('sessionLoadFailed', `Couldn't open Triage: ${reason}`, true),

  endeavorNotFound: (id: string): TriageException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is available to triage.`,
      false,
    ),

  incompleteDecision: (blockedReason: string): TriageException =>
    exception('incompleteDecision', blockedReason, true),

  localSaveFailed: (reason: string): TriageException =>
    exception(
      'localSaveFailed',
      `Couldn't save your triage decision: ${reason}`,
      true,
    ),

  unknown: (message: string): TriageException =>
    exception('unknown', message, true),
} as const
