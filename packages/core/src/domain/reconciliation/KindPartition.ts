/**
 * `partitionedByKindResolvingShadows` — canon
 * `KroCore/Model/Endeavor/Endeavor+KindPartition.swift`.
 *
 * Splitting a reconciled list into the per-kind channels a surface consumes,
 * with the one wrinkle a naive `filter(kind === …)` gets wrong: **the same
 * logical endeavor can arrive twice, under two different kinds.**
 *
 * Canon's own framing: a stale local mirror can disagree with a fresh external
 * row while synchronization settles. Identity merging collapses the pair when
 * they share an `id` — the common case — but not when Kro's row was created
 * independently and linked by shadow only. Left unresolved, one habit is
 * presented twice: once as a habit and once as a task.
 *
 * The tie is resolved in favour of the **habit**, matching the presentation
 * rules: *"daily and weekly Apple Reminders appear under Habits … [and] never
 * appear in the priority matrix or its task picker."* A task channel that let
 * one through would put a habit in the matrix by the back door.
 *
 * #7 deferred this here explicitly (its PR lists `resolvedKind`,
 * `partitionedByKindResolvingShadows` and `EndeavorSourceResolution` as #12's).
 *
 * **Kinds outside the four channels are dropped on purpose** — `blueprint`,
 * `behavior` and `background` have no channel asking for them. That is canon's
 * comment verbatim, and it is why this returns a record of four lists rather
 * than a grouping keyed by every kind.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import { EndeavorKind } from '../endeavor/EndeavorKind'
import {
  type ReconciliationContext,
  defaultReconciliationContext,
} from './ReconciliationContext'
import { resolvedKind } from './ResolvedKind'

export interface KindPartition {
  /** Actionable task kinds, minus anything a habit already claims. */
  readonly tasks: readonly Endeavor[]
  /** Reminder notices, minus anything a habit already claims. */
  readonly reminders: readonly Endeavor[]
  /** Resolved calendar events. */
  readonly events: readonly Endeavor[]
  /** Resolved habits, and nothing else. */
  readonly habits: readonly Endeavor[]
}

/**
 * Every identifier a row claims, for the habit-shadowing check: its own `id`
 * plus every non-empty shadow identifier.
 *
 * Note this is a **bare-string** set, not the `(source, identifier)` pairs
 * `SourceIdentity` uses — canon's `Set<String>` here, deliberately kept. The
 * two rules differ: identity matching must never let two providers collide,
 * while this one asks a narrower question about rows already reconciled
 * together, where the extra strictness would only cause a habit to be
 * presented twice. Widening it to pairs would be a behaviour change, not a
 * tidy-up.
 */
const claimedIdentifiers = (endeavor: Endeavor): readonly string[] => {
  const result: string[] = []
  if (endeavor.id !== '') result.push(endeavor.id)
  for (const shadow of endeavor.shadows ?? []) {
    if (shadow.sourceIdentifier !== '') result.push(shadow.sourceIdentifier)
  }
  return result
}

/**
 * Split into task / reminder / event / habit channels, dropping any task or
 * reminder that is really an external mirror of a habit.
 *
 * Every channel keys on `resolvedKind`, never the stored kind — *"Kind filters
 * always evaluate the resolved classification rather than the last stored
 * fallback."*
 *
 * The empty-habits fast path is canon's, and worth keeping: it skips building
 * the identity set entirely, which is the overwhelmingly common case (most
 * days have no habits at all).
 */
export const partitionByKindResolvingShadows = (
  endeavors: readonly Endeavor[],
  context: ReconciliationContext = defaultReconciliationContext(),
): KindPartition => {
  const kinds = endeavors.map((endeavor) => resolvedKind(endeavor, context))
  const isKind = (index: number, kind: EndeavorKind): boolean =>
    kinds[index] === kind

  const habits = endeavors.filter((_, index) =>
    isKind(index, EndeavorKind.habit),
  )
  const events = endeavors.filter((_, index) =>
    isKind(index, EndeavorKind.calendarEvent),
  )

  if (habits.length === 0) {
    return {
      tasks: endeavors.filter((_, index) => isKind(index, EndeavorKind.task)),
      reminders: endeavors.filter((_, index) =>
        isKind(index, EndeavorKind.reminder),
      ),
      events,
      habits: [],
    }
  }

  const habitIdentifiers = new Set<string>()
  for (const habit of habits) {
    for (const identifier of claimedIdentifiers(habit)) {
      habitIdentifiers.add(identifier)
    }
  }

  const isNotClaimedByHabit = (endeavor: Endeavor): boolean =>
    !claimedIdentifiers(endeavor).some((identifier) =>
      habitIdentifiers.has(identifier),
    )

  return {
    tasks: endeavors.filter(
      (endeavor, index) =>
        isKind(index, EndeavorKind.task) && isNotClaimedByHabit(endeavor),
    ),
    reminders: endeavors.filter(
      (endeavor, index) =>
        isKind(index, EndeavorKind.reminder) && isNotClaimedByHabit(endeavor),
    ),
    events,
    habits,
  }
}

/**
 * Whether a row may be admitted to the priority matrix.
 *
 * *"Priority-matrix admission depends only on the final resolved kind, never
 * on where an endeavor is hosted. Tasks and externally tracked Tickets are
 * eligible; Habits, Reminders, Events, and other kinds are not."*
 *
 * Kro's kind set has no "Ticket" member — that is a KroApple concept with no
 * ported counterpart — so admission is `task` alone today. Named here rather
 * than inlined into the matrix surface so the rule has one home when #25 and
 * #20 both need it.
 */
export const isEligibleForPriorityMatrix = (
  endeavor: Endeavor,
  context: ReconciliationContext = defaultReconciliationContext(),
): boolean => resolvedKind(endeavor, context) === EndeavorKind.task
