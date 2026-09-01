/**
 * The list Selectors, against a hand-built root state and never a live store
 * (`RC-55`).
 *
 * Two of these compose across slices and that is the point of the suite: the
 * sort and the grouping come from the SETTINGS snapshot (canon's preferences
 * provider), and the untimed half of the day comes from the endeavor POOL that
 * the day's own start-driven fetch cannot return.
 */
import type { SettingValue } from '@kro/core'
import { PlanListGrouping, PlanListSort } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../../../library/store'
import { initialAuthState } from '../../../../auth/AuthState'
import { initialCaptureState } from '../../../../capture/CaptureFeature'
import { initialDoState } from '../../../../do/DoFeature'
import { initialEarnState } from '../../../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../../../find/FindState'
import { initialGreetingState } from '../../../../greeting/GreetingFeature'
import { initialMainState } from '../../../../main/MainFeature'
import { initialPlatformState } from '../../../../platform/PlatformFeature'
import { initialSessionState } from '../../../../session/SessionState'
import { initialSettingsState } from '../../../../settings/SettingsState'
import { initialThirstState } from '../../../../thirst/ThirstFeature'
import { initialTriageState } from '../../../../triage/TriageFeature'
import { planDayKey, startOfPlanDay } from '../../../PlanCalendar'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planStateMocks,
} from '../../../PlanMocks'
import type { PlanState } from '../../../PlanState'
import {
  selectIsPlanListEmpty,
  selectPlanListEndeavors,
  selectPlanListGrouping,
  selectPlanListSections,
  selectPlanListSort,
  selectPlanRowCapabilities,
} from '../PlanListSelectors'
import {
  planListBucketFixtures,
  planListMixedDay,
  planListProjectDay,
} from '../planListMocks'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const dayKey = planDayKey(today)

/** A loaded Plan day whose timed rows and pool are both under the test's control. */
const planWith = (params: {
  readonly timed?: PlanState['dayLoad']
  readonly pool?: PlanState['matrixLoad']
}): PlanState => ({
  ...planStateMocks.loaded,
  now: PLAN_REFERENCE_NOW,
  selectedDate: today,
  dayLoad: params.timed ?? { kind: 'loaded', dayKey, events: [] },
  matrixLoad: params.pool ?? { kind: 'idle' },
})

const rootWith = (
  plan: PlanState,
  settingValues: Readonly<Record<string, SettingValue | null>> = {},
): RootState => ({
  greeting: initialGreetingState,
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: { ...initialSettingsState, values: settingValues },
  auth: initialAuthState,
  main: initialMainState,
  thirst: initialThirstState,
})

describe('selectPlanListSort', () => {
  it('opens on canon default (Time) before the settings snapshot has landed', () => {
    expect(selectPlanListSort(rootWith(planWith({})))).toBe(PlanListSort.time)
  })

  it('follows the saved preference once the snapshot is in', () => {
    const root = rootWith(planWith({}), { 'plan.listSort': 'priority' })
    expect(selectPlanListSort(root)).toBe(PlanListSort.priority)
  })

  it('falls back to Time when the stored value names no sort at all', () => {
    const root = rootWith(planWith({}), { 'plan.listSort': 'nonsense' })
    expect(selectPlanListSort(root)).toBe(PlanListSort.time)
  })
})

describe('selectPlanListGrouping', () => {
  it('opens on canon default (None) — the four temporal buckets', () => {
    expect(selectPlanListGrouping(rootWith(planWith({})))).toBe(
      PlanListGrouping.none,
    )
  })

  it('follows the saved preference — Project regroups the same day', () => {
    const root = rootWith(planWith({}), { 'plan.listGrouping': 'project' })
    expect(selectPlanListGrouping(root)).toBe(PlanListGrouping.project)
  })

  it('falls back to None when the stored value names no grouping', () => {
    const root = rootWith(planWith({}), { 'plan.listGrouping': 'byMood' })
    expect(selectPlanListGrouping(root)).toBe(PlanListGrouping.none)
  })
})

