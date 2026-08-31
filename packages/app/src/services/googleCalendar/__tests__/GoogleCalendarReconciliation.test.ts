/**
 * The integration proof for acceptance criterion 1:
 *
 * > Connect → day fetch → events appear on Plan/Do reconciled (**no duplicates
 * > against Kro-hosted copies**).
 *
 * This suite runs the real path end to end with no network: a stubbed proxy
 * transport answers with Google's wire shape, the real
 * `GoogleCalendarService` maps it, the result is concatenated with Kro-hosted
 * rows exactly as `fetchPlanHostRange` concatenates host fan-outs, and the real
 * `reconcile` pass from `@kro/core` collapses them.
 *
 * Nothing here is a re-implementation of the engine's rules — the assertions
 * are about *this integration's* contribution to them: that the mapper hands
 * reconciliation the source identity it needs (`SourceIdentity.identitiesOf`
 * keys on `(googleCalendar, event.id)`, which the mapper puts in both the
 * endeavor's `id` and the shadow's `sourceIdentifier`), and that the registered
 * `googleCalendarRuleset` resolves a persisted mirror the same way.
 */
import {
  type Endeavor,
  EndeavorHost,
  EndeavorKind,
  eventEndeavor,
  makeReconciliationContext,
  makeShadow,
  reconcile,
  resolvedKind,
  taskEndeavor,
  utcCalendar,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { GoogleCalendarConnections } from '../GoogleCalendarConnection'
import { makeGoogleCalendarPlanHost } from '../GoogleCalendarPlanHost'
import {
  type KroApiTransport,
  googleApiPaths,
  makeLiveGoogleCalendarService,
  makeStubbedGoogleCalendarService,
} from '../GoogleCalendarService'

const DAY = {
  start: new Date('2026-08-31T00:00:00Z'),
  end: new Date('2026-09-01T00:00:00Z'),
}

const GOOGLE_EVENT_ID = 'gcal-design-review-2026-08-31'
const START = '2026-08-31T14:00:00Z'
const END = '2026-08-31T15:00:00Z'

/** What `/api/google/events` answers for the day under test. */
const proxyAnswering = (events: readonly unknown[]): KroApiTransport => ({
  async get(path) {
    if (path.includes(googleApiPaths.events)) {
      return { status: 200, body: { events } }
    }
    return { status: 404, body: null }
  },
  async post() {
    return { status: 404, body: null }
  },
})

const googleEnvelope = (overrides: Record<string, unknown> = {}) => ({
  calendarId: 'primary',
  calendarName: 'Sergio',
  event: {
    id: GOOGLE_EVENT_ID,
    summary: 'Design review',
    status: 'confirmed',
    start: { dateTime: START, timeZone: 'UTC' },
    end: { dateTime: END, timeZone: 'UTC' },
    ...overrides,
  },
})

/**
 * The Kro-hosted mirror of that same Google event — a row the on-device store
 * would return, carrying a Google shadow pointing at the provider's id. This is
 * canon's `localMirrorRow` shape for the Google provider.
 */
const kroHostedCopy = (overrides: Partial<Endeavor> = {}): Endeavor => ({
  ...eventEndeavor({
    id: 'local-copy-1',
    title: 'Design review',
    start: new Date(START),
    duration: 3600,
    host: EndeavorHost.local,
    shadow: makeShadow({
      originalTitle: 'Design review',
      sourceIdentifier: GOOGLE_EVENT_ID,
      kind: EndeavorKind.calendarEvent,
      source: EndeavorHost.googleCalendar,
      group: 'Sergio',
    }),
  }),
  ...overrides,
})

const context = () =>
  makeReconciliationContext({ now: new Date(START), calendar: utcCalendar })

// ---------------------------------------------------------------------------

describe('a Google row and its Kro-hosted copy reconcile to ONE endeavor', () => {
  it('collapses the two into a single row', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const fromGoogle = await service.fetchRange(DAY)
    expect(fromGoogle).toHaveLength(1)

    // What `fetchPlanHostRange` produces: concatenation, de-duplication left
    // to the reconciliation pass.
    const fanOut = [kroHostedCopy(), ...fromGoogle]
    const reconciled = reconcile(fanOut, context())

    expect(reconciled).toHaveLength(1)
  })

  it('keeps BOTH hosts on the surviving row — it is Kro-enhanced', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const reconciled = reconcile(
      [kroHostedCopy(), ...(await service.fetchRange(DAY))],
      context(),
    )
    const [only] = reconciled
    expect(new Set(only?.hostedBy)).toEqual(
      new Set([EndeavorHost.local, EndeavorHost.googleCalendar]),
    )
  })

  it('retains the Google shadow, so the row can still be written back', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const [only] = reconcile(
      [kroHostedCopy(), ...(await service.fetchRange(DAY))],
      context(),
    )
    const googleShadows = (only?.shadows ?? []).filter(
      (shadow) => shadow.source === EndeavorHost.googleCalendar,
    )
    expect(googleShadows).toHaveLength(1)
    expect(googleShadows[0]?.sourceIdentifier).toBe(GOOGLE_EVENT_ID)
  })

  it('takes the fresh Google title over a stale local one', async () => {
    // Provider-native evidence outranks a Kro-persisted mirror
    // (`sourceEvidenceRank` = 3 vs 0), which is the mechanism behind "a late
    // cached fetch cannot erase stronger source evidence".
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([
        googleEnvelope({ summary: 'Design review (moved)' }),
      ]),
    })
    const [only] = reconcile(
      [kroHostedCopy({ title: 'Design review' }), ...(await service.fetchRange(DAY))],
      context(),
    )
    expect(only?.title).toBe('Design review (moved)')
  })

  it('reconciles the same way whichever host answered first', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const fromGoogle = await service.fetchRange(DAY)
    const googleFirst = reconcile([...fromGoogle, kroHostedCopy()], context())
    const localFirst = reconcile([kroHostedCopy(), ...fromGoogle], context())
    expect(googleFirst).toHaveLength(1)
    expect(localFirst).toHaveLength(1)
  })

  it('is idempotent — a refresh over its own previous output changes nothing', async () => {
    // The pass runs again on every refresh over a set that already contains
    // its own output.
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const once = reconcile(
      [kroHostedCopy(), ...(await service.fetchRange(DAY))],
      context(),
    )
    expect(reconcile(once, context())).toEqual(once)
  })
})

