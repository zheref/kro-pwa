import { greetingMocks } from '@kro/core/mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  greetingSlice,
  initialGreetingState,
} from '../../features/greeting/GreetingFeature'
import { fetchGreetingThunk } from '../../features/greeting/GreetingProducer'
import type { GreetingService } from '../../services/greeting/GreetingService'
import { type ThunkExtra, makeStore, stubbedThunkExtra } from '../store'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('makeStore', () => {
  it('builds a store from the stubbed manifest with every slice at its registered key', () => {
    const store = makeStore(stubbedThunkExtra)

    expect(store.getState().greeting).toEqual(initialGreetingState)
  })

  it('hands the injected services to a Producer — the substitution seam tests depend on', async () => {
    const fetchGreeting = vi.fn(
      async (_recipient: string, _options?: { signal?: AbortSignal }) => ({
        id: 'greeting-1',
        recipient: 'ada',
        message: 'Good morning, Ada.',
        signature: '— Kro',
        issued_at: '2026-01-15T08:00:00.000Z',
      }),
    )
    const extra: ThunkExtra = {
      ...stubbedThunkExtra,
      greetingService: { fetchGreeting } satisfies GreetingService,
    }

    await makeStore(extra).dispatch(fetchGreetingThunk({ recipient: 'ada' }))

    expect(fetchGreeting).toHaveBeenCalledTimes(1)
    expect(fetchGreeting.mock.calls[0]?.[0]).toBe('ada')
  })

  it('returns an isolated store per call, so one suite cannot leak state into the next', () => {
    const first = makeStore(stubbedThunkExtra)
    const second = makeStore(stubbedThunkExtra)

    first.dispatch(greetingSlice.actions.onViewLoaded({ recipient: 'ada' }))

    expect(first.getState().greeting.recipient).toBe('ada')
    expect(second.getState().greeting.recipient).toBeNull()
  })

  it('defaults to the live manifest when called with no argument — the shape apps/web uses', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const store = makeStore()

    // Construction alone must never reach a Service: nothing is dispatched yet.
    expect(store.getState().greeting).toEqual(initialGreetingState)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('accepts a Date in state without a serializability complaint — domain models carry real dates', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))

    const { load } = store.getState().greeting
    expect(load.kind).toBe('loaded')
    if (load.kind === 'loaded')
      expect(load.greeting.issuedAt).toEqual(greetingMocks.typical.issuedAt)
    expect(consoleError).not.toHaveBeenCalled()
  })
})
