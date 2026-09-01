/**
 * What a Plan list row prints, asserted without a canvas.
 *
 * The rule with a bug behind it is the all-day one: canon shipped the grouped
 * presentation printing a clock time for an event that has none, and fixed it
 * in review. Both presentations go through `planListRowTimeInfo`, so the fix
 * cannot come apart here.
 */
import { describe, expect, it } from 'vitest'
import { planAt } from '../../../PlanMocks'
import {
  planListRowBadges,
  planListRowOpenLabel,
  planListRowSymbol,
  planListRowTimeInfo,
} from '../planListPresentation'
import { planListBucketFixtures } from '../planListMocks'

describe('planListRowSymbol', () => {
  it('lifts a leading emoji out of the title and shows it as the badge', () => {
    const lead = planListRowSymbol('🧾 File the expenses')
    expect(lead).toEqual({
      symbol: '🧾',
      isGeneric: false,
      title: 'File the expenses',
    })
  })

  it('falls back to the calendar glyph for a plain title — the day is events-first', () => {
    const lead = planListRowSymbol('Renew the parking permit')
    expect(lead.isGeneric).toBe(true)
    expect(lead.symbol).toBe('calendar')
    expect(lead.title).toBe('Renew the parking permit')
  })

  it('keeps an emoji that is not leading inside the title', () => {
    const lead = planListRowSymbol('Ship the 🚀 release')
    expect(lead.isGeneric).toBe(true)
    expect(lead.title).toBe('Ship the 🚀 release')
  })

  it('handles a multi-codepoint emoji as one glyph', () => {
    expect(planListRowSymbol('🧑‍💻 Deep work').symbol).toBe('🧑‍💻')
  })
})

describe('planListRowTimeInfo', () => {
  it('prints a range for a timed event with a duration', () => {
    const info = planListRowTimeInfo(planListBucketFixtures.ongoing)
    expect(info?.kind).toBe('timeRange')
  })

  it('prints a due caption for an untimed task', () => {
    const info = planListRowTimeInfo(planListBucketFixtures.untimedDueToday)
    expect(info).toEqual({
      kind: 'dueTime',
      date: planAt(16),
      duration: null,
    })
  })

  it('prints NOTHING for an all-day event — it has no clock time to print', () => {
    expect(planListRowTimeInfo(planListBucketFixtures.allDay)).toBeUndefined()
  })

  it('prints nothing at all for a row with no moment and no duration', () => {
    expect(planListRowTimeInfo(planListBucketFixtures.unscheduled)).toBeUndefined()
  })
})

describe('planListRowBadges', () => {
  it('carries the kind and only the kind — the row already has a tinted badge', () => {
    expect(planListRowBadges(planListBucketFixtures.untimedDueToday)).toEqual([
      { kind: 'endeavorKind', value: 'task' },
    ])
  })

  it('names an event as an event, so a mixed day reads at a glance', () => {
    expect(planListRowBadges(planListBucketFixtures.ongoing)).toEqual([
      { kind: 'endeavorKind', value: 'calendarEvent' },
    ])
  })

  it('never adds a status pill, unlike the Find row', () => {
    expect(planListRowBadges(planListBucketFixtures.past)).toHaveLength(1)
  })
})

describe('planListRowOpenLabel', () => {
  it('names the row it opens', () => {
    expect(planListRowOpenLabel('Deep work')).toBe('Open Deep work')
  })

  it('says "Untitled" rather than trailing off for a row with no title', () => {
    expect(planListRowOpenLabel('')).toBe('Open Untitled')
  })

  it('uses the emoji-stripped title, so the label reads as speech', () => {
    const lead = planListRowSymbol('🧾 File the expenses')
    expect(planListRowOpenLabel(lead.title)).toBe('Open File the expenses')
  })
})
