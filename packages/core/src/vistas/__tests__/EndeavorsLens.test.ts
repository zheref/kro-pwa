import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { endeavorsLensMocks } from '../__mocks__/EndeavorsLens.mocks'
import { EndeavorComputedState } from '../EndeavorComputedState'
import {
  EndeavorGroupingCriteria,
  EndeavorSortingCriteria,
  ascendingBy,
} from '../EndeavorCriteria'
import {
  ALL_USER_FILTERS,
  BASIC_USER_FILTERS,
  UserFilter,
  applyLens,
  lensApplyingSnapshot,
  lensExposes,
  lensSnapshotOf,
  makeEndeavorsLens,
  userFilterFromRawValue,
  userFilters,
} from '../EndeavorsLens'
import { makeEndeavorsLensSnapshot } from '../EndeavorsLensSnapshot'

const everything = [
  endeavorMocks.plannedTask,
  endeavorMocks.todayEvent,
  endeavorMocks.weekdayHabit,
  endeavorMocks.bareDraft,
  endeavorMocks.blockedBlueprint,
  endeavorMocks.overdueTouristReminder,
  endeavorMocks.completedWithPerformances,
]

const idsOf = (endeavors: readonly { readonly id: string }[]) =>
  endeavors.map((endeavor) => endeavor.id)

describe('UserFilter', () => {
  it('carries canon’s eight toggles, in the OptionSet’s bit order', () => {
    expect(userFilters).toEqual([
      'kinds',
      'hosts',
      'statuses',
      'calendars',
      'search',
      'showArchived',
      'grouping',
      'computedStates',
    ])
  })

  it('`all` is every toggle, and `basics` is the kinds/hosts/statuses trio', () => {
    expect([...ALL_USER_FILTERS].sort()).toEqual([...userFilters].sort())
    expect([...BASIC_USER_FILTERS].sort()).toEqual([
      'hosts',
      'kinds',
      'statuses',
    ])
  })

  it('refuses a toggle name no case answers to', () => {
    expect(userFilterFromRawValue('lists')).toBeNull()
    expect(userFilterFromRawValue('grouping')).toBe(UserFilter.grouping)
  })
})

describe('makeEndeavorsLens defaults', () => {
  it('starts with nothing hidden, no search, archived out, grouped by status', () => {
    const lens = makeEndeavorsLens()
    expect(lens.hiddenKinds.size).toBe(0)
    expect(lens.hiddenHosts.size).toBe(0)
    expect(lens.hiddenStatuses.size).toBe(0)
    expect(lens.hiddenComputedStates.size).toBe(0)
    expect(lens.hiddenCalendarIds.size).toBe(0)
    expect(lens.searchQuery).toBe('')
    expect(lens.showArchived).toBe(false)
    expect(lens.grouping).toBe(EndeavorGroupingCriteria.status)
    expect(lens.sort).toEqual([])
  })

  it('exposes every toggle unless a vista says otherwise', () => {
    expect(makeEndeavorsLens().exposes).toEqual(ALL_USER_FILTERS)
  })

  it('treats an explicitly empty `exposes` as read-only, not as "unset"', () => {
    const readOnly = makeEndeavorsLens({ exposes: [] })
    expect(readOnly.exposes.size).toBe(0)
    expect(lensExposes(readOnly, UserFilter.search)).toBe(false)
  })

  it('carries per-vista sort parameters without persisting or applying them', () => {
    const lens = makeEndeavorsLens({
      sort: [ascendingBy(EndeavorSortingCriteria.due)],
    })
    expect(lens.sort).toEqual([{ direction: 'ascending', criteria: 'due' }])
    expect(lensSnapshotOf(lens)).toEqual(makeEndeavorsLensSnapshot())
  })
})

describe('applyLens — hidden kinds', () => {
  it('drops every task when the user hides tasks', () => {
    const visible = applyLens(
      endeavorsLensMocks.tasksHidden,
      everything,
      MOCK_NOW,
    )
    expect(
      visible.some((endeavor) => endeavor.kind === EndeavorKind.task),
    ).toBe(false)
  })

  it('leaves the other kinds alone', () => {
    const visible = applyLens(
      endeavorsLensMocks.tasksHidden,
      everything,
      MOCK_NOW,
    )
    expect(idsOf(visible)).toContain('endeavor-today-event')
    expect(idsOf(visible)).toContain('endeavor-weekday-habit')
  })

  it('changes nothing when the hidden set is empty', () => {
    expect(applyLens(makeEndeavorsLens(), everything, MOCK_NOW)).toHaveLength(
      everything.length - 1,
    )
  })
})

