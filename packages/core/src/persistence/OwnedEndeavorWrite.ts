/**
 * `persistOwnedEndeavor` — the one write path for an endeavor a feature edits
 * or creates, and the reason a web endeavor reaches Kro Cloud at all.
 *
 * Three features (Capture, Do, Endeavor Detail) used to carry a private copy of
 * a write helper, and every copy wrote the record with **no owner**: a freshly
 * created endeavor was anonymous, and an edit to a pulled cloud endeavor
 * silently dropped the owner it arrived with. The sync sweep only pushes rows
 * owned by the signed-in account, so neither ever left the device. Canon's
 * hosting model is the opposite — a signed-in user's new endeavor is a Kro
 * Cloud endeavor from its first write, exactly as Triage's confirm already does
 * through `pushOne`.
 *
 * Two cases, not one chain. An **existing** row keeps its recorded owner —
 * or its lack of one — full stop: an edit never re-hosts an endeavor. A **new**
 * row takes the owner the domain value itself names (a pulled cloud endeavor
 * carries one); failing that, when the caller hosts it in the cloud, the
 * profile cached at sign-in (the same source the sweep reads); otherwise
 * nobody. The sync watermark and group are carried, never reset. Then, when an
 * owner is known, the row is pushed **immediately** — cloud-first — and a push
 * that cannot happen (`unavailable`, `failed`) leaves the row dirty for the
 * next sweep rather than failing the user's action; the report says which.
 *
 * Lives in the persistence tier because it is shared by three features
 * (`UZF-6`) and touches only ports: two slices of `LocalStore` and a
 * structural push port a Producer hands in from `ThunkExtra` (`RC-6`). It is
 * not a Service and imports none.
 */
import type { Endeavor } from '../domain/endeavor/Endeavor'
import type { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import { endeavorRecordFromEndeavor } from './EndeavorRecord'
import type { LocalStore } from './Stores'

/** What an immediate push answered. Mirrors the sync service's own outcome. */
export type OwnedEndeavorPushOutcome = 'unavailable' | 'succeeded' | 'failed'

/** The one operation of the sync port this write needs. */
export interface OwnedEndeavorPushPort {
  pushOne(params: {
    endeavor: Endeavor
    now: Date
  }): Promise<OwnedEndeavorPushOutcome>
}

export interface PersistOwnedEndeavorDeps {
  readonly localStore: Pick<LocalStore, 'endeavors' | 'userProfiles'>
  readonly endeavorSync: OwnedEndeavorPushPort
}

/** Where a NEW endeavor is hosted — canon's `EndeavorHostingDestination`, reduced to what decides ownership. */
export type OwnedEndeavorHosting = 'cloud' | 'local'

export interface PersistOwnedEndeavorOptions {
  readonly now: Date
  readonly resolvedKind?: EndeavorKind
  /**
   * For a row that does not exist yet: `cloud` stamps the cached profile as
   * owner and pushes; `local` (the default — egress is never implicit) writes
   * it anonymous, on the device only, which is what the picker's On Device
   * means. An existing row is never re-hosted by an edit — its recorded owner
   * (or lack of one) stands.
   */
  readonly hosting?: OwnedEndeavorHosting
}

export interface PersistOwnedEndeavorReport {
  /** The owner the row was written with; `null` on a signed-out device. */
  readonly ownerUserId: string | null
  /** What the immediate push answered; `unavailable` when nobody is signed in. */
  readonly push: OwnedEndeavorPushOutcome
}

export const persistOwnedEndeavor = async (
  deps: PersistOwnedEndeavorDeps,
  endeavor: Endeavor,
  options: PersistOwnedEndeavorOptions,
): Promise<PersistOwnedEndeavorReport> => {
  const { localStore, endeavorSync } = deps
  const existing = await localStore.endeavors.get(endeavor.id)
  const ownerUserId =
    existing !== null
      ? existing.ownerUserId
      : ((endeavor.owner?.type === 'user' ? endeavor.owner.userId : null) ??
        ((options.hosting ?? 'local') === 'cloud'
          ? ((await localStore.userProfiles.current())?.id ?? null)
          : null))

  await localStore.endeavors.put(
    endeavorRecordFromEndeavor(endeavor, {
      now: options.now,
      ownerUserId,
      ownerGroupId: existing?.ownerGroupId ?? null,
      lastSyncedAtEpochMillis: existing?.lastSyncedAtEpochMillis ?? null,
      resolvedKind: options.resolvedKind,
    }),
  )

  if (ownerUserId === null) return { ownerUserId, push: 'unavailable' }

  let push: OwnedEndeavorPushOutcome
  try {
    push = await endeavorSync.pushOne({ endeavor, now: options.now })
  } catch {
    // `pushOne` never throws by contract; a port that does is a failed push,
    // and the row stays dirty for the sweep.
    push = 'failed'
  }
  return { ownerUserId, push }
}
