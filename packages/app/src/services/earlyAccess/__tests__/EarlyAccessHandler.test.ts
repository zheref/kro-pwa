// @vitest-environment node
/**
 * The handler driven end to end over a stubbed sink — no network, no Next
 * runtime (`RC-43`). The sink's own wire behaviour has its suite in
 * `EarlyAccessSinkService.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest'
import { makeEarlyAccessHandler } from '../EarlyAccessHandler'
import { makeStubbedEarlyAccessSink } from '../EarlyAccessSinkService'

const post = (body: unknown) =>
  new Request('https://kro.app/api/early-access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const valid = {
  email: 'ada@example.com',
  platform: 'ios',
  source: 'hero',
  locale: 'en-US',
}

describe('POST /api/early-access handler', () => {
  it('adds a valid request to the sink and answers its receipt', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(post(valid))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toEqual({
      ok: true,
      value: {
        id: 'ea-stub-1',
        email: 'ada@example.com',
        platform: 'ios',
        position: 1,
        joined_at: '2026-10-12T12:00:00.000Z',
      },
    })
    expect(sink.added).toEqual([valid])
  })

  it('trims the email and caps free-text context before it reaches the sink', async () => {
    const sink = makeStubbedEarlyAccessSink()
    await makeEarlyAccessHandler({ sink })(
      post({
        email: '  ada@example.com ',
        platform: 'web',
        source: 'x'.repeat(200),
        locale: '   ',
      }),
    )

    expect(sink.added[0]).toEqual({
      email: 'ada@example.com',
      platform: 'web',
      source: 'x'.repeat(64),
      locale: null,
    })
  })

  it('refuses a malformed email with invalidEmail (400) and never calls the sink', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(
      post({ ...valid, email: 'ada.example.com' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { kind: 'invalidEmail', recoverable: true },
    })
    expect(sink.added).toEqual([])
  })

  it('refuses a platform Kro does not know with invalidEmail (400)', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(
      post({ ...valid, platform: 'linux' }),
    )

    expect(response.status).toBe(400)
    expect(sink.added).toEqual([])
  })

  it('answers a filled honeypot with a fake receipt and never reaches the sink — a bot learns nothing', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const now = () => new Date('2026-10-12T08:00:00.000Z')
    const response = await makeEarlyAccessHandler({ sink, now })(
      post({ ...valid, website: 'https://spam.example' }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      ok: boolean
      value: { joined_at: string; position: unknown; platform: string }
    }
    expect(body.ok).toBe(true)
    expect(body.value.joined_at).toBe('2026-10-12T08:00:00.000Z')
    expect(body.value.position).toBeNull()
    expect(body.value.platform).toBe('ios')
    expect(sink.added).toEqual([])
  })

  it('fakes success for a honeypot even when the rest of the body is junk', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(
      post({ website: 'x', email: 42, platform: 'beos' }),
    )
    const body = (await response.json()) as {
      value: { email: string; platform: string }
    }

    expect(response.status).toBe(200)
    expect(body.value).toMatchObject({ email: '', platform: 'web' })
  })

  it('answers alreadyJoined (409) when the sink says the address is on the list', async () => {
    const sink = makeStubbedEarlyAccessSink({ rejectWith: { status: 409 } })
    const response = await makeEarlyAccessHandler({ sink })(post(valid))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { kind: 'alreadyJoined', recoverable: false },
    })
  })

  it('answers unavailable (503) on a deployment with no sink configured', async () => {
    const sink = makeStubbedEarlyAccessSink({ rejectWith: { status: 503 } })
    const response = await makeEarlyAccessHandler({ sink })(post(valid))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unavailable' },
    })
  })

  it('answers offline (502) when the sink is unreachable, and unknown (500) otherwise', async () => {
    const unreachable = makeStubbedEarlyAccessSink({
      rejectWith: new TypeError('fetch failed'),
    })
    expect(
      (await makeEarlyAccessHandler({ sink: unreachable })(post(valid))).status,
    ).toBe(502)

    const broken = makeStubbedEarlyAccessSink({ rejectWith: { status: 500 } })
    const response = await makeEarlyAccessHandler({ sink: broken })(post(valid))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { kind: 'unknown' } })
  })

  it('refuses a body that is not JSON, or not an object, with unknown (400)', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const handler = makeEarlyAccessHandler({ sink })

    for (const body of ['not json', '[1,2]', 'null', '"ada@example.com"']) {
      const response = await handler(post(body))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { kind: 'unknown' },
      })
    }
    expect(sink.added).toEqual([])
  })

  it('never logs the email, on success or failure', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    )
    await makeEarlyAccessHandler({ sink: makeStubbedEarlyAccessSink() })(
      post(valid),
    )
    await makeEarlyAccessHandler({
      sink: makeStubbedEarlyAccessSink({ rejectWith: new Error('boom') }),
    })(post(valid))

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })
})
