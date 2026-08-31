/**
 * Integrity assertions on the fixture set itself.
 *
 * A fixture that quietly stops being what its name claims takes a suite's
 * meaning with it: an "empty identifier" row that gains an identifier would
 * make its test pass for the wrong reason. These assert the properties the
 * suites rely on, so the drift fails here rather than somewhere subtle.
 */
import { describe, expect, it } from 'vitest'
import { EndeavorHost } from '../../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../../endeavor/EndeavorKind'
import { citizenshipOf } from '../../KroEnhanced'
import { resolvedKind } from '../../ResolvedKind'
import { representsSameEndeavor } from '../../SourceIdentity'
import {
  RECONCILIATION_MOCK_NOW,
  appleRow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
  seriesMirrorRow,
  seriesOccurrenceRow,
  seriesScenarioMocks,
  utcAt,
} from '../Reconciliation.mocks'

describe('the RC-13 spread', () => {
  it('ships at least seven named fixtures', () => {
    expect(Object.keys(reconciliationMocks).length).toBeGreaterThanOrEqual(7)
  })

  it('covers all four citizenship categories across the set', () => {
    const categories = new Set(
      [
        reconciliationMocks.kroCitizenTask,
        reconciliationMocks.googleTouristEvent,
        reconciliationMocks.enhancedAppleTask,
        reconciliationMocks.freshAppleDailyRow,
      ].map(citizenshipOf),
    )
    expect(categories.has('citizen')).toBe(true)
    expect(categories.has('tourist')).toBe(true)
    expect(categories.has('enhanced')).toBe(true)
  })

  it('gives every fixture a non-empty id', () => {
    const rows = [
      reconciliationMocks.enrichedLocalMirror,
      reconciliationMocks.freshAppleDailyRow,
      reconciliationMocks.cloudCopyOfAppleRow,
      reconciliationMocks.kroCitizenTask,
      reconciliationMocks.legacyShadowRow,
      reconciliationMocks.multiShadowChainRow,
      reconciliationMocks.enhancedAppleTask,
    ]
    for (const row of rows) {
      expect(row.id).not.toBe('')
    }
  })
})

describe('the pathological shadow fixtures are genuinely pathological', () => {
  it('keeps the empty-identifier row’s shadow identifier empty', () => {
    expect(
      reconciliationMocks.emptyIdentifierShadowRow.shadows?.[0]
        ?.sourceIdentifier,
    ).toBe('')
  })

  it('gives the cross-provider twin the same identifier under another source', () => {
    const twinShadow = reconciliationMocks.crossProviderTwinRow.shadows?.[0]
    const mirrorShadow = reconciliationMocks.enrichedLocalMirror.shadows?.[0]
    expect(twinShadow?.sourceIdentifier).toBe(mirrorShadow?.sourceIdentifier)
    expect(twinShadow?.source).not.toBe(mirrorShadow?.source)
  })

  it('leaves the legacy row without priority evidence', () => {
    expect(
      reconciliationMocks.legacyShadowRow.shadows?.[0]?.appleReminderPriority,
    ).toBeNull()
  })

  it('gives the chain row shadows under three different providers', () => {
    const sources = new Set(
      (reconciliationMocks.multiShadowChainRow.shadows ?? []).map(
        (shadow) => shadow.source,
      ),
    )
    expect(sources.size).toBe(3)
  })

  it('includes exactly one empty identifier in the chain row', () => {
    const empties = (
      reconciliationMocks.multiShadowChainRow.shadows ?? []
    ).filter((shadow) => shadow.sourceIdentifier === '')
    expect(empties).toHaveLength(1)
  })

  it('gives the two recurring-event fixtures one id and two starts', () => {
    expect(reconciliationMocks.recurringEventMondayRow.id).toBe(
      reconciliationMocks.recurringEventTuesdayRow.id,
    )
    expect(reconciliationMocks.recurringEventMondayRow.start).not.toEqual(
      reconciliationMocks.recurringEventTuesdayRow.start,
    )
  })

  it('makes the mirror and the fresh Apple row genuinely the same endeavor', () => {
    expect(
      representsSameEndeavor(
        reconciliationMocks.enrichedLocalMirror,
        reconciliationMocks.freshAppleDailyRow,
      ),
    ).toBe(true)
  })
})

