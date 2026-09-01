import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

/**
 * The root layout — passive, and nothing else (`RC-41`).
 *
 * It sets the document up (fonts, the one stylesheet, the metadata) and renders
 * its children. Everything stateful lives one level down, in `(shell)` — the
 * parity shell's Store + theme + navigation, wired in `providers.tsx`, which is
 * the one client composition root.
 *
 * There used to be a second group beside it. `(legacy)` held the pre-parity
 * surfaces (`/`, `/session`, `/settings`, `/integrations`) and its own Chakra
 * provider tree, so that tree wrapped only those routes and nothing new could
 * quietly start depending on it. KC-IS-#22 took `/session` out of the set;
 * KC-IS-#79 retired the rest. The three addresses survive as passive redirects
 * (`RC-38`) sitting directly under this layout — they render nothing, so they
 * need no providers at all — and the Chakra dependency is gone with the group.
 *
 * A route group changes no URL: `/settings` was `/settings` inside `(legacy)`
 * and is `/settings` outside it. The group only ever decided which providers
 * wrapped a route.
 */

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Kro for Web',
  description: 'by Zheref',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
