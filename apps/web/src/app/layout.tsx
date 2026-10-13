import './globals.css'
import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { siteUrl } from '../hostRouting'

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
 * wrapped a route. Today there are two groups: `(shell)` (the app) and
 * `(marketing)` (the landing at `/`, wrapped in the same `Providers` but not
 * the shell).
 *
 * The metadata is the landing's SEO baseline. `metadataBase` comes from
 * `NEXT_PUBLIC_SITE_URL` so Open Graph URLs resolve against the public apex.
 * The `(shell)` routes inherit it too; that is fine, because the hub host
 * answers `X-Robots-Tag: noindex` (see `hostRouting.ts`) and wins over the
 * default `robots: index` here.
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

const DESCRIPTION =
  'Control your time, do not let time control you. Plan, Do and Earn, in one personal execution system.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Kro — Control your time', template: '%s · Kro' },
  description: DESCRIPTION,
  applicationName: 'Kro',
  openGraph: {
    siteName: 'Kro',
    type: 'website',
    locale: 'en_US',
    title: 'Kro — Control your time',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kro — Control your time',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
