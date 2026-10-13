/**
 * The live binding is driven through an injected `fetch` — the Service is the
 * one module that wraps the wire, so this is the one suite that stands in for
 * it. Everything above the Service stubs the interface instead.
 */
import { EarlyAccessMapper } from '@kro/core'
import { earlyAccessRequestMocks } from '@kro/core/mocks'
import { describe, expect, it, vi } from 'vitest'
import {
  EARLY_ACCESS_ENDPOINT,
  makeLiveEarlyAccessService,
  makeRecordingEarlyAccessService,
  stubbedEarlyAccessService,
} from '../EarlyAccessService'

const receipt = {
  id: 'ea-1',
  email: 'ada@example.com',
  platform: 'ios',
  position: 3,
  joined_at: '2026-10-01T09:30:00.000Z',
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const caught = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected a rejection')
}

describe('the live binding', () => {
  it('posts the request as JSON to the same-origin route and returns its receipt', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse(200, { ok: true, value: receipt }),
    )
    const service = makeLiveEarlyAccessService({ fetch: fetchSpy })
    const controller = new AbortController()

    const result = await service.join(earlyAccessRequestMocks.typical, {
      signal: controller.signal,
    })

    expect(result).toEqual(receipt)
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe(EARLY_ACCESS_ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(init.body as string)).toEqual(
      EarlyAccessMapper.fromDomain(earlyAccessRequestMocks.typical),
    )
  })

  it('throws the status and the route’s own kind on a refusal — already on the list', async () => {
    const service = makeLiveEarlyAccessService({
      fetch: async () =>
        jsonResponse(409, {
          ok: false,
          error: { kind: 'alreadyJoined', message: 'x', recoverable: false },
        }),
    })

    const error = await caught(
      service.join(earlyAccessRequestMocks.alreadyJoined),
    )

    expect(error).toMatchObject({ status: 409, kind: 'alreadyJoined' })
    expect(EarlyAccessMapper.toException(error).kind).toBe('alreadyJoined')
  })

  it('throws the bare status when the error body is not JSON — a proxy’s HTML page', async () => {
    const service = makeLiveEarlyAccessService({
      fetch: async () =>
        new Response('<html>Bad gateway</html>', { status: 503 }),
    })

    const error = await caught(service.join(earlyAccessRequestMocks.typical))

    expect(error).toMatchObject({ status: 503 })
    expect(error).not.toHaveProperty('kind')
    expect(EarlyAccessMapper.toException(error).kind).toBe('unavailable')
  })

  it('treats a 200 without a receipt as unknown rather than returning half a value', async () => {
    const service = makeLiveEarlyAccessService({
      fetch: async () => jsonResponse(200, { ok: false }),
    })

    const error = await caught(service.join(earlyAccessRequestMocks.typical))

    expect(EarlyAccessMapper.toException(error).kind).toBe('unknown')
  })

  it('lets a network failure through as the TypeError the Mapper reads as offline', async () => {
    const service = makeLiveEarlyAccessService({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })

    const error = await caught(service.join(earlyAccessRequestMocks.typical))

    expect(EarlyAccessMapper.toException(error).kind).toBe('offline')
  })

  it('defaults to the global fetch when none is injected', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ok: true, value: receipt }))

    await makeLiveEarlyAccessService().join(earlyAccessRequestMocks.typical)

    expect(fetchSpy).toHaveBeenCalledWith(
      EARLY_ACCESS_ENDPOINT,
      expect.anything(),
    )
    fetchSpy.mockRestore()
  })
})

describe('the stubbed binding', () => {
  it('joins any ordinary address with no queue position', async () => {
    const response = await stubbedEarlyAccessService.join(
      earlyAccessRequestMocks.androidVote,
    )
    const domain = EarlyAccessMapper.toDomain(response)
    expect(domain?.platform).toBe('android')
    expect(domain?.position).toBeNull()
  })

  it('gives the same address the same id on every join', async () => {
    const first = await stubbedEarlyAccessService.join(
      earlyAccessRequestMocks.bare,
    )
    const second = await stubbedEarlyAccessService.join(
      earlyAccessRequestMocks.bare,
    )
    expect(first.id).toBe(second.id)
  })

  it('answers the fixture addresses with their failures', async () => {
    expect(
      EarlyAccessMapper.toException(
        await caught(
          stubbedEarlyAccessService.join(earlyAccessRequestMocks.alreadyJoined),
        ),
      ).kind,
    ).toBe('alreadyJoined')
    expect(
      EarlyAccessMapper.toException(
        await caught(
          stubbedEarlyAccessService.join(earlyAccessRequestMocks.offline),
        ),
      ).kind,
    ).toBe('offline')
    expect(
      EarlyAccessMapper.toException(
        await caught(
          stubbedEarlyAccessService.join({
            ...earlyAccessRequestMocks.bare,
            email: 'unavailable@kro.invalid',
          }),
        ),
      ).kind,
    ).toBe('unavailable')
  })
})

describe('makeRecordingEarlyAccessService', () => {
  it('records every request in order while answering like the stub', async () => {
    const service = makeRecordingEarlyAccessService()

    await service.join(earlyAccessRequestMocks.typical)
    await caught(service.join(earlyAccessRequestMocks.alreadyJoined))

    expect(service.calls).toEqual([
      earlyAccessRequestMocks.typical,
      earlyAccessRequestMocks.alreadyJoined,
    ])
  })

  it('starts empty, so one suite never sees another’s calls', () => {
    expect(makeRecordingEarlyAccessService().calls).toEqual([])
  })

  it('records a request even when the stub refuses it', async () => {
    const service = makeRecordingEarlyAccessService()
    await caught(service.join(earlyAccessRequestMocks.offline))
    expect(service.calls).toHaveLength(1)
  })
})
