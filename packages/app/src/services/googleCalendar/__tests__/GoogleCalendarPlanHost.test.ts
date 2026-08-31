import { EndeavorHost } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { PlanHost } from '../../../features/plan/PlanHosts'
import { GoogleCalendarConnections } from '../GoogleCalendarConnection'
import { GoogleCalendarExceptions } from '../GoogleCalendarException'
import { makeGoogleCalendarPlanHost } from '../GoogleCalendarPlanHost'
import { makeStubbedGoogleCalendarService } from '../GoogleCalendarService'

const DAY = {
  start: new Date('2026-08-31T00:00:00Z'),
  end: new Date('2026-09-01T00:00:00Z'),
}

describe('Google Calendar as a Plan host', () => {
  it('identifies itself as the Google Calendar host', () => {
    const host = makeGoogleCalendarPlanHost(makeStubbedGoogleCalendarService())
    expect(host.id).toBe(EndeavorHost.googleCalendar)
  })

  it('satisfies KC-IS-#18’s PlanHost port structurally', () => {
    // The compile-time half of the seam: `store.ts` assigns the adapter to a
    // `PlanHost` field, and this assignment is the same proof in test form.
    const host: PlanHost = makeGoogleCalendarPlanHost(
      makeStubbedGoogleCalendarService(),
    )
    expect(typeof host.fetchRange).toBe('function')
  })

  it('delegates the window straight to the service', async () => {
    const calls: string[] = []
    const host = makeGoogleCalendarPlanHost(
      makeStubbedGoogleCalendarService({
        connection: GoogleCalendarConnections.connected(),
        calls,
      }),
    )
    await host.fetchRange(DAY)
    expect(calls).toEqual([
      `fetchRange:${DAY.start.toISOString()}..${DAY.end.toISOString()}`,
    ])
  })

  it('returns the day’s events as endeavors', async () => {
    const host = makeGoogleCalendarPlanHost(
      makeStubbedGoogleCalendarService({
        connection: GoogleCalendarConnections.connected(),
      }),
    )
    const events = await host.fetchRange(DAY)
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => event.hostedBy.includes(host.id))).toBe(true)
  })

  it('contributes an empty day when the user has not connected', async () => {
    const host = makeGoogleCalendarPlanHost(makeStubbedGoogleCalendarService())
    expect(await host.fetchRange(DAY)).toEqual([])
  })

  it('does NOT swallow needsReconnect — the banner is driven by it', async () => {
    // `fetchPlanHostRange` tolerates a throwing host on the preload path; that
    // tolerance is the preload's decision, not the adapter's, so a caller that
    // wants the failure can still have it.
    const host = makeGoogleCalendarPlanHost(
      makeStubbedGoogleCalendarService({
        connection: GoogleCalendarConnections.needsReconnect(),
      }),
    )
    await expect(host.fetchRange(DAY)).rejects.toMatchObject({
      kind: 'needsReconnect',
    })
  })

  it('passes an abort signal through to the service', async () => {
    const controller = new AbortController()
    let seen: AbortSignal | undefined
    const host = makeGoogleCalendarPlanHost({
      connection: async () => GoogleCalendarConnections.connected(),
      fetchRange: async (_range, options) => {
        seen = options?.signal
        return []
      },
      listCalendars: async () => [],
      logSession: async () => {
        throw GoogleCalendarExceptions.notConnected()
      },
      disconnect: async () => {},
      authorizationPath: () => '/api/google/connect',
    })
    await host.fetchRange(DAY, { signal: controller.signal })
    expect(seen).toBe(controller.signal)
  })
})
