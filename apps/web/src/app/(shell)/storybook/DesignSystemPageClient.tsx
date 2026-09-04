'use client'

import { DesignSystemPage } from '@kro/app/design-system'

/**
 * Client wrapper (`RC-39`): imports the Page, forwards nothing, ≤10 lines.
 *
 * `/storybook` is a development-only destination. The sidebar row is gated
 * on `isDevelopment`; this wrapper still mounts the gallery so a pasted
 * link in a dev build lands the same way every other destination does.
 */
export function DesignSystemPageClient() {
  return <DesignSystemPage />
}
