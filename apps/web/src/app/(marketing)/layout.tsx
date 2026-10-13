import Script from 'next/script'
import { Providers } from '../providers'

/**
 * The marketing group's layout — a passive Server Component (`RC-41`).
 *
 * It wraps the landing in the ONE client composition root (`Providers`): the
 * landing's early-access and analytics thunks need the store, and the theme
 * comes from the same `next-themes` binding the app uses. It does NOT mount
 * `AppShellClient` — the landing is not a destination inside the shell.
 *
 * Two document-level additions, both inert without their inputs:
 *
 * - a **skip link** to `#main`, which the landing page's `<main>` carries;
 * - the **Umami** script, only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set.
 *   `data-auto-track="false"`: the landing reports events through its
 *   Analytics Service, never through the script's own page-view tracking.
 *   `NEXT_PUBLIC_UMAMI_SCRIPT_URL` overrides the Umami Cloud script (a
 *   self-hosted instance).
 */
const UMAMI_CLOUD_SCRIPT = 'https://cloud.umami.is/script.js'

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const umamiScript =
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || UMAMI_CLOUD_SCRIPT
  return (
    <Providers>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-kro-back focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      {children}
      {umamiWebsiteId ? (
        <Script
          src={umamiScript}
          data-website-id={umamiWebsiteId}
          data-auto-track="false"
          strategy="afterInteractive"
          defer
        />
      ) : null}
    </Providers>
  )
}
