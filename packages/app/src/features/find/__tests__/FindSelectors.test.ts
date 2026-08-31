/**
 * Selectors run against a hand-built root state, never a live store (`RC-55`).
 * The other registered slices are filled from their own initial states only
 * because `RootState` names every one of them; this suite asserts nothing about
 * them.
 *
 * The cases here are the ones acceptance criterion 2 is about: canon's search,
 * archived and filter rules, the four distinguishable empty states, and the
 * seven-per-group limit with its expand.
 */
import { EndeavorKind, EndeavorStatus } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import type { RootState } from '../../../library/store'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import {
  FIND_REFERENCE_NOW,
  allFindEndeavorMocks,
  findEndeavorMocks,
  findStateMocks,
} from '../FindMocks'
import type { FindState } from '../FindState'
import { withFilterToggled, withSearchQuery, withShowArchivedToggled } from '../FindShifters'
import {
  selectFindAreAllKindsHidden,
  selectFindCapabilities,
  selectFindEmptyState,
  selectFindException,
  selectFindHasNoFiltersSelected,
  selectFindNextIntent,
  selectFindPendingIntents,
  selectFindRowAdapters,
  selectFindRows,
  selectFindSelectedHosts,
  selectFindSelectedKinds,
  selectFindSelectedStatuses,
  selectFindShowArchived,
  selectFindVisibleCount,
  selectFindVisibleIds,
  selectFindVista,
  selectIsFindLensLoading,
  selectIsFindLoading,
  selectTasksEmptyState,
  selectTasksGroupAdapters,
  selectTasksGroups,
  selectTasksHeading,
  selectTasksTitle,
  selectTasksVista,
} from '../FindSelectors'

const rootWith = (find: FindState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts nothing about Do, Capture, Triage, Plan or Endeavor Detail.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  auth: initialAuthState,
})

const loaded = rootWith(findStateMocks.loaded)

describe('the vista is materialised from the registry plus the stored lens', () => {
  it('carries the user’s search into the Find vista’s lens', () => {
    const typed = withSearchQuery(findStateMocks.loaded, {
      surface: 'find',
      query: 'slides',
    })
    expect(selectFindVista(rootWith(typed)).lens.searchQuery).toBe('slides')
  })

  it('keeps the registry’s exposes set, which a saved lens may never rewrite', () => {
    expect([...selectFindVista(loaded).lens.exposes].sort()).toEqual([
      'hosts',
      'kinds',
      'search',
      'showArchived',
      'statuses',
    ])
  })

  it('picks the tasks vista the selection names', () => {
    const today = {
      ...findStateMocks.tasksLoaded,
      tasksSelection: { kind: 'today' as const },
    }
    expect(selectTasksVista(rootWith(today)).id).toBe('tasks.today')
  })
})

describe('capabilities resolve against the flags cached at install', () => {
  it('drops the flag-gated View Detail tap while the flag is off', () => {
    const operations = selectFindCapabilities(loaded).operations.map(
      (binding) => binding.operation,
    )
    expect(operations).not.toContain('viewDetail')
  })

  it('keeps it once the flag was on at install', () => {
    const withFlag = rootWith(findStateMocks.loadedWithDetailFlag)
    const operations = selectFindCapabilities(withFlag).operations.map(
      (binding) => binding.operation,
    )
    expect(operations).toContain('viewDetail')
  })

  it('feeds the adapters, so a gated tap simply does not exist on a row', () => {
    expect(selectFindRowAdapters(loaded)[0]?.tapAction).toBeNull()
    expect(
      selectFindRowAdapters(rootWith(findStateMocks.loadedWithDetailFlag))[0]
        ?.tapAction?.operation,
    ).toBe('viewDetail')
  })
})

