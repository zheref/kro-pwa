import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeObserver } from '../../../design/marketing/__tests__/testEnv'
import { StoreProvider } from '../../../library/StoreProvider'
import { LANDING_OBSERVED_IDS } from '../LandingSections'
import { makeRecordedStore } from '../../earlyAccess/__tests__/recordedStore'
import { useLanding } from '../useLanding'

const mountHook = (hubUrl = '/my-day') => {
  const { store, services } = makeRecordedStore()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>{children}</StoreProvider>
  )
  const rendered = renderHook(() => useLanding(hubUrl), { wrapper })
  return { ...rendered, store, services }
}

const tracked = (services: ReturnType<typeof makeRecordedStore>['services']) =>
  services.analytics.calls.map((c) =>
    c.kind === 'track' ? [c.event, c.props] : ['identify'],
  )

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-theme')
})

describe('useLanding — mount', () => {
  it('stamps the resolved theme and the hub link into the slice', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const { store } = mountHook('https://app.kro.example')
    expect(store.getState().landing.theme).toBe('dark')
    expect(store.getState().landing.hubUrl).toBe('https://app.kro.example')
  })

  it('counts exactly one page_view, even across a re-render', () => {
    const { rerender, services } = mountHook()
    rerender()
    rerender()
    expect(
      tracked(services).filter(([event]) => event === 'page_view'),
    ).toHaveLength(1)
  })

  it('returns the hub link it was given, so the first paint is right before any effect', () => {
    const { result } = mountHook('https://app.kro.example/my-day')
    expect(result.current.hubUrl).toBe('https://app.kro.example/my-day')
  })
})

describe('useLanding — sections in view', () => {
  it('a section crossing the viewport becomes active and is counted once', () => {
    const observers = installFakeObserver()
    document.body.innerHTML = LANDING_OBSERVED_IDS.map(
      (id) => `<section id="${id}"></section>`,
    ).join('')
    const { store, services } = mountHook()
    const target = document.getElementById('the-loop') as Element
    act(() => observers.at(-1)?.fire([{ target, isIntersecting: true }]))
    expect(store.getState().landing.activeSectionId).toBe('the-loop')
    expect(store.getState().landing.viewedSectionIds).toEqual(['the-loop'])
    expect(tracked(services)).toContainEqual([
      'section_view',
      { section: 'the-loop' },
    ])
  })

  it('scrolling back to a section already seen does not count it again', () => {
    const observers = installFakeObserver()
    document.body.innerHTML = LANDING_OBSERVED_IDS.map(
      (id) => `<section id="${id}"></section>`,
    ).join('')
    const { services, store } = mountHook()
    const observer = observers.at(-1)
    const loop = document.getElementById('the-loop') as Element
    const focus = document.getElementById('focus') as Element
    act(() => observer?.fire([{ target: loop, isIntersecting: true }]))
    act(() => observer?.fire([{ target: focus, isIntersecting: true }]))
    act(() => observer?.fire([{ target: loop, isIntersecting: true }]))
    expect(
      tracked(services).filter(([event]) => event === 'section_view'),
    ).toHaveLength(2)
    expect(store.getState().landing.activeSectionId).toBe('the-loop')
  })

  it('an element leaving the band is not a view', () => {
    const observers = installFakeObserver()
    document.body.innerHTML = LANDING_OBSERVED_IDS.map(
      (id) => `<section id="${id}"></section>`,
    ).join('')
    const { store } = mountHook()
    act(() =>
      observers.at(-1)?.fire([
        {
          target: document.getElementById('faq') as Element,
          isIntersecting: false,
        },
      ]),
    )
    expect(store.getState().landing.viewedSectionIds).toEqual([])
  })
})

