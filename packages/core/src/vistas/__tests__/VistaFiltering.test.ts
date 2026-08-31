import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { makeProject } from '../../domain/shared/EndeavorList'
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { absoluteDateRange, monthDateRange } from '../DateRangeSpec'
import { EndeavorComputedState } from '../EndeavorComputedState'
import { EndeavorPredicate } from '../EndeavorPredicate'
import { makeEndeavorsLens } from '../EndeavorsLens'
import { makeEndeavorsQuery } from '../EndeavorsQuery'
import { EndeavorsVistas } from '../EndeavorsVistas'
import { vistaWithLens } from '../EndeavorsVista'
import {
  applyQuery,
  applyVista,
  queryPredicate,
  resolveQueryWindow,
  vistaPredicate,
} from '../VistaFiltering'

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

describe('queryPredicate — kinds', () => {
  it('keeps only the requested kinds', () => {
    const query = makeEndeavorsQuery({ kinds: [EndeavorKind.task] })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toEqual([
      'endeavor-planned-task',
      'endeavor-bare-draft',
    ])
  })

  it('treats a null kind set as no constraint at all', () => {
    const query = makeEndeavorsQuery()
    expect(applyQuery(query, everything, MOCK_NOW)).toHaveLength(6)
  })

  it('treats an EMPTY kind set as no constraint too, matching canon’s isEmpty guard', () => {
    const query = makeEndeavorsQuery({ kinds: [] })
    expect(applyQuery(query, everything, MOCK_NOW)).toHaveLength(6)
  })
})

describe('queryPredicate — statuses, hosts and lists', () => {
  it('keeps only the requested statuses', () => {
    const query = makeEndeavorsQuery({ statuses: [EndeavorStatus.blocked] })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toEqual([
      'endeavor-blocked-blueprint',
    ])
  })

  it('matches an endeavor when ANY of its hosts was requested — the mirror of the lens rule', () => {
    const query = makeEndeavorsQuery({ hosts: [EndeavorHost.googleCalendar] })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toEqual([
      'endeavor-today-event',
    ])
  })

  it('drops an endeavor hosted nowhere from a host-scoped query', () => {
    const query = makeEndeavorsQuery({ hosts: [EndeavorHost.local] })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).not.toContain(
      'endeavor-bare-draft',
    )
  })

  it('keeps only endeavors in the scoped list', () => {
    const query = makeEndeavorsQuery({ lists: ['project-finances'] })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toEqual([
      'endeavor-planned-task',
    ])
  })

  it('never matches an endeavor with no list against a list-scoped query', () => {
    const listed = {
      ...endeavorMocks.bareDraft,
      list: makeProject({ id: 'project-other', title: 'Other' }),
    }
    const query = makeEndeavorsQuery({ lists: ['project-finances'] })
    expect(
      applyQuery(query, [endeavorMocks.bareDraft, listed], MOCK_NOW),
    ).toEqual([])
  })
})

describe('queryPredicate — archived', () => {
  it('strips closed and skipped items unless the query asks for them', () => {
    expect(
      idsOf(applyQuery(makeEndeavorsQuery(), everything, MOCK_NOW)),
    ).not.toContain('endeavor-completed-performances')
  })

  it('keeps them once includeArchived is set — which is why Do sets it', () => {
    const query = makeEndeavorsQuery({ includeArchived: true })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toContain(
      'endeavor-completed-performances',
    )
  })

  it('is what stands between Do’s lens intent and an always-empty completed lane', () => {
    const withoutArchive = makeEndeavorsQuery({
      kinds: [EndeavorKind.task],
      includeArchived: false,
    })
    expect(
      idsOf(applyQuery(withoutArchive, everything, MOCK_NOW)),
    ).not.toContain('endeavor-completed-performances')
  })
})

describe('queryPredicate — predicates', () => {
  it('keeps only what satisfies the named predicate', () => {
    const query = makeEndeavorsQuery({
      kinds: [EndeavorKind.task],
      predicates: [EndeavorPredicate.isDueToday],
    })
    expect(idsOf(applyQuery(query, everything, MOCK_NOW))).toEqual([
      'endeavor-planned-task',
    ])
  })

  it('requires EVERY predicate to hold, not merely one', () => {
    const query = makeEndeavorsQuery({
      predicates: [EndeavorPredicate.isDueToday, EndeavorPredicate.isCompleted],
    })
    expect(applyQuery(query, everything, MOCK_NOW)).toEqual([])
  })

  it('evaluates them against the supplied `now`', () => {
    const query = makeEndeavorsQuery({
      predicates: [EndeavorPredicate.isDueToday],
    })
    const tomorrow = new Date(2026, 0, 16, 9, 0, 0)
    expect(applyQuery(query, everything, MOCK_NOW)).toHaveLength(1)
    expect(applyQuery(query, everything, tomorrow)).toHaveLength(0)
  })
})

