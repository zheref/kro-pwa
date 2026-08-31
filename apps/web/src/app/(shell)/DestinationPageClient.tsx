'use client'

import { DestinationPage, type DestinationPageProps } from '@kro/app'

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props, ≤10 lines.
 *
 * One wrapper for every destination rather than fourteen identical ones. Each
 * route's `page.tsx` names its own destination and this hands it straight to
 * the shared Page — so when a feature child replaces a destination's body it
 * changes `packages/app`, and `apps/web` does not move at all.
 */
export function DestinationPageClient(props: DestinationPageProps) {
  return <DestinationPage {...props} />
}
