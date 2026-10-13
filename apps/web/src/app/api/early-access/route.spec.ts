/**
 * The route file itself, with **no network**: what it binds from the
 * environment and the flag registry. With the webhook unset, plaintext or
 * garbage every request answers the typed `unavailable` outcome; with the
 * `landingPage` flag off, so does every request; with an `https:` webhook a
 * request that fails validation never reaches it. The behaviour proper has its
 * suite in `@kro/app`'s `EarlyAccessHandler.test.ts`.
 */
import type * as EarlyAccess from '@kro/app/early-access'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, dynamic } from './route'

const landingEnabled = vi.fn(() => true)
vi.mock('../../(marketing)/landingFlag', () => ({
  isLandingEnabled: () => landingEnabled(),
}))

/**
 * The webhook binding is observed, never reached: the factory is wrapped so a
 * spec can see what the route bound, and it hands back the fixture-backed stub
 * sink instead of the live one, so no request ever leaves the process.
 */
const webhookFactory = vi.hoisted(() => ({
  calls: [] as { url: string; token?: string | null }[],
}))
vi.mock('@kro/app/early-access', async (importOriginal) => {
  const actual = await importOriginal<typeof EarlyAccess>()
  return {
    ...actual,
    makeWebhookEarlyAccessSink: (options: {
      url: string
      token?: string | null
    }) => {
      webhookFactory.calls.push(options)
      return actual.makeStubbedEarlyAccessSink()
    },
  }
})

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
  vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_HOST', '')
  vi.stubEnv('NEXT_PUBLIC_HUB_HOST', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
  landingEnabled.mockReturnValue(true)
  webhookFactory.calls.length = 0
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
    vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', 'privacy@kroapp.com')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post({ email: 'nope', platform: 'ios' }))

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('collects nothing (503) with a webhook set but no contact address to ask for removal', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'https://hooks.example.invalid/x')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(post(valid))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unavailable' },
    })
    expect(webhookFactory.calls).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats a contact value that is not an address as no contact at all', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', 'https://hooks.example.invalid/x')
    for (const contact of ['privacy', 'privacy@kroapp', 'a@b@kroapp.com']) {
      vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', contact)
      const response = await POST(post(valid))
      expect(response.status).toBe(503)
    }
    expect(webhookFactory.calls).toEqual([])
  })

  it('binds the webhook sink once both the https webhook and a contact address are set', async () => {
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_URL', ' https://hooks.example.invalid/x ')
    vi.stubEnv('EARLY_ACCESS_WEBHOOK_TOKEN', 'test-token-value')
    vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', ' privacy@kroapp.com ')

    const response = await POST(post(valid))

    expect(response.status).toBe(200)
    expect(webhookFactory.calls).toEqual([
      { url: 'https://hooks.example.invalid/x', token: 'test-token-value' },
    ])
  })

  it('accepts the public Origin of a proxied request from the configured hosts', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', 'kroapp.com')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', 'hub.kroapp.com')
    const proxied = (origin: string) =>
      new Request('http://localhost:3000/api/early-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify(valid),
      })

    // Past the Origin check, the unconfigured sink answers 503 — not 403.
    expect((await POST(proxied('https://kroapp.com'))).status).toBe(503)
    expect((await POST(proxied('https://hub.kroapp.com'))).status).toBe(503)
    expect((await POST(proxied('https://evil.example'))).status).toBe(403)
    expect((await POST(proxied('null'))).status).toBe(403)
  })

  it('accepts no public Origin for a proxied request when no host is configured', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/early-access', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://kroapp.com',
        },
        body: JSON.stringify(valid),
      }),
    )

    expect(response.status).toBe(403)
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
