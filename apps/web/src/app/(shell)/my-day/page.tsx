import { MyDayPageClient } from './MyDayPageClient'

/**
 * `/my-day` — the Today destination.
 *
 * A passive Server Component (`RC-38`): it renders the client wrapper and
 * nothing else. No hook, no store read, no markup. The surface itself lives in
 * `packages/app/src/features/do/pages`, so this file does not move again when
 * that surface changes.
 */
export default function MyDayRoute() {
  return <MyDayPageClient />
}
