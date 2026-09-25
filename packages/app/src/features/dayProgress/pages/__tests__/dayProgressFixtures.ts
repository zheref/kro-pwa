/**
 * A real store seeded through the persistence path production writes to —
 * the Day Progress Page's stories and render tests mount against it, so the
 * mount effect's real `loadDayProgressThunk` reads the fixture day.
 */
import {
  type Endeavor,
  endeavorRecordFromEndeavor,
  performanceRecordFromPerform,
} from '@kro/core'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import {
  type InMemoryLocalStoreSeed,
  makeInMemoryLocalStore,
} from '../../../../services/localStore/InMemoryLocalStore'
import type { DayProgressState } from '../../DayProgressFeature'
import { makeDayProgressEndeavors } from '../../DayProgressMocks'
import {
  selectCanPageToNextWeek,
  selectCanPageToPreviousWeek,
  selectDayProgressException,
  selectIsDayProgressLoading,
  selectSelectedDay,
  selectSelectedDayActivity,
  selectSelectedDayRelation,
  selectSelectedDayRings,
  selectWeekCells,
} from '../../DayProgressSelectors'
import type { DayProgressFragmentProps } from '../DayProgressFragment'

export const dayProgressSeed = (
  endeavors: readonly Endeavor[],
  now: Date,
): InMemoryLocalStoreSeed => ({
  endeavors: endeavors.map((endeavor) =>
    endeavorRecordFromEndeavor(endeavor, { now }),
  ),
  performances: endeavors.flatMap((endeavor) =>
    endeavor.performances.map((performance) =>
      performanceRecordFromPerform(performance, {
        endeavorId: endeavor.id,
        nowMillis: now.getTime(),
      }),
    ),
  ),
})

/** A store whose local database holds `endeavors` (default: today's busy day). */
export const makeSeededDayProgressStore = (
  endeavors: readonly Endeavor[] = makeDayProgressEndeavors(new Date()),
): AppStore =>
  makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore(dayProgressSeed(endeavors, new Date())),
  })

/**
 * The Fragment's props for a canned state, derived through the real Selectors
 * so stories and render tests show exactly what the Page would hand down.
 */
export const fragmentPropsFor = (
  state: DayProgressState,
  intents: Partial<
    Pick<
      DayProgressFragmentProps,
      'onSelectDay' | 'onPreviousWeek' | 'onNextWeek'
    >
  > = {},
): DayProgressFragmentProps => {
  const root = { dayProgress: state }
  return {
    selectedDay: selectSelectedDay(root),
    relation: selectSelectedDayRelation(root),
    weekCells: selectWeekCells(root),
    canPageToPreviousWeek: selectCanPageToPreviousWeek(root),
    canPageToNextWeek: selectCanPageToNextWeek(root),
    rings: selectSelectedDayRings(root),
    activity: selectSelectedDayActivity(root),
    isLoading: selectIsDayProgressLoading(root),
    exception: selectDayProgressException(root),
    onSelectDay: intents.onSelectDay ?? (() => undefined),
    onPreviousWeek: intents.onPreviousWeek ?? (() => undefined),
    onNextWeek: intents.onNextWeek ?? (() => undefined),
  }
}