describe('unrelated rows stay separate', () => {
  it('does not merge two different Google events', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([
        googleEnvelope(),
        googleEnvelope({
          id: 'gcal-standup-2026-08-31',
          summary: 'Daily standup',
          start: { dateTime: '2026-08-31T09:00:00Z' },
          end: { dateTime: '2026-08-31T09:15:00Z' },
        }),
      ]),
    })
    const reconciled = reconcile(await service.fetchRange(DAY), context())
    expect(reconciled).toHaveLength(2)
  })

  it('does not merge a Kro task that merely shares a title', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const unrelated = taskEndeavor({
      id: 'kro-task-1',
      title: 'Design review',
      host: EndeavorHost.local,
    })
    const reconciled = reconcile(
      [unrelated, ...(await service.fetchRange(DAY))],
      context(),
    )
    expect(reconciled).toHaveLength(2)
  })

  it('keeps two occurrences of one recurring meeting apart across a range', async () => {
    // Google's `singleEvents=true` gives each occurrence its own id, and
    // `occurrenceScopedIdentifier` scopes them by start on top of that.
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([
        googleEnvelope({ id: 'standup_20260831T090000Z' }),
        googleEnvelope({
          id: 'standup_20260901T090000Z',
          start: { dateTime: '2026-09-01T09:00:00Z' },
          end: { dateTime: '2026-09-01T09:15:00Z' },
        }),
      ]),
    })
    const week = {
      start: new Date('2026-08-31T00:00:00Z'),
      end: new Date('2026-09-07T00:00:00Z'),
    }
    const reconciled = reconcile(await service.fetchRange(week), context())
    expect(reconciled).toHaveLength(2)
  })
})

describe('the registered Google ruleset resolves the presented kind', () => {
  it('presents a live Google row as a calendar event', async () => {
    const service = makeLiveGoogleCalendarService({
      transport: proxyAnswering([googleEnvelope()]),
    })
    const [event] = await service.fetchRange(DAY)
    expect(event).toBeDefined()
    if (event === undefined) return
    expect(resolvedKind(event)).toBe(EndeavorKind.calendarEvent)
  })

  it('presents a PERSISTED mirror as a calendar event too, on a later launch', () => {
    // The reason the table exists at all: the mapper only runs on a live
    // fetch, and this row's stored kind is whatever was written last week.
    const stale = kroHostedCopy({ kind: EndeavorKind.task })
    expect(resolvedKind(stale)).toBe(EndeavorKind.calendarEvent)
  })

  it('leaves a Google-linked row with no schedule exactly as stored', () => {
    const dateless = kroHostedCopy({
      kind: EndeavorKind.task,
      start: null,
      due: null,
    })
    expect(resolvedKind(dateless)).toBe(EndeavorKind.task)
  })

  it('leaves a purely local row untouched — no provider claims it', () => {
    const local = taskEndeavor({
      id: 'kro-task-2',
      title: 'Water the plants',
      host: EndeavorHost.local,
      start: new Date(START),
    })
    expect(resolvedKind(local)).toBe(EndeavorKind.task)
  })
})

describe('the day the Plan host actually contributes', () => {
  it('adds nothing when Google is not connected', async () => {
    const host = makeGoogleCalendarPlanHost(makeStubbedGoogleCalendarService())
    const fanOut = [kroHostedCopy(), ...(await host.fetchRange(DAY))]
    expect(reconcile(fanOut, context())).toHaveLength(1)
    expect(reconcile(fanOut, context())[0]?.hostedBy).toEqual([
      EndeavorHost.local,
    ])
  })

  it('adds the day’s Google events once connected', async () => {
    const host = makeGoogleCalendarPlanHost(
      makeStubbedGoogleCalendarService({
        connection: GoogleCalendarConnections.connected(),
      }),
    )
    const reconciled = reconcile(await host.fetchRange(DAY), context())
    expect(reconciled.length).toBeGreaterThan(0)
    expect(
      reconciled.every((row) =>
        row.hostedBy.includes(EndeavorHost.googleCalendar),
      ),
    ).toBe(true)
  })
})
