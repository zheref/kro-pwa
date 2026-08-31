/**
 * The spec's scenarios, as a fixture table.
 *
 * Each row names a scenario from `docs/Features/SourceReconciliation.md`,
 * supplies the fan-out a host set would produce, and asserts the documented
 * outcome. The PR's "How to verify" table points at this file.
 */
import { describe, expect, it } from 'vitest'
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { EndeavorStatus } from '../../endeavor/EndeavorStatus'
import { makeShadow } from '../../endeavor/Shadow'
import { reconcile, reconciledCounterpartOf } from '../Reconcile'
import { utcCalendar } from '../ReconciliationCalendar'
import { makeReconciliationContext } from '../ReconciliationContext'
import {
  RECONCILIATION_MOCK_NOW,
  appleRow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
  seriesOccurrenceRow,
  seriesScenarioMocks,
  utcAt,
} from '../__mocks__/Reconciliation.mocks'

const context = makeReconciliationContext({
  calendar: utcCalendar,
  now: RECONCILIATION_MOCK_NOW,
})

const idsOf = (endeavors: readonly Endeavor[]): readonly string[] =>
  endeavors.map((endeavor) => endeavor.id)

describe('spec scenario — duplicates within one host', () => {
  it('collapses two rows sharing a primary id into one', () => {
    const rows = [
      makeEndeavor({
        id: 'dup',
        title: 'Original',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
      }),
      makeEndeavor({
        id: 'dup',
        title: 'Updated',
        kind: EndeavorKind.task,
        status: EndeavorStatus.closed,
        hostedBy: [EndeavorHost.local],
      }),
    ]
    const resolved = reconcile(rows, context)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.status).toBe(EndeavorStatus.closed)
  })

  it('leaves genuinely distinct rows from one host alone', () => {
    const rows = [
      makeEndeavor({
        id: 'a',
        title: 'A',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
      }),
      makeEndeavor({
        id: 'b',
        title: 'B',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
      }),
    ]
    expect(idsOf(reconcile(rows, context))).toEqual(['a', 'b'])
  })

  it('keeps two occurrences of one recurring event separate', () => {
    // "separate days survive a multi-day range fetch"
    const resolved = reconcile(
      [
        reconciliationMocks.recurringEventMondayRow,
        reconciliationMocks.recurringEventTuesdayRow,
      ],
      context,
    )
    expect(resolved).toHaveLength(2)
  })
})

