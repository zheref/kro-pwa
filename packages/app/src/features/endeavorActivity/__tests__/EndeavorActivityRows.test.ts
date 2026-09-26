import {
  PerformResolution,
  makeEndeavor,
  EndeavorKind,
  makePerform,
  makePerformFragment,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { activityEndeavorMocks } from '../EndeavorActivityMocks'
import {
  activityApplicability,
  activityRowsFor,
  activityTabLabel,
  formatActivityDate,
  formatActivityDuration,
  outcomeLabel,
  recordCountLabel,
  rowsForTab,
} from '../EndeavorActivityRows'

describe('activityRowsFor — canon RowMapping', () => {
  it('sorts a task’s records newest first by completion time', () => {
    const rows = activityRowsFor(activityEndeavorMocks.many)
    const times = rows.map((row) => row.completedAt.getTime())
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('sums closed fragments and starts at the first fragment for a split session', () => {
    const split = activityRowsFor(activityEndeavorMocks.many).find(
      (row) => row.resolution === PerformResolution.finished,
    )
    expect(split?.duration).toBe(65 * 60)
    expect(split?.startedAt.getHours()).toBe(14)
    expect(split?.completedAt.getHours()).toBe(15)
  })

  it('falls back to date + duration when nothing marks completion', () => {
    const [row] = activityRowsFor(activityEndeavorMocks.abortedOnly)
    expect(row?.completedAt.getTime()).toBe(
      (row?.startedAt.getTime() ?? 0) + 300_000,
    )
  })

  it('ignores an open fragment’s time and returns no rows for a reminder', () => {
    const open = makeEndeavor({
      id: 'open',
      title: 'Open',
      kind: EndeavorKind.task,
      performances: [
        makePerform({
          date: new Date(2026, 0, 1, 9),
          duration: 999,
          resolution: PerformResolution.aborted,
          sessionFragments: [
            makePerformFragment({ startedAt: new Date(2026, 0, 1, 9) }),
          ],
        }),
      ],
    })
    expect(activityRowsFor(open)[0]?.duration).toBe(0)
    expect(activityRowsFor(activityEndeavorMocks.reminder)).toEqual([])
  })
})

describe('activity vocabulary', () => {
  it('applies to tasks and habits, is pending for behaviors, and n/a otherwise', () => {
    expect(activityApplicability(EndeavorKind.task)).toBe('supported')
    expect(activityApplicability(EndeavorKind.habit)).toBe('supported')
    expect(activityApplicability(EndeavorKind.behavior)).toBe('behavior')
    for (const kind of [
      'background',
      'blueprint',
      'calendarEvent',
      'reminder',
    ] as const) {
      expect(activityApplicability(kind)).toBe('notApplicable')
    }
  })

  it('labels tabs and outcomes the way canon does', () => {
    expect(
      ['all', 'complete', 'finished', 'aborted'].map((t) =>
        activityTabLabel(t as 'all'),
      ),
    ).toEqual(['All', 'Complete', 'Finished', 'Aborted'])
    expect(outcomeLabel(PerformResolution.complete)).toBe('Complete')
    expect(outcomeLabel(PerformResolution.aborted)).toBe('Aborted')
    expect(outcomeLabel(PerformResolution.finished)).toBe('Session finished')
  })

  it('formats durations: no timer, seconds, minutes, hours', () => {
    expect(formatActivityDuration(0)).toBe('No timer')
    expect(formatActivityDuration(45)).toBe('45s')
    expect(formatActivityDuration(1500)).toBe('25m')
    expect(formatActivityDuration(3900)).toBe('1h 5m')
  })

  it('formats a range, a single time, and counts records', () => {
    const [row] = activityRowsFor(activityEndeavorMocks.single)
    if (!row) throw new Error('fixture')
    expect(formatActivityDate(row)).toBe('Jan 14 · 11:00–11:10')
    expect(formatActivityDate({ ...row, duration: 0 })).toBe('Jan 14 · 11:00')
    expect(recordCountLabel(1)).toBe('1 record')
    expect(recordCountLabel(3)).toBe('3 records')
  })

  it('filters rows by tab, keeping everything on All', () => {
    const rows = activityRowsFor(activityEndeavorMocks.many)
    expect(rowsForTab(rows, 'all')).toHaveLength(4)
    expect(rowsForTab(rows, 'complete')).toHaveLength(2)
    expect(rowsForTab(rows, 'finished')).toHaveLength(1)
  })
})
