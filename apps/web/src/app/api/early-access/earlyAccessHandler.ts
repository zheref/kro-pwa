/**
 * `POST /api/early-access` — a Producer (`RC-43`): it calls a Service (the
 * sink) and answers a `Result`, serialised as `{ ok: true, value }` or
 * `{ ok: false, error: { kind, message, recoverable } }`.
 *
 * Built as a factory over its dependencies so the spec drives the real
 * handler with a stubbed sink and no network; `route.ts` only binds the live
 * (or unavailable) sink from the environment.
 *
 * Order of checks: a body that is not a JSON object is `unknown` (400); a
 * filled honeypot (`website`) gets a convincing fake receipt and never reaches
 * the sink, so a bot learns nothing; then the email and the platform are
 * validated (`invalidEmail`, 400); then the sink. Every thrown value goes
 * through `EarlyAccessMapper.toException`, and the status comes from the kind.
 *
 * Nothing here logs — least of all the email.
 */
import {
  type EarlyAccessException,
  EarlyAccessExceptions,
  EarlyAccessMapper,
  type EarlyAccessRequest,
  type EarlyAccessResponse,
  isKroPlatform,
} from '@kro/core'
import type { EarlyAccessSink } from './earlyAccessSink'

export interface EarlyAccessHandlerDependencies {
  readonly sink: EarlyAccessSink
  /** Stamps the honeypot's fake receipt. Defaults to the wall clock. */
  readonly now?: () => Date
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

export const makeEarlyAccessHandler =
  (dependencies: EarlyAccessHandlerDependencies) =>
  async (request: Request): Promise<Response> => {
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
      const now = (dependencies.now ?? (() => new Date()))()
      return success({
        id: `ea-${now.getTime().toString(36)}`,
        email: typeof email === 'string' ? email : '',
        platform: isKroPlatform(fields.platform) ? fields.platform : 'web',
        position: null,
        joined_at: now.toISOString(),
      })
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
      return failure(EarlyAccessMapper.toException(error))
    }
  }
