import { MatrixPageClient } from './MatrixPageClient'

/**
 * `/matrix` — the Priority Matrix destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. `#35` mounts the
 * Thirst vote surface (Priority Matrix is a canon *available soon* dead-end,
 * `docs/Features/Thirst.md`) rather than the shared placeholder.
 */
export default function MatrixRoute() {
  return <MatrixPageClient />
}
