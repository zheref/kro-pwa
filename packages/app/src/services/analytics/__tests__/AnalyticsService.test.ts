/**
 * The live binding is driven through an injected tracker lookup and an
 * injected timer, so the queue, the flush and the 10 s give-up are tested
 * without real time passing and without a real Umami script.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_POLL_DEADLINE_MS,
  ANALYTICS_POLL_INTERVAL_MS,
  ANALYTICS_QUEUE_LIMIT,
  type AnalyticsEventName,
  type UmamiTracker,
  analyticsEventCatalog,
  browserUmami,
  makeLiveAnalyticsService,
  makeRecordingAnalyticsService,
  stubbedAnalyticsService,
} from '../AnalyticsService'

const makeTracker = () => ({
  track: vi.fn<UmamiTracker['track']>(),
  identify: vi.fn<UmamiTracker['identify']>(),
})

/** A manual clock: `tick()` runs whatever the Service scheduled. */
const makeScheduler = () => {
  const pending: Array<() => void> = []
  return {
    schedule: (callback: () => void, _delayMs: number) => {
      pending.push(callback)
    },
    tick: () => {
      const next = pending.shift()
      next?.()
      return next !== undefined
    },
    pendingCount: () => pending.length,
  }
}

afterEach(() => {
  window.umami = undefined
  vi.useRealTimers()
})

describe('the live binding, tracker already loaded', () => {
  it('sends a track straight to Umami with its props', () => {
    const tracker = makeTracker()
    const service = makeLiveAnalyticsService({ tracker: () => tracker })

    service.track('cta_early_access', { placement: 'hero' })

    expect(tracker.track).toHaveBeenCalledWith('cta_early_access', {
      placement: 'hero',
    })
  })

  it('sends identify straight to Umami', () => {
    const tracker = makeTracker()
    const service = makeLiveAnalyticsService({ tracker: () => tracker })

    service.identify({ locale: 'en-US' })

    expect(tracker.identify).toHaveBeenCalledWith({ locale: 'en-US' })
  })

  it('swallows a tracker that throws — analytics never fails the page', () => {
    const tracker = makeTracker()
    tracker.track.mockImplementation(() => {
      throw new Error('blocked')
    })
    const service = makeLiveAnalyticsService({ tracker: () => tracker })

    expect(() => service.track('page_view')).not.toThrow()
  })
})

describe('the live binding, tracker still loading', () => {
  it('queues early calls and flushes them, in order, once Umami appears', () => {
    let tracker: ReturnType<typeof makeTracker> | undefined
    const clock = makeScheduler()
    const service = makeLiveAnalyticsService({
      tracker: () => tracker,
      schedule: clock.schedule,
    })

    service.track('page_view', { path: '/' })
    service.identify({ locale: 'es-CO' })
    expect(clock.pendingCount()).toBe(1) // one poll, not one per call

    clock.tick() // still absent
    tracker = makeTracker()
    clock.tick() // appears → flush

    expect(tracker.track).toHaveBeenCalledWith('page_view', { path: '/' })
    expect(tracker.identify).toHaveBeenCalledWith({ locale: 'es-CO' })
    expect(clock.pendingCount()).toBe(0)
  })

  it('holds at most fifty calls — a runaway caller cannot grow memory', () => {
    let tracker: ReturnType<typeof makeTracker> | undefined
    const clock = makeScheduler()
    const service = makeLiveAnalyticsService({
      tracker: () => tracker,
      schedule: clock.schedule,
    })

    for (let index = 0; index < ANALYTICS_QUEUE_LIMIT + 10; index += 1)
      service.track('section_view', { index })
    tracker = makeTracker()
    clock.tick()

    expect(tracker.track).toHaveBeenCalledTimes(ANALYTICS_QUEUE_LIMIT)
  })

  it('gives up after ten seconds and drops the queue and every later call', () => {
    let tracker: ReturnType<typeof makeTracker> | undefined
    const clock = makeScheduler()
    const service = makeLiveAnalyticsService({
      tracker: () => tracker,
      schedule: clock.schedule,
    })

    service.track('page_view')
    let polls = 0
    while (clock.tick()) polls += 1
    expect(polls).toBe(ANALYTICS_POLL_DEADLINE_MS / ANALYTICS_POLL_INTERVAL_MS)

    service.track('faq_open')
    expect(clock.pendingCount()).toBe(0)

    // A tracker that turns up after the give-up still receives NEW calls.
    tracker = makeTracker()
    service.track('outbound', { host: 'apps.apple.com' })
    expect(tracker.track).toHaveBeenCalledTimes(1)
    expect(tracker.track).toHaveBeenCalledWith('outbound', {
      host: 'apps.apple.com',
    })
  })

  it('polls on a real timer by default, without throwing', () => {
    vi.useFakeTimers()
    const service = makeLiveAnalyticsService({ tracker: () => undefined })

    expect(() => service.track('page_view')).not.toThrow()
    vi.advanceTimersByTime(ANALYTICS_POLL_DEADLINE_MS + 1000)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('browserUmami', () => {
  it('reads nothing when the script has not run', () => {
    expect(browserUmami()).toBeUndefined()
  })

  it('reads a fully-formed tracker off window', () => {
    const tracker = makeTracker()
    window.umami = tracker
    expect(browserUmami()).toBe(tracker)
  })

  it('ignores a half-formed global some other script left behind', () => {
    window.umami = { track: () => {} }
    expect(browserUmami()).toBeUndefined()
  })
})

describe('the stubbed and recording bindings', () => {
  it('stub accepts every call and does nothing', () => {
    expect(() => {
      stubbedAnalyticsService.track('page_view', { path: '/' })
      stubbedAnalyticsService.identify({ theme: 'dark' })
    }).not.toThrow()
  })

  it('recording keeps every call in order, props null when absent', () => {
    const service = makeRecordingAnalyticsService()
    service.track('nav_open')
    service.track('platform_vote', { platform: 'android' })
    service.identify({ locale: 'fi-FI' })

    expect(service.calls).toEqual([
      { kind: 'track', event: 'nav_open', props: null },
      { kind: 'track', event: 'platform_vote', props: { platform: 'android' } },
      { kind: 'identify', props: { locale: 'fi-FI' } },
    ])
  })

  it('recording starts empty per instance', () => {
    makeRecordingAnalyticsService().track('page_view')
    expect(makeRecordingAnalyticsService().calls).toEqual([])
  })
})

describe('the event catalog fixture', () => {
  it('documents every event name exactly — the fixture is the taxonomy', () => {
    const names: readonly AnalyticsEventName[] = [
      'page_view',
      'section_view',
      'cta_open_web',
      'cta_early_access',
      'early_access_submit',
      'early_access_joined',
      'early_access_failed',
      'platform_vote',
      'faq_open',
      'outbound',
      'theme_toggle',
      'nav_open',
    ]
    expect(Object.keys(analyticsEventCatalog).sort()).toEqual([...names].sort())
    for (const name of names)
      expect(analyticsEventCatalog[name].length).toBeGreaterThan(0)
  })
})
