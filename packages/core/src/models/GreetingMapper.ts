/**
 * SCAFFOLDING — the demo feature's Mapper (`RC-30`, `UZF-17`).
 *
 * The single place wire ↔ domain translation happens, and the single place a
 * caught `unknown` becomes a typed `GreetingException`. A Producer's `catch`
 * block calls `toException` — it never re-implements the mapping inline.
 */
import { type Exception, toUnknownException } from '../library/exception'
import type { Greeting } from './Greeting'
import { type GreetingException, GreetingExceptions } from './GreetingException'
import type { GreetingResponse } from './GreetingResponse'

/** Reads an HTTP-ish `status` off an arbitrary caught value without throwing. */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

export const GreetingMapper = {
  /**
   * Returns `null` on malformed input rather than a partial domain object, so the
   * caller surfaces a typed exception instead of storing something half-built.
   */
  toDomain(response: GreetingResponse): Greeting | null {
    const issuedAt = new Date(response.issued_at)
    if (response.id.length === 0 || response.recipient.length === 0) return null
    if (Number.isNaN(issuedAt.getTime())) return null

    return {
      id: response.id,
      recipient: response.recipient,
      message: response.message,
      signature: response.signature ?? null,
      issuedAt,
    }
  },

  fromDomain(greeting: Greeting): GreetingResponse {
    return {
      id: greeting.id,
      recipient: greeting.recipient,
      message: greeting.message,
      signature: greeting.signature,
      issued_at: greeting.issuedAt.toISOString(),
    }
  },

  toException(error: unknown): GreetingException {
    if (error instanceof TypeError) return GreetingExceptions.offline()

    const status = statusOf(error)
    if (status === 401 || status === 403) return GreetingExceptions.unauthorized()
    if (status === 404) return GreetingExceptions.notFound()

    const unknown: Exception<'unknown'> = toUnknownException(error)
    return unknown
  },
}
