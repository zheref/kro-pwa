import { ExecutePageClient } from './ExecutePageClient'

/**
 * `/execute` — the Execute destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup.
 *
 * It renders the **session** surface rather than the shared
 * `DestinationPageClient` placeholder, because the session's body is not a
 * placeholder any more — `SessionDestinationPage` (in `packages/app`) carries
 * both halves the shared client was standing in for: the
 * `onDestinationRouteMounted` dispatch that keeps the sidebar highlight
 * following the URL, and the destination's own content. Everything about the
 * surface itself still lives in `packages/app`; this file only names it.
 */
export default function ExecuteRoute() {
  return <ExecutePageClient />
}
