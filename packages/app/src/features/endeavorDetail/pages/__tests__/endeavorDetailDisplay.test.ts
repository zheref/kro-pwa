/**
 * The display mapping, asserted against `#29`'s own fixtures.
 *
 * The point of these is the **placeholders**: canon says "No due date", not an
 * em dash, and a Detail row that prints nothing is indistinguishable from a row
 * whose value happens to be blank — which is the defect `PropertyRow`'s empty
 * case exists to prevent.
 */
import {
  EndeavorField,
  EndeavorKind,
  EndeavorRelation,
  EndeavorStatus,
  Month,
  PerformResolution,
  WeekDay,
  endeavorFields,
  makeEndeavor,
  makePerform,
  makeRepeatConfig,
  makeShadow,
  monthlyBase,
  weeklyBase,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { detailEndeavorMocks } from '../../EndeavorDetailMocks'
import {
  deferTitle,
  detailDateTime,
  fieldIcon,
  fieldLabel,
  fieldValue,
  headerChips,
  normalizedHex,
  performanceChips,
  performanceSummaryChips,
  relationIcon,
  relationLabel,
  relationSubtitle,
  relationSummary,
  repeatSummary,
  resolutionLabel,
  shadowChips,
  shadowTitle,
  tagLabel,
} from '../endeavorDetailDisplay'

const LOCALE = 'en-US'

describe('every field earns a label and a glyph', () => {
  it('names all thirteen fields, so a new one cannot render unlabelled', () => {
    for (const field of endeavorFields) {
      expect(fieldLabel(field).length).toBeGreaterThan(0)
      expect(fieldIcon(field).length).toBeGreaterThan(0)
    }
  })

  it("uses canon's own words where they differ from the domain name", () => {
    expect(fieldLabel(EndeavorField.sessionPoints)).toBe('Reward')
    expect(fieldLabel(EndeavorField.expiry)).toBe('Expires')
  })

  it('labels every tag with its human name rather than its wire letter', () => {
    expect(tagLabel('O')).toBe('On Desk')
    expect(tagLabel('E')).toBe('Engaging')
  })
})

describe('an unset field says WHY it is blank', () => {
  const sparse = makeEndeavor({
    id: 'sparse',
    title: 'Sparse',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
  })

  it('prints "No due date" rather than an em dash on an undated task', () => {
    expect(fieldValue(sparse, EndeavorField.due, LOCALE)).toEqual({
      kind: 'empty',
      placeholder: 'No due date',
    })
  })

  it('prints "Not rated" for an unscored value, not a zero-star rating', () => {
    expect(fieldValue(sparse, EndeavorField.effort, LOCALE)).toEqual({
      kind: 'empty',
      placeholder: 'Not rated',
    })
  })

  it('prints "Does not repeat" rather than an empty recurrence summary', () => {
    expect(fieldValue(sparse, EndeavorField.repeatConfig, LOCALE)).toEqual({
      kind: 'empty',
      placeholder: 'Does not repeat',
    })
  })
})

describe('a set field is formatted, not dumped', () => {
  it('renders status as a tinted, glyph-bearing chip — never bare text', () => {
    const value = fieldValue(
      detailEndeavorMocks.task,
      EndeavorField.status,
      LOCALE,
    )
    expect(value.kind).toBe('chip')
  })

  it('renders a duration in the app\'s own "30m" spelling', () => {
    expect(
      fieldValue(detailEndeavorMocks.task, EndeavorField.duration, LOCALE),
    ).toEqual({ kind: 'emphasis', text: '30m' })
  })

  it('renders a reward with its unit, so a bare 8 cannot read as an hour', () => {
    expect(
      fieldValue(detailEndeavorMocks.task, EndeavorField.sessionPoints, LOCALE),
    ).toEqual({ kind: 'emphasis', text: '8 pts' })
  })

  it("formats a date through the reader's locale, not a pinned one", () => {
    const value = fieldValue(
      detailEndeavorMocks.task,
      EndeavorField.due,
      'de-DE',
    )
    expect(value).toMatchObject({ kind: 'text' })
    if (value.kind === 'text') {
      expect(value.text).toBe(
        detailDateTime(detailEndeavorMocks.task.due!, 'de-DE'),
      )
    }
  })
})

describe('the associated colour', () => {
  it('accepts a six-digit hex and prints it uppercased', () => {
    const coloured = { ...detailEndeavorMocks.task, associatedColor: '#2a9d8f' }
    expect(fieldValue(coloured, EndeavorField.associatedColor, LOCALE)).toEqual(
      {
        kind: 'text',
        text: '#2A9D8F',
      },
    )
  })

  it('expands a three-digit shorthand the way canon does', () => {
    expect(normalizedHex('#0f8')).toBe('#00ff88')
  })

  it('refuses a malformed value rather than painting a black swatch', () => {
    expect(normalizedHex('nope')).toBeNull()
    const broken = { ...detailEndeavorMocks.task, associatedColor: 'nope' }
    expect(fieldValue(broken, EndeavorField.associatedColor, LOCALE)).toEqual({
      kind: 'empty',
      placeholder: 'No color',
    })
  })
})

describe('the recurrence summary reads as a sentence', () => {
  it('names the weekdays in Monday-first order, whatever order they were set in', () => {
    const config = makeRepeatConfig(
      weeklyBase([WeekDay.friday, WeekDay.monday, WeekDay.wednesday]),
    )
    expect(repeatSummary(config)).toBe('Weekly on Mon, Wed, Fri')
  })

  it('appends the multiplier only when it is more than every occurrence', () => {
    expect(repeatSummary(makeRepeatConfig(monthlyBase(1)))).toBe(
      'Monthly on day 1',
    )
    expect(repeatSummary(makeRepeatConfig(monthlyBase(1), 2))).toBe(
      'Monthly on day 1, every 2 months',
    )
  })

  it('degrades a weekly rule with no days chosen to plain "Weekly"', () => {
    expect(repeatSummary(makeRepeatConfig(weeklyBase([])))).toBe('Weekly')
  })

  it('spells a yearly rule with a short month name', () => {
    expect(
      repeatSummary(
        makeRepeatConfig({ type: 'yearly', day: 3, month: Month.july }),
      ),
    ).toBe('Yearly on Jul 3')
  })
})

describe('the relation cards', () => {
  it('labels and subtitles all four relations', () => {
    for (const relation of [
      EndeavorRelation.performances,
      EndeavorRelation.defers,
      EndeavorRelation.hosts,
      EndeavorRelation.shadows,
    ]) {
      expect(relationLabel(relation).length).toBeGreaterThan(0)
      expect(relationSubtitle(relation).length).toBeGreaterThan(0)
      expect(relationIcon(relation).length).toBeGreaterThan(0)
    }
  })

  it('counts sessions in words, singular included', () => {
    const one = {
      ...detailEndeavorMocks.task,
      performances: [
        makePerform({
          date: new Date(2026, 5, 18, 9),
          duration: 600,
          resolution: PerformResolution.complete,
        }),
      ],
    }
    expect(relationSummary(one, EndeavorRelation.performances)).toEqual({
      kind: 'text',
      text: '1 session logged',
    })
  })

  it('renders attached hosts as chips, so Detail and the Hosts screen agree', () => {
    const value = relationSummary(
      detailEndeavorMocks.task,
      EndeavorRelation.hosts,
    )
    expect(value.kind).toBe('chips')
  })

  it('says "Never deferred" rather than showing an empty history', () => {
    expect(
      relationSummary(detailEndeavorMocks.task, EndeavorRelation.defers),
    ).toEqual({ kind: 'empty', placeholder: 'Never deferred' })
  })
})

describe('the header chips', () => {
  it('always leads with the status, whatever else is set', () => {
    expect(headerChips(detailEndeavorMocks.habit)[0]?.id).toBe('status')
  })

  it('adds duration, reward and repeats only when they are set', () => {
    const ids = headerChips(detailEndeavorMocks.task).map((chip) => chip.id)
    expect(ids).toContain('duration')
    expect(ids).toContain('reward')
    expect(ids).not.toContain('repeats')
  })

  it('stays compact on a sparse endeavor rather than showing placeholders', () => {
    expect(headerChips(detailEndeavorMocks.blueprint)).toHaveLength(1)
  })
})

describe('the relation row projections', () => {
  const performance = makePerform({
    date: new Date(2026, 5, 18, 9),
    duration: 1500,
    resolution: PerformResolution.aborted,
    rewardPoints: 0,
  })

  it('leads a performance row with its resolution — the fact a log is scanned for', () => {
    expect(performanceChips(performance)[0]).toMatchObject({
      id: 'resolution',
      title: 'Aborted',
    })
  })

  it('totals the log so the header answers "how much" without adding up rows', () => {
    const chips = performanceSummaryChips([performance, performance])
    expect(chips.map((chip) => chip.title)).toEqual([
      '2 sessions',
      '50m',
      '0 pts',
    ])
  })

  it("names every resolution in canon's words", () => {
    expect(resolutionLabel(PerformResolution.finished)).toBe('Finished early')
  })

  it('falls back to the source identifier when a shadow has no title', () => {
    const shadow = makeShadow({
      originalTitle: '  ',
      sourceIdentifier: 'gcal-9',
      kind: EndeavorKind.calendarEvent,
      source: 'googleCalendar',
    })
    expect(shadowTitle(shadow)).toBe('gcal-9')
    expect(shadowChips(shadow).map((chip) => chip.id)).toEqual([
      'source',
      'kind',
    ])
  })

  it('adds the group chip only when the shadow carries one', () => {
    const shadow = makeShadow({
      originalTitle: 'Team sync',
      sourceIdentifier: 'gcal-1',
      kind: EndeavorKind.calendarEvent,
      source: 'googleCalendar',
      group: 'Work',
    })
    expect(shadowChips(shadow).map((chip) => chip.id)).toContain('group')
  })

  it('heads a defer row with the date it was pushed TO, not when it was made', () => {
    const target = new Date(2026, 5, 20, 9)
    expect(
      deferTitle({ made: new Date(2026, 5, 18), reason: null, target }, LOCALE),
    ).toBe(detailDateTime(target, LOCALE))
  })
})
