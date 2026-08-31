import type { GreetingResponse } from '@kro/core'
import { greetingMocks } from '@kro/core/mocks'
import { describe, expect, it, vi } from 'vitest'
import { type ThunkExtra, makeStore, stubbedThunkExtra } from '../../../library/store'
import type { GreetingService } from '../../../services/greeting/GreetingService'
import {
  childDetailDelegatedClose,
  greetingSlice,
  initialGreetingState,
  onViewLoaded,
  userDidTapGreeting,
  userDidTapRetry,
} from '../GreetingFeature'
import { greetingStateMocks } from '../GreetingMocks'
import { fetchGreetingThunk } from '../GreetingProducer'

const reduce = greetingSlice.reducer

/** A store wired to a service that behaves however the scenario needs (`RC-22`). */
const storeWith = (fetchGreeting: GreetingService['fetchGreeting']) =>
  makeStore({
    ...stubbedThunkExtra,
    greetingService: { fetchGreeting },
  } satisfies ThunkExtra)

describe('onViewLoaded', () => {
  it('stamps the recipient and starts loading on first mount', () => {
    const next = reduce(initialGreetingState, onViewLoaded({ recipient: 'ada' }))

    expect(next.recipient).toBe('ada')
    expect(next.load.kind).toBe('loading')
  })

  it('replaces the previous recipient when the surface remounts for someone else', () => {
    const next = reduce(greetingStateMocks.loaded, onViewLoaded({ recipient: 'grace' }))

    expect(next.recipient).toBe('grace')
    expect(next.load.kind).toBe('loading')
  })

  it('clears an error left over from the last recipient', () => {
    const next = reduce(greetingStateMocks.failedOffline, onViewLoaded({ recipient: 'grace' }))

    expect(next.load.kind).toBe('loading')
  })
})

describe('userDidTapRetry', () => {
  it('puts a failed surface back into loading — the user taps "try again"', () => {
    expect(reduce(greetingStateMocks.failedOffline, userDidTapRetry()).load.kind).toBe('loading')
  })

  it('keeps the recipient so the retry asks for the same greeting', () => {
    expect(reduce(greetingStateMocks.failedOffline, userDidTapRetry()).recipient).toBe('ada')
  })

  it('is harmless when a request is already in flight — a double tap changes nothing', () => {
    expect(reduce(greetingStateMocks.loading, userDidTapRetry())).toEqual(
      greetingStateMocks.loading,
    )
  })
})

describe('userDidTapGreeting', () => {
  it('opens the detail on a loaded greeting', () => {
    expect(reduce(greetingStateMocks.loaded, userDidTapGreeting()).detailOpen).toBe(true)
  })

  it('leaves the loaded greeting itself untouched — opening a detail loads nothing', () => {
    const next = reduce(greetingStateMocks.loaded, userDidTapGreeting())

    expect(next.load).toEqual(greetingStateMocks.loaded.load)
  })

  it('is idempotent — tapping an already-open detail keeps it open', () => {
    expect(reduce(greetingStateMocks.loadedWithDetailOpen, userDidTapGreeting()).detailOpen).toBe(
      true,
    )
  })
})

describe('childDetailDelegatedClose', () => {
  it('closes the detail when the child asks to be dismissed', () => {
    expect(
      reduce(greetingStateMocks.loadedWithDetailOpen, childDetailDelegatedClose()).detailOpen,
    ).toBe(false)
  })

  it('leaves the greeting loaded behind it', () => {
    const next = reduce(greetingStateMocks.loadedWithDetailOpen, childDetailDelegatedClose())

    expect(next.load.kind).toBe('loaded')
  })

  it('is a no-op when nothing was open — a stray delegate cannot corrupt state', () => {
    expect(reduce(greetingStateMocks.loaded, childDetailDelegatedClose())).toEqual(
      greetingStateMocks.loaded,
    )
  })
})

describe('the fetch lifecycle', () => {
  it('shows loading while the request is in flight — the user waits', async () => {
    let release: (value: GreetingResponse) => void = () => {}
    const pending = new Promise<GreetingResponse>((resolve) => {
      release = resolve
    })
    const store = storeWith(() => pending)

    const effect = store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))
    expect(store.getState().greeting.load.kind).toBe('loading')

    release({
      id: 'greeting-1',
      recipient: 'ada',
      message: 'Good morning, Ada.',
      signature: '— Kro',
      issued_at: '2026-01-15T08:00:00.000Z',
    })
    await effect
  })

  it('lands the mapped greeting in state — the fixture-backed happy path', async () => {
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))

    const { load } = store.getState().greeting
    expect(load.kind).toBe('loaded')
    if (load.kind === 'loaded') expect(load.greeting).toEqual(greetingMocks.typical)
  })

  it('surfaces an offline exception when the request never left the device (user on the subway)', async () => {
    const store = storeWith(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))

    const { load } = store.getState().greeting
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('offline')
  })

  it('surfaces a malformed exception when the payload cannot be mapped', async () => {
    const store = makeStore(stubbedThunkExtra)

    await store.dispatch(fetchGreetingThunk({ recipient: 'malformed' }))

    const { load } = store.getState().greeting
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('malformed')
  })

  it('ignores an aborted request — cancellation is the only silent exit', async () => {
    const store = makeStore(stubbedThunkExtra)

    const effect = store.dispatch(fetchGreetingThunk({ recipient: 'ada' }))
    effect.abort('superseded by a newer recipient')
    await effect

    expect(store.getState().greeting.load.kind).toBe('loading')
  })

  it('degrades to a generic exception if the payload creator itself throws (defensive .rejected)', async () => {
    const store = makeStore(stubbedThunkExtra)

    // The Producer never throws, so `.rejected` is reached here only by
    // dispatching the lifecycle action directly — which is exactly the shape a
    // serialization bug or a dispatch-level failure would take.
    store.dispatch({
      type: fetchGreetingThunk.rejected.type,
      error: { message: 'dispatch exploded' },
      meta: { aborted: false, condition: false, arg: { recipient: 'ada' }, requestId: 'r1' },
    })

    const { load } = store.getState().greeting
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('unknown')
      expect(load.exception.message).toBe('dispatch exploded')
    }
  })
})
