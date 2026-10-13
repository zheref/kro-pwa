import Script from 'next/script'
import { umamiConfig } from '../../analyticsConfig'
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
 * - the **Umami** script, only when `umamiConfig()` answers (a website id is
 *   set and any `NEXT_PUBLIC_UMAMI_SCRIPT_URL` override is `https:`).
 *   `data-auto-track="false"`: the landing reports events through its
 *   Analytics Service, never through the script's own page-view tracking.
 *   `data-exclude-search="true"` keeps query strings out of every event, and
 *   `data-do-not-track="true"` honours the browser's Do Not Track setting.
 *   `data-host-url` names where events go explicitly — the same
 *   `collectOrigin` the CSP admits in `connect-src` — so the tracker never
 *   falls back to a default origin the policy does not admit.
 */

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const umami = umamiConfig()
  return (
    <Providers>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-kro-back focus:px-4 focus:py-2 inline-flex min-h-11 items-center focus:outline-none focus:ring-2 focus:ring-kro-accent focus:ring-offset-2 focus:ring-offset-kro-back"
      >
        Skip to content
      </a>
      {children}
      {umami ? (
        <Script
          src={umami.scriptUrl}
          data-website-id={umami.websiteId}
          data-host-url={umami.collectOrigin}
          data-auto-track="false"
          data-exclude-search="true"
          data-do-not-track="true"
          strategy="afterInteractive"
          defer
        />
      ) : null}
    </Providers>
  )
}
