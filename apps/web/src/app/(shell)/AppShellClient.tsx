'use client'

import { DetailOverlays, MainShellPage } from '@kro/app'
import type { ReactNode } from 'react'

interface Props {
  readonly isDevelopment: boolean
  readonly children: ReactNode
}

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props. Nothing else.
 *
 * The overlay area below the destination is the shared anchor for the app's
 * global presentations — one line per overlay, each mounted once for every
 * surface rather than per destination. `DetailOverlays` (KC-IS-#30) opens on
 * the `viewDetail` / `edit` intents any endeavor row can raise.
 */
export function AppShellClient({ isDevelopment, children }: Props) {
  return (
    <MainShellPage isDevelopment={isDevelopment}>
      {children}
      {/* --- overlay area --- */}
      <DetailOverlays />
      {/* --- end overlay area --- */}
    </MainShellPage>
  )
}
