'use client'

import { SettingsHubPage } from '@kro/app'

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props, ≤10 lines.
 *
 * `/adjust` is the first destination whose body exists, so it is the first
 * route to swap the shared placeholder for a real Page. The generic
 * `DestinationPageClient` still serves every other destination.
 */
export function AdjustPageClient() {
  return <SettingsHubPage />
}
