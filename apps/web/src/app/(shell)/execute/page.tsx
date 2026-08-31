import { DestinationPageClient } from '../DestinationPageClient'

/**
 * `/execute` — the Execute destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. The surface itself
 * lives in `packages/app`, so the feature child that builds Session replaces
 * a Page there and never touches this file.
 */
export default function ExecuteRoute() {
  return <DestinationPageClient kind="session" />
}
