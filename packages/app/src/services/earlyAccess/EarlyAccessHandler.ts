/**
 * `POST /api/early-access` — a Producer (`RC-43`): it calls a Service (the
 * sink) and answers a `Result`, serialised as `{ ok: true, value }` or
 * `{ ok: false, error: { kind, message, recoverable } }`.
 *
 * Built as a factory over its dependencies so the suite drives the real
 * handler with a stubbed sink and no network; `apps/web`'s `route.ts` only
 * reads the environment and binds the live (or unavailable) sink. It lives in
 * `@kro/app` because a Producer belongs to the shared tier, never to the app
 * shell (`RC-62`), and is reached through `@kro/app/early-access`.
 *
 * Order of checks:
 * 1. the `landingPage` flag (`enabled`) — off, every request is `unavailable`
 *    (503) before the body is read: the flag is the sign-up's kill switch too;
 * 2. a cross-site `Origin` — one that is neither the request URL's origin nor
 *    on `allowedOrigins` (the deployment's public origins, for a proxied
 *    request) — is refused (403), and a body not declared as
 *    `application/json` is refused (415) — together they force a browser's
 *    CORS preflight, so another site cannot post a visitor's address here;
 * 3. a sink that cannot take sign-ups answers `unavailable` (503) — decided
 *    before the honeypot, so a bot gets the status a person would;
 * 4. a body that is not a JSON object is `unknown` (400);
 * 5. a filled honeypot (`website`) gets a fake receipt shaped exactly like a
 *    real one and never reaches the sink;
 * 6. the email and the platform are validated (`invalidEmail`, 400);
 * 7. the sink. "Already on the list" answers the same 200 as a new join, so
 *    the route never tells anyone whether an address has signed up; every
 *    other thrown value goes through `EarlyAccessMapper.toException`, and the
 *    status comes from the kind.
 *
 * Durable rate limiting and double opt-in need a shared store or the
 * platform's WAF; both are tracked as their own issue, not done here.
 *
 * Nothing here logs — least of all the email.
 */
import {
  type EarlyAccessException,
  EarlyAccessExceptions,
  EarlyAccessMapper,
  type EarlyAccessRequest,
  type EarlyAccessResponse,
  type KroPlatform,
  isKroPlatform,
} from '@kro/core'
import type { EarlyAccessSink } from './EarlyAccessSinkService'

export interface EarlyAccessHandlerDependencies {
  readonly sink: EarlyAccessSink
  /**
   * Whether the sign-up is switched on — the `landingPage` flag read the route
   * binds. Defaults to on.
   */
  readonly enabled?: () => boolean
  /** Stamps a receipt the handler writes itself. Defaults to the wall clock. */
  readonly now?: () => Date
  /**
   * Public origins a browser may post from besides the request URL's own —
   * behind a TLS-terminating proxy the request URL is the bind address
   * (`http://<bind>:<port>`), never the public `https://` origin. Built from
   * configuration by the route, never from a request header. Defaults to none.
   */
  readonly allowedOrigins?: readonly string[]
}

const NO_STORE = { 'cache-control': 'no-store' }

const success = (value: EarlyAccessResponse): Response =>
  Response.json({ ok: true, value }, { status: 200, headers: NO_STORE })

/**
 * The status follows the kind, except where the caller knows better: a body
 * that is not a JSON object is the client's mistake (400), though its kind is
 * `unknown` because no union member describes it.
 */
const failure = (
  error: EarlyAccessException,
  status: number = EarlyAccessExceptions.httpStatus(error),
): Response =>
  Response.json(
    {
      ok: false,
      error: {
        kind: error.kind,
        message: error.message,
        recoverable: error.recoverable,
      },
    },
    { status, headers: NO_STORE },
  )

const optionalText = (value: unknown, maxLength: number): string | null =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, maxLength)
    : null

/** A receipt indistinguishable from one a webhook with no queue answers. */
const receiptFor = (
  email: string,
  platform: KroPlatform,
  now: Date,
): EarlyAccessResponse => ({
  id: crypto.randomUUID(),
  email,
  platform,
  position: null,
  joined_at: now.toISOString(),
})

/**
 * An absent `Origin` is a non-browser client and passes; a present one must
 * equal the request URL's origin or be on the configured list. `null` (an
 * opaque origin — a sandboxed frame, a `data:` page) is on no list.
 */
const isCrossSite = (
  request: Request,
  allowedOrigins: readonly string[],
): boolean => {
  const origin = request.headers.get('origin')
  if (origin === null) return false
  if (origin === new URL(request.url).origin) return false
  return !allowedOrigins.includes(origin)
}

const isJson = (request: Request): boolean =>
  (request.headers.get('content-type') ?? '')
    .trim()
    .toLowerCase()
    .startsWith('application/json')

export const makeEarlyAccessHandler =
  (dependencies: EarlyAccessHandlerDependencies) =>
  async (request: Request): Promise<Response> => {
    const enabled = dependencies.enabled ?? (() => true)
    const now = dependencies.now ?? (() => new Date())

    if (!enabled()) return failure(EarlyAccessExceptions.unavailable())
    if (isCrossSite(request, dependencies.allowedOrigins ?? [])) {
      return failure(
        EarlyAccessExceptions.unknown('Cross-site requests are not accepted.'),
        403,
      )
    }
    if (!isJson(request)) {
      return failure(
        EarlyAccessExceptions.unknown(
          'The request body must be sent as application/json.',
        ),
        415,
      )
    }
    if (!dependencies.sink.available) {
      return failure(EarlyAccessExceptions.unavailable())
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return failure(
        EarlyAccessExceptions.unknown('The request body was not valid JSON.'),
        400,
      )
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return failure(
        EarlyAccessExceptions.unknown(
          'The request body was not a JSON object.',
        ),
        400,
      )
    }
    const fields = body as Record<string, unknown>
    const email =
      typeof fields.email === 'string' ? fields.email.trim() : fields.email

    // Bots fill every field; people never see this one.
    if (typeof fields.website === 'string' && fields.website.length > 0) {
      return success(
        receiptFor(
          typeof email === 'string' ? email : '',
          isKroPlatform(fields.platform) ? fields.platform : 'web',
          now(),
        ),
      )
    }

    if (
      !EarlyAccessMapper.isLikelyEmail(email) ||
      !isKroPlatform(fields.platform)
    ) {
      return failure(EarlyAccessExceptions.invalidEmail())
    }

    const earlyAccessRequest: EarlyAccessRequest = {
      email,
      platform: fields.platform,
      source: optionalText(fields.source, 64),
      locale: optionalText(fields.locale, 35),
    }

    try {
      return success(await dependencies.sink.add(earlyAccessRequest))
    } catch (error) {
      const exception = EarlyAccessMapper.toException(error)
      // The sink dedupes; the visitor is told only that the request landed.
      if (exception.kind === 'alreadyJoined') {
        return success(receiptFor(email, earlyAccessRequest.platform, now()))
      }
      return failure(exception)
    }
  }
