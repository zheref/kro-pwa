/**
 * The registry-vs-canon suite. Every assertion here is transcribed from
 * `KroCore/Vistas/EndeavorsVistas.swift` at `zheref/KroApple@2c1ee45`: three
 * tests per entry at minimum — its query shape, its capability order, its lens
 * `exposes` set — plus the cross-cutting invariants that make the registry a
 * registry.
 */
import { describe, expect, it } from 'vitest'
import { CardVariant, Density } from '../PresentationStyle'
import { EndeavorGroupingCriteria } from '../EndeavorCriteria'
import { UserFilter } from '../EndeavorsLens'
import type { EndeavorsVista } from '../EndeavorsVista'
import { EndeavorsVistas, fixedEndeavorsVistas } from '../EndeavorsVistas'
import { requiredFlagsOf } from '../EndeavorCapabilities'

/** `operation@gesture` per binding, in declaration order — the swipe order. */
const capabilityOrder = (vista: EndeavorsVista): readonly string[] =>
  vista.capabilities.operations.map(
    (binding) => `${binding.operation}@${binding.gesture.kind}`,
  )

const exposesOf = (vista: EndeavorsVista): readonly string[] =>
  [...vista.lens.exposes].sort()

const setValues = <T>(values: ReadonlySet<T> | null): readonly T[] | null =>
  values === null ? null : [...values].sort()

/** The capability set every Tasks-tab variant shares. */
const TASKS_CAPABILITY_ORDER = [
  'markComplete@swipeTrailing',
  'delete@swipeTrailing',
  'startSession@contextMenu',
]

const TASKS_EXPOSES = ['grouping', 'search']

describe('find', () => {
  const vista = EndeavorsVistas.find

  it('queries everything — all hosts, all kinds, all statuses, no window', () => {
    expect(vista.id).toBe('find')
    expect(vista.title).toBe('Find')
    expect(vista.query.hosts).toBeNull()
    expect(vista.query.kinds).toBeNull()
    expect(vista.query.statuses).toBeNull()
    expect(vista.query.lists).toBeNull()
    expect(vista.query.dateRange).toBeNull()
    expect(vista.query.predicates).toBeNull()
    expect(vista.query.includeArchived).toBe(false)
  })

  it('binds Start then Edit leading, Delete then Archive trailing, Detail on tap AND long-press — that order IS the button order', () => {
    expect(capabilityOrder(vista)).toEqual([
      'startSession@swipeLeading',
      'edit@swipeLeading',
      'delete@swipeTrailing',
      'archive@swipeTrailing',
      'viewDetail@tap',
      // The long-press half of the same operation (KC-IS-#71 item 12): a
      // whole-row tap is undiscoverable and unreachable without a pointer.
      'viewDetail@contextMenu',
    ])
  })

  it('exposes the five toggles its filter sheet shows, and no grouping control', () => {
    expect(exposesOf(vista)).toEqual([
      'hosts',
      'kinds',
      'search',
      'showArchived',
      'statuses',
    ])
    expect(vista.lens.exposes.has(UserFilter.grouping)).toBe(false)
  })

  it('tints Start green, Edit blue and Archive orange, leaving Delete to the destructive default', () => {
    const tints = vista.capabilities.operations.map((binding) => binding.tint)
    expect(tints).toEqual(['green', 'blue', null, 'orange', null, null])
  })

  it('dark-launches the Detail tap behind `endeavorDetail`, and gates nothing else', () => {
    expect(requiredFlagsOf(vista.capabilities)).toEqual(['endeavorDetail'])
  })

  it('renders standard rows at regular density, uncapped', () => {
    expect(vista.presentation).toEqual({
      cardVariant: CardVariant.standardRow,
      density: Density.regular,
      itemLimit: null,
    })
  })
})

describe('tasksDefault', () => {
  const vista = EndeavorsVistas.tasksDefault

  it('queries tasks only, with no time bound and no list scope', () => {
    expect(vista.id).toBe('tasks.default')
    expect(vista.title).toBeNull()
    expect(setValues(vista.query.kinds)).toEqual(['task'])
    expect(vista.query.lists).toBeNull()
    expect(vista.query.dateRange).toBeNull()
    expect(vista.query.predicates).toBeNull()
  })

  it('carries the shared Tasks capability order', () => {
    expect(capabilityOrder(vista)).toEqual(TASKS_CAPABILITY_ORDER)
  })

  it('exposes search and grouping only, grouped by status by default', () => {
    expect(exposesOf(vista)).toEqual(TASKS_EXPOSES)
    expect(vista.lens.grouping).toBe(EndeavorGroupingCriteria.status)
  })

  it('caps each group at seven rows until one is expanded', () => {
    expect(vista.presentation.itemLimit).toBe(7)
  })
})

