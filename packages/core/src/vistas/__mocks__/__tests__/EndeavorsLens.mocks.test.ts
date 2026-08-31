import { describe, expect, it } from 'vitest'
import {
  MOCK_NOW,
  allEndeavorMocks,
} from '../../../domain/endeavor/__mocks__/Endeavor.mocks'
import { ALL_USER_FILTERS, applyLens } from '../../EndeavorsLens'
import {
  decodeLensSnapshot,
  encodeLensSnapshot,
} from '../../EndeavorsLensSnapshot'
import {
  allEndeavorsLensMocks,
  allEndeavorsLensSnapshotMocks,
  endeavorsLensMocks,
  endeavorsLensSnapshotMocks,
} from '../EndeavorsLens.mocks'

describe('the lens fixture spread', () => {
  it('ships nine variants, past `RC-13`’s floor of seven', () => {
    expect(allEndeavorsLensMocks.length).toBeGreaterThanOrEqual(7)
    expect(allEndeavorsLensMocks).toHaveLength(9)
  })

  it('covers every user-mutable axis at least once', () => {
    expect(endeavorsLensMocks.tasksHidden.hiddenKinds.size).toBeGreaterThan(0)
    expect(endeavorsLensMocks.googleHidden.hiddenHosts.size).toBeGreaterThan(0)
    expect(
      endeavorsLensMocks.everythingHidden.hiddenStatuses.size,
    ).toBeGreaterThan(0)
    expect(
      endeavorsLensMocks.doComputedHidden.hiddenComputedStates.size,
    ).toBeGreaterThan(0)
    expect(
      endeavorsLensMocks.everythingHidden.hiddenCalendarIds.size,
    ).toBeGreaterThan(0)
    expect(endeavorsLensMocks.searchOnly.searchQuery).not.toBe('')
    expect(endeavorsLensMocks.showArchived.showArchived).toBe(true)
    expect(endeavorsLensMocks.groupedByHost.grouping).toBe('host')
  })

  it('carries the read-only variant that pins the Inbox’s empty `exposes`', () => {
    expect(endeavorsLensMocks.readOnly.exposes.size).toBe(0)
    expect(endeavorsLensMocks.default.exposes).toEqual(ALL_USER_FILTERS)
  })
})

describe('the convenient fixtures narrow without emptying', () => {
  it('leaves something visible for each of the three', () => {
    for (const lens of [
      endeavorsLensMocks.default,
      endeavorsLensMocks.tasksHidden,
      endeavorsLensMocks.googleHidden,
    ]) {
      expect(
        applyLens(lens, allEndeavorMocks, MOCK_NOW).length,
      ).toBeGreaterThan(0)
    }
  })
})

describe('the inconvenient fixture really is inconvenient', () => {
  it('narrows the whole fixture set to empty — the filter-driven empty state', () => {
    expect(
      applyLens(
        endeavorsLensMocks.everythingHidden,
        allEndeavorMocks,
        MOCK_NOW,
      ),
    ).toEqual([])
  })

  it('does so by more than one term at once, which is the stress part', () => {
    const lens = endeavorsLensMocks.everythingHidden
    expect(lens.hiddenKinds.size).toBe(6)
    expect(lens.hiddenHosts.size).toBe(6)
    expect(lens.searchQuery).toBe('impossible match')
  })
})

describe('the snapshot fixture spread', () => {
  it('ships seven variants, `RC-13`’s floor exactly', () => {
    expect(allEndeavorsLensSnapshotMocks).toHaveLength(7)
  })

  it('round-trips every one through the codec unchanged', () => {
    for (const snapshot of allEndeavorsLensSnapshotMocks) {
      expect(
        decodeLensSnapshot(encodeLensSnapshot(snapshot))?.snapshot,
      ).toEqual(snapshot)
    }
  })

  it('carries a default variant that is genuinely all-defaults', () => {
    const snapshot = endeavorsLensSnapshotMocks.default
    expect(snapshot.hiddenKinds.size).toBe(0)
    expect(snapshot.searchQuery).toBe('')
    expect(snapshot.showArchived).toBe(false)
    expect(snapshot.grouping).toBe('status')
  })

  it('gives each snapshot fixture a distinct shape', () => {
    const shapes = allEndeavorsLensSnapshotMocks.map((snapshot) =>
      JSON.stringify(encodeLensSnapshot(snapshot)),
    )
    expect(new Set(shapes).size).toBe(shapes.length)
  })
})