describe('queryPredicate — purity', () => {
  it('returns a new array and leaves the input untouched', () => {
    const input = [...everything]
    const result = applyQuery(makeEndeavorsQuery(), input, MOCK_NOW)
    expect(result).not.toBe(input)
    expect(input).toEqual(everything)
  })

  it('is reusable across endeavors without re-reading the query', () => {
    const matches = queryPredicate(
      makeEndeavorsQuery({ kinds: [EndeavorKind.habit] }),
      MOCK_NOW,
    )
    expect(matches(endeavorMocks.weekdayHabit)).toBe(true)
    expect(matches(endeavorMocks.plannedTask)).toBe(false)
  })
})

describe('resolveQueryWindow', () => {
  it('gives Plan today’s midnight-to-midnight window', () => {
    expect(resolveQueryWindow(EndeavorsVistas.planDay.query, MOCK_NOW)).toEqual(
      {
        start: new Date(2026, 0, 15, 0, 0, 0),
        end: new Date(2026, 0, 16, 0, 0, 0),
      },
    )
  })

  it('still gives today’s window to a query with no date constraint, because a calendar client needs one', () => {
    expect(resolveQueryWindow(makeEndeavorsQuery(), MOCK_NOW)).toEqual(
      resolveQueryWindow(EndeavorsVistas.doTab.query, MOCK_NOW),
    )
  })

  it('passes an absolute window through, and a month spec through its own bounds', () => {
    const from = new Date(2026, 0, 10, 0, 0, 0)
    const to = new Date(2026, 0, 12, 0, 0, 0)
    expect(
      resolveQueryWindow(
        makeEndeavorsQuery({ dateRange: absoluteDateRange(from, to) }),
        MOCK_NOW,
      ),
    ).toEqual({ start: from, end: to })
    expect(
      resolveQueryWindow(
        makeEndeavorsQuery({ dateRange: monthDateRange(2026, 3) }),
        MOCK_NOW,
      ),
    ).toEqual({
      start: new Date(2026, 2, 1, 0, 0, 0),
      end: new Date(2026, 3, 1, 0, 0, 0),
    })
  })

  it('is the ONLY place the window bites: the predicate never filters on a date range', () => {
    const outOfWindow = {
      ...endeavorMocks.plannedTask,
      start: new Date(2020, 0, 1, 9, 0, 0),
      due: new Date(2020, 0, 1, 9, 0, 0),
    }
    const todayScoped = makeEndeavorsQuery({
      kinds: [EndeavorKind.task],
      dateRange: EndeavorsVistas.planDay.query.dateRange,
    })
    expect(applyQuery(todayScoped, [outOfWindow], MOCK_NOW)).toHaveLength(1)
  })
})

describe('applyVista — query then lens', () => {
  it('narrows by the query first and the lens second', () => {
    const withSearch = vistaWithLens(
      EndeavorsVistas.find,
      makeEndeavorsLens({ searchQuery: 'mortgage' }),
    )
    expect(idsOf(applyVista(withSearch, everything, MOCK_NOW))).toEqual([
      'endeavor-planned-task',
    ])
  })

  it('agrees term for term with the composed predicate', () => {
    const matches = vistaPredicate(EndeavorsVistas.find, MOCK_NOW)
    expect(
      idsOf(applyVista(EndeavorsVistas.find, everything, MOCK_NOW)),
    ).toEqual(idsOf(everything.filter(matches)))
  })

  it('lets Do see its completed task, because the query asks for archived AND the lens shows it', () => {
    expect(
      idsOf(applyVista(EndeavorsVistas.doTab, everything, MOCK_NOW)),
    ).toContain('endeavor-completed-performances')
  })

  it('empties Do’s completed lane once the user hides completed-today, without touching the query', () => {
    const finishedToday = {
      ...endeavorMocks.completedWithPerformances,
      completed: new Date(2026, 0, 15, 8, 30, 0),
    }
    const shown = applyVista(EndeavorsVistas.doTab, [finishedToday], MOCK_NOW)
    expect(idsOf(shown)).toEqual(['endeavor-completed-performances'])

    const hidden = vistaWithLens(
      EndeavorsVistas.doTab,
      makeEndeavorsLens({
        showArchived: true,
        hiddenComputedStates: [EndeavorComputedState.completedToday],
      }),
    )
    expect(applyQuery(hidden.query, [finishedToday], MOCK_NOW)).toHaveLength(1)
    expect(applyVista(hidden, [finishedToday], MOCK_NOW)).toEqual([])
  })

  it('gives the Inbox exactly the pending tasks and nothing else', () => {
    expect(
      idsOf(applyVista(EndeavorsVistas.inbox, everything, MOCK_NOW)),
    ).toEqual(['endeavor-bare-draft'])
  })

  it('gives Plan the day’s events', () => {
    expect(
      idsOf(applyVista(EndeavorsVistas.planDay, everything, MOCK_NOW)),
    ).toEqual(['endeavor-today-event'])
  })

  it('distinguishes "no data" from "filters hid everything" by which stage emptied it', () => {
    const impossible = vistaWithLens(
      EndeavorsVistas.find,
      makeEndeavorsLens({ searchQuery: 'no such endeavor' }),
    )
    expect(applyQuery(impossible.query, everything, MOCK_NOW)).not.toHaveLength(
      0,
    )
    expect(applyVista(impossible, everything, MOCK_NOW)).toEqual([])
  })
})