describe('tasksToday', () => {
  const vista = EndeavorsVistas.tasksToday

  it('narrows to today with a PREDICATE, not a date range — the range would narrow the fetch instead', () => {
    expect(vista.id).toBe('tasks.today')
    expect(setValues(vista.query.kinds)).toEqual(['task'])
    expect(setValues(vista.query.predicates)).toEqual(['isDueToday'])
    expect(vista.query.dateRange).toBeNull()
  })

  it('carries the shared Tasks capability order', () => {
    expect(capabilityOrder(vista)).toEqual(TASKS_CAPABILITY_ORDER)
  })

  it('exposes search and grouping, but groups by section of day rather than status', () => {
    expect(exposesOf(vista)).toEqual(TASKS_EXPOSES)
    expect(vista.lens.grouping).toBe(EndeavorGroupingCriteria.dueSection)
  })

  it('shares the Tasks presentation, seven-row cap included', () => {
    expect(vista.presentation).toEqual(
      EndeavorsVistas.tasksDefault.presentation,
    )
  })
})

describe('tasksForList', () => {
  const vista = EndeavorsVistas.tasksForList('project-finances')

  it('scopes tasks to the one list id it was handed', () => {
    expect(setValues(vista.query.kinds)).toEqual(['task'])
    expect(setValues(vista.query.lists)).toEqual(['project-finances'])
  })

  it('carries the shared Tasks capability order', () => {
    expect(capabilityOrder(vista)).toEqual(TASKS_CAPABILITY_ORDER)
  })

  it('exposes search and grouping, grouped by status', () => {
    expect(exposesOf(vista)).toEqual(TASKS_EXPOSES)
    expect(vista.lens.grouping).toBe(EndeavorGroupingCriteria.status)
  })

  it('gives each list its own vista id, so each list keeps its own saved lens', () => {
    expect(vista.id).toBe('tasks.list.project-finances')
    expect(EndeavorsVistas.tasksForList('reminders-errands').id).toBe(
      'tasks.list.reminders-errands',
    )
  })

  it('is a factory, not a shared value — two calls do not alias one vista', () => {
    expect(EndeavorsVistas.tasksForList('a')).not.toBe(
      EndeavorsVistas.tasksForList('a'),
    )
  })
})

describe('tasksForSearch', () => {
  const vista = EndeavorsVistas.tasksForSearch('groceries')

  it('queries all tasks — the search is not a query term', () => {
    expect(vista.id).toBe('tasks.search')
    expect(setValues(vista.query.kinds)).toEqual(['task'])
    expect(vista.query.lists).toBeNull()
    expect(vista.query.predicates).toBeNull()
  })

  it('carries the shared Tasks capability order', () => {
    expect(capabilityOrder(vista)).toEqual(TASKS_CAPABILITY_ORDER)
  })

  it('seeds the LENS with the search text so the user can refine or clear it', () => {
    expect(vista.lens.searchQuery).toBe('groceries')
    expect(exposesOf(vista)).toEqual(TASKS_EXPOSES)
  })

  it('keeps one id for every search, because the surface is one screen', () => {
    expect(EndeavorsVistas.tasksForSearch('anything').id).toBe('tasks.search')
  })
})

describe('inbox', () => {
  const vista = EndeavorsVistas.inbox

  it('queries pending tasks only — the triage backlog', () => {
    expect(vista.id).toBe('inbox')
    expect(vista.title).toBe('Inbox')
    expect(setValues(vista.query.kinds)).toEqual(['task'])
    expect(setValues(vista.query.statuses)).toEqual(['pending'])
    expect(vista.query.includeArchived).toBe(false)
  })

  it('binds Complete then Delete on the trailing swipe, and nothing else', () => {
    expect(capabilityOrder(vista)).toEqual([
      'markComplete@swipeTrailing',
      'delete@swipeTrailing',
    ])
  })

  it('omits Triage from capabilities on purpose — it is an in-row button, not a gesture', () => {
    expect(capabilityOrder(vista)).not.toContain('triage@tap')
  })

  it('exposes NO toggle at all: there is nothing to narrow, so nothing to persist', () => {
    expect(exposesOf(vista)).toEqual([])
  })

  it('renders standard rows at compact density', () => {
    expect(vista.presentation).toEqual({
      cardVariant: CardVariant.standardRow,
      density: Density.compact,
      itemLimit: null,
    })
  })
})

