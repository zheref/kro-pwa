/**
 * The landing's Umami analytics configuration, read once from the build env.
 *
 * - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` unset or blank → `null`: no analytics.
 * - `NEXT_PUBLIC_UMAMI_SCRIPT_URL` overrides the Umami Cloud script (a
 *   self-hosted instance). An override that is not an `https:` URL turns
 *   analytics OFF rather than falling back to the cloud script: an operator
 *   who set something else did not ask for Umami Cloud (`SEC-10`).
 *
 * `origin` is the script's origin — the one third-party origin the landing's
 * Content-Security-Policy admits (see `securityHeaders.ts`).
 */
export const UMAMI_CLOUD_SCRIPT = 'https://cloud.umami.is/script.js'

export interface UmamiConfig {
  readonly websiteId: string
  readonly scriptUrl: string
  readonly origin: string
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
  return { websiteId, scriptUrl: url.href, origin: url.origin }
}
