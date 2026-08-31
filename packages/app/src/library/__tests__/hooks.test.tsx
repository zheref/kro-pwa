import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { onViewLoaded, userDidTapGreeting } from '../../features/greeting/GreetingFeature'
import { fetchGreetingThunk } from '../../features/greeting/GreetingProducer'
import {
  selectGreetingHeadline,
  selectIsGreetingDetailOpen,
} from '../../features/greeting/GreetingSelectors'
import { StoreProvider } from '../StoreProvider'
import { useAppDispatch, useAppSelector } from '../hooks'
import { type AppStore, makeStore, stubbedThunkExtra } from '../store'

afterEach(cleanup)

function wrapperFor(store: AppStore) {
  return ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>{children}</StoreProvider>
  )
}

describe('useAppSelector', () => {
  it('reads through a named Selector — the only way a surface sees state', () => {
    const store = makeStore(stubbedThunkExtra)
    store.dispatch(onViewLoaded({ recipient: 'ada' }))

    const { result } = renderHook(() => useAppSelector(selectGreetingHeadline), {
      wrapper: wrapperFor(store),
    })

    expect(result.current).toBe('Fetching your greeting…')
  })

  it('re-renders the caller when the slice it reads changes — user opens the detail', () => {
    const store = makeStore(stubbedThunkExtra)

    const { result } = renderHook(() => useAppSelector(selectIsGreetingDetailOpen), {
      wrapper: wrapperFor(store),
    })
    expect(result.current).toBe(false)

    act(() => {
      store.dispatch(userDidTapGreeting())
    })

    expect(result.current).toBe(true)
  })

  it('is bound to RootState, so a plain field read needs no annotation at the call site', () => {
    const store = makeStore(stubbedThunkExtra)
    store.dispatch(onViewLoaded({ recipient: 'grace' }))

    const { result } = renderHook(() => useAppSelector((state) => state.greeting.recipient), {
      wrapper: wrapperFor(store),
    })

    expect(result.current).toBe('grace')
  })
})

describe('useAppDispatch', () => {
  it('dispatches a synchronous event and the store reflects it immediately', () => {
    const store = makeStore(stubbedThunkExtra)

    const { result } = renderHook(() => useAppDispatch(), { wrapper: wrapperFor(store) })
    act(() => {
      result.current(onViewLoaded({ recipient: 'ada' }))
    })

    expect(store.getState().greeting.recipient).toBe('ada')
  })

  it('dispatches a Producer thunk and awaits its completion — the typed thunk overload', async () => {
    const store = makeStore(stubbedThunkExtra)

    const { result } = renderHook(() => useAppDispatch(), { wrapper: wrapperFor(store) })
    await result.current(fetchGreetingThunk({ recipient: 'ada' }))

    await waitFor(() => expect(store.getState().greeting.load.kind).toBe('loaded'))
  })

  it('returns an abortable effect handle for the in-flight request', async () => {
    const store = makeStore(stubbedThunkExtra)

    const { result } = renderHook(() => useAppDispatch(), { wrapper: wrapperFor(store) })
    const effect = result.current(fetchGreetingThunk({ recipient: 'ada' }))
    effect.abort('superseded')
    await effect

    // Cancellation is the only silent exit: an aborted request paints nothing.
    expect(store.getState().greeting.load.kind).not.toBe('failed')
  })
})
