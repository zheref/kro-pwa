/**
 * The Apple Reminders classification table — canon's rules, as **data**.
 *
 * `docs/Features/SourceReconciliation.md`, verbatim:
 *
 * > For Apple Reminders:
 * > - any daily or weekly recurrence is a Habit, regardless of interval,
 * >   selected weekdays, priority, or scheduling;
 * > - otherwise, a non-zero Apple priority makes it a Task;
 * > - otherwise, an item with neither a date nor a time is a Task;
 * > - otherwise, it is a Reminder.
 *
 * plus the evidence gate the same document states one paragraph later: an
 * older cached shadow without priority evidence *"keeps the last stored kind
 * rather than inventing a priority"* — while recurrence alone still resolves a
 * Habit, which is why the series row sits **above** the gate.
 *
 * ## Why Apple ships in a web repo that cannot host Apple
 *
 * Epic #1 puts Apple EventKit hosts out of scope on the web — there is no
 * browser counterpart, and Kro Web will never *fetch* from Apple Reminders.
 * But an endeavor synced down from Kro Cloud can carry `appleReminders` in its
 * `hostedBy` and an Apple shadow in its `shadows`, because it was mirrored on
 * the user's phone. The spec's promise is that *"the same item reconciles
 * identically everywhere"*, so the table has to be here for that row to
 * resolve to the same kind the phone shows. It is a **provided ruleset**, not
 * a hosting capability.
 *
 * Adding Google (#33) is one more value of this shape and no change here.
 */
import { EndeavorHost } from '../endeavor/EndeavorHost'
import { EndeavorKind } from '../endeavor/EndeavorKind'
import { RepeatBaseType } from '../endeavor/RepeatConfig'
import {
  type ProviderClassificationRuleset,
  SourceEvidenceKey,
  classifyAs,
  keepStoredKind,
} from './ProviderClassification'

export const appleRemindersRuleset: ProviderClassificationRuleset = {
  provider: EndeavorHost.appleReminders,

  /**
   * *"Daily and weekly Apple recurrence are habit evidence. Monthly and yearly
   * reminders fall through the ordinary task/reminder decision table."*
   * Order is also preference order for `preferredRecurrence`.
   */
  seriesRecurrenceBases: [RepeatBaseType.daily, RepeatBaseType.weekly],

  rules: [
    // Recurrence outranks everything, and outranks the evidence gate below —
    // a legacy shadow with no priority still resolves to a habit.
    {
      when: { type: 'seriesRecurrence' },
      outcome: classifyAs(EndeavorKind.habit),
    },

    // The gate. Not "skip this row": evaluation stops and the stored kind
    // stands. See `ProviderClassification.ts` for why this is an outcome.
    {
      when: { type: 'evidenceMissing', key: SourceEvidenceKey.priority },
      outcome: keepStoredKind(),
    },

    // "a non-zero Apple priority makes it a Task"
    { when: { type: 'hasPriority' }, outcome: classifyAs(EndeavorKind.task) },

    // "an item with neither a date nor a time is a Task"
    { when: { type: 'unscheduled' }, outcome: classifyAs(EndeavorKind.task) },

    // "otherwise, it is a Reminder"
    { when: { type: 'always' }, outcome: classifyAs(EndeavorKind.reminder) },
  ],
}

/**
 * The rulesets in force by default. One entry today; #33 appends Google's.
 *
 * Order is meaningful: `resolvedKind` applies the **first** registered ruleset
 * whose provider the endeavor is linked to, so a row linked to two classifying
 * providers resolves deterministically rather than by object-key order.
 */
export const defaultProviderRulesets: readonly ProviderClassificationRuleset[] =
  [appleRemindersRuleset]
