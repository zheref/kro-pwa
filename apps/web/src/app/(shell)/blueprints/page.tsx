import { DestinationPageClient } from '../DestinationPageClient'

/**
 * `/blueprints` — the Blueprints destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. The surface itself
 * lives in `packages/app`, so the feature child that builds Blueprints replaces
 * a Page there and never touches this file.
 */
export default function BlueprintsRoute() {
  return <DestinationPageClient kind="blueprints" />
}
