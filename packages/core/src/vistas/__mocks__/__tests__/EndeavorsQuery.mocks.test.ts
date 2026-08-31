import { describe, expect, it } from 'vitest'
import { resolveDateRange } from '../../DateRangeSpec'
import {
  allEndeavorsQueryMocks,
  endeavorsQueryMocks,
} from '../EndeavorsQuery.mocks'

const NOW = new Date(2026, 0, 15, 9, 0, 0)

describe('the query fixture spread', () => {
  it('ships eight variants, past `RC-13`’s floor of seven', () => {
    expect(allEndeavorsQueryMocks.length).toBeGreaterThanOrEqual(7)
    expect(allEndeavorsQueryMocks).toHaveLength(8)
  })

  it('spans the axes a query has: hosts, kinds, lists, window and the archive flag', () => {
    expect(endeavorsQueryMocks.localTasksOnly.hosts).not.toBeNull()
    expect(endeavorsQueryMocks.allTasks.kinds).not.toBeNull()
    expect(endeavorsQueryMocks.specificList.lists).not.toBeNull()
    expect(endeavorsQueryMocks.todayEvents.dateRange).not.toBeNull()
    expect(endeavorsQueryMocks.includingArchived.includeArchived).toBe(true)
  })

  it('leaves `everything` genuinely unconstrained, so it is a usable baseline', () => {
    const query = endeavorsQueryMocks.everything
    expect(query.hosts).toBeNull()
    expect(query.kinds).toBeNull()
    expect(query.statuses).toBeNull()
    expect(query.includeArchived).toBe(false)
  })
})

describe('the reversed-range fixture', () => {
  it('really is reversed, which is what makes it inconvenient', () => {
    const range = endeavorsQueryMocks.reversedRange.dateRange
    expect(range?.kind).toBe('absolute')
    if (range?.kind === 'absolute') {
      expect(range.from.getTime()).toBeGreaterThan(range.to.getTime())
    }
  })

  it('resolves to an empty window rather than a backwards fetch', () => {
    const { start, end } = resolveDateRange(
      endeavorsQueryMocks.reversedRange.dateRange,
      NOW,
    )
    expect(start).toEqual(end)
  })

  it('uses the same instants canon’s fixture pins, in milliseconds', () => {
    const range = endeavorsQueryMocks.reversedRange.dateRange
    if (range?.kind === 'absolute') {
      expect(range.from.getTime()).toBe(2_000_000)
      expect(range.to.getTime()).toBe(1_000_000)
    }
  })
})

describe('fixture hygiene', () => {
  it('reads no clock — every fixture is byte-identical on a second import', async () => {
    const reimported = await import('../EndeavorsQuery.mocks')
    expect(reimported.endeavorsQueryMocks).toEqual(endeavorsQueryMocks)
  })

  it('gives each fixture a distinct shape, so none is a redundant copy', () => {
    const shapes = allEndeavorsQueryMocks.map((query) =>
      JSON.stringify({
        hosts: query.hosts === null ? null : [...query.hosts].sort(),
        kinds: query.kinds === null ? null : [...query.kinds].sort(),
        lists: query.lists === null ? null : [...query.lists].sort(),
        dateRange: query.dateRange,
        includeArchived: query.includeArchived,
      }),
    )
    expect(new Set(shapes).size).toBe(shapes.length)
  })
})
