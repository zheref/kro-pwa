'use client'

import {
  CaptureOverlays,
  DetailOverlays,
  MainShellPage,
  SessionOverlays,
} from '@kro/app'
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
 * the `viewDetail` / `edit` intents any endeavor row can raise;
 * `CaptureOverlays` is KC-IS-#24's; `SessionOverlays` (KC-IS-#22) is the
 * session pill and the sheet it reopens, plus the three lifecycles a session
 * owns for as long as the app is open. Each mount is its own feature's
 * composition, so this file never grows logic — only the list.
 */
export function AppShellClient({ isDevelopment, children }: Props) {
  return (
    <MainShellPage isDevelopment={isDevelopment}>
      {children}
      {/* --- overlay area --- */}
      <CaptureOverlays />
      <DetailOverlays />
      <SessionOverlays />
      {/* --- end overlay area --- */}
    </MainShellPage>
  )
}