describe('useLanding — callbacks', () => {
  it('onOpenHub tracks cta_open_web with the placement', async () => {
    const { result, services } = mountHook()
    await act(async () => result.current.onOpenHub('hero'))
    expect(tracked(services)).toContainEqual([
      'cta_open_web',
      { placement: 'hero' },
    ])
  })

  it('onGetEarlyAccess tracks cta_early_access with the placement', async () => {
    const { result, services } = mountHook()
    await act(async () => result.current.onGetEarlyAccess('final'))
    expect(tracked(services)).toContainEqual([
      'cta_early_access',
      { placement: 'final' },
    ])
  })

  it('onVotePlatform records the vote, requests the platform (never writing the form) and scrolls to the form', async () => {
    document.body.innerHTML =
      '<section id="early-access"><input name="email" /></section>'
    const section = document.getElementById('early-access') as HTMLElement
    section.scrollIntoView = vi.fn()
    const { result, store, services } = mountHook()
    await act(async () => result.current.onVotePlatform('android'))
    expect(tracked(services)).toContainEqual([
      'platform_vote',
      { platform: 'android' },
    ])
    expect(store.getState().landing.platformRequest).toEqual({
      platform: 'android',
      seq: 1,
    })
    expect(store.getState().earlyAccess.platform).toBe('ios')
    expect(result.current.platformRequest?.platform).toBe('android')
    expect(section.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(section.querySelector('input'))
  })

  it('onPickPlatform requests the platform and counts an early-access tap from the platforms band', async () => {
    const { result, store, services } = mountHook()
    await act(async () => result.current.onPickPlatform('macos'))
    expect(store.getState().landing.platformRequest).toEqual({
      platform: 'macos',
      seq: 1,
    })
    expect(tracked(services)).toContainEqual([
      'cta_early_access',
      { placement: 'platforms' },
    ])
  })

  it('onToggleTheme flips the slice theme and paints the document', async () => {
    const { result, store, services } = mountHook()
    await act(async () => result.current.onToggleTheme())
    expect(store.getState().landing.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(tracked(services)).toContainEqual([
      'theme_toggle',
      { theme: 'dark' },
    ])
  })

  it('onFaqOpen opens the entry and tracks the question index; onFaqClose closes it', async () => {
    const { result, store, services } = mountHook()
    await act(async () => result.current.onFaqOpen('data'))
    expect(store.getState().landing.faqOpenId).toBe('data')
    expect(tracked(services)).toContainEqual(['faq_open', { question: 2 }])
    act(() => result.current.onFaqClose())
    expect(store.getState().landing.faqOpenId).toBeNull()
  })

  it('onOutbound tracks only the destination host, never the path', async () => {
    const { result, services } = mountHook()
    await act(async () =>
      result.current.onOutbound('https://github.com/zheref/kro-pwa'),
    )
    await act(async () => result.current.onOutbound('not a url'))
    expect(tracked(services)).toContainEqual([
      'outbound',
      { destination: 'github.com' },
    ])
    expect(tracked(services)).toContainEqual([
      'outbound',
      { destination: 'unknown' },
    ])
  })

  it('opening the menu tracks nav_open and opens the slice; following a link closes it', async () => {
    const { result, store, services } = mountHook()
    await act(async () => result.current.onOpenMenu())
    expect(store.getState().landing.navOpen).toBe(true)
    expect(tracked(services)).toContainEqual(['nav_open', null])
    act(() => result.current.onNavigate('#faq'))
    expect(store.getState().landing.navOpen).toBe(false)
  })

  it('opening the menu twice keeps it open, and following a link with it closed changes nothing', async () => {
    const { result, store } = mountHook()
    act(() => result.current.onNavigate('#faq'))
    expect(store.getState().landing.navOpen).toBe(false)
    await act(async () => result.current.onOpenMenu())
    await act(async () => result.current.onOpenMenu())
    expect(store.getState().landing.navOpen).toBe(true)
  })

  it('asking for the same platform twice yields two numbered requests', async () => {
    const { result, store } = mountHook()
    await act(async () => result.current.onPickPlatform('ios'))
    await act(async () => result.current.onPickPlatform('ios'))
    expect(store.getState().landing.platformRequest?.seq).toBe(2)
  })
})