describe('applyLens — hidden hosts', () => {
  it('keeps a multi-host endeavor while one of its hosts is still visible', () => {
    const visible = applyLens(
      endeavorsLensMocks.googleHidden,
      everything,
      MOCK_NOW,
    )
    expect(idsOf(visible)).toContain('endeavor-today-event')
  })

  it('drops it once every one of its hosts is hidden', () => {
    const bothHidden = makeEndeavorsLens({
      hiddenHosts: [EndeavorHost.googleCalendar, EndeavorHost.local],
    })
    const visible = applyLens(bothHidden, everything, MOCK_NOW)
    expect(idsOf(visible)).not.toContain('endeavor-today-event')
  })

  it('never hides an endeavor that has no host yet — a draft is not "at" a hidden source', () => {
    const allHostsHidden = makeEndeavorsLens({
      hiddenHosts: [
        EndeavorHost.supabase,
        EndeavorHost.local,
        EndeavorHost.appleCalendar,
        EndeavorHost.googleCalendar,
        EndeavorHost.outlookCalendar,
        EndeavorHost.appleReminders,
      ],
    })
    expect(idsOf(applyLens(allHostsHidden, everything, MOCK_NOW))).toEqual([
      'endeavor-bare-draft',
    ])
  })
})

describe('applyLens — hidden statuses and archived', () => {
  it('drops a hidden status outright', () => {
    const noBlocked = makeEndeavorsLens({
      hiddenStatuses: [EndeavorStatus.blocked],
    })
    expect(idsOf(applyLens(noBlocked, everything, MOCK_NOW))).not.toContain(
      'endeavor-blocked-blueprint',
    )
  })

  it('hides closed and skipped items until show-archived is on', () => {
    expect(
      idsOf(applyLens(makeEndeavorsLens(), everything, MOCK_NOW)),
    ).not.toContain('endeavor-completed-performances')
    expect(
      idsOf(applyLens(endeavorsLensMocks.showArchived, everything, MOCK_NOW)),
    ).toContain('endeavor-completed-performances')
  })

  it('applies the archive rule to skipped as well as closed', () => {
    const skipped = {
      ...endeavorMocks.plannedTask,
      status: EndeavorStatus.skipped,
    }
    expect(applyLens(makeEndeavorsLens(), [skipped], MOCK_NOW)).toEqual([])
  })
})

describe('applyLens — computed states', () => {
  it('hides the expired reminder when the Do lens hides expired', () => {
    const asTask = {
      ...endeavorMocks.overdueTouristReminder,
      kind: EndeavorKind.task,
    }
    const visible = applyLens(
      endeavorsLensMocks.doComputedHidden,
      [asTask, endeavorMocks.plannedTask],
      MOCK_NOW,
    )
    expect(idsOf(visible)).toEqual(['endeavor-planned-task'])
  })

  it('hides an endeavor matching ANY hidden state, not only all of them', () => {
    const overdueToday = {
      ...endeavorMocks.plannedTask,
      due: new Date(2026, 0, 15, 7, 0, 0),
    }
    const lens = makeEndeavorsLens({
      hiddenComputedStates: [
        EndeavorComputedState.overdue,
        EndeavorComputedState.completedToday,
      ],
    })
    expect(applyLens(lens, [overdueToday], MOCK_NOW)).toEqual([])
  })

  it('evaluates against the supplied `now`, not the wall clock', () => {
    const overdueOnly = {
      ...endeavorMocks.plannedTask,
      due: new Date(2026, 0, 15, 7, 0, 0),
    }
    const lens = makeEndeavorsLens({
      hiddenComputedStates: [EndeavorComputedState.overdue],
    })
    const earlier = new Date(2026, 0, 15, 6, 0, 0)
    expect(applyLens(lens, [overdueOnly], earlier)).toHaveLength(1)
    expect(applyLens(lens, [overdueOnly], MOCK_NOW)).toHaveLength(0)
  })
})

