import { BoardPageClient } from './BoardPageClient'

/**
 * `/board` — the Board destination.
 *
 * A passive Server Component (`RC-38`): it names its destination and renders
 * the client wrapper. No hook, no store read, no markup. `#35` mounts the
 * Thirst vote surface (Board is a canon *available soon* dead-end,
 * `docs/Features/Thirst.md`) rather than the shared placeholder.
 */
export default function BoardRoute() {
  return <BoardPageClient />
}
