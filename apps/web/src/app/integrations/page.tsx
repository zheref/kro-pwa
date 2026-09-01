import { redirect } from 'next/navigation'

/**
 * `/integrations` — a retired address, and a live OAuth return path.
 *
 * Calendar-connect is a **pane inside the Settings hub**, not a destination of
 * its own: `SettingsSection` registers it as `SettingsSectionId.integrations`
 * within the hub `/adjust` mounts, and nothing in the shell's route map
 * addresses it separately (KC-IS-#33 landed the Google surface there, and
 * `GoogleCalendar.md` names "Integrations" as the place you connect). So this
 * address resolves to the hub rather than to a page that would have to explain
 * why it is empty.
 *
 * **DO NOT DELETE THIS ROUTE thinking it only serves old bookmarks.** The
 * Google OAuth callback still returns the browser here:
 * `GOOGLE_CONNECTED_DESTINATION` / `GOOGLE_FAILED_DESTINATION` in
 * `packages/app/src/services/googleCalendar/GoogleCalendarRouteHandlers.ts` are
 * `/integrations?google=connected` and `/integrations?google=failed`, so every
 * connect attempt lands on this file before reaching the hub. `redirect()`
 * drops the query string; nothing reads `?google=` today (the pane re-reads
 * connection status on mount), so the signal is currently decorative — but it
 * is written on a live path, and pointing those constants at `/adjust` is
 * KC-IS-#33's surface to change, not this one's.
 *
 * Otherwise the same story as `/settings`: KC-IS-#32 emptied the stub,
 * KC-IS-#79 moved the file out of the deleted `(legacy)` group. A passive
 * Server Component (`RC-38`) and nothing more.
 */
export default function IntegrationsRoute() {
  redirect('/adjust')
}
