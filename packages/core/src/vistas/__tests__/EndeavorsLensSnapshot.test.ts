import { describe, expect, it } from 'vitest'
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import {
  allEndeavorsLensSnapshotMocks,
  endeavorsLensSnapshotMocks,
} from '../__mocks__/EndeavorsLens.mocks'
import { EndeavorComputedState } from '../EndeavorComputedState'
import { EndeavorGroupingCriteria } from '../EndeavorCriteria'
import {
  CURRENT_LENS_SNAPSHOT_VERSION,
  type LensSnapshotRecord,
  type LensSnapshotUpgrade,
  decodeLensSnapshot,
  encodeLensSnapshot,
  latestLensSnapshotVersion,
  lensSnapshotUpgrades,
  makeEndeavorsLensSnapshot,
  upgradeLensSnapshotRecord,
} from '../EndeavorsLensSnapshot'

/**
 * A save written before the `schemaVersion` key existed: no version stamp, and
 * no `hiddenComputedStates` (added later, additively, in canon's Phase 3).
 */
const PRE_VERSIONING_SAVE: LensSnapshotRecord = {
  hiddenKinds: ['task'],
  hiddenHosts: ['googleCalendar'],
  hiddenStatuses: ['pending'],
  hiddenCalendarIds: ['work-cal'],
  searchQuery: 'groceries',
  showArchived: true,
  grouping: 'host',
}

describe('the ladder and the version stamp agree', () => {
  it('upgrades to exactly the version this build writes', () => {
    expect(latestLensSnapshotVersion(lensSnapshotUpgrades)).toBe(
      CURRENT_LENS_SNAPSHOT_VERSION,
    )
  })

  it('ships one step today, because canon has made no breaking change yet', () => {
    expect(lensSnapshotUpgrades.map((step) => step.to)).toEqual([1])
  })

  it('states why each step exists — the reason is the reviewable part', () => {
    for (const step of lensSnapshotUpgrades) {
      expect(step.reason.length).toBeGreaterThan(0)
    }
  })
})

describe('an old save upgrades in place, exactly once, and round-trips thereafter', () => {
  it('reads a pre-versioning save as version 0 and runs the one pending step', () => {
    const decoded = decodeLensSnapshot(PRE_VERSIONING_SAVE)
    expect(decoded).not.toBeNull()
    expect(decoded?.storedVersion).toBe(0)
    expect(decoded?.upgradesApplied).toEqual([1])
  })

  it('produces the upgraded shape: every stored choice kept, the new field defaulted', () => {
    const decoded = decodeLensSnapshot(PRE_VERSIONING_SAVE)
    expect(decoded?.snapshot).toEqual(
      makeEndeavorsLensSnapshot({
        hiddenKinds: [EndeavorKind.task],
        hiddenHosts: [EndeavorHost.googleCalendar],
        hiddenStatuses: [EndeavorStatus.pending],
        hiddenComputedStates: [],
        hiddenCalendarIds: ['work-cal'],
        searchQuery: 'groceries',
        showArchived: true,
        grouping: EndeavorGroupingCriteria.host,
      }),
    )
  })

  it('re-encodes at the current version, so the save is no longer old', () => {
    const decoded = decodeLensSnapshot(PRE_VERSIONING_SAVE)
    const rewritten = encodeLensSnapshot(
      decoded?.snapshot ?? makeEndeavorsLensSnapshot(),
    )
    expect(rewritten.schemaVersion).toBe(CURRENT_LENS_SNAPSHOT_VERSION)
  })

  it('runs NO step on the second read — the upgrade happened once, not on every open', () => {
    const first = decodeLensSnapshot(PRE_VERSIONING_SAVE)
    const rewritten = encodeLensSnapshot(
      first?.snapshot ?? makeEndeavorsLensSnapshot(),
    )
    const second = decodeLensSnapshot(rewritten)
    expect(second?.storedVersion).toBe(CURRENT_LENS_SNAPSHOT_VERSION)
    expect(second?.upgradesApplied).toEqual([])
  })

  it('round-trips byte-for-byte from then on', () => {
    const first = decodeLensSnapshot(PRE_VERSIONING_SAVE)
    const once = encodeLensSnapshot(
      first?.snapshot ?? makeEndeavorsLensSnapshot(),
    )
    const twice = encodeLensSnapshot(
      decodeLensSnapshot(once)?.snapshot ?? makeEndeavorsLensSnapshot(),
    )
    expect(twice).toEqual(once)
  })
})

