/**
 * Where an early-access request is finally written — the waitlist sink.
 *
 * A Service in UZF terms (`RC-33`): an interface plus a live binding and a
 * stub. It returns the **wire** receipt and throws `{ status }`-shaped errors;
 * the route handler is the Producer that turns those into a `Result`
 * (`RC-43`), via `EarlyAccessMapper.toException`.
 *
 * It lives under `@kro/app`'s `src/services/**` because it calls `fetch`
 * (`RC-3`), and ships the Service's full set (`RC-33`, `RC-59`): the live
 * webhook binding, the always-503 binding, and a stub backed by
 * `earlyAccessSink.fixtures.json`.
 *
 * This module reads **no environment**. `apps/web`'s `route.ts` is the one file that reads
 * `EARLY_ACCESS_WEBHOOK_URL` / `EARLY_ACCESS_WEBHOOK_TOKEN` and passes the
 * values in, so the sink is testable with nothing exported in the shell and a
 * misconfiguration surfaces as the typed `unavailable` outcome, not a crash.
 *
 * Failure shapes, read by `EarlyAccessMapper.toException`:
 * - 409 keeps its status (the handler answers it as a plain success, so the
 *   route is no membership oracle);
 * - any other 4xx is collapsed into a status-less error — the address was
 *   already validated, so a webhook refusing the payload is our fault
 *   (`unknown`), never the visitor's (`invalidEmail`);
 * - a 5xx keeps its status;
 * - a timeout or abort is rethrown named `TimeoutError` with no status
 *   (`unavailable`);
 * - a transport failure, a redirect included, stays a `TypeError` (`offline`).
 *
 * It never logs, and never puts the email anywhere but the request body.
 */
import type { EarlyAccessRequest, EarlyAccessResponse } from '@kro/core'
import fixtures from './earlyAccessSink.fixtures.json'

export interface EarlyAccessSink {
  /**
   * Whether this sink can take a sign-up at all. `false` only for the sink a
   * deployment with no (or no `https:`) webhook gets, so the handler can give
   * a honeypot the very answer a real request would get.
   */
  readonly available: boolean
  add(request: EarlyAccessRequest): Promise<EarlyAccessResponse>
}

/** Shapes a failure the way `EarlyAccessMapper.toException` reads it. */
const statusError = (status: number): Error =>
  Object.assign(new Error(`early-access sink answered HTTP ${status}`), {
    status,
  })

/** A webhook that refused the payload: no status, so it maps to `unknown`. */
const refusedError = (): Error =>
  new Error('early-access sink refused the request')

/** A webhook that did not answer in time: maps to `unavailable`. */
const timeoutError = (): Error =>
  Object.assign(new Error('early-access sink timed out'), {
    name: 'TimeoutError',
  })

/** What a non-2xx webhook answer becomes — see the failure shapes above. */
const errorForStatus = (status: number): Error => {
  if (status === 409) return statusError(status)
  if (status >= 400 && status < 500) return refusedError()
  return statusError(status)
}

/** Duck-typed: `AbortSignal.timeout` rejects with a `DOMException` named so. */
const isAbort = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  return name === 'TimeoutError' || name === 'AbortError'
}

/** How long the webhook gets before the sign-up answers `unavailable`. */
export const EARLY_ACCESS_SINK_TIMEOUT_MS = 5000

export interface WebhookEarlyAccessSinkOptions {
  /** The webhook to POST each request to. */
  readonly url: string
  /** Sent as `Authorization: Bearer <token>` when set. */
  readonly token?: string | null
  /** Injected for specs; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch
  /** Injected for specs; stamps `joined_at`. */
  readonly now?: () => Date
  /** Injected for specs; defaults to `EARLY_ACCESS_SINK_TIMEOUT_MS`. */
  readonly timeoutMs?: number
}

/** Reads `id` / `position` off the webhook's JSON answer, when it gave one. */
const receiptFieldsOf = async (
  response: Response,
): Promise<{ id: string | null; position: number | null }> => {
  try {
    const body = (await response.json()) as {
      id?: unknown
      position?: unknown
    } | null
    return {
      id: typeof body?.id === 'string' && body.id.length > 0 ? body.id : null,
      position:
        typeof body?.position === 'number' && Number.isInteger(body.position)
          ? body.position
          : null,
    }
  } catch {
    return { id: null, position: null }
  }
}

