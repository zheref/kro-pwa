/**
 * The browser's early-access binding (`RC-6`, `RC-33`, `RC-59`).
 *
 * It posts to this app's own `/api/early-access` route — never to the waitlist
 * provider — so no webhook URL or token exists on this side of the wire. It
 * returns the **wire** receipt and throws on failure; the `Result` boundary is
 * the Producer's, which hands the thrown value to `EarlyAccessMapper.toException`.
 *
 * A non-2xx answer throws an `Error` carrying `status` and, when the route's
 * body named one, its `kind` — so the Mapper can keep the route's own verdict
 * (a 502 the route called `offline`) instead of guessing from the number.
 *
 * Nothing outside `library/store.ts` and tests may import this module
 * (`check-uzf-boundaries.mjs`).
 */
import {
  type EarlyAccessRequest,
  type EarlyAccessResponse,
  EarlyAccessMapper,
} from '@kro/core'
import fixtures from './earlyAccess.fixtures.json'

export interface EarlyAccessService {
  join(
    request: EarlyAccessRequest,
    options?: { signal?: AbortSignal },
  ): Promise<EarlyAccessResponse>
}

/** Same-origin: the route handler in `apps/web` owns the sink. */
export const EARLY_ACCESS_ENDPOINT = '/api/early-access'

/** Shapes a failure the way `EarlyAccessMapper.toException` reads it. */
function httpError(status: number, kind: unknown): Error {
  return Object.assign(new Error(`HTTP ${status}`), {
    status,
    ...(typeof kind === 'string' ? { kind } : {}),
  })
}

/** The route's error body is `{ ok: false, error: { kind } }`; read it softly. */
async function errorKindOf(response: Response): Promise<unknown> {
  try {
    const body = (await response.json()) as {
      error?: { kind?: unknown }
    } | null
    return body?.error?.kind
  } catch {
    return undefined
  }
}

export interface LiveEarlyAccessServiceOptions {
  /** Injected for tests; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch
  readonly endpoint?: string
}

export const makeLiveEarlyAccessService = (
  options: LiveEarlyAccessServiceOptions = {},
): EarlyAccessService => ({
  async join(request, { signal } = {}) {
    const doFetch = options.fetch ?? fetch
    const response = await doFetch(options.endpoint ?? EARLY_ACCESS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(EarlyAccessMapper.fromDomain(request)),
      signal,
    })
    if (!response.ok)
      throw httpError(response.status, await errorKindOf(response))
    const body = (await response.json()) as {
      ok?: unknown
      value?: EarlyAccessResponse
    }
    if (body.ok !== true || body.value === undefined)
      throw httpError(response.status, 'unknown')
    return body.value
  },
})

export const liveEarlyAccessService: EarlyAccessService =
  makeLiveEarlyAccessService()

// ---------------------------------------------------------------------------
// The stub
// ---------------------------------------------------------------------------

const fixtureFailures = fixtures.failures as Record<
  string,
  { status: number; kind: string } | undefined
>

/** A deterministic id per address, so two joins of one email agree. */
const stubIdFor = (email: string): string => {
  let hash = 0
  for (const char of email)
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return `ea-stub-${hash.toString(16)}`
}

/**
 * Fixture-backed: `already@kro.invalid` answers 409, `unavailable@…` 503,
 * `invalid@…` 400, `offline@…` a network `TypeError`; any other address joins
 * with `position: null`, exactly like a webhook sink with no queue.
 */
export const stubbedEarlyAccessService: EarlyAccessService = {
  async join(request) {
    if (fixtures.networkFailures.includes(request.email))
      throw new TypeError('Failed to fetch')
    const failure = fixtureFailures[request.email]
    if (failure !== undefined) throw httpError(failure.status, failure.kind)
    return {
      id: stubIdFor(request.email),
      email: request.email,
      platform: request.platform,
      position: null,
      joined_at: fixtures.joinedAt,
    }
  },
}

export interface RecordingEarlyAccessService extends EarlyAccessService {
  /** Every request handed to `join`, in order. */
  readonly calls: readonly EarlyAccessRequest[]
}

/**
 * The stub, plus a record of what it was asked — for suites asserting that a
 * Producer sent the right request (or sent none).
 */
export const makeRecordingEarlyAccessService =
  (): RecordingEarlyAccessService => {
    const calls: EarlyAccessRequest[] = []
    return {
      calls,
      join: (request, options) => {
        calls.push(request)
        return stubbedEarlyAccessService.join(request, options)
      },
    }
  }
