// @vitest-environment node
/**
 * The sink is the one module that wraps the waitlist wire, so this is the one
 * suite that stands in for `fetch` — injected, never a global patch. Every
 * other suite stubs the `EarlyAccessSink` interface instead.
 */
import { EarlyAccessMapper } from '@kro/core'
import { earlyAccessRequestMocks } from '@kro/core/mocks'
import { describe, expect, it, vi } from 'vitest'
import {
  makeStubbedEarlyAccessSink,
  makeUnavailableEarlyAccessSink,
  makeWebhookEarlyAccessSink,
  stubbedEarlyAccessSink,
} from '../EarlyAccessSinkService'

const WEBHOOK = 'https://hooks.example.invalid/early-access'
const now = () => new Date('2026-10-12T09:00:00.000Z')

const caught = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected a rejection')
}

const fetchAnswering = (response: Response) =>
  vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response)

describe('the webhook sink', () => {
  it('POSTs the request and a joined_at stamp as JSON, with the bearer token', async () => {
    const fetchSpy = fetchAnswering(Response.json({ id: 'row-7', position: 7 }))
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      token: 'test-token-value',
      fetch: fetchSpy,
      now,
    })

    const receipt = await sink.add(earlyAccessRequestMocks.typical)

    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe(WEBHOOK)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: 'Bearer test-token-value',
    })
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'ada@example.com',
      platform: 'ios',
      source: 'hero',
      locale: 'en-US',
      joined_at: '2026-10-12T09:00:00.000Z',
    })
    expect(receipt).toEqual({
      id: 'row-7',
      email: 'ada@example.com',
      platform: 'ios',
      position: 7,
      joined_at: '2026-10-12T09:00:00.000Z',
    })
  })

  it('sends no Authorization header when no token is configured', async () => {
    const fetchSpy = fetchAnswering(new Response(null, { status: 204 }))
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      fetch: fetchSpy,
      now,
    })

    await sink.add(earlyAccessRequestMocks.bare)

    expect(fetchSpy.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'authorization',
    )
  })

  it('invents an id and leaves the position null when the webhook answers no JSON', async () => {
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      fetch: fetchAnswering(new Response('OK', { status: 200 })),
      now,
    })

    const receipt = await sink.add(earlyAccessRequestMocks.androidVote)

    expect(receipt.id.length).toBeGreaterThan(0)
    expect(receipt.position).toBeNull()
    expect(EarlyAccessMapper.toDomain(receipt)?.platform).toBe('android')
  })

  it('ignores a malformed id or position in the webhook’s answer', async () => {
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      fetch: fetchAnswering(Response.json({ id: '', position: 'third' })),
      now,
    })

    const receipt = await sink.add(earlyAccessRequestMocks.typical)

    expect(receipt.id).not.toBe('')
    expect(receipt.position).toBeNull()
  })

  it('throws status 409 when the webhook says the address is already listed', async () => {
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      fetch: fetchAnswering(new Response('dup', { status: 409 })),
    })

    const error = await caught(sink.add(earlyAccessRequestMocks.typical))

    expect(error).toMatchObject({ status: 409 })
    expect(EarlyAccessMapper.toException(error).kind).toBe('alreadyJoined')
  })

  it('throws the bare status on any other refusal, without the email in the message', async () => {
    const sink = makeWebhookEarlyAccessSink({
      url: WEBHOOK,
      fetch: fetchAnswering(new Response('nope', { status: 500 })),
    })

    const error = await caught(sink.add(earlyAccessRequestMocks.typical))

    expect(error).toMatchObject({ status: 500 })
    expect(String((error as Error).message)).not.toContain('ada@example.com')
  })

  it('stamps the wall clock when no clock is injected', async () => {
    const fetchSpy = fetchAnswering(new Response(null, { status: 204 }))
    const sink = makeWebhookEarlyAccessSink({ url: WEBHOOK, fetch: fetchSpy })

    const receipt = await sink.add(earlyAccessRequestMocks.bare)

    expect(Number.isNaN(new Date(receipt.joined_at).getTime())).toBe(false)
  })
})

describe('the unavailable sink', () => {
  it('always refuses with 503 — a deployment with no webhook configured', async () => {
    const error = await caught(
      makeUnavailableEarlyAccessSink().add(earlyAccessRequestMocks.typical),
    )
    expect(error).toMatchObject({ status: 503 })
    expect(EarlyAccessMapper.toException(error).kind).toBe('unavailable')
  })
})

describe('the stubbed sink', () => {
  it('records each request and numbers the positions', async () => {
    const sink = makeStubbedEarlyAccessSink()
    await sink.add(earlyAccessRequestMocks.typical)
    const second = await sink.add(earlyAccessRequestMocks.bare)

    expect(sink.added).toHaveLength(2)
    expect(second.position).toBe(2)
  })

  it('rejects with the configured value, after recording the attempt', async () => {
    const sink = makeStubbedEarlyAccessSink({ rejectWith: { status: 409 } })
    expect(await caught(sink.add(earlyAccessRequestMocks.typical))).toEqual({
      status: 409,
    })
    expect(sink.added).toHaveLength(1)
  })

  it('answers the fixture’s canned receipt for a known address', async () => {
    const receipt = await makeStubbedEarlyAccessSink().add({
      ...earlyAccessRequestMocks.bare,
      email: 'queued@kro.invalid',
    })
    expect(receipt).toMatchObject({ id: 'ea-fixture-queued', position: 12 })
  })

  it('fails the fixture’s failing addresses the way the webhook would', async () => {
    const sink = makeStubbedEarlyAccessSink()
    const as = (email: string) =>
      caught(sink.add({ ...earlyAccessRequestMocks.bare, email }))

    expect(await as('already@kro.invalid')).toMatchObject({ status: 409 })
    expect(await as('broken@kro.invalid')).toMatchObject({ status: 500 })
    expect(await as('offline@kro.invalid')).toBeInstanceOf(TypeError)
  })

  it('ships a shared default that answers a valid receipt', async () => {
    const receipt = await stubbedEarlyAccessSink.add(
      earlyAccessRequestMocks.bare,
    )
    expect(EarlyAccessMapper.toDomain(receipt)).not.toBeNull()
  })
})