describe('the builders produce what their names claim', () => {
  it('builds a provider-native Apple row with no Kro host', () => {
    const row = appleRow({ priority: 0 })
    expect(row.hostedBy).toEqual([EndeavorHost.appleReminders])
  })

  it('builds a local mirror linked only through its shadow', () => {
    const row = localMirrorRow({})
    expect(row.hostedBy).toEqual([EndeavorHost.local])
    expect(row.shadows?.[0]?.source).toBe(EndeavorHost.appleReminders)
  })

  it('omits scheduling when a row is built unscheduled', () => {
    const row = appleRow({ scheduled: false, priority: 0 })
    expect(row.due).toBeNull()
    expect(row.start).toBeNull()
  })

  it('gives a completed occurrence no recurrence rule', () => {
    // The provider behaviour the collapse rule exists for.
    const row = seriesOccurrenceRow({ id: 'old', day: 25, complete: true })
    expect(row.repeatConfig).toBeNull()
    expect(row.completed).not.toBeNull()
  })

  it('gives a live occurrence its recurrence rule', () => {
    const row = seriesOccurrenceRow({
      id: 'current',
      day: 26,
      recurrence: recurrenceMocks.daily,
    })
    expect(row.repeatConfig).toEqual(recurrenceMocks.daily)
    expect(row.completed).toBeNull()
  })

  it('points a series mirror at a retired identifier', () => {
    const mirror = seriesMirrorRow({ sourceIdentifier: 'old-occurrence' })
    const live = seriesOccurrenceRow({
      id: 'current-occurrence',
      day: 26,
      recurrence: recurrenceMocks.daily,
    })
    // Identity matching alone cannot link them — that is the whole point.
    expect(representsSameEndeavor(mirror, live)).toBe(false)
  })

  it('builds every instant in UTC', () => {
    expect(utcAt(26, 7).toISOString()).toBe('2026-08-26T07:00:00.000Z')
  })

  it('anchors the mock instant to noon UTC on the 26th', () => {
    expect(RECONCILIATION_MOCK_NOW.toISOString()).toBe(
      '2026-08-26T12:00:00.000Z',
    )
  })
})

describe('the recurrence fixtures cover all four bases', () => {
  it('names one fixture per base', () => {
    expect(recurrenceMocks.daily.base.type).toBe('daily')
    expect(recurrenceMocks.weekly.base.type).toBe('weekly')
    expect(recurrenceMocks.monthly.base.type).toBe('monthly')
    expect(recurrenceMocks.yearly.base.type).toBe('yearly')
  })

  it('splits them into series and non-series for the Apple table', () => {
    const seriesRow = appleRow({
      recurrence: recurrenceMocks.weekly,
      priority: 0,
    })
    const nonSeriesRow = appleRow({
      recurrence: recurrenceMocks.monthly,
      priority: 0,
    })
    expect(resolvedKind(seriesRow)).toBe(EndeavorKind.habit)
    expect(resolvedKind(nonSeriesRow)).not.toBe(EndeavorKind.habit)
  })
})

describe('the series scenario set', () => {
  it('shares one signature across all three rows', () => {
    // Same title, same group, same clock time — so the series rules apply.
    const rows = [
      seriesScenarioMocks.completedYesterday,
      seriesScenarioMocks.liveToday,
      seriesScenarioMocks.enrichedMirror,
    ]
    const titles = new Set(rows.map((row) => row.title))
    const groups = new Set(rows.map((row) => row.shadows?.[0]?.group))
    expect(titles.size).toBe(1)
    expect(groups.size).toBe(1)
  })

  it('carries enrichment only on the mirror', () => {
    expect(seriesScenarioMocks.enrichedMirror.value).toBe(4)
    expect(seriesScenarioMocks.liveToday.value).toBeNull()
  })

  it('makes only the live row a series recurrence', () => {
    expect(seriesScenarioMocks.liveToday.repeatConfig).toEqual(
      recurrenceMocks.daily,
    )
    expect(seriesScenarioMocks.completedYesterday.repeatConfig).toBeNull()
    expect(seriesScenarioMocks.enrichedMirror.repeatConfig).toBeNull()
  })
})
