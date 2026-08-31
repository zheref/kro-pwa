import { describe, expect, it } from 'vitest'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { RepeatBaseType, makeRepeatConfig } from '../../endeavor/RepeatConfig'
import { appleRemindersRuleset } from '../AppleRemindersRuleset'
import {
  type ProviderClassificationRuleset,
  type SourceEvidence,
  classifyAs,
  classifyFromEvidence,
  isSeriesRecurrence,
  keepStoredKind,
  preferredRecurrence,
} from '../ProviderClassification'
import { recurrenceMocks } from '../__mocks__/Reconciliation.mocks'

const evidence = (params: Partial<SourceEvidence> = {}): SourceEvidence => ({
  recurrenceBase: params.recurrenceBase ?? null,
  priority: params.priority ?? null,
  hasScheduledDate: params.hasScheduledDate ?? true,
})

describe('the Apple Reminders decision table', () => {
  /**
   * The truth table the spec states, row for row. Every combination of the
   * three evidence axes that the rules discriminate between, with the stored
   * kind varied where it can matter.
   */
  const truthTable: readonly {
    readonly scenario: string
    readonly recurrenceBase: RepeatBaseType | null
    readonly priority: number | null
    readonly hasScheduledDate: boolean
    readonly storedKind: EndeavorKind
    readonly expected: EndeavorKind
  }[] = [
    // "any daily or weekly recurrence is a Habit, regardless of interval,
    // selected weekdays, priority, or scheduling"
    {
      scenario: 'a daily reminder with no priority is a habit',
      recurrenceBase: RepeatBaseType.daily,
      priority: 0,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.habit,
    },
    {
      scenario: 'a daily reminder with a high priority is still a habit',
      recurrenceBase: RepeatBaseType.daily,
      priority: 9,
      hasScheduledDate: true,
      storedKind: EndeavorKind.reminder,
      expected: EndeavorKind.habit,
    },
    {
      scenario: 'an unscheduled daily reminder is still a habit',
      recurrenceBase: RepeatBaseType.daily,
      priority: 1,
      hasScheduledDate: false,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.habit,
    },
    {
      scenario: 'a weekly reminder is a habit',
      recurrenceBase: RepeatBaseType.weekly,
      priority: 0,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.habit,
    },
    {
      scenario: 'a weekly reminder with no priority evidence is a habit',
      recurrenceBase: RepeatBaseType.weekly,
      priority: null,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.habit,
    },

    // "otherwise, a non-zero Apple priority makes it a Task"
    {
      scenario: 'a scheduled reminder with priority 1 is a task',
      recurrenceBase: null,
      priority: 1,
      hasScheduledDate: true,
      storedKind: EndeavorKind.reminder,
      expected: EndeavorKind.task,
    },
    {
      scenario: 'an unscheduled reminder with priority 1 is a task',
      recurrenceBase: null,
      priority: 1,
      hasScheduledDate: false,
      storedKind: EndeavorKind.reminder,
      expected: EndeavorKind.task,
    },

    // "otherwise, an item with neither a date nor a time is a Task"
    {
      scenario: 'an unscheduled reminder with no priority is a task',
      recurrenceBase: null,
      priority: 0,
      hasScheduledDate: false,
      storedKind: EndeavorKind.reminder,
      expected: EndeavorKind.task,
    },

    // "otherwise, it is a Reminder"
    {
      scenario: 'a scheduled reminder with no priority is a reminder',
      recurrenceBase: null,
      priority: 0,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.reminder,
    },

    // Monthly and yearly "fall through the remaining priority and scheduling
    // rules" — they are recurrences, but not series recurrences.
    {
      scenario: 'a scheduled monthly reminder with no priority is a reminder',
      recurrenceBase: RepeatBaseType.monthly,
      priority: 0,
      hasScheduledDate: true,
      storedKind: EndeavorKind.habit,
      expected: EndeavorKind.reminder,
    },
    {
      scenario: 'a scheduled monthly reminder with a priority is a task',
      recurrenceBase: RepeatBaseType.monthly,
      priority: 5,
      hasScheduledDate: true,
      storedKind: EndeavorKind.habit,
      expected: EndeavorKind.task,
    },
    {
      scenario: 'a scheduled yearly reminder with no priority is a reminder',
      recurrenceBase: RepeatBaseType.yearly,
      priority: 0,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.reminder,
    },

    // The evidence gate: no priority evidence, no reclassification.
    {
      scenario: 'a legacy scheduled shadow keeps its stored task kind',
      recurrenceBase: null,
      priority: null,
      hasScheduledDate: true,
      storedKind: EndeavorKind.task,
      expected: EndeavorKind.task,
    },
    {
      scenario: 'a legacy unscheduled shadow keeps its stored reminder kind',
      recurrenceBase: null,
      priority: null,
      hasScheduledDate: false,
      storedKind: EndeavorKind.reminder,
      expected: EndeavorKind.reminder,
    },
    {
      scenario: 'a legacy monthly shadow keeps its stored kind',
      recurrenceBase: RepeatBaseType.monthly,
      priority: null,
      hasScheduledDate: true,
      storedKind: EndeavorKind.habit,
      expected: EndeavorKind.habit,
    },
  ]

  it.each(truthTable)(
    'classifies: $scenario',
    ({ recurrenceBase, priority, hasScheduledDate, storedKind, expected }) => {
      expect(
        classifyFromEvidence(
          appleRemindersRuleset,
          evidence({ recurrenceBase, priority, hasScheduledDate }),
          storedKind,
        ),
      ).toBe(expected)
    },
  )

  it('treats an explicit zero priority as evidence, not as absence', () => {
    // The three-way distinction `Shadow.appleReminderPriority` documents: `0`
    // runs the table (and yields reminder), `null` stops it.
    const scheduled = { recurrenceBase: null, hasScheduledDate: true }
    expect(
      classifyFromEvidence(
        appleRemindersRuleset,
        evidence({ ...scheduled, priority: 0 }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.reminder)
    expect(
      classifyFromEvidence(
        appleRemindersRuleset,
        evidence({ ...scheduled, priority: null }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.task)
  })

  it('resolves every stored kind to habit under a daily recurrence', () => {
    // Canon asserts this across stored kinds and priorities; the point is that
    // recurrence is checked before both the gate and the stored kind.
    for (const storedKind of [
      EndeavorKind.task,
      EndeavorKind.reminder,
      EndeavorKind.habit,
    ]) {
      for (const priority of [0, 1, 9, null]) {
        expect(
          classifyFromEvidence(
            appleRemindersRuleset,
            evidence({ recurrenceBase: RepeatBaseType.daily, priority }),
            storedKind,
          ),
        ).toBe(EndeavorKind.habit)
      }
    }
  })
})

describe('series recurrence', () => {
  it('recognizes daily and weekly as Apple series recurrences', () => {
    expect(
      isSeriesRecurrence(appleRemindersRuleset, recurrenceMocks.daily),
    ).toBe(true)
    expect(
      isSeriesRecurrence(appleRemindersRuleset, recurrenceMocks.weekly),
    ).toBe(true)
  })

  it('does not treat monthly or yearly as a series recurrence', () => {
    expect(
      isSeriesRecurrence(appleRemindersRuleset, recurrenceMocks.monthly),
    ).toBe(false)
    expect(
      isSeriesRecurrence(appleRemindersRuleset, recurrenceMocks.yearly),
    ).toBe(false)
  })

  it('never treats an absent recurrence as a series', () => {
    expect(isSeriesRecurrence(appleRemindersRuleset, null)).toBe(false)
  })

  it('ignores the everyOther multiplier — "regardless of interval"', () => {
    expect(
      isSeriesRecurrence(
        appleRemindersRuleset,
        makeRepeatConfig(recurrenceMocks.daily.base, 3),
      ),
    ).toBe(true)
  })
})

describe('preferredRecurrence', () => {
  it('prefers a daily rule over a weekly one, whatever the source order', () => {
    expect(
      preferredRecurrence(appleRemindersRuleset, [
        recurrenceMocks.weekly,
        recurrenceMocks.daily,
      ]),
    ).toBe(recurrenceMocks.daily)
  })

  it('prefers weekly over monthly when no daily rule is offered', () => {
    expect(
      preferredRecurrence(appleRemindersRuleset, [
        recurrenceMocks.monthly,
        recurrenceMocks.weekly,
      ]),
    ).toBe(recurrenceMocks.weekly)
  })

  it('falls back to the first rule when none is a series recurrence', () => {
    expect(
      preferredRecurrence(appleRemindersRuleset, [
        recurrenceMocks.monthly,
        recurrenceMocks.yearly,
      ]),
    ).toBe(recurrenceMocks.monthly)
  })

  it('returns null when the provider offered no rules at all', () => {
    expect(preferredRecurrence(appleRemindersRuleset, [])).toBeNull()
  })
})

describe('the machinery is provider-neutral', () => {
  /**
   * The whole point of moving the table into data: a second provider with
   * entirely different rules needs no new code. This synthetic ruleset inverts
   * Apple's — monthly is its series recurrence, and it has no evidence gate.
   */
  const invertedRuleset: ProviderClassificationRuleset = {
    provider: 'syntheticProvider',
    seriesRecurrenceBases: [RepeatBaseType.monthly],
    rules: [
      {
        when: { type: 'seriesRecurrence' },
        outcome: classifyAs(EndeavorKind.behavior),
      },
      {
        when: { type: 'unscheduled' },
        outcome: classifyAs(EndeavorKind.blueprint),
      },
      {
        when: { type: 'always' },
        outcome: classifyAs(EndeavorKind.background),
      },
    ],
  }

  it('applies a different provider’s series base', () => {
    expect(
      classifyFromEvidence(
        invertedRuleset,
        evidence({ recurrenceBase: RepeatBaseType.monthly }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.behavior)
  })

  it('does not apply Apple’s series bases to another provider', () => {
    expect(
      classifyFromEvidence(
        invertedRuleset,
        evidence({ recurrenceBase: RepeatBaseType.daily }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.background)
  })

  it('runs a table with no evidence gate without keeping the stored kind', () => {
    expect(
      classifyFromEvidence(
        invertedRuleset,
        evidence({ priority: null, hasScheduledDate: false }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.blueprint)
  })

  it('falls back to the stored kind when a table matches nothing', () => {
    const emptyRuleset: ProviderClassificationRuleset = {
      provider: 'emptyProvider',
      seriesRecurrenceBases: [],
      rules: [],
    }
    expect(
      classifyFromEvidence(emptyRuleset, evidence(), EndeavorKind.habit),
    ).toBe(EndeavorKind.habit)
  })

  it('stops at a keepStoredKind row rather than falling through', () => {
    // The load-bearing short circuit: a table whose gate matches must not
    // reach the `always` row beneath it.
    const gatedRuleset: ProviderClassificationRuleset = {
      provider: 'gatedProvider',
      seriesRecurrenceBases: [],
      rules: [
        {
          when: { type: 'evidenceMissing', key: 'priority' },
          outcome: keepStoredKind(),
        },
        {
          when: { type: 'always' },
          outcome: classifyAs(EndeavorKind.reminder),
        },
      ],
    }
    expect(
      classifyFromEvidence(
        gatedRuleset,
        evidence({ priority: null }),
        EndeavorKind.blueprint,
      ),
    ).toBe(EndeavorKind.blueprint)
    expect(
      classifyFromEvidence(
        gatedRuleset,
        evidence({ priority: 0 }),
        EndeavorKind.blueprint,
      ),
    ).toBe(EndeavorKind.reminder)
  })
})
