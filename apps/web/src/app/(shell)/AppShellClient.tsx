'use client'

import { MainShellPage } from '@kro/app'
import type { ReactNode } from 'react'

interface Props {
  readonly isDevelopment: boolean
  readonly children: ReactNode
}

/** Client wrapper (`RC-39`): imports the Page, forwards props. Nothing else. */
export function AppShellClient({ isDevelopment, children }: Props) {
  return <MainShellPage isDevelopment={isDevelopment}>{children}</MainShellPage>
}
