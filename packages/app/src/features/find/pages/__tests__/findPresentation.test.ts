/**
 * The presentation model is pure, so it is asserted without a surface: the chip
 * rows against the DOMAIN's own lists (not a transcribed copy), the four empty
 * messages against canon's strings, and the row projection against the fixtures
 * `#29` already ships.
 */
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  endeavorHosts,
  endeavorKinds,
  endeavorStatuses,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { findEndeavorMocks } from '../../FindMocks'
import {
  ARCHIVED_CHIP,
  findEmptyCopy,
  findFilterRows,
  findOverflowEntries,
  findRowBadges,
  findRowSymbol,
  findRowTimeInfo,
  isFilterChipSelected,
} from '../findPresentation'

const rowFor = (id: 'kind' | 'host' | 'status') => {
  const row = findFilterRows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`no ${id} row`)
  return row
}

const noneSelected = {
  kinds: [] as readonly EndeavorKind[],
  hosts: [] as readonly EndeavorHost[],
  statuses: [] as readonly EndeavorStatus[],
  showArchived: false,
}

describe('the filter rows are derived from the domain, never transcribed', () => {
  it('offers one chip per kind the domain declares — a new kind cannot go missing', () => {
    expect(rowFor('kind').chips.map((chip) => chip.id)).toEqual([
      ...endeavorKinds,
    ])
  })

  it('offers one chip per host, so a source the fetch can return is filterable', () => {
    expect(rowFor('host').chips.map((chip) => chip.id)).toEqual([
      ...endeavorHosts,
    ])
  })

  it('rides the Archived flag at the end of the status row, exactly as canon does', () => {
    const status = rowFor('status')
    expect(status.chips.slice(0, -1).map((chip) => chip.id)).toEqual([
      ...endeavorStatuses,
    ])
    expect(status.chips.at(-1)).toBe(ARCHIVED_CHIP)
  })

  it('gives every chip a glyph and a label, so colour is never the only signal', () => {
    for (const row of findFilterRows) {
      for (const chip of row.chips) {
        expect(chip.label.length).toBeGreaterThan(0)
        expect(chip.icon.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('a chip reads as selected when its value is NOT hidden', () => {
  it('shows Task selected once the user has un-hidden it', () => {
    const chip = rowFor('kind').chips.find(
      (each) => each.id === EndeavorKind.task,
    )
    if (chip === undefined) throw new Error('no Task chip')
    expect(
      isFilterChipSelected(chip, {
        ...noneSelected,
        kinds: [EndeavorKind.task],
      }),
    ).toBe(true)
  })

  it('shows a host chip unselected when the lens hides that host', () => {
    const chip = rowFor('host').chips[0]
    if (chip === undefined) throw new Error('no host chip')
    expect(isFilterChipSelected(chip, noneSelected)).toBe(false)
  })

  it('reads the Archived chip from the lens flag, not from a hidden set', () => {
    expect(isFilterChipSelected(ARCHIVED_CHIP, noneSelected)).toBe(false)
    expect(
      isFilterChipSelected(ARCHIVED_CHIP, {
        ...noneSelected,
        showArchived: true,
      }),
    ).toBe(true)
  })
})

describe('the four empty states are four different sentences', () => {
  it('tells a first-run user there is nothing to browse yet', () => {
    expect(findEmptyCopy({ kind: 'noData' })).toMatchObject({
      title: 'No Endeavors Yet',
      message: "Add tasks, events, or habits and they'll appear here.",
    })
  })

  it('tells a user who turned every chip off why the list is blank', () => {
    expect(findEmptyCopy({ kind: 'noFilters' }).title).toBe(
      'No Filters Selected',
    )
  })

  it('quotes the query back when a search matched nothing', () => {
    expect(findEmptyCopy({ kind: 'noResults', query: 'tax' }).message).toBe(
      'No endeavors match "tax" with the current filters.',
    )
  })

  it('distinguishes "filters hid everything" from "there is nothing"', () => {
    expect(findEmptyCopy({ kind: 'filteredOut' }).title).toBe('Nothing Here')
    expect(findEmptyCopy({ kind: 'filteredOut' }).title).not.toBe(
      findEmptyCopy({ kind: 'noData' }).title,
    )
  })
})

describe('the row projection', () => {
  it('lifts a leading emoji out of the title and draws it as the symbol', () => {
    expect(findRowSymbol('📊 Prepare quarterly slides')).toEqual({
      symbol: '📊',
      isGeneric: false,
      title: 'Prepare quarterly slides',
    })
  })

  it('falls back to a generic glyph when the title has no emoji', () => {
    const lead = findRowSymbol('Review the auth flow PR')
    expect(lead.isGeneric).toBe(true)
    expect(lead.title).toBe('Review the auth flow PR')
  })

  it('reads a started event with a duration as a time RANGE', () => {
    const info = findRowTimeInfo(findEndeavorMocks.teamSync)
    expect(info?.kind).toBe('timeRange')
  })

  it('reads a due-dated task as a due time carrying its duration', () => {
    const info = findRowTimeInfo(findEndeavorMocks.morningTask)
    expect(info).toMatchObject({ kind: 'dueTime' })
  })

  it('prints no time at all for an undated, unmeasured endeavor', () => {
    expect(findRowTimeInfo(findEndeavorMocks.undatedTask)).toBeUndefined()
  })

  it('badges every row with its kind and its status, which is canon\'s Find row', () => {
    expect(findRowBadges(findEndeavorMocks.afternoonTask)).toEqual([
      { kind: 'endeavorKind', value: EndeavorKind.task },
      { kind: 'status', value: EndeavorStatus.ongoing },
    ])
  })

  it('keeps a title that is nothing but an emoji from collapsing to a blank row', () => {
    const lead = findRowSymbol('🎯')
    expect(lead.symbol).toBe('🎯')
    expect(lead.title).toBe('')
  })

  it('projects a host-less endeavor without inventing one', () => {
    const hostless = makeEndeavor({
      id: 'x',
      title: 'Nowhere',
      kind: EndeavorKind.task,
      status: EndeavorStatus.pending,
      hostedBy: [EndeavorHost.local],
    })
    expect(findRowBadges(hostless)).toHaveLength(2)
  })
})

describe('the bulk menu counts what is visible', () => {
  it('prints the visible count in both labels, as canon does', () => {
    const entries = findOverflowEntries(4)
    expect(entries.map((entry) => entry.label)).toEqual([
      'Delete all visible (4)',
      'Archive all visible (4)',
    ])
  })

  it('marks only Delete destructive — the affordance canon relies on', () => {
    expect(findOverflowEntries(0).map((entry) => entry.isDestructive)).toEqual([
      true,
      false,
    ])
  })

  it('still offers both entries at zero, so the menu never changes shape', () => {
    expect(findOverflowEntries(0)).toHaveLength(2)
  })
})
