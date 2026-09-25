/**
 * The hosts a plan-range read consults, from the injected thunk `extra`.
 *
 * Shared by every feature that reads a day of timed events (Plan, the Day
 * Timeline pane) so they agree on the host set (`UZF-6`). A plain function
 * over `ThunkExtra` — it imports no Service; the hosts arrive already built.
 */
import { FeatureFlags } from '@kro/core'
import type { ThunkExtra } from '../store'
import { type PlanHost, makeLocalStorePlanHost } from './PlanHosts'

/**
 * Every host a plan-range read (Plan's preload, the Day Timeline) fans out over.
 *
 * Two entries: the on-device store, and Google Calendar (#33) — which is the
 * reason the fan-out is a list rather than a direct call.
 *
 * The Google host arrives **already adapted**, from `ThunkExtra`, rather than
 * being built here from a service: `check-uzf-boundaries.mjs` refuses a feature
 * file that imports anything under `services/` (`RC-6`, `RC-21`), so the
 * adaptation happens at the composition root, which is the one file the check
 * exempts. See `store.ts`'s `googleCalendarPlanHost` field and
 * `services/googleCalendar/GoogleCalendarPlanHost.ts`.
 *
 * The Google host is wrapped in its `UZF-22` flag, at the Producer boundary
 * where the checklist puts it — never inside a reducer. `googleCalendarIntegration`
 * is **enabled** in `statusQuo` (canon ships the integration on), so this is not
 * a rollout switch: it is the kill switch a debug override can reach when the
 * integration misbehaves, and the seam KC-IS-#35's Thirst surface reads.
 *
 * Beyond the flag, no further gate is needed: a disconnected or unconfigured
 * Google answers `[]` rather than failing, and `fetchPlanHostRange` already
 * tolerates a host that throws (canon's per-host `.bestEffort`), so a
 * `needsReconnect` cannot empty the day either.
 */
export const planHostsFor = (extra: ThunkExtra): readonly PlanHost[] => [
  makeLocalStorePlanHost(extra.localStore),
  ...(extra.featureFlags.isEnabled(FeatureFlags.googleCalendarIntegration)
    ? [extra.googleCalendarPlanHost]
    : []),
]
