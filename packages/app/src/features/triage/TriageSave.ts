/**
 * *"Durable save (offline-first)"* — the order, and what a push that does not
 * land means.
 *
 * Canon's shape is `EndeavorEditException.saveOfflineFirst`, and it is two
 * `do/catch` blocks in a fixed order:
 *
 * 1. `endeavorRepository.upsertLocal(endeavor)` — on failure return
 *    `.localPersistenceFailed` **and stop**. Nothing is pushed.
 * 2. `objectsClient().updateEndeavor(endeavor)` — on failure return
 *    `.remoteSyncFailed(exception, persisted: endeavor)`, carrying the endeavor
 *    that *did* reach disk.
 *
 * That `persisted:` payload is the whole contract: a failed push is not a
 * failed save. The doc says it twice — *"A local-save failure is the only case
 * where the triage decision truly wasn't captured"* and *"it does not roll back
 * or re-prompt the just-completed triage decision"*.
 *
 * ## The transport is #31's, and this module says so rather than faking it
 *
 * kro-pwa has no Supabase client yet (epic child #31) and `ThunkExtra` carries
 * exactly one store. So step 2 has **no transport to attempt** today. Two
 * things follow, and both are deliberate:
 *
 * - The decision function below takes the transport's result as an argument,
 *   so `unavailable`, `failed` and `succeeded` are all real, tested branches
 *   and #31 has a landing spot that needs no new shape.
 * - `TriageProducer` binds it to `unavailable`. Reporting `pushed` with no
 *   client behind it would be the one thing worse than not pushing: a row that
 *   claims to be synced and is not.
 *
 * Either way the durability guarantee holds unchanged, because it is a property
 * of the **order**, not of the transport: the row is on disk and dirty before
 * step 2 is even considered.
 *
 * ## No automatic retry — canon's own known gap, ported as a gap
 *
 * *"There is no automatic background retry yet, though: the remote push is only
 * attempted again if this endeavor goes through another save path later (e.g.
 * an Edit save), not on a timer or connectivity change. **Planned:** a
 * pending-push sweep on reconnect/refresh."*
 *
 * `TRIAGE_RETRIES_PUSH_AUTOMATICALLY` states that as an asserted `false` rather
 * than as an absence, so the suite fails if someone later adds a timer here
 * instead of building the planned sweep in #31.
 */
import { type Endeavor, EndeavorHost, assertNever } from '@kro/core'

/**
 * The two phases, in the only order they may run. Exported so acceptance
 * criterion 3 is checkable as a value rather than by reading the Producer.
 */
export const TriageSaveStep = {
  localStore: 'localStore',
  remotePush: 'remotePush',
} as const

export type TriageSaveStep =
  (typeof TriageSaveStep)[keyof typeof TriageSaveStep]

/** Local first, always. */
export const triageSaveOrder: readonly TriageSaveStep[] = [
  TriageSaveStep.localStore,
  TriageSaveStep.remotePush,
]

/** Canon's known gap, as a fact the suite can assert. */
export const TRIAGE_RETRIES_PUSH_AUTOMATICALLY = false

/** What the transport reported, or that there was none. */
export const TriagePushTransport = {
  /** No client is wired for this host yet (#31). */
  unavailable: 'unavailable',
  /** The host accepted the write. */
  succeeded: 'succeeded',
  /** The host was reachable-ish and refused, or the device is offline. */
  failed: 'failed',
} as const

export type TriagePushTransport =
  (typeof TriagePushTransport)[keyof typeof TriagePushTransport]

/** Why a push did not land. */
export const TriagePushDeferral = {
  transportUnavailable: 'transportUnavailable',
  pushFailed: 'pushFailed',
} as const

export type TriagePushDeferral =
  (typeof TriagePushDeferral)[keyof typeof TriagePushDeferral]

/**
 * The outcome of step 2, as one discriminated field (`UZF-9`) — never a
 * `didPush` boolean beside a `pushError`, which could describe "pushed and
 * failed" at once.
 */
export type TriagePushOutcome =
  /** Nothing but Kro's own store owns this row — there is nothing to push. */
  | { readonly kind: 'notApplicable' }
  /** Every remote host confirmed the write. */
  | { readonly kind: 'pushed'; readonly hosts: readonly EndeavorHost[] }
  /** The local save stands; the row stays dirty for a later save path. */
  | {
      readonly kind: 'deferred'
      readonly hosts: readonly EndeavorHost[]
      readonly reason: TriagePushDeferral
    }

/**
 * The hosts a push would target — *"the endeavor's remote host"*.
 *
 * `local` is the durable store the first step already wrote, so it is never a
 * push target. Everything else is: `supabase` is Kro Cloud (canon's
 * `objectsClient`), and the external calendar/reminders hosts are canon's
 * `EndeavorMutationHost` write-back leg. Both legs are #31's and #33's; this
 * only names them.
 */
export const triageRemotePushHosts = (
  endeavor: Endeavor,
): readonly EndeavorHost[] =>
  endeavor.hostedBy.filter((host) => host !== EndeavorHost.local)

/**
 * Step 2's outcome for one endeavor.
 *
 * A row with no remote host short-circuits to `notApplicable` **before** the
 * transport is consulted, which is why an unavailable transport does not make
 * every purely-local triage look like a pending sync.
 */
export const triagePushOutcomeFor = (params: {
  readonly endeavor: Endeavor
  readonly transport: TriagePushTransport
}): TriagePushOutcome => {
  const hosts = triageRemotePushHosts(params.endeavor)
  if (hosts.length === 0) return { kind: 'notApplicable' }

  switch (params.transport) {
    case TriagePushTransport.succeeded:
      return { kind: 'pushed', hosts }
    case TriagePushTransport.unavailable:
      return {
        kind: 'deferred',
        hosts,
        reason: TriagePushDeferral.transportUnavailable,
      }
    case TriagePushTransport.failed:
      return { kind: 'deferred', hosts, reason: TriagePushDeferral.pushFailed }
    default:
      return assertNever(params.transport)
  }
}

/**
 * The copy the operation-status indicator shows, or `null` when there is
 * nothing to say.
 *
 * Canon routes a remote failure through `onOperationError`, i.e. the same
 * status surface every other background failure uses — a banner, not a dialog,
 * and never a re-prompt. The copy therefore states what happened *and* that the
 * decision is safe, because a user who is told only "sync failed" has no way to
 * know their triage survived.
 */
export const triagePushNotice = (outcome: TriagePushOutcome): string | null => {
  switch (outcome.kind) {
    case 'notApplicable':
    case 'pushed':
      return null
    case 'deferred':
      return outcome.reason === TriagePushDeferral.transportUnavailable
        ? 'Saved on this device. Syncing to your other hosts is not set up yet.'
        : "Saved on this device. We couldn't reach your other hosts — it will sync on the next save."
    default:
      return assertNever(outcome)
  }
}