describe('Find’s displayed rows follow canon’s lens and sort', () => {
  it('hides closed rows until Show Archived is on', () => {
    expect(
      selectFindRows(loaded).some(
        (row) => row.id === findEndeavorMocks.archivedTask.id,
      ),
    ).toBe(false)

    const shown = withShowArchivedToggled(findStateMocks.loaded, {
      surface: 'find',
    })
    expect(
      selectFindRows(rootWith(shown)).some(
        (row) => row.id === findEndeavorMocks.archivedTask.id,
      ),
    ).toBe(true)
  })

  it('matches the search case-insensitively against the title', () => {
    const typed = withSearchQuery(findStateMocks.loaded, {
      surface: 'find',
      query: 'SLIDES',
    })
    expect(selectFindRows(rootWith(typed)).map((row) => row.id)).toEqual([
      findEndeavorMocks.morningTask.id,
    ])
  })

  it('sorts by start ?? due ascending, with undated rows trailing', () => {
    const ids = selectFindRows(loaded).map((row) => row.id)
    expect(ids[0]).toBe(findEndeavorMocks.morningTask.id)
    expect(ids[ids.length - 1]).toMatch(/undated|habit/)
  })

  it('keeps a multi-host row while ONE of its hosts is still shown', () => {
    const hidden = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'host', value: 'local' },
    })
    expect(
      selectFindRows(rootWith(hidden)).some(
        (row) => row.id === findEndeavorMocks.mirroredTask.id,
      ),
    ).toBe(true)
  })

  it('short-circuits to empty when every filter is off', () => {
    expect(selectFindRows(rootWith(findStateMocks.everythingHidden))).toEqual([])
  })

  it('reports the visible count and ids the bulk menu acts on', () => {
    expect(selectFindVisibleCount(loaded)).toBe(selectFindRows(loaded).length)
    expect(selectFindVisibleIds(loaded)).toEqual(
      selectFindRows(loaded).map((row) => row.id),
    )
  })
})

describe('the filter chips read the complement of the hidden sets', () => {
  it('shows every kind while nothing is hidden', () => {
    expect(selectFindSelectedKinds(loaded)).toHaveLength(7)
  })

  it('drops the one the user deselected', () => {
    const hidden = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'kind', value: EndeavorKind.habit },
    })
    expect(selectFindSelectedKinds(rootWith(hidden))).not.toContain(
      EndeavorKind.habit,
    )
  })

  it('answers the same way for hosts and statuses', () => {
    const hidden = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'status', value: EndeavorStatus.qa },
    })
    expect(selectFindSelectedHosts(loaded)).toHaveLength(6)
    expect(selectFindSelectedStatuses(rootWith(hidden))).not.toContain(
      EndeavorStatus.qa,
    )
  })

  it('reports "no filters selected" only when everything is off AND archived is hidden', () => {
    expect(selectFindHasNoFiltersSelected(loaded)).toBe(false)
    expect(
      selectFindHasNoFiltersSelected(rootWith(findStateMocks.everythingHidden)),
    ).toBe(true)
  })

  it('tells "all kinds hidden" apart from "no data"', () => {
    expect(selectFindAreAllKindsHidden(loaded)).toBe(false)
    expect(
      selectFindAreAllKindsHidden(rootWith(findStateMocks.everythingHidden)),
    ).toBe(true)
  })

  it('exposes the archived toggle as the chip renders it', () => {
    expect(selectFindShowArchived(loaded)).toBe(false)
  })
})

describe('the four empty states are told apart, in canon’s branch order', () => {
  it('says "no data" when nothing was fetched at all', () => {
    expect(selectFindEmptyState(rootWith(findStateMocks.idle))).toEqual({
      kind: 'noData',
    })
  })

  it('says "no filters" before it would say "no results"', () => {
    expect(
      selectFindEmptyState(rootWith(findStateMocks.everythingHidden)),
    ).toEqual({ kind: 'noFilters' })
  })

  it('says "no results" when a search matched nothing', () => {
    expect(
      selectFindEmptyState(rootWith(findStateMocks.searchWithNoMatches)),
    ).toEqual({ kind: 'noResults', query: 'zzzz' })
  })

  it('says "filtered out" when rows exist but filters hid all of them', () => {
    const hidden = withFilterToggled(findStateMocks.loaded, {
      surface: 'find',
      toggle: { axis: 'status', value: EndeavorStatus.pending },
    })
    const alsoHidden = withFilterToggled(
      withFilterToggled(hidden, {
        surface: 'find',
        toggle: { axis: 'status', value: EndeavorStatus.ongoing },
      }),
      { surface: 'find', toggle: { axis: 'status', value: EndeavorStatus.planned } },
    )
    expect(selectFindEmptyState(rootWith(alsoHidden))).toEqual({
      kind: 'filteredOut',
    })
  })

  it('answers null while there is something to show', () => {
    expect(selectFindEmptyState(loaded)).toBeNull()
  })
})

