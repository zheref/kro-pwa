/**
 * The grouping engine, exercised as pure functions — no store, no clock
 * (`RC-56`). The cases that matter are canon's own edge rules: the `anytime`
 * band leading, a multi-host row landing in two groups, the chunked sort, and
 * the seven-per-group display limit with its expand.
 */
import type { Endeavor } from '@kro/core'
import {
  EndeavorGroupingCriteria,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  ascendingBy,
  descendingBy,
  EndeavorSortingCriteria,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { EndeavorRowGroup } from '../FindGrouping'
import {
  DEFAULT_GROUP_SORTING,
  DaySection,
  EndeavorGroupDisplayState,
  daySectionDisplayName,
  daySectionFromRawValue,
  daySectionOrderIndex,
  dueSectionOf,
  groupDisplayState,
  groupEndeavors,
  limitGroup,
  limitGroups,
  sortEndeavorsByParameters,
} from '../FindGrouping'
import { findAt, findEndeavorMocks, nineOpenTasks } from '../FindMocks'

/** The first group, or a loud failure — `noUncheckedIndexedAccess` is on. */
const firstGroup = (groups: readonly EndeavorRowGroup[]): EndeavorRowGroup => {
  const group = groups[0]
  if (group === undefined) throw new Error('expected at least one group')
  return group
}

const taskDueAt = (id: string, due: Date | null): Endeavor =>
  makeEndeavor({
    id,
    title: id,
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due,
    hostedBy: [EndeavorHost.local],
  })

describe('dueSectionOf maps a due time onto canon’s wall-clock bands', () => {
  it('puts an 09:00 task in the morning band', () => {
    expect(dueSectionOf(taskDueAt('a', findAt(9)))).toBe(DaySection.morning)
  })

  it('treats 12:00 as the afternoon boundary, not the morning one', () => {
    expect(dueSectionOf(taskDueAt('b', findAt(12)))).toBe(DaySection.afternoon)
  })

  it('puts a 02:00 task in late night, not night', () => {
    expect(dueSectionOf(taskDueAt('c', findAt(2)))).toBe(DaySection.lateNight)
  })

  it('answers anytime for an endeavor with no due date at all', () => {
    expect(dueSectionOf(taskDueAt('d', null))).toBe(DaySection.anytime)
  })

  it('orders anytime BEFORE every clock band, as canon does', () => {
    expect(daySectionOrderIndex(DaySection.anytime)).toBeLessThan(
      daySectionOrderIndex(DaySection.earlyMorning),
    )
  })

  it('round-trips a raw group key and labels it for the picker', () => {
    expect(daySectionFromRawValue('evening')).toBe(DaySection.evening)
    expect(daySectionFromRawValue('teatime')).toBeNull()
    expect(daySectionDisplayName(DaySection.lateNight)).toBe('Late Night')
  })
})

describe('sortEndeavorsByParameters walks the parameters in chunks', () => {
  const withDue = taskDueAt('due', findAt(9))
  const earlierDue = taskDueAt('earlier', findAt(7))
  const undated = taskDueAt('undated', null)

  it('orders the rows that have a value for the first parameter', () => {
    const sorted = sortEndeavorsByParameters(
      [withDue, earlierDue],
      [ascendingBy(EndeavorSortingCriteria.due)],
    )
    expect(sorted.map((row) => row.id)).toEqual(['earlier', 'due'])
  })

  it('leaves rows with no value for any parameter in arrival order, at the end', () => {
    const sorted = sortEndeavorsByParameters(
      [undated, withDue, earlierDue],
      [ascendingBy(EndeavorSortingCriteria.due)],
    )
    expect(sorted.map((row) => row.id)).toEqual(['earlier', 'due', 'undated'])
  })

  it('hands the value-less remainder to the next parameter', () => {
    const created = makeEndeavor({
      id: 'created',
      title: 'created',
      kind: EndeavorKind.task,
      createdAt: findAt(5),
    })
    const sorted = sortEndeavorsByParameters(
      [created, withDue],
      [
        ascendingBy(EndeavorSortingCriteria.due),
        descendingBy(EndeavorSortingCriteria.createdAt),
      ],
    )
    expect(sorted.map((row) => row.id)).toEqual(['due', 'created'])
  })

  it('puts the most recently completed first under the default parameters', () => {
    const early = makeEndeavor({
      id: 'early',
      title: 'early',
      kind: EndeavorKind.task,
      completed: findAt(8),
    })
    const late = makeEndeavor({
      id: 'late',
      title: 'late',
      kind: EndeavorKind.task,
      completed: findAt(10),
    })
    const sorted = sortEndeavorsByParameters(
      [early, late],
      DEFAULT_GROUP_SORTING,
    )
    expect(sorted.map((row) => row.id)).toEqual(['late', 'early'])
  })

  it('returns an empty list untouched', () => {
    expect(sortEndeavorsByParameters([])).toEqual([])
  })
})

describe('groupEndeavors partitions by the lens criterion', () => {
  it('groups by status and orders the groups by canon’s status order', () => {
    const groups = groupEndeavors(
      [findEndeavorMocks.afternoonTask, findEndeavorMocks.morningTask],
      EndeavorGroupingCriteria.status,
    )
    expect(groups.map((group) => group.key)).toEqual(['ongoing', 'pending'])
    expect(groups[0]?.title).toBe('Ongoing')
  })

  it('puts a multi-host row in EVERY one of its host groups', () => {
    const groups = groupEndeavors(
      [findEndeavorMocks.mirroredTask],
      EndeavorGroupingCriteria.host,
    )
    expect(groups.map((group) => group.key).sort()).toEqual([
      'appleReminders',
      'local',
    ])
  })

  it('leaves a host-less row in no group at all, as canon does', () => {
    const orphan = makeEndeavor({
      id: 'orphan',
      title: 'orphan',
      kind: EndeavorKind.task,
    })
    expect(groupEndeavors([orphan], EndeavorGroupingCriteria.host)).toEqual([])
  })

  it('groups by due section with anytime leading', () => {
    const groups = groupEndeavors(
      [taskDueAt('morning', findAt(9)), taskDueAt('undated', null)],
      EndeavorGroupingCriteria.dueSection,
    )
    expect(groups.map((group) => group.key)).toEqual(['anytime', 'morning'])
  })

  it('groups by kind, one membership per row', () => {
    const groups = groupEndeavors(
      [findEndeavorMocks.morningTask, findEndeavorMocks.teamSync],
      EndeavorGroupingCriteria.kind,
    )
    expect(groups.map((group) => group.key).sort()).toEqual([
      'calendarEvent',
      'task',
    ])
  })

  it('reports the pre-limit size on every group', () => {
    const group = firstGroup(
      groupEndeavors(nineOpenTasks, EndeavorGroupingCriteria.status),
    )
    expect(group.totalCount).toBe(9)
    expect(group.isTrimmed).toBe(false)
  })
})

describe('the seven-item display limit and its expand', () => {
  const pending = firstGroup(
    groupEndeavors(nineOpenTasks, EndeavorGroupingCriteria.status),
  )

  it('trims a nine-row group to seven and says it was trimmed', () => {
    const limited = limitGroup(pending, 7)
    expect(limited.endeavors).toHaveLength(7)
    expect(limited.isTrimmed).toBe(true)
    expect(limited.totalCount).toBe(9)
  })

  it('leaves a group at or under the limit alone', () => {
    const small = firstGroup(
      groupEndeavors(
        [findEndeavorMocks.morningTask],
        EndeavorGroupingCriteria.status,
      ),
    )
    expect(limitGroup(small, 7).isTrimmed).toBe(false)
  })

  it('applies no limit at all when the vista declares none', () => {
    const limited = limitGroup(pending, null)
    expect(limited.endeavors).toHaveLength(9)
  })

  it('lifts the limit from EVERY group once one is expanded', () => {
    const groups = groupEndeavors(
      [...nineOpenTasks, findEndeavorMocks.afternoonTask],
      EndeavorGroupingCriteria.status,
    )
    const clipped = limitGroups(groups, 7, null)
    const expanded = limitGroups(groups, 7, 'pending')
    expect(
      clipped.find((group) => group.key === 'pending')?.endeavors,
    ).toHaveLength(7)
    expect(
      expanded.find((group) => group.key === 'pending')?.endeavors,
    ).toHaveLength(9)
    expect(expanded.every((group) => !group.isTrimmed)).toBe(true)
  })

  it('reports clipped, expanded and collapsed display states', () => {
    expect(groupDisplayState(pending, null)).toBe(
      EndeavorGroupDisplayState.clipped,
    )
    expect(groupDisplayState(pending, 'pending')).toBe(
      EndeavorGroupDisplayState.expanded,
    )
    expect(groupDisplayState(pending, 'ongoing')).toBe(
      EndeavorGroupDisplayState.collapsed,
    )
  })
})
