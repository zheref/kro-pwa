/**
 * The Apple table asserted **as data**.
 *
 * `ProviderClassification.test.ts` proves the machinery decides correctly for
 * any table; this file proves the shipped Apple table is the one canon
 * specifies — its rows, their order, and the structural properties the rules
 * depend on. A table is data, so it can drift silently; these assertions are
 * what make that drift fail.
 */
import { describe, expect, it } from 'vitest'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { RepeatBaseType } from '../../endeavor/RepeatConfig'
import {
  appleRemindersRuleset,
  defaultProviderRulesets,
} from '../AppleRemindersRuleset'
import { googleCalendarRuleset } from '../GoogleCalendarRuleset'
import { classifyFromEvidence } from '../ProviderClassification'

describe('the shipped Apple table', () => {
  it('is registered against the Apple Reminders host', () => {
    expect(appleRemindersRuleset.provider).toBe(EndeavorHost.appleReminders)
  })

  it('names daily and weekly as its series recurrences, in that order', () => {
    // Order is also preference order for `preferredRecurrence`.
    expect(appleRemindersRuleset.seriesRecurrenceBases).toEqual([
      RepeatBaseType.daily,
      RepeatBaseType.weekly,
    ])
  })

  it('excludes monthly and yearly from its series recurrences', () => {
    expect(appleRemindersRuleset.seriesRecurrenceBases).not.toContain(
      RepeatBaseType.monthly,
    )
    expect(appleRemindersRuleset.seriesRecurrenceBases).not.toContain(
      RepeatBaseType.yearly,
    )
  })

  it('ships the spec’s four rows plus the evidence gate, in order', () => {
    expect(
      appleRemindersRuleset.rules.map((rule) => [
        rule.when.type,
        rule.outcome.type === 'kind' ? rule.outcome.kind : 'keepStoredKind',
      ]),
    ).toEqual([
      ['seriesRecurrence', EndeavorKind.habit],
      ['evidenceMissing', 'keepStoredKind'],
      ['hasPriority', EndeavorKind.task],
      ['unscheduled', EndeavorKind.task],
      ['always', EndeavorKind.reminder],
    ])
  })

  it('places the recurrence row above the evidence gate', () => {
    // If the gate came first, a legacy daily shadow would keep a stale `task`
    // kind — contradicting "Recurrence remains sufficient to resolve a cached
    // item as a Habit".
    const seriesIndex = appleRemindersRuleset.rules.findIndex(
      (rule) => rule.when.type === 'seriesRecurrence',
    )
    const gateIndex = appleRemindersRuleset.rules.findIndex(
      (rule) => rule.when.type === 'evidenceMissing',
    )
    expect(seriesIndex).toBe(0)
    expect(gateIndex).toBeGreaterThan(seriesIndex)
  })

  it('gates on priority evidence specifically', () => {
    const gate = appleRemindersRuleset.rules.find(
      (rule) => rule.when.type === 'evidenceMissing',
    )
    expect(gate?.when).toEqual({ type: 'evidenceMissing', key: 'priority' })
  })

  it('ends in a terminal always row, so the table is total', () => {
    const last = appleRemindersRuleset.rules.at(-1)
    expect(last?.when.type).toBe('always')
  })

  it('never yields a kind outside habit, task and reminder', () => {
    // Apple Reminders cannot produce an event, blueprint, behavior or
    // background — those are not reminder shapes.
    const kinds = appleRemindersRuleset.rules
      .map((rule) => (rule.outcome.type === 'kind' ? rule.outcome.kind : null))
      .filter((kind): kind is EndeavorKind => kind !== null)
    expect(new Set(kinds)).toEqual(
      new Set([EndeavorKind.habit, EndeavorKind.task, EndeavorKind.reminder]),
    )
  })

  it('is total over every evidence combination it can be handed', () => {
    // No input may fall off the end of the table into the defensive fallback
    // *except* through the explicit gate — a property only a data table can
    // lose by accident.
    for (const recurrenceBase of [
      null,
      RepeatBaseType.daily,
      RepeatBaseType.weekly,
      RepeatBaseType.monthly,
      RepeatBaseType.yearly,
    ]) {
      for (const priority of [null, 0, 1, 9]) {
        for (const hasScheduledDate of [true, false]) {
          const result = classifyFromEvidence(
            appleRemindersRuleset,
            { recurrenceBase, priority, hasScheduledDate },
            EndeavorKind.blueprint,
          )
          // `blueprint` is the sentinel stored kind: seeing it back means the
          // gate fired, which is only legitimate when priority evidence is
          // absent and the recurrence is not a series one.
          if (result === EndeavorKind.blueprint) {
            expect(priority).toBeNull()
            expect([RepeatBaseType.daily, RepeatBaseType.weekly]).not.toContain(
              recurrenceBase,
            )
          }
        }
      }
    }
  })
})

describe('the default ruleset registry', () => {
  it('contains the Apple table then the Google one', () => {
    // Order is precedence order (`rulesetFor` takes the first match), and
    // Apple leads deliberately: its table reads real evidence where Google's
    // reads none. See `GoogleCalendarRuleset.ts`.
    expect(defaultProviderRulesets).toEqual([
      appleRemindersRuleset,
      googleCalendarRuleset,
    ])
  })

  it('registers each provider at most once', () => {
    const providers = defaultProviderRulesets.map((ruleset) => ruleset.provider)
    expect(new Set(providers).size).toBe(providers.length)
  })

  it('names only providers that exist as hosts', () => {
    // A table keyed to a provider string no `EndeavorHost` uses could never
    // match a row, and would fail silently.
    const hosts = new Set<string>(Object.values(EndeavorHost))
    for (const ruleset of defaultProviderRulesets) {
      expect(hosts.has(ruleset.provider)).toBe(true)
    }
  })

  it('registers Google Calendar — KC-IS-#33', () => {
    expect(
      defaultProviderRulesets.some(
        (ruleset) => ruleset.provider === EndeavorHost.googleCalendar,
      ),
    ).toBe(true)
  })

  it('still leaves Apple with the higher precedence of the two', () => {
    // A row mirrored to both providers resolves through Apple's table, which
    // carries priority and recurrence evidence Google's cannot.
    const providers = defaultProviderRulesets.map((ruleset) => ruleset.provider)
    expect(providers.indexOf(EndeavorHost.appleReminders)).toBeLessThan(
      providers.indexOf(EndeavorHost.googleCalendar),
    )
  })
})
