/**
 * Google Calendar as a **`PlanHost`** — the second entry in KC-IS-#18's fan-out.
 *
 * `PlanHosts.ts` predicted this file almost exactly: *"When #33 lands, its
 * `googleCalendarService` becomes a `ThunkExtra` field (a real manifest edit)
 * and `makeGoogleCalendarPlanHost(service)` becomes the second entry in
 * `planHostsFor(extra)`."* One detail had to move: the factory lives **here**,
 * not in `PlanHosts.ts`, because `check-uzf-boundaries.mjs` refuses a feature
 * file that imports anything under `services/` (`RC-6`, `RC-21`) — and
 * `makeGoogleCalendarPlanHost` needs the Service's type.
 *
 * So the adapter is built at the **composition root** instead. `library/store.ts`
 * is the one file the boundary check exempts (it is where `ThunkExtra` is
 * assembled), it calls this factory once, and the already-adapted host arrives
 * in `ThunkExtra.googleCalendarPlanHost`. `planHostsFor` then gains a single
 * line — `extra.googleCalendarPlanHost` — and imports nothing new. The
 * prediction holds; only the seam moved, and it moved *outward*, which is the
 * safe direction.
 *
 * ## The shape is declared here, not imported
 *
 * A `services/` module importing a feature's type would point the dependency
 * graph backwards (`apps/web → @kro/app → @kro/core`, and inside the package
 * `features/` depends on nothing under `services/` and vice versa). TypeScript's
 * structural typing makes the import unnecessary: `PlanHost` is
 * `{ id: EndeavorHost; fetchRange(range, options?) }`, this declares the same
 * members, and `store.ts` — which may see both — is where the two are proved
 * compatible by assignment.
 *
 * ## Failure policy
 *
 * `fetchPlanHostRange` already swallows a throwing host (canon's per-host
 * `.bestEffort`), so this adapter does not need its own `try`. It deliberately
 * does not add one either: swallowing here would hide `needsReconnect` from a
 * caller that *does* want it — KC-IS-#19's banner is driven by exactly that
 * exception escaping a direct `service.fetchRange` call, and the Plan preload's
 * tolerance is the preload's decision, not the adapter's.
 */
import type { Endeavor, EndeavorHost } from '@kro/core'
import { EndeavorHost as Host } from '@kro/core'
import type {
  GoogleCalendarRange,
  GoogleCalendarService,
} from './GoogleCalendarService'

/**
 * Structurally identical to KC-IS-#18's `PlanHost`. See the module note for why
 * it is declared rather than imported.
 */
export interface CalendarPlanHost {
  readonly id: EndeavorHost
  fetchRange(
    range: GoogleCalendarRange,
    options?: { readonly signal?: AbortSignal },
  ): Promise<readonly Endeavor[]>
}

/**
 * Adapt the service into a host.
 *
 * The window is pushed **into the request** rather than filtered afterwards —
 * `PlanHosts.ts` names this as the expected difference from the local store:
 * *"a calendar host will push the window into its request instead"*. The
 * service's `fetchRange` sets `timeMin`/`timeMax`, so a −3…+3 preload is one
 * seven-day request per calendar rather than a full mirror read.
 */
export const makeGoogleCalendarPlanHost = (
  service: GoogleCalendarService,
): CalendarPlanHost => ({
  id: Host.googleCalendar,
  fetchRange: (range, options) => service.fetchRange(range, options),
})
