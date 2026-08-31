import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import { type AppStore, type ThunkExtra, makeStore, stubbedThunkExtra } from '../../../library/store'
import type { GreetingService } from '../../../services/greeting/GreetingService'
import { useGreeting } from '../useGreeting'

afterEach(cleanup)

function wrapperFor(store: AppStore) {
  return ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>{children}</StoreProvider>
  )
}

const storeWith = (fetchGreeting: GreetingService['fetchGreeting']) =>
  makeStore({ greetingService: { fetchGreeting } } satisfies ThunkExtra)

describe('useGreeting', () => {
  it('runs the whole loop on mount and exposes the greeting — a returning user opens the page', async () => {
    const { result } = renderHook(() => useGreeting('ada'), {
      wrapper: wrapperFor(makeStore(stubbedThunkExtra)),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.headline).toBe('Good morning, Ada.')
    expect(result.current.greeting?.recipient).toBe('ada')
    expect(result.current.exception).toBeNull()
  })

  it('announces the request while it is in flight rather than rendering an empty surface', () => {
    const { result } = renderHook(() => useGreeting('ada'), {
      wrapper: wrapperFor(makeStore(stubbedThunkExtra)),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.headline).toBe('Fetching your greeting…')
  })

  it('shows exception copy and offers a retry when the device is offline', async () => {
    const store = storeWith(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { result } = renderHook(() => useGreeting('ada'), { wrapper: wrapperFor(store) })

    await waitFor(() => expect(result.current.exception).not.toBeNull())
    expect(result.current.headline).toMatch(/offline/i)
    expect(result.current.canRetry).toBe(true)
  })

  it('withholds the retry affordance when retrying cannot help — the greeting does not exist', async () => {
    const { result } = renderHook(() => useGreeting('nobody-at-all'), {
      wrapper: wrapperFor(makeStore(stubbedThunkExtra)),
    })

    await waitFor(() => expect(result.current.exception?.kind).toBe('notFound'))
    expect(result.current.canRetry).toBe(false)
  })

  it('asks the Service again when the user retries', async () => {
    const fetchGreeting = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useGreeting('ada'), { wrapper: wrapperFor(storeWith(fetchGreeting)) })

    await waitFor(() => expect(result.current.canRetry).toBe(true))
    await act(async () => {
      result.current.onRetry()
    })

    expect(fetchGreeting).toHaveBeenCalledTimes(2)
  })

  it('opens and closes the detail through intent callbacks, never local component state', async () => {
    const { result } = renderHook(() => useGreeting('ada'), {
      wrapper: wrapperFor(makeStore(stubbedThunkExtra)),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.detailOpen).toBe(false)

    act(() => {
      result.current.onTapGreeting()
    })
    expect(result.current.detailOpen).toBe(true)

    act(() => {
      result.current.onCloseDetail()
    })
    expect(result.current.detailOpen).toBe(false)
  })
})