describe('planDay', () => {
  const vista = EndeavorsVistas.planDay

  it('queries today’s calendar events', () => {
    expect(vista.id).toBe('plan.day')
    expect(vista.title).toBeNull()
    expect(setValues(vista.query.kinds)).toEqual(['calendarEvent'])
    expect(vista.query.dateRange).toEqual({ kind: 'today' })
    expect(vista.query.includeArchived).toBe(false)
  })

  it('binds Start Session and Delete on both a swipe and the context menu, plus Detail on both', () => {
    expect(capabilityOrder(vista)).toEqual([
      'startSession@swipeLeading',
      'delete@swipeTrailing',
      'startSession@contextMenu',
      'delete@contextMenu',
      'viewDetail@tap',
      'viewDetail@contextMenu',
    ])
  })

  it('gates both halves of Detail on the same flag, so they appear together', () => {
    // A menu row for an operation the tap cannot perform would be the worse of
    // the two inconsistencies (KC-IS-#71 item 12).
    const detail = vista.capabilities.operations.filter(
      (binding) => binding.operation === 'viewDetail',
    )
    expect(detail).toHaveLength(2)
    expect(
      detail.every((binding) => binding.requires === 'endeavorDetail'),
    ).toBe(true)
  })

  it('binds no Edit — canon has no endeavor editor, so a tap-to-edit would do nothing', () => {
    expect(
      vista.capabilities.operations.some(
        (binding) => binding.operation === 'edit',
      ),
    ).toBe(false)
  })

  it('exposes calendars and computed states alongside kinds and hosts, but no search', () => {
    expect(exposesOf(vista)).toEqual([
      'calendars',
      'computedStates',
      'hosts',
      'kinds',
    ])
    expect(vista.lens.exposes.has(UserFilter.search)).toBe(false)
  })

  it('groups by section of day and keeps archived items out', () => {
    expect(vista.lens.grouping).toBe(EndeavorGroupingCriteria.dueSection)
    expect(vista.lens.showArchived).toBe(false)
  })

  it('renders timeline blocks', () => {
    expect(vista.presentation.cardVariant).toBe(CardVariant.timelineBlock)
  })
})

describe('doTab', () => {
  const vista = EndeavorsVistas.doTab

  it('fetches today’s tasks, reminders, events and habits in ONE query', () => {
    expect(vista.id).toBe('do.tab')
    expect(setValues(vista.query.kinds)).toEqual([
      'calendarEvent',
      'habit',
      'reminder',
      'task',
    ])
    expect(vista.query.dateRange).toEqual({ kind: 'today' })
  })

  it('asks for archived items so the completed-today lane survives a refetch', () => {
    expect(vista.query.includeArchived).toBe(true)
    expect(vista.lens.showArchived).toBe(true)
  })

  it('binds Complete on tap, Defer in the menu, Delete and Dismiss trailing, Execute in the prep overlay', () => {
    expect(capabilityOrder(vista)).toEqual([
      'markComplete@tap',
      'defer@contextMenu',
      'delete@swipeTrailing',
      'execute@prepOverlay',
      'dismissSuggestion@swipeTrailing',
    ])
  })

  it('exposes kinds, hosts, computed states and calendars — the Do filter sheet', () => {
    expect(exposesOf(vista)).toEqual([
      'calendars',
      'computedStates',
      'hosts',
      'kinds',
    ])
  })

  it('is ONE vista: the lanes are computed downstream, so there is no per-lane entry', () => {
    const laneIds = fixedEndeavorsVistas
      .map((entry) => entry.id)
      .filter((id) => id.startsWith('do.'))
    expect(laneIds).toEqual(['do.tab'])
  })
})

describe('registry invariants', () => {
  it('lists the six fixed entries; the two parameterized ones have no single value', () => {
    expect(fixedEndeavorsVistas.map((vista) => vista.id)).toEqual([
      'find',
      'tasks.default',
      'tasks.today',
      'inbox',
      'plan.day',
      'do.tab',
    ])
  })

  it('gives every fixed entry a distinct id, since the id keys its saved lens', () => {
    const ids = fixedEndeavorsVistas.map((vista) => vista.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gates only the two Detail taps across the whole registry', () => {
    const gated = fixedEndeavorsVistas.filter(
      (vista) => requiredFlagsOf(vista.capabilities).length > 0,
    )
    expect(gated.map((vista) => vista.id)).toEqual(['find', 'plan.day'])
  })

  it('declares no sort parameters anywhere — canon ships every vista with an empty sort', () => {
    for (const vista of fixedEndeavorsVistas) {
      expect(vista.lens.sort).toEqual([])
    }
  })

  it('starts every entry with an unfiltered lens, bar the two Do/archive flags', () => {
    for (const vista of fixedEndeavorsVistas) {
      expect(vista.lens.hiddenKinds.size).toBe(0)
      expect(vista.lens.hiddenHosts.size).toBe(0)
      expect(vista.lens.hiddenStatuses.size).toBe(0)
      expect(vista.lens.hiddenComputedStates.size).toBe(0)
      expect(vista.lens.hiddenCalendarIds.size).toBe(0)
      expect(vista.lens.searchQuery).toBe('')
    }
  })

  it('shares one capability set across every Tasks variant, so one edit updates them all', () => {
    expect(EndeavorsVistas.tasksDefault.capabilities).toBe(
      EndeavorsVistas.tasksToday.capabilities,
    )
    expect(EndeavorsVistas.tasksForList('x').capabilities).toBe(
      EndeavorsVistas.tasksDefault.capabilities,
    )
    expect(EndeavorsVistas.tasksForSearch('x').capabilities).toBe(
      EndeavorsVistas.tasksDefault.capabilities,
    )
  })
})
