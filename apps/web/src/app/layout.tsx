import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

/**
 * The root layout — passive, and nothing else (`RC-41`).
 *
 * It sets the document up (fonts, the one stylesheet, the metadata) and
 * renders its children. Everything stateful moved out, because there are now
 * two shells under this one document and they do not share a provider tree:
 *
 *   `(shell)`   the parity shell — Store + theme + navigation, wired in
 *               `providers.tsx`, which is the one client composition root.
 *   `(legacy)`  the pre-parity surfaces (`/`, `/settings`, `/integrations`)
 *               that Chakra still renders. They keep their own provider tree,
 *               in their own group's layout, so nothing new can quietly start
 *               depending on it. `/session` was the fourth and is gone —
 *               KC-IS-#22 retired it; the parity shell serves the surface at
 *               `/execute`, canon's own name for that destination.
 *
 * A route group changes no URL: `/settings` is still `/settings`. The split is
 * about which providers wrap a route, not about where it lives.
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
