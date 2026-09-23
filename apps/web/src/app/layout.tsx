import './globals.css'
import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'

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

const beVietnamPro = localFont({
  src: [
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-ThinItalic.ttf',
      weight: '100',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-ExtraLight.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-ExtraLightItalic.ttf',
      weight: '200',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-SemiBoldItalic.ttf',
      weight: '600',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-ExtraBoldItalic.ttf',
      weight: '800',
      style: 'italic',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-Black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../../fonts/be-vietnam-pro/BeVietnamPro-BlackItalic.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
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
    <html
      lang="en"
      className={`${beVietnamPro.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
