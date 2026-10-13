/**
 * `POST /api/early-access` — the landing page's early-access sign-up.
 *
 * The one file that reads the waitlist's environment, and it only binds: with
 * `EARLY_ACCESS_WEBHOOK_URL` set, requests go to that webhook (with
 * `EARLY_ACCESS_WEBHOOK_TOKEN` as a bearer token when set); without it, every
 * request answers the typed `unavailable` outcome (503) rather than failing.
 * All behaviour lives in `earlyAccessHandler.ts`.
 *
 * The environment is read per request, so a deployment that adds the variable
 * needs no rebuild to start accepting sign-ups.
 */
import { makeEarlyAccessHandler } from './earlyAccessHandler'
import {
  makeUnavailableEarlyAccessSink,
  makeWebhookEarlyAccessSink,
} from './earlyAccessSink'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const url = process.env.EARLY_ACCESS_WEBHOOK_URL?.trim()
  const token = process.env.EARLY_ACCESS_WEBHOOK_TOKEN?.trim()
  const sink = url
    ? makeWebhookEarlyAccessSink({ url, token: token || null })
    : makeUnavailableEarlyAccessSink()
  return makeEarlyAccessHandler({ sink })(request)
}
