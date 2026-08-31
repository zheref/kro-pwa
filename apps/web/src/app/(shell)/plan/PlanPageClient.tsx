'use client'

/**
 * The Client Page Wrapper for `/plan` (`RC-39`).
 *
 * Imports the shared Page and forwards the Server Page's props. The one thing
 * it adds is the reconnect action, and that is deliberate rather than
 * incidental: starting Google's OAuth flow is a **full-document** navigation to
 * `/api/google/connect` — the browser has to leave for Google's consent screen
 * and come back with a cookie — so it cannot go through the app router, and
 * `RC-17` keeps `window` out of the shared tier either way. `apps/web` is the
 * platform shell; a platform API belongs here (`RC-40`, `RC-48`).
 *
 * Nothing else: no hook that decides anything, no markup, no store read.
 */
import { PlanPage, type PlanPageProps } from '@kro/app'

export function PlanPageClient(props: PlanPageProps) {
  return (
    <PlanPage
      {...props}
      onTapReconnect={() => {
        window.location.assign('/api/google/connect')
      }}
    />
  )
}
