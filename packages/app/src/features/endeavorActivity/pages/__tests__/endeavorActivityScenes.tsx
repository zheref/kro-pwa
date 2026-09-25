/**
 * Shared scenes for the Page's stories and render tests: a real store built by
 * `makeStore` (`RC-22`) over an in-memory `LocalStore` seeded from the
 * feature's mocks, so the Page's own load runs end to end.
 */
import {
  type Endeavor,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  performanceRecordFromPerform,
} from '@kro/core'
import type { ReactNode } from 'react'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import {
  ACTIVITY_NOW,
  allActivityEndeavorMocks,
} from '../../EndeavorActivityMocks'

export const activityStore = (
  endeavors: readonly Endeavor[] = allActivityEndeavorMocks,
): AppStore => {
  const nowMillis = epochMillisFromDate(ACTIVITY_NOW)
  const localStore = makeInMemoryLocalStore({
    endeavors: endeavors.map((endeavor) =>
      endeavorRecordFromEndeavor(endeavor, { now: ACTIVITY_NOW }),
    ),
    performances: endeavors.flatMap((endeavor) =>
      endeavor.performances.map((perform) =>
        performanceRecordFromPerform(perform, {
          endeavorId: endeavor.id,
          nowMillis,
          endedAt:
            perform.sessionFragments[perform.sessionFragments.length - 1]
              ?.endedAt ?? null,
        }),
      ),
    ),
  })
  return makeStore({ ...stubbedThunkExtra, localStore })
}

export function ActivityHarness({
  store,
  children,
}: {
  store: AppStore
  children: ReactNode
}) {
  return (
    <StoreProvider store={store}>
      <div style={{ width: 380 }}>{children}</div>
    </StoreProvider>
  )
}
