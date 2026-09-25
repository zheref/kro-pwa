/**
 * The **host port** the Plan preload fans out over, and the one live host that
 * exists today.
 *
 * Canon's preload runs *"one range request per host"* through
 * `EndeavorsQueryClient`, which fans a windowed query out to every capable
 * host. This repo has exactly one host it can reach — the on-device store
 * (KC-IS-#10) — and Google Calendar is #33's. So the *shape* is defined here,
 * as the issue asks, with the local store as its only implementation; #33 adds
 * a second `PlanHost` and nothing in the feature changes.
 *
 * ## Why this is not a new `…Service` in `ThunkExtra`
 *
 * `RC-6`/`RC-21` say a Producer reaches an external system through the closed
 * `ThunkExtra` manifest. The external system here is **already** in that
 * manifest: `extra.localStore`. A `PlanHost` is not a second injection
 * mechanism — it is an adapter *built from* an injected service, inside the
 * Producer that owns it, so the manifest stays closed and the fan-out stays
 * expressible. `makeLocalStorePlanHost` therefore takes the store as an
 * argument and imports nothing from `services/`.
 *
 * When #33 lands, its `googleCalendarService` becomes a `ThunkExtra` field
 * (a real manifest edit) and `makeGoogleCalendarPlanHost(service)` becomes the
 * second entry in `planHostsFor(extra)`.
 *
 * ## What "in the window" means
 *
 * A host returns every endeavor whose extent **overlaps** the half-open window,
 * so a meeting that begins the night before still shows on the morning it runs
 * into. The overlap here is deliberately one notch more permissive than the
 * layout pass's: a zero-length event sitting exactly on the window's opening
 * instant is fetched (`end >= range.start`) but is not drawn
 * (`end > dayStart`). A fetch that under-returns loses data the surface can
 * never recover; a layout that under-draws is the canon behaviour for a
 * zero-extent card and is what `TimelineLayout` keeps.
 *
 * Endeavors with no `start` are not returned: the timeline is start-driven, and
 * an undated task belongs to the list surface, which reads its own query.
 */
import type {
  Endeavor,
  EndeavorHost,
  EndeavorRecord,
  LocalStore,
} from '@kro/core'
import { EndeavorHost as Host, endeavorFromRecord } from '@kro/core'

/** The half-open `[start, end)` window a host is asked for. */
export interface PlanHostRange {
  readonly start: Date
  readonly end: Date
}

/**
 * One fetchable source of timeline events.
 *
 * `fetchRange` may throw — it is a boundary, and the `Result` translation is
 * the Producer's (`RC-33`: *"the Service does not translate to `Result`"*).
 */
export interface PlanHost {
  readonly id: EndeavorHost
  fetchRange(
    range: PlanHostRange,
    options?: { readonly signal?: AbortSignal },
  ): Promise<readonly Endeavor[]>
}

/** Whether an endeavor's extent overlaps a half-open window. */
export const overlapsPlanHostRange = (
  endeavor: Endeavor,
  range: PlanHostRange,
): boolean => {
  const start = endeavor.start
  if (start === null) return false
  const end = new Date(start.getTime() + (endeavor.duration ?? 0) * 1000)
  return (
    end.getTime() >= range.start.getTime() &&
    start.getTime() < range.end.getTime()
  )
}

/**
 * Decode the rows one read returned, skipping any that cannot be decoded.
 *
 * Canon's repository does the same — `guard let endeavor = try? record
 * .toEndeavor(…) else { continue }` — and the reason is in
 * `endeavorFromRecord`'s own note: *"a stricter reader would hide rows the
 * phone still shows."* One unreadable row must not empty the day.
 */
export const endeavorsFromRecords = (
  records: readonly EndeavorRecord[],
): readonly Endeavor[] => {
  const endeavors: Endeavor[] = []
  for (const record of records) {
    const decoded = endeavorFromRecord(record)
    if (decoded.ok) endeavors.push(decoded.value)
  }
  return endeavors
}

/**
 * The on-device store as a `PlanHost` — the only live host until #33.
 *
 * The store has no range read of its own (its `all()` is the whole mirror, by
 * design: *"the local mirror fetches everything and lets kinds/predicates/the
 * lens narrow"*), so the window is applied here. That is a fetch-shape detail
 * of this host, not of the port: a calendar host will push the window into its
 * request instead.
 */
export const makeLocalStorePlanHost = (localStore: LocalStore): PlanHost => ({
  id: Host.local,
  async fetchRange(range) {
    const records = await localStore.endeavors.all()
    return endeavorsFromRecords(records).filter((endeavor) =>
      overlapsPlanHostRange(endeavor, range),
    )
  },
})

/**
 * Run every host's range request concurrently and concatenate the results in
 * host order.
 *
 * Concatenation, not merge: de-duplication across hosts is the reconciliation
 * pass's job (#12), which the caller applies afterwards. Doing it here would be
 * a second, weaker identity rule sitting in front of the real one.
 *
 * A host that throws contributes nothing and does **not** fail the fan-out —
 * canon's per-host `.bestEffort` mode. The caller still learns the window
 * settled, which is what keeps the activity signal terminating.
 */
export const fetchPlanHostRange = async (
  hosts: readonly PlanHost[],
  range: PlanHostRange,
  options?: { readonly signal?: AbortSignal },
): Promise<readonly Endeavor[]> => {
  const settled = await Promise.all(
    hosts.map(async (host) => {
      try {
        return await host.fetchRange(range, options)
      } catch {
        return [] as readonly Endeavor[]
      }
    }),
  )
  return settled.flat()
}
