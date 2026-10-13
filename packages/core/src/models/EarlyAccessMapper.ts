/**
 * The early-access Mapper (`RC-30`, `UZF-17`) — the single place wire ↔ domain
 * translation happens, and the single place a caught `unknown` becomes a typed
 * `EarlyAccessException`. Both the browser Producer and the `/api/early-access`
 * route handler call it; neither re-implements the mapping.
 */
import type { EarlyAccessException } from './EarlyAccessException'
import { EarlyAccessExceptions } from './EarlyAccessException'
import type { EarlyAccessReceipt } from './EarlyAccessReceipt'
import type { EarlyAccessRequest } from './EarlyAccessRequest'
import type {
  EarlyAccessRequestBody,
  EarlyAccessResponse,
} from './EarlyAccessResponse'
import { isKroPlatform } from './KroPlatform'

/** RFC 5321's practical ceiling on a whole address. */
const MAX_EMAIL_LENGTH = 254

/**
 * Deliberately loose: one `@`, something before it, a dotted domain after it,
 * no whitespace. Deliverability is the sink's problem; this only stops typos
 * and junk from reaching it.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

function kindOf(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  return (error as { kind?: unknown }).kind
}

export const EarlyAccessMapper = {
  /** Whether `value` is plausibly an email address worth sending on. */
  isLikelyEmail(value: unknown): value is string {
    if (typeof value !== 'string') return false
    if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false
    return EMAIL_RE.test(value)
  },

  /**
   * `null` on a malformed payload — an empty id or email, a platform this
   * product does not ship on, an unparseable date or a non-integer position —
   * so the caller surfaces a typed exception instead of storing half a receipt.
   */
  toDomain(response: EarlyAccessResponse): EarlyAccessReceipt | null {
    if (typeof response.id !== 'string' || response.id.length === 0) return null
    if (typeof response.email !== 'string' || response.email.length === 0)
      return null
    if (!isKroPlatform(response.platform)) return null
    const joinedAt = new Date(response.joined_at)
    if (Number.isNaN(joinedAt.getTime())) return null
    const position = response.position ?? null
    if (position !== null && !(Number.isInteger(position) && position >= 0))
      return null

    return {
      id: response.id,
      email: response.email,
      platform: response.platform,
      position,
      joinedAt,
    }
  },

  /** The request in wire form — the JSON body posted to the route and sink. */
  fromDomain(request: EarlyAccessRequest): EarlyAccessRequestBody {
    return {
      email: request.email,
      platform: request.platform,
      source: request.source,
      locale: request.locale,
    }
  },

  /**
   * A network failure (`TypeError`) is `offline`; a thrown value already
   * carrying a declared `kind` (the route's error body, preserved by the
   * browser Service) keeps it; otherwise an HTTP status maps to its kind; and
   * anything else is `unknown` — with the default copy, never the caught
   * error's own text.
   */
  toException(error: unknown): EarlyAccessException {
    if (error instanceof TypeError) return EarlyAccessExceptions.offline()

    const declared = EarlyAccessExceptions.fromKind(kindOf(error))
    if (declared !== null) return declared

    const status = statusOf(error)
    if (status === 409) return EarlyAccessExceptions.alreadyJoined()
    if (status === 400 || status === 422)
      return EarlyAccessExceptions.invalidEmail()
    if (status === 503) return EarlyAccessExceptions.unavailable()

    return EarlyAccessExceptions.unknown()
  },
}

/** Free-function form of `EarlyAccessMapper.isLikelyEmail`. */
export const isLikelyEmail = (value: unknown): value is string =>
  EarlyAccessMapper.isLikelyEmail(value)
