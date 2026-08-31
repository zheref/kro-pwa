/**
 * `Endeavor.Kind` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * The seven kinds an endeavor can be. **Immutable after creation**: canon
 * declares `public let kind: Kind` and `EndeavorFieldRelevance.isKindEditable`
 * is a hard `false`. The one path that replaces it is source resolution
 * (`withKind`, #12), which rebuilds the value rather than editing it.
 *
 * Flattened out of the `Endeavor` namespace and prefixed, because TypeScript
 * has no nested types on an interface — see the PR Notes for the full rename
 * table.
 */
import { assertNever } from '../../library/assertNever'

export const EndeavorKind = {
  background: 'background',
  behavior: 'behavior',
  blueprint: 'blueprint',
  calendarEvent: 'calendarEvent',
  habit: 'habit',
  reminder: 'reminder',
  task: 'task',
} as const

export type EndeavorKind = (typeof EndeavorKind)[keyof typeof EndeavorKind]

/** `Kind.allCases`, in canon declaration order (alphabetical, as written). */
export const endeavorKinds: readonly EndeavorKind[] = [
  EndeavorKind.background,
  EndeavorKind.behavior,
  EndeavorKind.blueprint,
  EndeavorKind.calendarEvent,
  EndeavorKind.habit,
  EndeavorKind.reminder,
  EndeavorKind.task,
]

/** `Kind(rawValue:)` — narrows a raw string, or `null` when it names no case. */
export const endeavorKindFromRawValue = (raw: string): EndeavorKind | null =>
  endeavorKinds.find((kind) => kind === raw) ?? null

/** `Kind.displayName`. Note `calendarEvent` renders as two words. */
export const endeavorKindDisplayName = (kind: EndeavorKind): string => {
  switch (kind) {
    case EndeavorKind.background:
      return 'Background'
    case EndeavorKind.behavior:
      return 'Behavior'
    case EndeavorKind.blueprint:
      return 'Blueprint'
    case EndeavorKind.calendarEvent:
      return 'Calendar Event'
    case EndeavorKind.habit:
      return 'Habit'
    case EndeavorKind.reminder:
      return 'Reminder'
    case EndeavorKind.task:
      return 'Task'
    default:
      return assertNever(kind)
  }
}