/**
 * The live sink: a JSON POST of `{ email, platform, source, locale, joined_at }`
 * to any webhook (a Zapier/Make hook, a Sheet script, a list provider). A 409
 * means "already on the list". The call is bounded by a timeout and refuses
 * to follow a redirect, so the bearer token only ever goes to the configured
 * URL. A webhook that answers with no id gets a generated one, and with no
 * position gets `null` — most webhooks have no queue to count. This is the
 * wire receipt only: the handler answers the visitor a receipt of its own
 * and never forwards this `id` or `position` (`SEC-12`).
 */
export const makeWebhookEarlyAccessSink = (
  options: WebhookEarlyAccessSinkOptions,
): EarlyAccessSink => ({
  available: true,
  async add(request) {
    const doFetch = options.fetch ?? fetch
    const joinedAt = (options.now ?? (() => new Date()))().toISOString()
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (options.token) headers.authorization = `Bearer ${options.token}`

    let response: Response
    try {
      response = await doFetch(options.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: request.email,
          platform: request.platform,
          source: request.source,
          locale: request.locale,
          joined_at: joinedAt,
        }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(
          options.timeoutMs ?? EARLY_ACCESS_SINK_TIMEOUT_MS,
        ),
      })
    } catch (error) {
      if (isAbort(error)) throw timeoutError()
      throw error
    }
    if (!response.ok) throw errorForStatus(response.status)

    const { id, position } = await receiptFieldsOf(response)
    return {
      id: id ?? crypto.randomUUID(),
      email: request.email,
      platform: request.platform,
      position,
      joined_at: joinedAt,
    }
  },
})

/** The sink a deployment with no webhook configured gets: always 503. */
export const makeUnavailableEarlyAccessSink = (): EarlyAccessSink => ({
  available: false,
  async add() {
    throw statusError(503)
  },
})

export interface StubbedEarlyAccessSink extends EarlyAccessSink {
  /** Every request that reached the sink, in order. */
  readonly added: readonly EarlyAccessRequest[]
}

export interface StubbedEarlyAccessSinkOptions {
  /** Makes every `add` reject with this value, whatever the fixture says. */
  readonly rejectWith?: unknown
  /** The `joined_at` the stub stamps. Defaults to the fixture's. */
  readonly joinedAt?: string
}

const fixtureReceipts = fixtures.receipts as Record<
  string,
  { id: string; position: number | null } | undefined
>
const fixtureFailures = fixtures.failures as Record<
  string,
  { status: number } | undefined
>

/**
 * A recording, in-memory sink — no network at all. Backed by
 * `earlyAccessSink.fixtures.json`: the `*@kro.invalid` addresses there answer
 * a canned receipt, a status failure, a network failure or a timeout, each
 * shaped exactly as the webhook binding throws it; any other address
 * joins with a sequential `ea-stub-<n>` id and position.
 */
export const makeStubbedEarlyAccessSink = (
  options: StubbedEarlyAccessSinkOptions = {},
): StubbedEarlyAccessSink => {
  const added: EarlyAccessRequest[] = []
  return {
    available: true,
    added,
    async add(request) {
      added.push(request)
      if (options.rejectWith !== undefined) throw options.rejectWith
      if (fixtures.networkFailures.includes(request.email))
        throw new TypeError('fetch failed')
      if (fixtures.timeouts.includes(request.email)) throw timeoutError()
      const failure = fixtureFailures[request.email]
      if (failure !== undefined) throw errorForStatus(failure.status)
      const canned = fixtureReceipts[request.email]
      return {
        id: canned?.id ?? `ea-stub-${added.length}`,
        email: request.email,
        platform: request.platform,
        position: canned === undefined ? added.length : canned.position,
        joined_at: options.joinedAt ?? fixtures.joinedAt,
      }
    },
  }
}

export const stubbedEarlyAccessSink: EarlyAccessSink =
  makeStubbedEarlyAccessSink()
