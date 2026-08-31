'use client'

import { DoPage } from '@kro/app'

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props, ≤10 lines.
 *
 * `/my-day` is the one destination whose surface exists, so it mounts `DoPage`
 * instead of the shared `DestinationPageClient` placeholder. The route file
 * above it stays a passive Server Component and this file holds no hook, no
 * markup and no logic.
 */
export function MyDayPageClient() {
  return <DoPage />
}
