/**
 * The Google table asserted **as data**, plus its truth table run through the
 * real machinery.
 *
 * Same split as `AppleRemindersRuleset.test.ts`:
 * `ProviderClassification.test.ts` proves the engine decides correctly for any
 * table; this file proves the shipped Google table is the one canon implies —
 * its two rows, their order, and what they resolve to for every combination of
 * evidence a Google row can carry.
 */
import { describe, expect, it } from 'vitest'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { googleCalendarRuleset } from '../GoogleCalendarRuleset'
import {
  type SourceEvidence,
  classifyFromEvidence,
  isSeriesRecurrence,
} from '../ProviderClassification'
import { recurrenceMocks } from '../__mocks__/Reconciliation.mocks'

describe('the shipped Google Calendar table', () => {
  it('is registered against the Google Calendar host', () => {
    expect(googleCalendarRuleset.provider).toBe(EndeavorHost.googleCalendar)
  })

  it('declares no series recurrence bases — Google expands series itself', () => {
    // `singleEvents=true` on the events request means Kro never sees a Google
    // series, only its occurrences. A base listed here would make
    // `SeriesReconciliation` engage on rows that are already expanded.
    expect(googleCalendarRuleset.seriesRecurrenceBases).toEqual([])
  })

  it('ends in a terminal `always` row so no row falls through the table', () => {
    const last =
      googleCalendarRuleset.rules[googleCalendarRuleset.rules.length - 1]
    expect(last?.when).toEqual({ type: 'always' })
    expect(last?.outcome).toEqual({
      type: 'kind',
      kind: EndeavorKind.calendarEvent,
    })
  })

  it('guards the unscheduled case ABOVE the terminal row', () => {
    // Order is the whole rule: an unscheduled row must stop at
    // `keepStoredKind` before the `always` row can call it an event. Canon's
    // mapper refuses to build an event without a start for the same reason.
    expect(googleCalendarRuleset.rules[0]?.when).toEqual({
      type: 'unscheduled',
    })
    expect(googleCalendarRuleset.rules[0]?.outcome).toEqual({
      type: 'keepStoredKind',
    })
  })

  it('treats no recurrence base as a series', () => {
    for (const recurrence of Object.values(recurrenceMocks)) {
      expect(isSeriesRecurrence(googleCalendarRuleset, recurrence)).toBe(false)
    }
    expect(isSeriesRecurrence(googleCalendarRuleset, null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The truth table, through `classifyFromEvidence`
// ---------------------------------------------------------------------------

const evidence = (params: Partial<SourceEvidence> = {}): SourceEvidence => ({
  recurrenceBase: params.recurrenceBase ?? null,
  priority: params.priority ?? null,
  hasScheduledDate: params.hasScheduledDate ?? true,
})

describe('classifying a Google-linked row', () => {
  it('resolves a scheduled row to a calendar event (the ordinary meeting)', () => {
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence({ hasScheduledDate: true }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.calendarEvent)
  })

  it('resolves a stale mirror stored as a task back to a calendar event', () => {
    // The row Kro persisted last week says `task`; the spec says the stored
    // kind is a compatibility fallback, so the presented kind is recomputed.
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence(),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.calendarEvent)
  })

  it('leaves an unscheduled row exactly as it was stored (no date, no event)', () => {
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence({ hasScheduledDate: false }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.task)
  })

  it('keeps an unscheduled habit a habit rather than promoting it', () => {
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence({ hasScheduledDate: false, recurrenceBase: 'daily' }),
        EndeavorKind.habit,
      ),
    ).toBe(EndeavorKind.habit)
  })

  it('ignores a recurrence base entirely when the row is scheduled', () => {
    // Google supplies no series evidence, so a repeat config on a Google row
    // says nothing about its kind — it is still the occurrence of an event.
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence({ recurrenceBase: 'weekly' }),
        EndeavorKind.reminder,
      ),
    ).toBe(EndeavorKind.calendarEvent)
  })

  it('ignores priority evidence, which Google never supplies', () => {
    // Belt and braces: even if some other provider's shadow put a priority on
    // the row, Google's table has no `hasPriority` row to read it.
    expect(
      classifyFromEvidence(
        googleCalendarRuleset,
        evidence({ priority: 9 }),
        EndeavorKind.task,
      ),
    ).toBe(EndeavorKind.calendarEvent)
  })

  it('is idempotent — a row already resolved stays resolved', () => {
    const once = classifyFromEvidence(
      googleCalendarRuleset,
      evidence(),
      EndeavorKind.calendarEvent,
    )
    const twice = classifyFromEvidence(googleCalendarRuleset, evidence(), once)
    expect(twice).toBe(EndeavorKind.calendarEvent)
  })
})