describe('spec scenario — duplicates across hosts', () => {
  it('shows a local shadow and its original source once', () => {
    const resolved = reconcile(
      [
        localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
        appleRow({ id: 'apple-1', priority: 0 }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(new Set(resolved[0]?.hostedBy)).toEqual(
      new Set([EndeavorHost.local, EndeavorHost.appleReminders]),
    )
  })

  it('keeps the Kro row as the survivor so enrichment is not lost', () => {
    const resolved = reconcile(
      [
        localMirrorRow({
          id: 'local',
          sourceIdentifier: 'apple-1',
          value: 5,
          effort: 3,
        }),
        appleRow({ id: 'apple-1', priority: 0 }),
      ],
      context,
    )
    expect(resolved[0]?.id).toBe('local')
    expect(resolved[0]?.value).toBe(5)
    expect(resolved[0]?.effort).toBe(3)
  })

  it('resolves the same result whichever order the hosts answered in', () => {
    const mirror = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      value: 5,
    })
    const apple = appleRow({
      id: 'apple-1',
      recurrence: recurrenceMocks.daily,
      priority: 0,
    })
    const forward = reconcile([mirror, apple], context)[0]
    const reverse = reconcile([apple, mirror], context)[0]
    expect(forward?.id).toBe(reverse?.id)
    expect(forward?.kind).toBe(reverse?.kind)
    expect(forward?.value).toBe(reverse?.value)
  })
})

describe('spec scenario — transitive chains', () => {
  it('collapses a mirror, its source and a cloud copy into one row', () => {
    // Canon: "Identity groups remain transitive across primary ids and shadows".
    const resolved = reconcile(
      [
        localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
        appleRow({ id: 'apple-1', priority: 0 }),
        makeEndeavor({
          id: 'apple-1',
          title: 'Cloud',
          kind: EndeavorKind.task,
          hostedBy: [EndeavorHost.supabase],
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(new Set(resolved[0]?.hostedBy)).toEqual(
      new Set([
        EndeavorHost.local,
        EndeavorHost.appleReminders,
        EndeavorHost.supabase,
      ]),
    )
  })

  it('retains every source route across the whole chain', () => {
    const resolved = reconcile(
      [
        makeEndeavor({
          id: 'local',
          title: 'Chained',
          kind: EndeavorKind.task,
          hostedBy: [EndeavorHost.local],
          shadows: [
            makeShadow({
              originalTitle: 'Chained',
              sourceIdentifier: 'apple-1',
              kind: EndeavorKind.task,
              source: EndeavorHost.appleReminders,
              group: null,
            }),
            makeShadow({
              originalTitle: 'Chained',
              sourceIdentifier: 'google-1',
              kind: EndeavorKind.task,
              source: EndeavorHost.googleCalendar,
              group: null,
            }),
          ],
        }),
        appleRow({ id: 'apple-1', priority: 0 }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    const sources = new Set((resolved[0]?.shadows ?? []).map((s) => s.source))
    expect(sources.has(EndeavorHost.appleReminders)).toBe(true)
    expect(sources.has(EndeavorHost.googleCalendar)).toBe(true)
  })

  it('does not chain through a cross-provider identifier collision', () => {
    const resolved = reconcile(
      [
        reconciliationMocks.enrichedLocalMirror,
        reconciliationMocks.crossProviderTwinRow,
      ],
      context,
    )
    expect(resolved).toHaveLength(2)
  })
})

describe('spec scenario — empty identifiers', () => {
  it('keeps two rows with empty shadow identifiers apart', () => {
    const first = reconciliationMocks.emptyIdentifierShadowRow
    const second = makeEndeavor({ ...first, id: 'orphan-b' })
    expect(idsOf(reconcile([first, second], context))).toEqual([
      'orphan-a',
      'orphan-b',
    ])
  })

  it('still merges such a row with a genuine primary-id duplicate', () => {
    const first = reconciliationMocks.emptyIdentifierShadowRow
    const twin = makeEndeavor({ ...first, title: 'Renamed' })
    expect(reconcile([first, twin], context)).toHaveLength(1)
  })

  it('leaves an unhosted, shadowless draft entirely alone', () => {
    const draft = makeEndeavor({
      id: 'draft-1',
      title: 'Just captured',
      kind: EndeavorKind.task,
    })
    const resolved = reconcile(
      [draft, reconciliationMocks.kroCitizenTask],
      context,
    )
    expect(resolved).toHaveLength(2)
  })
})

describe('spec scenario — a late stale fetch cannot erase evidence', () => {
  it('keeps a resolved habit resolved when the stale mirror arrives again', () => {
    const stale = localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' })
    const resolved = reconcile(
      [
        stale,
        appleRow({
          id: 'apple-1',
          kind: EndeavorKind.task,
          recurrence: recurrenceMocks.daily,
          priority: 7,
        }),
      ],
      context,
    )
    const afterLateFetch = reconcile([resolved[0] as Endeavor, stale], context)
    expect(afterLateFetch).toHaveLength(1)
    expect(afterLateFetch[0]?.kind).toBe(EndeavorKind.habit)
    expect(afterLateFetch[0]?.repeatConfig).toEqual(recurrenceMocks.daily)
  })

  it('does not let a stale row erase a title the provider refreshed', () => {
    const stale = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      title: 'Old name',
    })
    const fresh = appleRow({
      id: 'apple-1',
      title: 'New name',
      priority: 0,
    })
    const once = reconcile([stale, fresh], context)
    const twice = reconcile([once[0] as Endeavor, stale], context)
    expect(twice[0]?.title).toBe('New name')
  })

  it('is idempotent — reconciling its own output changes nothing', () => {
    const rows = [
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1', value: 5 }),
      appleRow({
        id: 'apple-1',
        recurrence: recurrenceMocks.daily,
        priority: 0,
      }),
      reconciliationMocks.kroCitizenTask,
    ]
    const once = reconcile(rows, context)
    const twice = reconcile(once, context)
    expect(twice).toEqual(once)
  })
})

describe('the pass keeps unrelated rows separate and stable', () => {
  it('preserves input order for unrelated rows', () => {
    const rows = Array.from({ length: 50 }, (_, index) =>
      makeEndeavor({
        id: `task-${index}`,
        title: `Task ${index}`,
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
      }),
    )
    expect(idsOf(reconcile(rows, context))).toEqual(idsOf(rows))
  })

  it('places a merged group at its first member’s position', () => {
    const rows = [
      reconciliationMocks.kroCitizenTask,
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      reconciliationMocks.googleTouristEvent,
      appleRow({ id: 'apple-1', priority: 0 }),
    ]
    expect(idsOf(reconcile(rows, context))).toEqual([
      'kro-citizen',
      'local',
      'google-tourist',
    ])
  })

  it('handles an empty fan-out', () => {
    expect(reconcile([], context)).toEqual([])
  })

  it('returns a single row untouched', () => {
    const resolved = reconcile([reconciliationMocks.kroCitizenTask], context)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.value).toBe(4)
  })
})

describe('stage ordering — series repair must see the raw fan-out', () => {
  it('repairs a rotated identifier before host unioning hides the native row', () => {
    // Canon's explicit ordering note. Identity matching cannot link these:
    // the mirror points at a retired identifier.
    const resolved = reconcile(
      [seriesScenarioMocks.enrichedMirror, seriesScenarioMocks.liveToday],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.id).toBe('mirror-vitamins')
    expect(resolved[0]?.kind).toBe(EndeavorKind.habit)
    expect(resolved[0]?.value).toBe(4)
  })

  it('collapses superseded history after the merge, not before', () => {
    const resolved = reconcile(
      [seriesScenarioMocks.completedYesterday, seriesScenarioMocks.liveToday],
      context,
    )
    expect(idsOf(resolved)).toEqual(['occurrence-26'])
  })

  it('runs all three stages together on one mixed batch', () => {
    const resolved = reconcile(
      [
        seriesScenarioMocks.completedYesterday,
        seriesScenarioMocks.enrichedMirror,
        seriesScenarioMocks.liveToday,
        reconciliationMocks.kroCitizenTask,
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['mirror-vitamins', 'kro-citizen'])
  })
})

describe('reconciledCounterpartOf', () => {
  it('finds the merged row a given endeavor ends up in', () => {
    const mirror = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      value: 5,
    })
    const apple = appleRow({ id: 'apple-1', priority: 0 })
    const counterpart = reconciledCounterpartOf(apple, [mirror, apple], context)
    expect(counterpart?.id).toBe('local')
    expect(counterpart?.value).toBe(5)
  })

  it('returns the row itself when nothing merges with it', () => {
    const rows = [reconciliationMocks.kroCitizenTask]
    expect(
      reconciledCounterpartOf(reconciliationMocks.kroCitizenTask, rows, context)
        ?.id,
    ).toBe('kro-citizen')
  })

  it('returns null for a row that is not in the set', () => {
    expect(
      reconciledCounterpartOf(
        reconciliationMocks.googleTouristEvent,
        [reconciliationMocks.kroCitizenTask],
        context,
      ),
    ).toBeNull()
  })
})

describe('reconciliation without a clock', () => {
  it('still collapses superseded history when now is absent', () => {
    const clocklessContext = makeReconciliationContext({
      calendar: utcCalendar,
    })
    const resolved = reconcile(
      [seriesScenarioMocks.completedYesterday, seriesScenarioMocks.liveToday],
      clocklessContext,
    )
    expect(idsOf(resolved)).toEqual(['occurrence-26'])
  })

  it('does not project a completion when now is absent', () => {
    const clocklessContext = makeReconciliationContext({
      calendar: utcCalendar,
    })
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'today-done', day: 26, complete: true }),
        seriesOccurrenceRow({
          id: 'today-live',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      clocklessContext,
    )
    expect(resolved[0]?.status).toBe(EndeavorStatus.pending)
    expect(resolved[0]?.completed).toBeNull()
  })

  it('uses the default context when the caller supplies none', () => {
    // Reconciling Kro-only rows needs neither clock nor calendar.
    const rows = [
      reconciliationMocks.kroCitizenTask,
      makeEndeavor({ ...reconciliationMocks.kroCitizenTask, title: 'Renamed' }),
    ]
    expect(reconcile(rows)).toHaveLength(1)
  })
})

describe('the pass never invents scheduling', () => {
  it('leaves an undated Kro row undated', () => {
    const undated = makeEndeavor({
      id: 'undated',
      title: 'Someday',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const resolved = reconcile([undated], context)
    expect(resolved[0]?.due).toBeNull()
    expect(resolved[0]?.start).toBeNull()
  })

  it('does not copy a duration the provider never reported', () => {
    // `duration` is deliberately outside the merged host-native set.
    const withDuration = makeEndeavor({
      ...localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      duration: 1800,
    })
    const resolved = reconcile(
      [withDuration, appleRow({ id: 'apple-1', priority: 0 })],
      context,
    )
    expect(resolved[0]?.duration).toBe(1800)
  })

  it('keeps the expiry the user set through a provider refresh', () => {
    const enriched = makeEndeavor({
      ...localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      expiry: utcAt(27, 23),
    })
    const resolved = reconcile(
      [enriched, appleRow({ id: 'apple-1', priority: 1 })],
      context,
    )
    expect(resolved[0]?.expiry).toEqual(utcAt(27, 23))
  })
})
