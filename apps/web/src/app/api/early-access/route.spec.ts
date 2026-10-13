/**
 * The route file itself, with **no network**: with the webhook unset every
 * request answers the typed `unavailable` outcome, and with it set a request
 * that fails validation never reaches the sink. The behaviour proper has its
 * suite in `earlyAccessHandler.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, dynamic } from './route'

const post = (body: unknown) =>
  new Request('https://kro.app/api/early-access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  // Deterministic: a developer's shell may have real values exported.
  vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', '')
  vi.stubEnv('EARLY_ACCESS_WEBHOOK_TOKEN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/early-access', () => {
  it('is dynamic — every answer is per-request', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('answers unavailable (503) on a deployment with no webhook configured', async () => {
    const response = await POST(
      post({ email: 'ada@example.com', platform: 'ios' }),
    )
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
    fetchSpy.mockRestore()
  })
})
