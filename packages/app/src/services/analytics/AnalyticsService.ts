/**
 * Product analytics, as a Service (`RC-6`, `RC-33`) — cookieless Umami.
 *
 * ## What may be sent
 *
 * Counts and timings only. An event names *that* something happened (a CTA
 * was pressed, a section came into view, a sign-up failed with kind X) and may
 * carry small enumerable props (a platform id, a placement, an exception kind,
 * a duration). It never carries what a visitor wrote — no email, no free text,
 * no identifier of a person. `identify` exists for the same coarse context
 * (locale, a theme), never for an identity. The event names are a closed union
 * so a new one is a reviewed change; `analytics.fixtures.json` is the catalog
 * with what each one means.
 *
 * ## The live binding never throws and never blocks
 *
 * Umami's script loads `defer`, so the first `page_view` usually arrives
 * before `window.umami` exists. Calls made then are queued (at most 50), and a
 * short poll flushes them the moment the tracker appears. If it has not
 * appeared within ~10 s — an ad blocker, a CSP, a deployment with no website
 * id — the queue is dropped and later calls are dropped too. A tracker that
 * throws is swallowed: analytics failing must never fail the page.
 *
 * Nothing outside `library/store.ts` and tests may import this module.
 */
import fixtures from './analytics.fixtures.json'

/** The closed event catalog. Documented one line each in the fixture. */
export type AnalyticsEventName =
  | 'page_view'
  | 'section_view'
  | 'cta_open_web'
  | 'cta_early_access'
  | 'early_access_submit'
  | 'early_access_joined'
  | 'early_access_failed'
  | 'platform_vote'
  | 'faq_open'
  | 'outbound'
  | 'theme_toggle'
  | 'nav_open'

export type AnalyticsProps = Readonly<Record<string, string | number | boolean>>

export interface AnalyticsService {
  track(event: AnalyticsEventName, props?: AnalyticsProps): void
  identify(props: AnalyticsProps): void
}

/** The slice of Umami's browser tracker this Service calls. */
export interface UmamiTracker {
  track(event: string, data?: AnalyticsProps): void
  identify(data: AnalyticsProps): void
}

declare global {
  interface Window {
    /** Umami's tracker, present once its `defer`red script has run. */
    umami?: Partial<UmamiTracker>
  }
}

/** Every catalogued event name — the fixture is the documented taxonomy. */
export const analyticsEventCatalog: Readonly<
  Record<AnalyticsEventName, string>
> = fixtures.events as Record<AnalyticsEventName, string>

export const ANALYTICS_QUEUE_LIMIT = 50
export const ANALYTICS_POLL_INTERVAL_MS = 250
export const ANALYTICS_POLL_DEADLINE_MS = 10_000

type QueuedCall =
  | {
      readonly kind: 'track'
      readonly event: string
      readonly props?: AnalyticsProps
    }
  | { readonly kind: 'identify'; readonly props: AnalyticsProps }

/** Reads `window.umami` when, and only when, it is a usable tracker. */
export const browserUmami = (): UmamiTracker | undefined => {
  if (typeof window === 'undefined') return undefined
  const umami = window.umami
  if (
    umami === undefined ||
    typeof umami.track !== 'function' ||
    typeof umami.identify !== 'function'
  )
    return undefined
  return umami as UmamiTracker
}

export interface LiveAnalyticsServiceOptions {
  /** The tracker lookup. Defaults to `window.umami`. */
  readonly tracker?: () => UmamiTracker | undefined
  /** The poll's timer. Defaults to `setTimeout`. */
  readonly schedule?: (callback: () => void, delayMs: number) => void
}

export const makeLiveAnalyticsService = (
  options: LiveAnalyticsServiceOptions = {},
): AnalyticsService => {
  const tracker = options.tracker ?? browserUmami
  const schedule =
    options.schedule ??
    ((callback: () => void, delayMs: number) => {
      if (typeof setTimeout === 'function') setTimeout(callback, delayMs)
    })

  const queue: QueuedCall[] = []
  let polling = false
  let gaveUp = false

  const send = (umami: UmamiTracker, call: QueuedCall) => {
    try {
      if (call.kind === 'track') umami.track(call.event, call.props)
      else umami.identify(call.props)
    } catch {
      // Analytics failing must never fail the page.
    }
  }

  const poll = (elapsedMs: number) => {
    const umami = tracker()
    if (umami !== undefined) {
      polling = false
      for (const call of queue.splice(0)) send(umami, call)
      return
    }
    if (elapsedMs >= ANALYTICS_POLL_DEADLINE_MS) {
      polling = false
      gaveUp = true
      queue.length = 0
      return
    }
    schedule(
      () => poll(elapsedMs + ANALYTICS_POLL_INTERVAL_MS),
      ANALYTICS_POLL_INTERVAL_MS,
    )
  }

  const dispatch = (call: QueuedCall) => {
    const umami = tracker()
    if (umami !== undefined) {
      send(umami, call)
      return
    }
    if (gaveUp || queue.length >= ANALYTICS_QUEUE_LIMIT) return
    queue.push(call)
    if (!polling) {
      polling = true
      schedule(
        () => poll(ANALYTICS_POLL_INTERVAL_MS),
        ANALYTICS_POLL_INTERVAL_MS,
      )
    }
  }

  return {
    track: (event, props) =>
      dispatch(
        props === undefined
          ? { kind: 'track', event }
          : { kind: 'track', event, props },
      ),
    identify: (props) => dispatch({ kind: 'identify', props }),
  }
}

export const liveAnalyticsService: AnalyticsService = makeLiveAnalyticsService()

/** Sends nothing — the default for every suite and story. */
export const stubbedAnalyticsService: AnalyticsService = {
  track: () => {},
  identify: () => {},
}

export type AnalyticsCall =
  | {
      readonly kind: 'track'
      readonly event: AnalyticsEventName
      readonly props: AnalyticsProps | null
    }
  | { readonly kind: 'identify'; readonly props: AnalyticsProps }

export interface RecordingAnalyticsService extends AnalyticsService {
  /** Every call, in order. */
  readonly calls: readonly AnalyticsCall[]
}

/** For suites that assert a Producer tracked the right event. */
export const makeRecordingAnalyticsService = (): RecordingAnalyticsService => {
  const calls: AnalyticsCall[] = []
  return {
    calls,
    track: (event, props) => {
      calls.push({ kind: 'track', event, props: props ?? null })
    },
    identify: (props) => {
      calls.push({ kind: 'identify', props })
    },
  }
}
