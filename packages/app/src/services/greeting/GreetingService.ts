/**
 * SCAFFOLDING — the demo feature's Service (`RC-6`, `RC-33`, `RC-59`).
 *
 * A Service is a stateless wrapper around one external system. It returns the
 * **wire** shape and is allowed to throw: the `Result` boundary belongs to the
 * Producer, not here (`RC-7`). It ships in a pair — `liveGreetingService` for
 * production and `stubbedGreetingService` reading `greeting.fixtures.json` for
 * every test and story. A live-only Service is incomplete.
 *
 * Nothing outside `library/store.ts` (which assembles `ThunkExtra`) and test
 * setup may import this module — `scripts/check-uzf-boundaries.mjs` fails the
 * lint task if it does, which is what makes "components cannot fetch" a
 * structural fact rather than a convention.
 */
import type { GreetingResponse } from '@kro/core'
import fixtures from './greeting.fixtures.json'

export interface GreetingService {
  fetchGreeting(
    recipient: string,
    options?: { signal?: AbortSignal },
  ): Promise<GreetingResponse>
}

const GREETINGS_ENDPOINT = 'https://greetings.kro.invalid/greetings'

const fixtureGreetings = fixtures.greetings as Record<
  string,
  GreetingResponse | undefined
>

/** Shapes a transport failure the way `GreetingMapper.toException` reads it. */
function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status })
}

export const liveGreetingService: GreetingService = {
  async fetchGreeting(recipient, options = {}) {
    const response = await fetch(
      `${GREETINGS_ENDPOINT}/${encodeURIComponent(recipient)}`,
      {
        signal: options.signal,
      },
    )
    if (!response.ok)
      throw httpError(response.status, `HTTP ${response.status}`)
    return (await response.json()) as GreetingResponse
  },
}

export const stubbedGreetingService: GreetingService = {
  async fetchGreeting(recipient, _options = {}) {
    const found = fixtureGreetings[recipient]
    if (found === undefined)
      throw httpError(404, `no greeting fixture for "${recipient}"`)
    return found
  },
}
