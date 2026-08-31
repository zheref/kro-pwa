'use client'

import { MainShellPage, SessionOverlays } from '@kro/app'
import type { ReactNode } from 'react'

interface Props {
  readonly isDevelopment: boolean
  readonly children: ReactNode
}

/**
 * Client wrapper (`RC-39`): imports the Page, forwards props. Nothing else.
 *
 * ## The overlay area
 *
 * The block below is a shared anchor. Each global surface that has to outlive
 * every navigation — the session pill and its sheet, and whatever siblings add
 * next — mounts here as ONE line, appended at the END so two children touching
 * this file conflict on one line rather than on a structure. Nothing in the
 * area takes props from this wrapper; each entry is a self-mounted container
 * that reads what it needs from the store (`RC-37`).
 */
export function AppShellClient({ isDevelopment, children }: Props) {
  return (
    <>
      <MainShellPage isDevelopment={isDevelopment}>{children}</MainShellPage>
      {/* --- overlay area: append new global surfaces below this line --- */}
      <SessionOverlays />
    </>
  )
}
