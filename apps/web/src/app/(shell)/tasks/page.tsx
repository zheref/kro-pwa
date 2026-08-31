import { DestinationPageClient } from '../DestinationPageClient'

/**
 * `/tasks` — the All Tasks destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. The surface itself
 * lives in `packages/app`, so the feature child that builds All Tasks replaces
 * a Page there and never touches this file.
 */
export default function TasksRoute() {
  return <DestinationPageClient kind="allTasks" />
}
