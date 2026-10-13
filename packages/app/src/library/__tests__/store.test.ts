import { greetingMocks } from '@kro/core/mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  greetingSlice,
  initialGreetingState,
} from '../../features/greeting/GreetingFeature'
import { fetchGreetingThunk } from '../../features/greeting/GreetingProducer'
import type { GreetingService } from '../../services/greeting/GreetingService'
import { FeatureFlags } from '@kro/core'
import {
  type ThunkExtra,
  liveThunkExtra,
  makeStore,
  stubbedThunkExtra,
  makeStubbedStore,
} from '../store'

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

describe('the shipping feature-flag overrides', () => {
  it('turns Kro Cloud on for the web build — sign in, then see your endeavors', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.supabaseHosting),
    ).toBe(true)
  })

  it('keeps Appearance on, the earlier product override', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.appearanceThemes),
    ).toBe(true)
  })

  it('turns the pane’s web-only Inbox segment on for the shipping build', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.detailPaneInbox),
    ).toBe(true)
  })

  it('turns the capture suggestions pane on for the shipping build only', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.captureSuggestions),
    ).toBe(true)
    expect(
      stubbedThunkExtra.featureFlags.isEnabled(FeatureFlags.captureSuggestions),
    ).toBe(false)
  })

  it('turns the keyboard accelerators on for the shipping build only', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.keyboardAccelerators),
    ).toBe(true)
    expect(
      stubbedThunkExtra.featureFlags.isEnabled(
        FeatureFlags.keyboardAccelerators,
      ),
    ).toBe(false)
  })

  it('turns the landing page on for the shipping build only — dark-launched in the status quo', () => {
    expect(
      liveThunkExtra.featureFlags.isEnabled(FeatureFlags.landingPage),
    ).toBe(true)
    expect(
      stubbedThunkExtra.featureFlags.isEnabled(FeatureFlags.landingPage),
    ).toBe(false)
  })

  it('leaves the stubbed extra on the status-quo set, so tests never sync by accident', () => {
    expect(
      stubbedThunkExtra.featureFlags.isEnabled(FeatureFlags.supabaseHosting),
    ).toBe(false)
  })
})

describe('the landing services in the manifest', () => {
  it('wires the fixture-backed early-access stub into the stubbed extra', async () => {
    const response = await stubbedThunkExtra.earlyAccessService.join({
      email: 'ada@example.com',
      platform: 'ios',
      source: null,
      locale: null,
    })
    expect(response.position).toBeNull()
  })

  it('wires a silent analytics stub into the stubbed extra', () => {
    expect(() =>
      stubbedThunkExtra.analyticsService.track('page_view'),
    ).not.toThrow()
  })

  it('gives the live extra a distinct binding for both, never the stubs', () => {
    expect(liveThunkExtra.earlyAccessService).not.toBe(
      stubbedThunkExtra.earlyAccessService,
    )
    expect(liveThunkExtra.analyticsService).not.toBe(
      stubbedThunkExtra.analyticsService,
    )
  })
})

describe('makeStubbedStore — the one store a story or a test builds', () => {
  it('builds on the stubbed extra, so a thunk reaches a double and never the network', async () => {
    const store = makeStubbedStore()
    await store.dispatch(
      fetchGreetingThunk({ recipient: greetingMocks.typical.recipient }),
    )
    expect(store.getState().greeting.load.kind).not.toBe('idle')
  })

  it('lets a caller swap one Service for its own double and keeps the rest stubbed', () => {
    const calls: string[] = []
    const greetingService: GreetingService = {
      ...stubbedThunkExtra.greetingService,
      fetchGreeting: async (recipient, options) => {
        calls.push(recipient)
        return stubbedThunkExtra.greetingService.fetchGreeting(
          recipient,
          options,
        )
      },
    }
    const store = makeStubbedStore({ greetingService })
    void store.dispatch(fetchGreetingThunk({ recipient: 'Ada' }))
    expect(calls).toEqual(['Ada'])
  })

  it('returns a fresh store on every call — two stories never share state', () => {
    const a = makeStubbedStore()
    const b = makeStubbedStore()
    expect(a).not.toBe(b)
    expect(a.getState()).toEqual(b.getState())
  })
})
