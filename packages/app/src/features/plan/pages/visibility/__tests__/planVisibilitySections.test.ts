/**
 * The exposes-driven section list.
 *
 * The assertion that carries acceptance criterion 3 is the first one: the
 * shipped `.planDay` vista is read, not a hand-built lens, so the panel and the
 * registry cannot drift apart without this suite going red.
 */
import {
  EndeavorsVistas,
  UserFilter,
  makeEndeavorsLens,
  userFilters,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  ALL_PLAN_VISIBILITY_FILTERS,
  PLAN_VISIBILITY_FILTER_ORDER,
  PLAN_VISIBILITY_SUPPORTED_FILTERS,
  planVisibilityFilterTitle,
  planVisibilitySections,
} from '../planVisibilitySections'

describe('PLAN_VISIBILITY_FILTER_ORDER', () => {
  it('is total over UserFilter — a new domain filter cannot slip past unlisted', () => {
    expect([...PLAN_VISIBILITY_FILTER_ORDER].sort()).toEqual(
      [...ALL_PLAN_VISIBILITY_FILTERS].sort(),
    )
    expect(PLAN_VISIBILITY_FILTER_ORDER).toHaveLength(userFilters.length)
  })

  it('lists each filter exactly once', () => {
    expect(new Set(PLAN_VISIBILITY_FILTER_ORDER).size).toBe(
      PLAN_VISIBILITY_FILTER_ORDER.length,
    )
  })

  it('opens with canon sheet order — Search, State, Kind, Calendars, Hosts', () => {
    expect(PLAN_VISIBILITY_FILTER_ORDER.slice(0, 5)).toEqual([
      UserFilter.search,
      UserFilter.computedStates,
      UserFilter.kinds,
      UserFilter.calendars,
      UserFilter.hosts,
    ])
  })
})

describe('planVisibilitySections against the SHIPPED Plan vista', () => {
  const sections = planVisibilitySections(EndeavorsVistas.planDay.lens)

  it('draws exactly the four families `.planDay` declares', () => {
    expect(sections.map((section) => section.filter)).toEqual([
      UserFilter.computedStates,
      UserFilter.kinds,
      UserFilter.calendars,
      UserFilter.hosts,
    ])
  })

  it('draws NO search, archived or grouping control — the vista declares none', () => {
    const drawn = sections.map((section) => section.filter)
    expect(drawn).not.toContain(UserFilter.search)
    expect(drawn).not.toContain(UserFilter.showArchived)
    expect(drawn).not.toContain(UserFilter.grouping)
    expect(drawn).not.toContain(UserFilter.statuses)
  })

  it('can dispatch a toggle for every family it draws', () => {
    expect(sections.every((section) => section.isSupported)).toBe(true)
  })

  it('titles the four families as the shipped panel already titles three', () => {
    expect(sections.map((section) => section.title)).toEqual([
      'Show',
      'Kinds',
      'Calendars',
      'Sources',
    ])
  })
})

describe('planVisibilitySections in general', () => {
  it('draws nothing for a vista that exposes nothing — a read-only surface', () => {
    expect(planVisibilitySections(makeEndeavorsLens({ exposes: [] }))).toEqual([])
  })

  it('honours canon order even when the lens declares them out of order', () => {
    const lens = makeEndeavorsLens({
      exposes: [UserFilter.hosts, UserFilter.kinds],
    })
    expect(planVisibilitySections(lens).map((s) => s.filter)).toEqual([
      UserFilter.kinds,
      UserFilter.hosts,
    ])
  })

  it('marks a declared family this surface cannot dispatch as unsupported', () => {
    const lens = makeEndeavorsLens({ exposes: [UserFilter.grouping] })
    expect(planVisibilitySections(lens)).toEqual([
      { filter: UserFilter.grouping, title: 'Group by', isSupported: false },
    ])
  })

  it('names every filter, so no section is ever drawn headless', () => {
    for (const filter of userFilters) {
      expect(planVisibilityFilterTitle(filter).length).toBeGreaterThan(0)
    }
  })

  it('supports exactly the four axis-backed families this surface can toggle', () => {
    expect([...PLAN_VISIBILITY_SUPPORTED_FILTERS].sort()).toEqual(
      [
        UserFilter.calendars,
        UserFilter.computedStates,
        UserFilter.hosts,
        UserFilter.kinds,
      ].sort(),
    )
  })
})
