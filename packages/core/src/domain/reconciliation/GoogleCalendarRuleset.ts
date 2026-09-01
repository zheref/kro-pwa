/**
 * The Google Calendar classification table — KC-IS-#33's ruleset for KC-IS-#12's
 * pluggable machinery.
 *
 * `ProviderClassification.ts` predicted this file: *"#33 adds Google's as a
 * second value, and no code in this file changes."* It does not. This is one
 * `ProviderClassificationRuleset` value and one entry in
 * `defaultProviderRulesets`.
 *
 * ## What canon says
 *
 * Canon has **no** Google kind resolver — `AppleReminderKindResolver` is the only
 * one — because Google needs none: `GoogleCalendarEvent.swift`'s
 * `Endeavor.from(googleEvent:calendarName:)` hard-codes `kind: .calendarEvent`
 * on both the endeavor and its shadow. Every row Google produces is a calendar
 * event. That is the rule this table states, in the form `resolvedKind` can
 * apply to a row Google is *not* currently producing.
 *
 * ## Why the table is needed at all, if the mapper already sets the kind
 *
 * Because the mapper only runs on a **live fetch**. A row persisted from an
 * earlier fetch, or synced down from Kro Cloud, arrives with `hostedBy:
 * [local]` and a Google shadow, and its stored `kind` is whatever was written
 * then. `SourceReconciliation.md`'s rule is that the stored kind is *"a
 * compatibility fallback, not the final presentation kind"* — so the table is
 * what makes a persisted Google mirror still present as a calendar event, and
 * makes it do so identically on every device, which is the spec's promise.
 *
 * ## The two rows, and why the first one exists
 *
 * ```text
 *   unscheduled → keepStoredKind        (a row with no date is not an event)
 *   always      → calendarEvent
 * ```
 *
 * The `always` row is canon's rule. The `unscheduled` row above it is this
 * port's guard, and it is the conservative direction: `SourceIdentity` and
 * `EndeavorComputed` both treat a calendar event as start-driven, and canon's
 * own mapper *refuses to build one at all* without a start
 * (`guard let start = event.start?.resolvedDate() else { return nil }`).
 * Reclassifying a dateless row as an event would produce exactly the object
 * canon declines to create. `keepStoredKind` is the same conservative answer
 * the Apple table gives when its evidence is missing.
 *
 * ## Why `seriesRecurrenceBases` is empty
 *
 * `GoogleCalendarApiService` sets `singleEvents=true`, which asks Google to
 * expand a recurring series into discrete instances with distinct ids. Kro
 * therefore never sees a Google *series* — it sees occurrences — so no
 * recurrence base marks one, and `SeriesReconciliation`'s occurrence machinery
 * correctly does not engage for this provider. The Apple table's `daily`/
 * `weekly` entries exist because EventKit hands back the rule rather than the
 * expansion; Google's API does the expansion for us.
 *
 * An empty list also makes `isSeriesRecurrence` false for every Google row,
 * which is what keeps `sourceEvidenceRank` honest: a Google row's evidence is
 * rank 3 when it is provider-native and 0 otherwise, never the middle rungs
 * that only mean something for a provider with priority or series evidence.
 *
 * ## Precedence with the Apple table
 *
 * `rulesetFor` applies the **first** registered ruleset the row is linked to,
 * and Apple is registered first. A row linked to both — an Apple reminder the
 * user also mirrored to Google — therefore keeps resolving through Apple's
 * table, which is right: Apple's carries real evidence (priority, recurrence)
 * and Google's carries none.
 */
import { EndeavorHost } from '../endeavor/EndeavorHost'
import { EndeavorKind } from '../endeavor/EndeavorKind'
import type { RepeatBaseType } from '../endeavor/RepeatConfig'
import {
  type ProviderClassificationRuleset,
  classifyAs,
  keepStoredKind,
} from './ProviderClassification'

/** See the module note — Google expands series server-side. */
const noSeriesBases: readonly RepeatBaseType[] = []

export const googleCalendarRuleset: ProviderClassificationRuleset = {
  provider: EndeavorHost.googleCalendar,
  seriesRecurrenceBases: noSeriesBases,
  rules: [
    // A row with neither a date nor a time cannot be a calendar event — canon's
    // mapper will not build one. Stop here and keep what was stored.
    { when: { type: 'unscheduled' }, outcome: keepStoredKind() },

    // Canon's whole Google rule: everything Google hosts is a calendar event.
    {
      when: { type: 'always' },
      outcome: classifyAs(EndeavorKind.calendarEvent),
    },
  ],
}
