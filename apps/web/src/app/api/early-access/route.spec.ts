/**
 * The route file itself, with **no network**: what it binds from the
 * environment and the flag registry. With the webhook unset, plaintext or
 * garbage every request answers the typed `unavailable` outcome; with the
 * `landingPage` flag off, so does every request; with an `https:` webhook a
 * request that fails validation never reaches it. The behaviour proper has its
 * suite in `@kro/app`'s `EarlyAccessHandler.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, dynamic } from './route'

const landingEnabled = vi.fn(() => true)
vi.mock('../../(marketing)/landingFlag', () => ({
  isLandingEnabled: () => landingEnabled(),
}))

const post = (body: unknown) =>
  new Request('https://kro.app/api/early-access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const valid = { email: 'ada@example.com', platform: 'ios' }

beforeEach(() => {
  // Deterministic: a developer's shell may have real values exported.
  vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', '')
  vi.stubEnv('EARLY_ACCESS_WEBHOOK_TOKEN', '')
  landingEnabled.mockReturnValue(true)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/early-access', () => {
  it('is dynamic — every answer is per-request', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('answers unavailable (503) on a deployment with no webhook configured', async () => {
    const response = await POST(post(valid))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { kind: 'unavailable', recoverable: true },
    })
  })

  it('validates before it ever reaches a configured webhook', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'https://hooks.example.invalid/x')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post({ email: 'nope', platform: 'ios' }))

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses a plaintext http: webhook — the address and token never go out in the clear', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'http://hooks.example.invalid/x')
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_TOKEN', 'test-token-value')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post(valid))

    expect(response.status).toBe(503)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats a webhook value that is not a URL at all as unconfigured', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'hooks dot example')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post(valid))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unavailable' },
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers unavailable (503) with the landingPage flag off, even with a webhook set', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'https://hooks.example.invalid/x')
    landingEnabled.mockReturnValue(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post(valid))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unavailable' },
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