describe('selectPlanListEndeavors', () => {
  it('is empty on a day with nothing fetched at all', () => {
    const root = rootWith(planWith({}))
    expect(selectPlanListEndeavors(root)).toEqual([])
    expect(selectIsPlanListEmpty(root)).toBe(true)
  })

  it('carries the timed rows the timeline draws', () => {
    const root = rootWith(
      planWith({
        timed: {
          kind: 'loaded',
          dayKey,
          events: [planListBucketFixtures.ongoing],
        },
      }),
    )
    expect(selectPlanListEndeavors(root).map((e) => e.id)).toEqual([
      'list-ongoing',
    ])
  })

  it('ADDS the untimed rows due that day, which the day fetch cannot return', () => {
    const root = rootWith(
      planWith({
        timed: {
          kind: 'loaded',
          dayKey,
          events: [planListBucketFixtures.ongoing],
        },
        pool: {
          kind: 'loaded',
          endeavors: [planListBucketFixtures.untimedDueToday],
        },
      }),
    )
    expect(selectPlanListEndeavors(root).map((e) => e.id)).toEqual([
      'list-ongoing',
      'list-untimed-today',
    ])
  })

  it('never double-counts a row the pool and the day both hold', () => {
    const root = rootWith(
      planWith({
        timed: {
          kind: 'loaded',
          dayKey,
          events: [planListBucketFixtures.ongoing],
        },
        pool: { kind: 'loaded', endeavors: [planListBucketFixtures.ongoing] },
      }),
    )
    expect(selectPlanListEndeavors(root)).toHaveLength(1)
  })

  it('leaves an untimed row due on ANOTHER day out of this day list', () => {
    const otherDay = {
      ...planListBucketFixtures.untimedDueToday,
      due: new Date(
        planListBucketFixtures.untimedDueToday.due!.getTime() + 86_400_000,
      ),
    }
    const root = rootWith(
      planWith({ pool: { kind: 'loaded', endeavors: [otherDay] } }),
    )
    expect(selectPlanListEndeavors(root)).toEqual([])
  })

  it('sorts the combined set ONCE, so Priority interleaves timed and untimed rows', () => {
    const day = planWith({
      timed: {
        kind: 'loaded',
        dayKey,
        events: [planListBucketFixtures.comingNext],
      },
      pool: {
        kind: 'loaded',
        endeavors: [planListBucketFixtures.untimedOverdue],
      },
    })

    // Under Time the timed 14:00 call leads, because the untimed row has no
    // start at all and floats to the end.
    expect(selectPlanListEndeavors(rootWith(day)).map((e) => e.id)).toEqual([
      'list-coming-next',
      'list-untimed-overdue',
    ])

    // Under Priority the overdue permit leads — which it could not do if the
    // two halves were concatenated as two pre-sorted runs.
    expect(
      selectPlanListEndeavors(
        rootWith(day, { 'plan.listSort': 'priority' }),
      ).map((e) => e.id),
    ).toEqual(['list-untimed-overdue', 'list-coming-next'])
  })
})

describe('selectPlanListSections', () => {
  it('renders the four temporal buckets on the default grouping', () => {
    const root = rootWith(
      planWith({
        timed: { kind: 'loaded', dayKey, events: planListMixedDay },
      }),
    )
    expect(
      selectPlanListSections(root).map((section) => section.title),
    ).toEqual(['All Day', 'Past Events', 'Ongoing', 'Coming Next'])
  })

  it('regroups the SAME day by project when the preference changes', () => {
    const root = rootWith(
      planWith({
        timed: { kind: 'loaded', dayKey, events: planListProjectDay },
      }),
      { 'plan.listGrouping': 'project' },
    )
    expect(selectPlanListSections(root).map((section) => section.id)).toEqual([
      'atlas',
      'borealis',
      'noProject',
    ])
  })

  it('renders no sections at all for an empty day', () => {
    expect(selectPlanListSections(rootWith(planWith({})))).toEqual([])
  })
})

describe('selectPlanRowCapabilities', () => {
  it('keeps the two swipe operations the Plan vista declares', () => {
    const operations = selectPlanRowCapabilities(
      rootWith(planWith({})),
    ).operations.map((binding) => binding.operation)
    expect(operations).toContain('startSession')
    expect(operations).toContain('delete')
  })

  it('drops the flag-gated Detail tap — the shipping baseline holds it off', () => {
    const operations = selectPlanRowCapabilities(
      rootWith(planWith({})),
    ).operations.map((binding) => binding.operation)
    expect(operations).not.toContain('viewDetail')
  })

  it('keeps both context-menu bindings, so a right-click reaches everything', () => {
    const contextMenu = selectPlanRowCapabilities(
      rootWith(planWith({})),
    ).operations.filter((binding) => binding.gesture.kind === 'contextMenu')
    expect(contextMenu).toHaveLength(2)
  })
})
