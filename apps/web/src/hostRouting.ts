/**
 * Host-aware routing — the apex landing and the hub app, as one pure decision.
 *
 * Kro Web is one deployment answering on two hosts:
 *
 * - the **apex** (`NEXT_PUBLIC_SITE_HOST`, e.g. `kroapp.com`) serves the
 *   marketing landing page at `/` and is indexable;
 * - the **hub** (`NEXT_PUBLIC_HUB_HOST`, e.g. `hub.kroapp.com`) is the app's
 *   canonical host and is never indexed.
 *
 * The matrix, for a request on host `h` to `path?query`:
 *
 * | host  | path                    | outcome                                        |
 * |-------|-------------------------|------------------------------------------------|
 * | apex  | `/hub`, `/hub/<rest>`   | 307 → `https://<hub>/<rest>?query`             |
 * | apex  | an app path (`/plan` …) | 307 → `https://<hub>/plan?query`               |
 * | apex  | anything else           | served as is (`/` is the landing)              |
 * | hub   | `/`                     | REWRITE to `/my-day?query` (`?code=` survives) |
 * | hub   | `/hub`, `/hub/<rest>`   | 307 → `/<rest>?query` on the hub               |
 * | hub   | anything else           | served as is                                   |
 * | other | `/hub`, `/hub/<rest>`   | 307 → `/<rest>?query` on the same host         |
 * | other | anything else           | served as is (no host redirects at all)        |
 *
 * Every hub response that is served (rewrite or pass-through) carries
 * `X-Robots-Tag: noindex, nofollow`. "Other" is localhost, `127.0.0.1`, any
 * preview deployment — and EVERY host while either env value is unset, which
 * is the safe default for a preview: it never bounces a visitor to production.
 *
 * Static and API paths are never routed (`isBypassed`); `middleware.ts`'s
 * matcher excludes them too, and this check is the tested half of that rule.
 *
 * The hosts are `NEXT_PUBLIC_` values, so Next inlines them at BUILD time:
 * each deployment sets them in its build environment, and changing a host
 * means rebuilding. They are public by nature (they are hostnames), and the
 * landing page may need the hub URL on the client for its "Open the app" link.
 */

/**
 * Every address the app answers on, as a path prefix. `/settings` and
 * `/integrations` are redirects into `/adjust` but are app addresses all the
 * same — the Google Calendar callback returns to `/integrations?google=…`.
 */
export const APP_PATHS: readonly string[] = [
  '/my-day',
  '/tasks',
  '/inbox',
  '/matrix',
  '/plan',
  '/habits',
  '/execute',
  '/board',
  '/earn',
  '/blueprints',
  '/adjust',
  '/tweak',
  '/storybook',
  '/search',
  '/lists',
  '/settings',
  '/integrations',
]

/** The hub's landing destination — the same one `/` has always redirected to. */
export const HUB_LANDING_PATH = '/my-day'

/** The header that keeps the app host out of search indexes. */
export const HUB_ROBOTS_HEADERS: Readonly<Record<string, string>> = {
  'X-Robots-Tag': 'noindex, nofollow',
}

/** Directory-like prefixes: matched as a whole segment (`/api`, `/api/…`). */
const BYPASSED_SEGMENTS = ['/api', '/_next', '/icons', '/sounds', '/landing']

const BYPASSED_FILES = [
  '/sw.js',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
]

export interface HostRoutingInput {
  /** The `Host` header, possibly with a port. */
  readonly host: string | null | undefined
  readonly pathname: string
  /** The query including its leading `?`, or `''`. */
  readonly search: string
  readonly siteHost: string | null | undefined
  readonly hubHost: string | null | undefined
}

export type HostRoutingDecision =
  | {
      readonly kind: 'next'
      readonly headers?: Readonly<Record<string, string>>
    }
  | {
      /** `url` is absolute for a cross-host hop, a path for a same-host one. */
      readonly kind: 'redirect'
      readonly url: string
    }
  | {
      readonly kind: 'rewrite'
      readonly url: string
      readonly headers?: Readonly<Record<string, string>>
    }

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

/**
 * True for a path the host routing never touches. `/opengraph-image` is a
 * prefix rather than a segment because Next suffixes the generated route
 * (`/opengraph-image-<hash>`).
 */
export const isBypassed = (pathname: string): boolean =>
  BYPASSED_FILES.includes(pathname) ||
  pathname.startsWith('/opengraph-image') ||
  BYPASSED_SEGMENTS.some((prefix) => startsWithSegment(pathname, prefix))

/** True for an address the app answers on (`/plan`, `/lists/x` …). */
export const isAppPath = (pathname: string): boolean =>
  APP_PATHS.some((prefix) => startsWithSegment(pathname, prefix))

/** `host:port` → `host`, lower-cased; empty when absent. */
export const normalizeHost = (host: string | null | undefined): string =>
  (host ?? '').trim().toLowerCase().replace(/:\d+$/, '')

/** `/hub` → `/`, `/hub/plan` → `/plan`; `null` when the path is not under `/hub`. */
const stripHubPrefix = (pathname: string): string | null => {
  if (!startsWithSegment(pathname, '/hub')) return null
  const rest = pathname.slice('/hub'.length)
  return rest.length === 0 ? '/' : rest
}

export const resolveHostRouting = ({
  host,
  pathname,
  search,
  siteHost,
  hubHost,
}: HostRoutingInput): HostRoutingDecision => {
  if (isBypassed(pathname)) return { kind: 'next' }

  const site = normalizeHost(siteHost)
  const hub = normalizeHost(hubHost)
  const here = normalizeHost(host)
  const configured = site.length > 0 && hub.length > 0
  const underHub = stripHubPrefix(pathname)

  if (configured && here === site) {
    if (underHub !== null) {
      return { kind: 'redirect', url: `https://${hub}${underHub}${search}` }
    }
    if (isAppPath(pathname)) {
      return { kind: 'redirect', url: `https://${hub}${pathname}${search}` }
    }
    return { kind: 'next' }
  }

  if (configured && here === hub) {
    if (underHub !== null) {
      return { kind: 'redirect', url: `${underHub}${search}` }
    }
    if (pathname === '/') {
      return {
        kind: 'rewrite',
        url: `${HUB_LANDING_PATH}${search}`,
        headers: HUB_ROBOTS_HEADERS,
      }
    }
    return { kind: 'next', headers: HUB_ROBOTS_HEADERS }
  }

  if (underHub !== null) {
    return { kind: 'redirect', url: `${underHub}${search}` }
  }
  return { kind: 'next' }
}

/**
 * The public origin, without a trailing slash — `metadataBase`, the sitemap and
 * robots all build absolute URLs from it. Defaults to the dev server.
 */
export const siteUrl = (
  value: string | null | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string => {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '')
  return trimmed.length > 0 ? trimmed : 'http://localhost:3000'
}