describe('All Tasks groups, limits and expands', () => {
  const tasks = rootWith(findStateMocks.tasksLoaded)

  it('clips every group to the vista’s seven-row limit', () => {
    const [group] = selectTasksGroups(tasks)
    expect(group?.endeavors).toHaveLength(7)
    expect(group?.isTrimmed).toBe(true)
    expect(group?.totalCount).toBe(9)
  })

  it('lifts the limit for the group the user expanded', () => {
    const [group] = selectTasksGroups(rootWith(findStateMocks.tasksExpanded))
    expect(group?.endeavors).toHaveLength(9)
    expect(group?.isTrimmed).toBe(false)
  })

  it('narrows by the vista’s own kinds — All Tasks shows tasks only', () => {
    const mixed = rootWith(findStateMocks.tasksMixed)
    const kinds = new Set(
      selectTasksGroups(mixed).flatMap((group) =>
        group.endeavors.map((row) => row.kind),
      ),
    )
    expect([...kinds]).toEqual([EndeavorKind.task])
  })

  it('adapts every visible row against the tasks capabilities', () => {
    const [first] = selectTasksGroupAdapters(tasks)
    expect(first?.rows).toHaveLength(7)
    expect(first?.rows[0]?.trailingSwipeActions.map((a) => a.operation)).toEqual(
      ['markComplete', 'delete'],
    )
  })

  it('tells its own empty states apart', () => {
    expect(selectTasksEmptyState(rootWith(findStateMocks.idle))).toEqual({
      kind: 'noData',
    })
    expect(selectTasksEmptyState(tasks)).toBeNull()
  })
})

describe('the All Tasks heading follows canon’s fallback ladder', () => {
  it('prefers the caller’s override', () => {
    const custom = {
      ...findStateMocks.tasksLoaded,
      tasksCustomTitle: 'Today’s work',
    }
    expect(selectTasksHeading(rootWith(custom))).toBe('Today’s work')
  })

  it('then the scoped list’s own title', () => {
    const list = {
      ...findStateMocks.tasksLoaded,
      tasksSelection: {
        kind: 'list' as const,
        listId: 'l-1',
        listTitle: 'Groceries',
      },
    }
    expect(selectTasksHeading(rootWith(list))).toBe('Groceries')
    expect(selectTasksTitle(rootWith(list))).toBe('List')
  })

  it('then the live search, then the generic label', () => {
    const searching = withSearchQuery(findStateMocks.tasksLoaded, {
      surface: 'tasks',
      query: 'slides',
    })
    expect(selectTasksHeading(rootWith(searching))).toBe('Searching: "slides"')
    expect(selectTasksTitle(rootWith(searching))).toBe('Search')
    expect(selectTasksHeading(rootWith(findStateMocks.tasksLoaded))).toBe('Tasks')
    expect(selectTasksTitle(rootWith(findStateMocks.tasksLoaded))).toBe('')
  })

  it('says "Tasks" as the subtitle for a predicate-scoped vista', () => {
    const today = {
      ...findStateMocks.tasksLoaded,
      tasksSelection: { kind: 'today' as const },
    }
    expect(selectTasksTitle(rootWith(today))).toBe('Tasks')
  })
})

describe('lifecycle and intents', () => {
  it('reports the loading and failed lifecycles', () => {
    expect(selectIsFindLoading(rootWith(findStateMocks.loading))).toBe(true)
    expect(selectFindException(rootWith(findStateMocks.failedAfterLoad))?.kind).toBe(
      'fetchFailed',
    )
  })

  it('suppresses a filter-driven empty hint until the saved lens has landed', () => {
    expect(selectIsFindLensLoading(rootWith(findStateMocks.idle))).toBe(true)
    expect(selectIsFindLensLoading(loaded)).toBe(false)
  })

  it('hands the oldest parked intent over first', () => {
    const withIntent = rootWith(findStateMocks.withPendingIntent)
    expect(selectFindPendingIntents(withIntent)).toHaveLength(1)
    expect(selectFindNextIntent(withIntent)?.operation).toBe('startSession')
    expect(selectFindNextIntent(loaded)).toBeNull()
  })

  it('classifies against the anchored clock, never a live one', () => {
    expect(findStateMocks.loaded.find.clockAnchor).toEqual(FIND_REFERENCE_NOW)
    expect(selectFindRows(loaded)).toHaveLength(
      allFindEndeavorMocks.length - 1, // the archived row is hidden
    )
  })
})