describe('the ladder chains a genuine breaking change', () => {
  /**
   * The rename `lensSnapshotUpgrades` does not ship, because canon has not
   * needed one. Injecting it here is what proves the machinery a real removal
   * or rename would use: `v2` renames `showArchived` to `includeArchived`, and
   * `v3` drops a since-retired key.
   */
  const without = (
    record: LensSnapshotRecord,
    key: string,
  ): LensSnapshotRecord =>
    Object.fromEntries(
      Object.entries(record).filter(([entryKey]) => entryKey !== key),
    )

  const renameStep: LensSnapshotUpgrade = {
    to: 2,
    reason: 'Renamed `showArchived` to `includeArchived`.',
    apply: (record) => ({
      ...without(record, 'showArchived'),
      includeArchived: record.showArchived,
    }),
  }
  const dropStep: LensSnapshotUpgrade = {
    to: 3,
    reason: 'Removed the retired `pinnedOnly` toggle.',
    apply: (record) => without(record, 'pinnedOnly'),
  }
  const ladder = [renameStep, dropStep]

  it('runs every pending step, in ascending version order', () => {
    const { record, applied } = upgradeLensSnapshotRecord(
      { showArchived: true, pinnedOnly: true, searchQuery: 'tax' },
      1,
      ladder,
    )
    expect(applied).toEqual([2, 3])
    expect(record).toEqual({ includeArchived: true, searchQuery: 'tax' })
  })

  it('runs only the steps newer than the stored version', () => {
    const { applied } = upgradeLensSnapshotRecord(
      { pinnedOnly: true },
      2,
      ladder,
    )
    expect(applied).toEqual([3])
  })

  it('runs nothing for a save already at the latest version', () => {
    const { record, applied } = upgradeLensSnapshotRecord(
      { includeArchived: true },
      3,
      ladder,
    )
    expect(applied).toEqual([])
    expect(record).toEqual({ includeArchived: true })
  })

  it('runs nothing for a save from a NEWER build than this one', () => {
    const { applied } = upgradeLensSnapshotRecord({}, 9, ladder)
    expect(applied).toEqual([])
  })

  it('applies the ladder out of declaration order without complaint', () => {
    const { applied } = upgradeLensSnapshotRecord({ pinnedOnly: true }, 1, [
      dropStep,
      renameStep,
    ])
    expect(applied).toEqual([2, 3])
  })

  it('never mutates the record it was handed', () => {
    const original = { showArchived: true, pinnedOnly: true }
    upgradeLensSnapshotRecord(original, 1, ladder)
    expect(original).toEqual({ showArchived: true, pinnedOnly: true })
  })
})

describe('additive change — no bump needed', () => {
  it('defaults a field the old save never wrote', () => {
    const decoded = decodeLensSnapshot({
      schemaVersion: 1,
      searchQuery: 'invoice',
    })
    expect(decoded?.upgradesApplied).toEqual([])
    expect(decoded?.snapshot.hiddenComputedStates).toEqual(new Set())
    expect(decoded?.snapshot.grouping).toBe(EndeavorGroupingCriteria.status)
  })

  it('ignores a key a NEWER build wrote and this one does not know', () => {
    const decoded = decodeLensSnapshot({
      schemaVersion: 1,
      searchQuery: 'invoice',
      pinnedOnly: true,
    })
    expect(decoded?.snapshot).toEqual(
      makeEndeavorsLensSnapshot({ searchQuery: 'invoice' }),
    )
  })
})

