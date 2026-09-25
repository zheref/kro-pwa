/**
 * Real stores for the Day Timeline suites (`RC-22`, `RC-35`): `makeStore`
 * with `stubbedThunkExtra`, the on-device host seeded through the record
 * path production writes to. Never a live binding, never a mocked `fetch`.
 */
import { type Endeavor, endeavorRecordFromEndeavor } from '@kro/core'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { DAY_TIMELINE_MOCK_NOW } from '../DayTimelineMocks'

/** A store whose local database holds `events`. */
export const makeDayTimelineStore = (
  events: readonly Endeavor[] = [],
): AppStore =>
  makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore({
      endeavors: events.map((event) =>
        endeavorRecordFromEndeavor(event, { now: DAY_TIMELINE_MOCK_NOW }),
      ),
    }),
  })

/** A store whose host fan-out itself throws — the Producer's `err` path. */
export const makeFailingDayTimelineStore = (message: string): AppStore =>
  makeStore({
    ...stubbedThunkExtra,
    featureFlags: {
      ...stubbedThunkExtra.featureFlags,
      isEnabled: () => {
        throw new Error(message)
      },
    },
  })
