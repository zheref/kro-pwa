import { greetingMocks } from '@kro/core/mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import type { GreetingService } from '../../../services/greeting/GreetingService'
import { fetchGreetingThunk } from '../GreetingProducer'

afterEach(() => {
  vi.restoreAllMocks()
})

const storeWith = (fetchGreeting: GreetingService['fetchGreeting']) =>
  makeStore({
    ...stubbedThunkExtra,
    greetingService: { fetchGreeting },
  } satisfies ThunkExtra)

describe('fetchGreetingThunk', () => {
  it('resolves ok with the mapped domain greeting — the fixture-backed happy path', async () => {
    const store = makeStore(stubbedThunkExtra)

    const action = await store.dispatch(
      fetchGreetingThunk({ recipient: 'ada' }),
    )

    expect(action.payload).toEqual({ ok: true, value: greetingMocks.typical })
  })

  it('resolves err(notFound) rather than rejecting when the service 404s', async () => {
    const store = makeStore(stubbedThunkExtra)

    const action = await store.dispatch(
      fetchGreetingThunk({ recipient: 'nobody-at-all' }),
    )

    expect(action.type).toBe('greeting/onGreetingFetchCompleted/fulfilled')
    expect(action.payload).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'notFound' }),
    })
  })

  it('resolves err(offline) when the request never left the device', async () => {
    const store = storeWith(
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const action = await store.dispatch(
      fetchGreetingThunk({ recipient: 'ada' }),
    )

    expect(action.payload).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'offline' }),
    })
  })

  it('resolves err(malformed) when the payload cannot become a domain greeting', async () => {
    const store = makeStore(stubbedThunkExtra)

    const action = await store.dispatch(
      fetchGreetingThunk({ recipient: 'malformed' }),
    )

    expect(action.payload).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'malformed' }),
    })
  })

  it('hands the abort signal to the Service so an aborted dispatch cancels the request', async () => {
    const fetchGreeting = vi.fn(
      async (_recipient: string, options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBeInstanceOf(AbortSignal)
        return {
          id: 'greeting-1',
          recipient: 'ada',
          message: 'Good morning, Ada.',
          signature: '— Kro',
          issued_at: '2026-01-15T08:00:00.000Z',
        }
      },
    )

    await storeWith(fetchGreeting).dispatch(
      fetchGreetingThunk({ recipient: 'ada' }),
    )

    expect(fetchGreeting).toHaveBeenCalledTimes(1)
  })

  it('never reaches the network — every failure mode is a stubbed Service, not a mocked fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))
    await store.dispatch(fetchGreetingThunk({ recipient: 'nobody-at-all' }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
