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
 * The environment is read per request, so a deployment that adds the variable
 * needs no rebuild to start accepting sign-ups.
 */
import {
  type EarlyAccessSink,
  makeEarlyAccessHandler,
  makeUnavailableEarlyAccessSink,
  makeWebhookEarlyAccessSink,
} from '@kro/app/early-access'
// The same flag-registry read that gates the landing page gates its sign-up.
import { isLandingEnabled } from '../../(marketing)/landingFlag'

export const dynamic = 'force-dynamic'

const isHttps = (raw: string): boolean => {
  try {
    return new URL(raw).protocol === 'https:'
  } catch {
    return false
  }
}

const sinkFromEnvironment = (): EarlyAccessSink => {
  const url = process.env.EARLY_ACCESS_WEBHOOK_URL?.trim()
  const token = process.env.EARLY_ACCESS_WEBHOOK_TOKEN?.trim()
  return url && isHttps(url)
    ? makeWebhookEarlyAccessSink({ url, token: token || null })
    : makeUnavailableEarlyAccessSink()
}

export async function POST(request: Request): Promise<Response> {
  return makeEarlyAccessHandler({
    sink: sinkFromEnvironment(),
    enabled: isLandingEnabled,
  })(request)
}
