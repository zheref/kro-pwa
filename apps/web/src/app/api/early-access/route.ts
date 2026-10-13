/**
 * `POST /api/early-access` — the landing page's early-access sign-up.
 *
 * The one file that reads the waitlist's environment, and it only binds: with
 * `EARLY_ACCESS_WEBHOOK_URL` set to an `https:` URL, requests go to that
 * webhook (with `EARLY_ACCESS_WEBHOOK_TOKEN` as a bearer token when set);
 * unset, unparseable or plaintext, every request answers the typed
 * `unavailable` outcome (503) rather than sending an address or a token in
 * the clear. The handler (a Producer, `RC-43`) and the sink (a Service that
 * calls `fetch`, `RC-3`) live in `@kro/app/early-access`, never in this shell
 * (`RC-62`).
 *
 * A deployment collects no address before it offers a private way to have
 * one removed (`SEC-8`): the webhook sink is bound only when
 * `NEXT_PUBLIC_CONTACT_EMAIL` also holds an address (one `@`, a dot after
 * it); without it every request answers `unavailable` too.
 *
 * A browser `Origin` is accepted when it is the request URL's own origin or
 * one of `siteOrigins()` — the deployment's public `https://` origins, built
 * from configuration — because behind a TLS-terminating proxy the request URL
 * is the bind address, not the public host (`SEC-7`).
 *
 * The server-only variables are read per request, so a deployment that adds
 * the webhook needs no rebuild to start accepting sign-ups; the
 * `NEXT_PUBLIC_` ones are inlined at build time.
 */
import {
  type EarlyAccessSink,
  makeEarlyAccessHandler,
  makeUnavailableEarlyAccessSink,
  makeWebhookEarlyAccessSink,
} from '@kro/app/early-access'
// The same flag-registry read that gates the landing page gates its sign-up.
import { isLandingEnabled } from '../../(marketing)/landingFlag'
import { siteOrigins } from '../../../hostRouting'

export const dynamic = 'force-dynamic'

const isHttps = (raw: string): boolean => {
  try {
    return new URL(raw).protocol === 'https:'
  } catch {
    return false
  }
}

/** One `@`, something before it, and a dot somewhere after it. */
const isContactAddress = (raw: string): boolean => {
  const parts = raw.split('@')
  if (parts.length !== 2) return false
  const [local = '', domain = ''] = parts
  return local.length > 0 && /^[^.\s]+(\.[^.\s]+)+$/.test(domain)
}

const sinkFromEnvironment = (): EarlyAccessSink => {
  const url = process.env.EARLY_ACCESS_WEBHOOK_URL?.trim()
  const token = process.env.EARLY_ACCESS_WEBHOOK_TOKEN?.trim()
  const contact = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '').trim()
  return url && isHttps(url) && isContactAddress(contact)
    ? makeWebhookEarlyAccessSink({ url, token: token || null })
    : makeUnavailableEarlyAccessSink()
}

export async function POST(request: Request): Promise<Response> {
  return makeEarlyAccessHandler({
    sink: sinkFromEnvironment(),
    enabled: isLandingEnabled,
    allowedOrigins: siteOrigins(),
  })(request)
}
