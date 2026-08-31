import { InboxRouteClient } from './InboxRouteClient'

/**
 * `/inbox` — the Jot Down destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. The surface itself
 * lives in `packages/app` — KC-IS-#24 replaced the shared placeholder Page with
 * the real Inbox, which is the swap `DestinationPage`'s header describes.
 */
export default function InboxRoute() {
  return <InboxRouteClient />
}
