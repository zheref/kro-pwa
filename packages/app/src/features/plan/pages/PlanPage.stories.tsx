/**
 * The Page, wired to a real store (`RC-11`).
 *
 * These are the only stories in this feature that build a store, and they
 * build it the one sanctioned way — `makeStore(extra)` with a seeded in-memory
 * `LocalStore` injected through `ThunkExtra` (`RC-22`, `RC-35`). Nothing is
 * preloaded into the slice by hand: the day arrives because the Page's own
 * Producer read it, which is what makes these stories evidence of the loop
 * rather than of a snapshot.
 *
 * The fixtures are #18's, so a story cannot show a day the slice could not
 * produce — including the nested short event the column sweep exists for.
 */
import type { EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import type { ReactNode } from 'react'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { PlanPage } from './PlanPage'

export default {
  title: 'Plan/Page',
  component: PlanPage,
  parameters: { layout: 'fullscreen' },
}

/**
 * The seeded day, expressed relative to **today**.
 *
 * The Page opens on the day it mounts, so a fixture pinned to a fixed date
 * would render an empty canvas in every story — which is a story showing the
 * wrong thing rather than a story failing.
 */
const at = (hour: number, minute = 0) => {
  const day = new Date()
  day.setHours(hour, minute, 0, 0)
  return day
}

const record = (
  id: string,
  title: string,
  start: Date,
  durationSeconds: number,
  associatedColor: string | null = null,
): EndeavorRecord =>
  endeavorRecordFromEndeavor(
    makeEndeavor({
      id,
      title,
      kind: EndeavorKind.calendarEvent,
      start,
      duration: durationSeconds,
      associatedColor,
      hostedBy: [EndeavorHost.local],
    }),
    { now: new Date() },
  )

/** A realistic day: overlapping blocks, a nested short one, and a past event. */
const busyDay: readonly EndeavorRecord[] = [
  record('breakfast', '🥐 Breakfast', at(7, 30), 1800),
  record('offsite', 'Team offsite', at(9), 4 * 3600, '#4285F4'),
  record('standup', 'Standup', at(9, 30), 900, '#DB4437'),
  record('one-on-one', 'One-on-one with Ada', at(11), 1800, '#0F9D58'),
  record('design-review', 'Design review', at(13), 2 * 3600, '#AB47BC'),
  record('vendor-call', 'Vendor call', at(14), 2 * 3600, '#F4B400'),
  record('sync', 'Sync', at(16, 30), 600),
  record('retro', 'Retro', at(17), 3600, '#00ACC1'),
]

const storeWith = (records: readonly EndeavorRecord[]) =>
  makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore({ endeavors: records }),
  })

function Viewport({
  width,
  children,
}: {
  readonly width: number
  readonly children: ReactNode
}) {
  return <div style={{ width, height: 720, display: 'flex' }}>{children}</div>
}

const page = (
  records: readonly EndeavorRecord[],
  width: number,
  props: Parameters<typeof PlanPage>[0] = {},
) => (
  <StoreProvider store={storeWith(records)}>
    <Viewport width={width}>
      <PlanPage {...props} />
    </Viewport>
  </StoreProvider>
)

/** A realistic day at phone width — overlaps, a nested short event, a past one. */
export const BusyDayPhone = {
  render: () => <Stage width={390}>{page(busyDay, 390)}</Stage>,
}

/** The same day at desktop width, where the columns have room. */
export const BusyDayDesktop = {
  render: () => <Stage width={1000}>{page(busyDay, 1000)}</Stage>,
}

/** Nothing scheduled — the grid alone has to read as a day. */
export const EmptyDay = {
  render: () => <Stage width={390}>{page([], 390)}</Stage>,
}

/** The grant has lapsed: the reconnect banner the route resolves, in place. */
export const NeedsReconnect = {
  render: () => (
    <Stage width={390}>
      {page(busyDay, 390, {
        googleNeedsReconnect: true,
        googleReconnectDetail:
          'Kro no longer has access to your Google Calendar. Reconnect to see your events.',
      })}
    </Stage>
  ),
}

/** Google is rate-limiting; the day still shows its last good events. */
export const StaleSync = {
  render: () => (
    <Stage width={390}>
      {page(busyDay, 390, {
        staleSyncLabel: 'Rate limit hit. Last synced 3 min ago',
      })}
    </Stage>
  ),
}

/** Both schemes on the same busy day. */
export const BothSchemesBusyDay = {
  render: () => <BothSchemes>{page(busyDay, 390)}</BothSchemes>,
}
