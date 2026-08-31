import { DestinationPageClient } from '../DestinationPageClient'

/**
 * `/inbox` — the Jot Down destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. The surface itself
 * lives in `packages/app`, so the feature child that builds Inbox replaces
 * a Page there and never touches this file.
 */
export default function InboxRoute() {
  return <DestinationPageClient kind="inbox" />
}
