'use client'

import { ThirstDestinationPage } from '@kro/app/thirst'

/**
 * Client wrapper (`RC-39`): imports the Page, forwards nothing, ≤10 lines.
 *
 * `#35` mounts the Thirst vote surface here instead of the shared
 * `DestinationPageClient` — see `ThirstDestinationPage.tsx`'s header for why.
 */
export function MatrixPageClient() {
  return <ThirstDestinationPage kind="matrix" />
}