describe('decoding a hostile blob', () => {
  it('treats a non-object as "no snapshot" rather than throwing', () => {
    expect(decodeLensSnapshot('not json at all')).toBeNull()
    expect(decodeLensSnapshot(null)).toBeNull()
    expect(decodeLensSnapshot(42)).toBeNull()
    expect(decodeLensSnapshot([])).toBeNull()
  })

  it('drops an enum member no case answers to instead of losing the whole save', () => {
    const decoded = decodeLensSnapshot({
      schemaVersion: 1,
      hiddenKinds: ['task', 'sprint'],
      searchQuery: 'tax',
    })
    expect(decoded?.snapshot.hiddenKinds).toEqual(new Set([EndeavorKind.task]))
    expect(decoded?.snapshot.searchQuery).toBe('tax')
  })

  it('falls back to the default grouping when the stored one is gone', () => {
    const decoded = decodeLensSnapshot({
      schemaVersion: 1,
      grouping: 'project',
    })
    expect(decoded?.snapshot.grouping).toBe(EndeavorGroupingCriteria.status)
  })

  it('ignores a wrongly-typed value rather than storing it', () => {
    const decoded = decodeLensSnapshot({
      schemaVersion: 1,
      hiddenKinds: 'task',
      searchQuery: 12,
      showArchived: 'yes',
    })
    expect(decoded?.snapshot.hiddenKinds).toEqual(new Set())
    expect(decoded?.snapshot.searchQuery).toBe('')
    expect(decoded?.snapshot.showArchived).toBe(false)
  })

  it('treats a missing version stamp as pre-versioning, never as "current"', () => {
    expect(decodeLensSnapshot({ searchQuery: 'x' })?.storedVersion).toBe(0)
  })
})

describe('encoding', () => {
  it('always stamps the current version, whatever the value came from', () => {
    for (const snapshot of allEndeavorsLensSnapshotMocks) {
      expect(encodeLensSnapshot(snapshot).schemaVersion).toBe(
        CURRENT_LENS_SNAPSHOT_VERSION,
      )
    }
  })

  it('writes enum sets in canon `allCases` order, so two equal saves are identical text', () => {
    const record = encodeLensSnapshot(
      makeEndeavorsLensSnapshot({
        hiddenKinds: [EndeavorKind.task, EndeavorKind.habit],
        hiddenComputedStates: [
          EndeavorComputedState.completedToday,
          EndeavorComputedState.overdue,
        ],
      }),
    )
    expect(record.hiddenKinds).toEqual(['habit', 'task'])
    expect(record.hiddenComputedStates).toEqual(['overdue', 'completedToday'])
  })

  it('sorts free-form calendar ids so the written text is deterministic', () => {
    const record = encodeLensSnapshot(
      makeEndeavorsLensSnapshot({
        hiddenCalendarIds: ['work-cal', 'personal-cal'],
      }),
    )
    expect(record.hiddenCalendarIds).toEqual(['personal-cal', 'work-cal'])
  })

  it('round-trips every snapshot fixture unchanged', () => {
    for (const snapshot of allEndeavorsLensSnapshotMocks) {
      const decoded = decodeLensSnapshot(encodeLensSnapshot(snapshot))
      expect(decoded?.snapshot).toEqual(snapshot)
      expect(decoded?.upgradesApplied).toEqual([])
    }
  })

  it('round-trips the everything-hidden fixture, the widest one there is', () => {
    const decoded = decodeLensSnapshot(
      encodeLensSnapshot(endeavorsLensSnapshotMocks.everythingHidden),
    )
    expect(decoded?.snapshot).toEqual(
      endeavorsLensSnapshotMocks.everythingHidden,
    )
  })
})

describe('makeEndeavorsLensSnapshot defaults', () => {
  it('starts empty, unsearched, archived-out and grouped by status', () => {
    expect(makeEndeavorsLensSnapshot()).toEqual({
      hiddenKinds: new Set(),
      hiddenHosts: new Set(),
      hiddenStatuses: new Set(),
      hiddenComputedStates: new Set(),
      hiddenCalendarIds: new Set(),
      searchQuery: '',
      showArchived: false,
      grouping: EndeavorGroupingCriteria.status,
    })
  })

  it('carries no schema version on the value itself — it is stamped on encode', () => {
    expect('schemaVersion' in makeEndeavorsLensSnapshot()).toBe(false)
  })

  it('copies the sets it is given, so a later edit to the source cannot reach it', () => {
    const kinds = new Set<EndeavorKind>([EndeavorKind.task])
    const snapshot = makeEndeavorsLensSnapshot({ hiddenKinds: kinds })
    kinds.add(EndeavorKind.habit)
    expect(snapshot.hiddenKinds).toEqual(new Set([EndeavorKind.task]))
  })
})
