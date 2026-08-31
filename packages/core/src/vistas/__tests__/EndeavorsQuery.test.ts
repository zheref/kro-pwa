import { describe, expect, it } from 'vitest'
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { todayDateRange } from '../DateRangeSpec'
import { EndeavorPredicate } from '../EndeavorPredicate'
import {
  everythingEndeavorsQuery,
  makeEndeavorsQuery,
  queryIncludingLocalMirrorSource,
  queryRequestingHosts,
} from '../EndeavorsQuery'

describe('makeEndeavorsQuery defaults', () => {
  it('leaves every axis unconstrained when nothing is asked for', () => {
    const query = makeEndeavorsQuery()
    expect(query.hosts).toBeNull()
    expect(query.kinds).toBeNull()
    expect(query.statuses).toBeNull()
    expect(query.lists).toBeNull()
    expect(query.dateRange).toBeNull()
    expect(query.predicates).toBeNull()
  })

  it('excludes archived items by default — a screen opts in, never out', () => {
    expect(makeEndeavorsQuery().includeArchived).toBe(false)
  })

  it('`everything` is that same unconstrained query', () => {
    expect(everythingEndeavorsQuery).toEqual(makeEndeavorsQuery())
  })

  it('keeps `null` (no constraint) distinct from an empty set (constrain to nothing)', () => {
    expect(makeEndeavorsQuery({ kinds: [] }).kinds).toEqual(new Set())
    expect(makeEndeavorsQuery({ kinds: null }).kinds).toBeNull()
  })
})

describe('makeEndeavorsQuery normalization', () => {
  it('accepts an array literal at the call site and stores a Set', () => {
    const query = makeEndeavorsQuery({
      kinds: [EndeavorKind.task, EndeavorKind.habit],
    })
    expect(query.kinds).toEqual(
      new Set([EndeavorKind.task, EndeavorKind.habit]),
    )
  })

  it('collapses a repeated member, as a Swift Set literal would', () => {
    const query = makeEndeavorsQuery({
      statuses: [EndeavorStatus.pending, EndeavorStatus.pending],
    })
    expect(query.statuses?.size).toBe(1)
  })

  it('carries a date range and a predicate set side by side', () => {
    const query = makeEndeavorsQuery({
      dateRange: todayDateRange,
      predicates: [EndeavorPredicate.isDueToday],
    })
    expect(query.dateRange).toEqual({ kind: 'today' })
    expect(query.predicates).toEqual(new Set(['isDueToday']))
  })
})

describe('queryRequestingHosts', () => {
  it('narrows the host set while preserving every other axis', () => {
    const original = makeEndeavorsQuery({
      kinds: [EndeavorKind.calendarEvent],
      dateRange: todayDateRange,
      includeArchived: true,
    })
    const narrowed = queryRequestingHosts(original, [
      EndeavorHost.googleCalendar,
    ])
    expect(narrowed.hosts).toEqual(new Set([EndeavorHost.googleCalendar]))
    expect(narrowed.kinds).toEqual(original.kinds)
    expect(narrowed.dateRange).toEqual(original.dateRange)
    expect(narrowed.includeArchived).toBe(true)
  })

  it('widens back to every host when handed null', () => {
    const scoped = makeEndeavorsQuery({ hosts: [EndeavorHost.local] })
    expect(queryRequestingHosts(scoped, null).hosts).toBeNull()
  })

  it('leaves the original query untouched', () => {
    const original = makeEndeavorsQuery({ hosts: [EndeavorHost.local] })
    queryRequestingHosts(original, [EndeavorHost.supabase])
    expect(original.hosts).toEqual(new Set([EndeavorHost.local]))
  })
})

describe('queryIncludingLocalMirrorSource', () => {
  it('adds the local mirror when an external host is being refreshed', () => {
    const external = makeEndeavorsQuery({
      hosts: [EndeavorHost.googleCalendar],
      kinds: [EndeavorKind.calendarEvent],
    })
    expect(queryIncludingLocalMirrorSource(external).hosts).toEqual(
      new Set([EndeavorHost.googleCalendar, EndeavorHost.local]),
    )
  })

  it('returns an unrestricted query unchanged, rather than pinning it to two hosts', () => {
    const unrestricted = makeEndeavorsQuery()
    expect(queryIncludingLocalMirrorSource(unrestricted)).toBe(unrestricted)
  })

  it('returns a Kro-only query unchanged — there is no external mirror to reconcile', () => {
    const kroOnly = makeEndeavorsQuery({
      hosts: [EndeavorHost.supabase, EndeavorHost.local],
    })
    expect(queryIncludingLocalMirrorSource(kroOnly)).toBe(kroOnly)
  })

  it('is idempotent: a query already carrying local gains nothing on a second pass', () => {
    const once = queryIncludingLocalMirrorSource(
      makeEndeavorsQuery({ hosts: [EndeavorHost.appleReminders] }),
    )
    expect(queryIncludingLocalMirrorSource(once).hosts).toEqual(once.hosts)
  })
})
