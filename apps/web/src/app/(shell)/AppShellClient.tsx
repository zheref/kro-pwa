'use client'

import { CaptureOverlays, MainShellPage } from '@kro/app'
import type { ReactNode } from 'react'

interface Props {
  readonly isDevelopment: boolean
  readonly children: ReactNode
}

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props. Nothing else.
 *
 * The overlay area below the shell's children is the shared anchor every
 * feature that owns a global surface adds one line to. Each mount is its own
 * feature's composition (`CaptureOverlays` is KC-IS-#24's), so this file never
 * grows logic — only the list.
 */
export function AppShellClient({ isDevelopment, children }: Props) {
  return (
    <MainShellPage isDevelopment={isDevelopment}>
      {children}
      {/* --- overlay area --- */}
      <CaptureOverlays />
    </MainShellPage>
  )
}
