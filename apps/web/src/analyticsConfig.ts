/**
 * The landing's Umami analytics configuration, read once from the build env.
 *
 * - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` unset or blank → `null`: no analytics.
 * - `NEXT_PUBLIC_UMAMI_SCRIPT_URL` overrides the Umami Cloud script (a
 *   self-hosted instance). An override that is not an `https:` URL turns
 *   analytics OFF rather than falling back to the cloud script: an operator
 *   who set something else did not ask for Umami Cloud (`SEC-10`).
 *
 * Two origins, because Umami Cloud serves its script from one host and takes
 * events on another:
 *
 * - `origin` is the script's origin — what the landing's CSP admits in
 *   `script-src` (see `securityHeaders.ts`);
 * - `collectOrigin` is where the tracker posts events (`<origin>/api/send`) —
 *   what the CSP admits in `connect-src`, and what the layout passes to the
 *   script as `data-host-url` so the two can never disagree. For the Umami
 *   Cloud script it is `https://gateway.umami.is` (the script's own default);
 *   a self-hosted Umami serves its script and its API from one origin, so an
 *   override's collect origin is the override's own origin.
 */
export const UMAMI_CLOUD_SCRIPT = 'https://cloud.umami.is/script.js'

/** Where the Umami Cloud script posts events when no `data-host-url` is set. */
export const UMAMI_CLOUD_COLLECT_ORIGIN = 'https://gateway.umami.is'

export interface UmamiConfig {
  readonly websiteId: string
  readonly scriptUrl: string
  readonly origin: string
  readonly collectOrigin: string
}

type AnalyticsEnv = Readonly<Record<string, string | undefined>>

/**
 * Each key read by its literal name so Next inlines it at build time — a
 * whole-`process.env` read is empty in the Edge runtime the middleware uses.
 */
const buildEnv = (): AnalyticsEnv => ({
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
})

const parseHttps = (value: string): URL | null => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export const umamiConfig = (
  env: AnalyticsEnv = buildEnv(),
): UmamiConfig | null => {
  const websiteId = (env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? '').trim()
  if (websiteId.length === 0) return null
  const override = (env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? '').trim()
  const url = parseHttps(override.length > 0 ? override : UMAMI_CLOUD_SCRIPT)
  if (url === null) return null
  const collectOrigin =
    url.href === UMAMI_CLOUD_SCRIPT ? UMAMI_CLOUD_COLLECT_ORIGIN : url.origin
  return { websiteId, scriptUrl: url.href, origin: url.origin, collectOrigin }
}
