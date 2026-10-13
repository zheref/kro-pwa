// @vitest-environment node
/**
 * The handler driven end to end over a stubbed sink — no network, no Next
 * runtime (`RC-43`). The sink's own wire behaviour has its suite in
 * `EarlyAccessSinkService.test.ts`.
 */
import { earlyAccessRequestMocks } from '@kro/core/mocks'
import { describe, expect, it, vi } from 'vitest'
import { makeEarlyAccessHandler } from '../EarlyAccessHandler'
import {
  makeStubbedEarlyAccessSink,
  makeUnavailableEarlyAccessSink,
} from '../EarlyAccessSinkService'

const SITE = 'https://kro.app'
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${SITE}/api/early-access`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const valid = {
  email: earlyAccessRequestMocks.typical.email,
  platform: earlyAccessRequestMocks.typical.platform,
  source: earlyAccessRequestMocks.typical.source,
  locale: earlyAccessRequestMocks.typical.locale,
}

type Body = {
  ok: boolean
  value: {
    id: string
    email: string
    platform: string
    position: unknown
    joined_at: string
  }
  error: { kind: string; message: string }
}

const json = async (response: Response): Promise<Body> =>
  (await response.json()) as Body

describe('POST /api/early-access handler — joining', () => {
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

  it('accepts a same-origin request and a charset on the JSON content type', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(
      post(valid, {
        origin: SITE,
        'content-type': 'application/json; charset=utf-8',
      }),
    )

    expect(response.status).toBe(200)
    expect(sink.added).toHaveLength(1)
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
})

describe('POST /api/early-access handler — the kill switch and the abuse surface', () => {
  it('answers unavailable (503) with the sign-up switched off, before reading the body', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const request = post(valid)
    const response = await makeEarlyAccessHandler({
      sink,
      enabled: () => false,
    })(request)

    expect(response.status).toBe(503)
    expect((await json(response)).error.kind).toBe('unavailable')
    expect(request.bodyUsed).toBe(false)
    expect(sink.added).toEqual([])
  })

  it('refuses a cross-site Origin with 403 and never reaches the sink', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({ sink })(
      post(valid, { origin: 'https://evil.example' }),
    )

    expect(response.status).toBe(403)
    expect((await json(response)).error).toMatchObject({
      kind: 'unknown',
      message: 'Cross-site requests are not accepted.',
    })
    expect(sink.added).toEqual([])
  })

  it('refuses a body not declared as JSON with 415 — a CORS simple request', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const handler = makeEarlyAccessHandler({ sink })

    const plain = await handler(post(valid, { 'content-type': 'text/plain' }))
    expect(plain.status).toBe(415)
    expect((await json(plain)).error.kind).toBe('unknown')

    const none = await handler(
      new Request(`${SITE}/api/early-access`, {
        method: 'POST',
        body: new Uint8Array([123, 125]),
      }),
    )
    expect(none.status).toBe(415)
    expect(sink.added).toEqual([])
  })

  it('answers unavailable (503) when the sink cannot take sign-ups, before validating', async () => {
    const response = await makeEarlyAccessHandler({
      sink: makeUnavailableEarlyAccessSink(),
    })(post({ ...valid, email: 'nope' }))

    expect(response.status).toBe(503)
    expect((await json(response)).error.kind).toBe('unavailable')
  })
})

describe('POST /api/early-access handler — the honeypot', () => {
  it('answers a filled honeypot with a receipt shaped like a real one, never reaching the sink', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const now = () => new Date('2026-10-12T08:00:00.000Z')
    const response = await makeEarlyAccessHandler({ sink, now })(
      post({ ...valid, website: 'https://spam.example' }),
    )

    expect(response.status).toBe(200)
    const body = await json(response)
    expect(body.ok).toBe(true)
    expect(body.value.id).toMatch(UUID)
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

    expect(response.status).toBe(200)
    expect((await json(response)).value).toMatchObject({
      email: '',
      platform: 'web',
    })
  })

  it('gives a honeypot the same 503 a real request gets when no sink is configured', async () => {
    const response = await makeEarlyAccessHandler({
      sink: makeUnavailableEarlyAccessSink(),
    })(post({ ...valid, website: 'x' }))

    expect(response.status).toBe(503)
    expect((await json(response)).error.kind).toBe('unavailable')
  })

  it('gives a honeypot the same 503 a real request gets with the sign-up switched off', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const response = await makeEarlyAccessHandler({
      sink,
      enabled: () => false,
    })(post({ ...valid, website: 'x' }))

    expect(response.status).toBe(503)
    expect(sink.added).toEqual([])
  })
})

describe('POST /api/early-access handler — refusals and sink failures', () => {
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

  it('answers an address already on the list with the same 200 a new join gets — no membership oracle', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const now = () => new Date('2026-10-12T10:00:00.000Z')
    const response = await makeEarlyAccessHandler({ sink, now })(
      post({ ...valid, email: 'already@kro.invalid' }),
    )

    expect(response.status).toBe(200)
    const body = await json(response)
    expect(body.ok).toBe(true)
    expect(body.value).toEqual({
      id: expect.stringMatching(UUID),
      email: 'already@kro.invalid',
      platform: 'ios',
      position: null,
      joined_at: '2026-10-12T10:00:00.000Z',
    })
    expect(sink.added).toHaveLength(1)
  })

  it('answers a thrown alreadyJoined kind as a plain success too', async () => {
    const sink = makeStubbedEarlyAccessSink({
      rejectWith: { kind: 'alreadyJoined' },
    })
    const response = await makeEarlyAccessHandler({ sink })(post(valid))
    expect(response.status).toBe(200)
  })

  it('answers unknown (500) when the webhook refuses the payload with a 422 — never invalidEmail', async () => {
    const response = await makeEarlyAccessHandler({
      sink: makeStubbedEarlyAccessSink(),
    })(post({ ...valid, email: 'invalid@kro.invalid' }))

    expect(response.status).toBe(500)
    expect((await json(response)).error.kind).toBe('unknown')
  })

  it('answers unavailable (503) when the webhook times out', async () => {
    const response = await makeEarlyAccessHandler({
      sink: makeStubbedEarlyAccessSink(),
    })(post({ ...valid, email: 'slow@kro.invalid' }))

    expect(response.status).toBe(503)
    expect((await json(response)).error.kind).toBe('unavailable')
  })

  it('answers unavailable (503) when the webhook itself says so', async () => {
    const response = await makeEarlyAccessHandler({
      sink: makeStubbedEarlyAccessSink(),
    })(post({ ...valid, email: 'unavailable@kro.invalid' }))

    expect(response.status).toBe(503)
  })

  it('answers offline (502) when the sink is unreachable, and unknown (500) otherwise', async () => {
    const handler = makeEarlyAccessHandler({
      sink: makeStubbedEarlyAccessSink(),
    })
    expect(
      (await handler(post({ ...valid, email: 'offline@kro.invalid' }))).status,
    ).toBe(502)

    const response = await handler(
      post({ ...valid, email: 'broken@kro.invalid' }),
    )
    expect(response.status).toBe(500)
    expect((await json(response)).error.kind).toBe('unknown')
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