describe('applyLens — search', () => {
  it('matches a title case-insensitively, on a substring', () => {
    const lens = makeEndeavorsLens({ searchQuery: 'MORTGAGE' })
    expect(idsOf(applyLens(lens, everything, MOCK_NOW))).toEqual([
      'endeavor-planned-task',
    ])
  })

  it('narrows everything away when nothing matches, which is the filter-driven empty state', () => {
    expect(
      applyLens(endeavorsLensMocks.everythingHidden, everything, MOCK_NOW),
    ).toEqual([])
  })

  it('treats an empty query as no search at all', () => {
    const lens = makeEndeavorsLens({ searchQuery: '' })
    expect(applyLens(lens, everything, MOCK_NOW)).toHaveLength(
      everything.length - 1,
    )
  })

  it('matches a non-ASCII title without folding it away', () => {
    const lens = makeEndeavorsLens({ searchQuery: '設計図' })
    expect(idsOf(applyLens(lens, everything, MOCK_NOW))).toEqual([
      'endeavor-blocked-blueprint',
    ])
  })
})

describe('applyLens — purity', () => {
  it('returns a new array and never reorders or mutates the input', () => {
    const input = [...everything]
    const result = applyLens(makeEndeavorsLens(), input, MOCK_NOW)
    expect(result).not.toBe(input)
    expect(input).toEqual(everything)
    expect(idsOf(result)).toEqual(
      idsOf(everything).filter(
        (id) => id !== 'endeavor-completed-performances',
      ),
    )
  })
})

describe('snapshot bridge', () => {
  it('carries only the user-mutable subset out', () => {
    const snapshot = lensSnapshotOf(endeavorsLensMocks.doComputedHidden)
    expect(snapshot).toEqual(
      makeEndeavorsLensSnapshot({
        hiddenComputedStates: [
          EndeavorComputedState.overdue,
          EndeavorComputedState.expired,
        ],
        showArchived: true,
      }),
    )
  })

  it('restores the user’s choices onto a vista’s default lens', () => {
    const restored = lensApplyingSnapshot(
      makeEndeavorsLens({ exposes: [UserFilter.search] }),
      makeEndeavorsLensSnapshot({
        hiddenKinds: [EndeavorKind.habit],
        searchQuery: 'invoice',
        grouping: EndeavorGroupingCriteria.kind,
      }),
    )
    expect(restored.hiddenKinds).toEqual(new Set([EndeavorKind.habit]))
    expect(restored.searchQuery).toBe('invoice')
    expect(restored.grouping).toBe(EndeavorGroupingCriteria.kind)
  })

  it('never lets a save rewrite `sort` or `exposes` — those belong to the vista', () => {
    const configured = makeEndeavorsLens({
      sort: [ascendingBy(EndeavorSortingCriteria.due)],
      exposes: [UserFilter.search, UserFilter.grouping],
    })
    const restored = lensApplyingSnapshot(
      configured,
      makeEndeavorsLensSnapshot({ showArchived: true }),
    )
    expect(restored.sort).toEqual(configured.sort)
    expect(restored.exposes).toEqual(configured.exposes)
  })

  it('round-trips a lens through its own snapshot unchanged', () => {
    const lens = endeavorsLensMocks.everythingHidden
    expect(lensApplyingSnapshot(lens, lensSnapshotOf(lens))).toEqual(lens)
  })

  it('returns a new lens rather than mutating the one it was given', () => {
    const original = makeEndeavorsLens()
    const restored = lensApplyingSnapshot(
      original,
      makeEndeavorsLensSnapshot({ showArchived: true }),
    )
    expect(original.showArchived).toBe(false)
    expect(restored.showArchived).toBe(true)
  })
})

describe('hidden calendars', () => {
  it('is carried for persistence but applies no in-memory term, exactly as canon does', () => {
    const lens = makeEndeavorsLens({ hiddenCalendarIds: ['work-cal'] })
    expect(applyLens(lens, everything, MOCK_NOW)).toHaveLength(
      everything.length - 1,
    )
    expect(lensSnapshotOf(lens).hiddenCalendarIds).toEqual(
      new Set(['work-cal']),
    )
  })
})
