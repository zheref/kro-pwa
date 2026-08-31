import { describe, expect, it } from 'vitest'
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { EndeavorStatus } from '../../endeavor/EndeavorStatus'
import { reconcile } from '../Reconcile'
import { resolvedKind } from '../ResolvedKind'
import { utcCalendar } from '../ReconciliationCalendar'
import { makeReconciliationContext } from '../ReconciliationContext'
import {
  collapseSupersededOccurrences,
  reconcileSeriesOccurrences,
} from '../SeriesReconciliation'
import {
  RECONCILIATION_MOCK_NOW,
  recurrenceMocks,
  reconciliationMocks,
  seriesMirrorRow,
  seriesOccurrenceRow,
  utcAt,
} from '../__mocks__/Reconciliation.mocks'

const context = makeReconciliationContext({
  calendar: utcCalendar,
  now: RECONCILIATION_MOCK_NOW,
})

const idsOf = (endeavors: readonly Endeavor[]): readonly string[] =>
  endeavors.map((endeavor) => endeavor.id)

describe('superseded occurrences', () => {
  it('drops a completed recurrence-less occurrence of an active series', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'old', day: 25, complete: true }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['current'])
    // The survivor was never merged with anything, so its *stored* kind is
    // untouched and the habit classification is computed. See the dedicated
    // "stored kind vs resolved kind" block below.
    expect(resolvedKind(resolved[0] as Endeavor, context)).toBe(
      EndeavorKind.habit,
    )
  })

  it('supersedes history for a weekly series too', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'old', day: 25, complete: true }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.weekly,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['current'])
  })

  it('never supersedes a pending recurrence-less reminder', () => {
    // Canon: "A recurrence-less pending reminder is never treated as completed
    // series history".
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'stale', day: 25 }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['stale', 'current'])
  })

  it('keeps the same title in another provider group independent', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({
          id: 'other',
          day: 25,
          group: 'Personal',
          complete: true,
        }),
        seriesOccurrenceRow({
          id: 'daily',
          day: 26,
          group: 'Health',
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['other', 'daily'])
  })

  it('keeps the same title and group at another clock time independent', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({
          id: 'evening',
          day: 25,
          hour: 20,
          complete: true,
        }),
        seriesOccurrenceRow({
          id: 'morning',
          day: 26,
          hour: 7,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['evening', 'morning'])
  })

  it('keeps a monthly recurrence with the same signature independent', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({
          id: 'monthly',
          day: 25,
          recurrence: recurrenceMocks.monthly,
        }),
        seriesOccurrenceRow({
          id: 'daily',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['monthly', 'daily'])
  })

  it('does not collapse when two active occurrences share a signature', () => {
    // "Ambiguous daily series do not share one completion."
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'done', day: 25, complete: true }),
        seriesOccurrenceRow({
          id: 'first',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
        seriesOccurrenceRow({
          id: 'second',
          day: 27,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(3)
  })

  it('leaves a row with no scheduled instant out of any series', () => {
    const undated = makeEndeavor({
      ...seriesOccurrenceRow({ id: 'undated', day: 25, complete: true }),
      due: null,
      start: null,
    })
    const resolved = collapseSupersededOccurrences(
      [
        undated,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(idsOf(resolved)).toEqual(['undated', 'current'])
  })
})

describe('projecting a same-day completion onto the live occurrence', () => {
  it('completes today’s occurrence from today’s completed occurrence', () => {
    const completedToday = seriesOccurrenceRow({
      id: 'done-today',
      day: 26,
      complete: true,
      completedAt: utcAt(26, 8),
    })
    const resolved = reconcile(
      [
        completedToday,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.status).toBe(EndeavorStatus.closed)
    expect(resolved[0]?.completed).toEqual(utcAt(26, 8))
  })

  it('takes the latest completion when several arrive for one day', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({
          id: 'earlier',
          day: 26,
          complete: true,
          completedAt: utcAt(26, 6),
        }),
        seriesOccurrenceRow({
          id: 'later',
          day: 26,
          complete: true,
          completedAt: utcAt(26, 9),
        }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved[0]?.completed).toEqual(utcAt(26, 9))
  })

  it('does not complete today’s habit from a cleared overdue occurrence', () => {
    // The rule that is easy to get wrong: completed today, but scheduled for
    // an earlier day, so it is not today's occurrence.
    const overdueClearedToday = seriesOccurrenceRow({
      id: 'overdue',
      day: 25,
      complete: true,
      completedAt: utcAt(26, 12),
    })
    const resolved = reconcile(
      [
        overdueClearedToday,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.status).toBe(EndeavorStatus.pending)
    expect(resolved[0]?.completed).toBeNull()
  })

  it('does not project a completion from an earlier day', () => {
    const resolved = reconcile(
      [
        seriesOccurrenceRow({ id: 'yesterday', day: 25, complete: true }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved[0]?.status).toBe(EndeavorStatus.pending)
  })
})

describe('reconnecting a rotated provider identifier', () => {
  it('reconnects an enriched mirror to the live daily occurrence', () => {
    const mirror = seriesMirrorRow({
      id: 'local-old',
      sourceIdentifier: 'old-occurrence',
      value: 4,
    })
    const active = seriesOccurrenceRow({
      id: 'current-occurrence',
      day: 26,
      recurrence: recurrenceMocks.daily,
    })
    const resolved = reconcile([mirror, active], context)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.id).toBe('local-old')
    expect(resolved[0]?.kind).toBe(EndeavorKind.habit)
    expect(resolved[0]?.repeatConfig).toEqual(recurrenceMocks.daily)
    expect(resolved[0]?.value).toBe(4)
  })

  it('repoints the provider shadow at the live occurrence', () => {
    // "Mutation write-back must target the live occurrence, never the stale
    // occurrence identifier that caused this fallback reconciliation."
    const resolved = reconcile(
      [
        seriesMirrorRow({
          id: 'local-old',
          sourceIdentifier: 'old-occurrence',
        }),
        seriesOccurrenceRow({
          id: 'current-occurrence',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    const appleShadows = (resolved[0]?.shadows ?? []).filter(
      (shadow) => shadow.source === EndeavorHost.appleReminders,
    )
    expect(appleShadows).toHaveLength(1)
    expect(appleShadows[0]?.sourceIdentifier).toBe('current-occurrence')
  })

  it('reconnects to a weekly series too', () => {
    const resolved = reconcile(
      [
        seriesMirrorRow({ id: 'local-old', sourceIdentifier: 'old', value: 4 }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.weekly,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.kind).toBe(EndeavorKind.habit)
    expect(resolved[0]?.repeatConfig).toEqual(recurrenceMocks.weekly)
  })

  it('reconnects across a matrix-changed due time', () => {
    // The repair signature is deliberately time-free, unlike the collapse one.
    const resolved = reconcile(
      [
        seriesMirrorRow({
          id: 'local-old',
          sourceIdentifier: 'old',
          hour: 19,
          value: 4,
        }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          hour: 7,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.value).toBe(4)
  })

  it('reconnects across a re-typed title differing only by case and accent', () => {
    const resolved = reconcile(
      [
        seriesMirrorRow({
          id: 'local-old',
          sourceIdentifier: 'old',
          title: 'Tomár vitaminas',
          value: 4,
        }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          title: 'tomar VITAMINAS',
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.id).toBe('local-old')
  })

  it('still classifies the mirror when the live occurrence is completed', () => {
    // "A completed daily occurrence still prevents its matrix mirror from
    // resurfacing as a task."
    const resolved = reconcile(
      [
        seriesMirrorRow({ id: 'local-old', sourceIdentifier: 'old', value: 4 }),
        seriesOccurrenceRow({
          id: 'completed',
          day: 26,
          recurrence: recurrenceMocks.daily,
          complete: true,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.kind).toBe(EndeavorKind.habit)
    expect(resolved[0]?.status).toBe(EndeavorStatus.closed)
  })

  it('leaves an ambiguous series alone when two occurrences are incomplete', () => {
    const resolved = reconcile(
      [
        seriesMirrorRow({ id: 'local-old', sourceIdentifier: 'old' }),
        seriesOccurrenceRow({
          id: 'first',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
        seriesOccurrenceRow({
          id: 'second',
          day: 27,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved.length).toBeGreaterThan(1)
  })

  it('never absorbs a mirror that declares a non-series recurrence', () => {
    const explicitMonthly = makeEndeavor({
      ...seriesMirrorRow({ id: 'monthly-mirror', sourceIdentifier: 'old' }),
      repeatConfig: recurrenceMocks.monthly,
    })
    const resolved = reconcile(
      [
        explicitMonthly,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(2)
  })

  it('does nothing when there is no mirror to repair', () => {
    const active = seriesOccurrenceRow({
      id: 'current',
      day: 26,
      recurrence: recurrenceMocks.daily,
    })
    expect(reconcileSeriesOccurrences([active], context)).toEqual([active])
  })
})

describe('performances across a series boundary', () => {
  it('drops performances cached against a previous occurrence', () => {
    // "A pending successor must not inherit performances cached against a
    // previous occurrence of the same series."
    const mirror = makeEndeavor({
      ...seriesMirrorRow({ id: 'mirror', sourceIdentifier: 'old' }),
      performances: [reconciliationMocks.focusPerformance],
    })
    const resolved = reconcile(
      [
        mirror,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.status).toBe(EndeavorStatus.pending)
    expect(resolved[0]?.performances).toEqual([])
  })

  it('keeps the mirror’s performances when the live occurrence is closed', () => {
    const mirror = makeEndeavor({
      ...seriesMirrorRow({ id: 'mirror', sourceIdentifier: 'old' }),
      performances: [reconciliationMocks.focusPerformance],
    })
    const resolved = reconcile(
      [
        mirror,
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
          complete: true,
        }),
      ],
      context,
    )
    expect(resolved[0]?.performances).toHaveLength(1)
  })

  it('does not duplicate a performance both sides already recorded', () => {
    // Structural dedupe, since a spread copy defeats reference equality.
    const performance = reconciliationMocks.focusPerformance
    const mirror = makeEndeavor({
      ...seriesMirrorRow({ id: 'mirror', sourceIdentifier: 'old' }),
      performances: [performance],
    })
    const active = makeEndeavor({
      ...seriesOccurrenceRow({
        id: 'current',
        day: 26,
        recurrence: recurrenceMocks.daily,
        complete: true,
      }),
      performances: [{ ...performance }],
    })
    const resolved = reconcile([mirror, active], context)
    expect(resolved[0]?.performances).toHaveLength(1)
  })
})

describe('stored kind vs resolved kind after the pass', () => {
  /**
   * A contract #10 (persistence) depends on, and the reason canon's own tests
   * assert `resolvedKind` rather than `kind` here.
   *
   * The pass writes a resolved kind onto a row only when that row was
   * **rewritten** anyway — merged with another row, or repaired against a live
   * occurrence. A row that merely survived is returned untouched, because
   * reconciliation is a read-side pass and rewriting a field nobody asked
   * about would make it a mutation. Either way every surface reads
   * `resolvedKind`, so the two paths are indistinguishable downstream.
   */
  it('leaves the stored kind alone on a row that was never merged', () => {
    const lone = seriesOccurrenceRow({
      id: 'lone',
      day: 26,
      recurrence: recurrenceMocks.daily,
    })
    const resolved = reconcile([lone], context)
    expect(resolved[0]?.kind).toBe(EndeavorKind.task)
    expect(resolvedKind(resolved[0] as Endeavor, context)).toBe(
      EndeavorKind.habit,
    )
  })

  it('writes the resolved kind onto a row it merged', () => {
    const resolved = reconcile(
      [
        seriesMirrorRow({ id: 'mirror', sourceIdentifier: 'old', value: 4 }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )
    expect(resolved[0]?.kind).toBe(EndeavorKind.habit)
  })

  it('agrees on the resolved kind whichever path produced the row', () => {
    const merged = reconcile(
      [
        seriesMirrorRow({ id: 'mirror', sourceIdentifier: 'old' }),
        seriesOccurrenceRow({
          id: 'current',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )[0] as Endeavor
    const survived = reconcile(
      [
        seriesOccurrenceRow({
          id: 'lone',
          day: 26,
          recurrence: recurrenceMocks.daily,
        }),
      ],
      context,
    )[0] as Endeavor
    expect(resolvedKind(merged, context)).toBe(resolvedKind(survived, context))
  })
})
