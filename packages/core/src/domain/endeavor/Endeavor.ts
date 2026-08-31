/**
 * `Endeavor` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * The single domain vocabulary every other Kro surface consumes: a unit of
 * intent, whatever its shape — a task, a calendar event, a habit, a reminder,
 * or one of the three meta kinds.
 *
 * ## What the port changes, and why
 *
 * Swift gets immutability from **value semantics**: `Endeavor` is a `struct`,
 * so `var copy = self` is a copy and mutating it cannot be observed by anyone
 * else. TypeScript objects are references, so the same guarantee has to be
 * spelled out: every property is `readonly`, every array is `readonly T[]`,
 * and every mutation is a pure `with…` helper in `EndeavorMutations` that
 * returns a **new** object. `Object.freeze` is deliberately not used —
 * `readonly` is a compile-time contract with no runtime cost, and freezing
 * would make the domain tier's cost scale with the size of the day's list.
 *
 * `kind` is `readonly` for the same reason canon writes `let kind: Kind`: it
 * is fixed at creation. `EndeavorFieldRelevance.isKindEditable` is `false` for
 * every kind, and the one path that replaces it (`withKind`, for source
 * resolution) rebuilds the value rather than editing it.
 *
 * Optionals are `T | null`, never `T | undefined` and never an omitted
 * property. Canon distinguishes "no shadows" (`nil`) from "an empty shadow
 * list" (`[]`) — `withRemovedShadow` normalizes back to `nil` when the last
 * one goes — so the difference is real and a `?:` optional property would blur
 * it against a key that was simply never written.
 *
 * Neither a clock nor a UUID source exists in this tier (`lib: ["ES2022"]`,
 * `types: []`), so canon's `id: String = UUID().uuidString` and
 * `created_at: Date? = Date()` defaults cannot cross: `id` is **required** and
 * `createdAt` is passed by the caller. The app tier owns identity and time.
 */
import type { AnyEndeavorList } from '../shared/EndeavorList'
import type { Owner } from '../shared/Owner'
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { Defer } from './Defer'
import type { EndeavorHost } from './EndeavorHost'
import { type EndeavorKind, EndeavorKind as Kind } from './EndeavorKind'
import { type EndeavorStatus, EndeavorStatus as Status } from './EndeavorStatus'
import type { EndeavorTag } from './EndeavorTag'
import type { Perform } from './Perform'
import type { RepeatConfig } from './RepeatConfig'
import type { Shadow } from './Shadow'

export interface Endeavor {
  readonly id: string
  readonly title: string
  /** Fixed at creation — never editable, for any kind. */
  readonly kind: EndeavorKind
  readonly status: EndeavorStatus
  /** Reward points this endeavor is worth. Kro-enhanced field. */
  readonly sessionPoints: number | null

  readonly start: Date | null
  readonly duration: TimeIntervalSeconds | null
  /** Optional lower bound applied to empirical session recommendations. */
  readonly minimumDuration: TimeIntervalSeconds | null
  /** Optional upper bound applied to empirical session recommendations. */
  readonly maximumDuration: TimeIntervalSeconds | null
  readonly repeatConfig: RepeatConfig | null

  readonly due: Date | null
  readonly defers: readonly Defer[]
  readonly performances: readonly Perform[]
  /** The host-native completion timestamp. `null` while still open. */
  readonly completed: Date | null

  /**
   * Subjective 1–5 score: how much addressing this endeavor brings to the
   * user's life and goals. `null` means the user has not rated it. Set from
   * Triage. Not natively supported by external hosts — a **Kro-enhanced**
   * field per `docs/Features/KroEnhanced.md`.
   */
  readonly value: number | null

  /**
   * Subjective 1–5 score: how hard the endeavor is expected to be. `null`
   * means unrated. Kro-enhanced field.
   */
  readonly effort: number | null

  /**
   * Moment after which the endeavor is no longer relevant. **Distinct from
   * `due`**, which is the scheduled time: a task due at 9am with a 5pm expiry
   * should be done at 9am but is permitted to slip until 5pm. `null` means no
   * expiry. Kro-enhanced field.
   */
  readonly expiry: Date | null

  /** RGB hex, no alpha. Kro-enhanced field. */
  readonly associatedColor: string | null
  readonly projectId: string | null

  readonly createdAt: Date | null
  readonly updatedAt: Date | null

  readonly isDraft: boolean
  /** `null` (never tagged) is distinct from `[]` (tags all removed). */
  readonly tags: readonly EndeavorTag[] | null
  /** `null` (not mirrored) is distinct from `[]`; canon normalizes to `null`. */
  readonly shadows: readonly Shadow[] | null

  readonly owner: Owner | null
  readonly list: AnyEndeavorList | null
  readonly hostedBy: readonly EndeavorHost[]

  /** Transient UI bookkeeping canon carries on the model. Never persisted. */
  readonly errorMessages: readonly string[]
  /** Transient in-flight flag canon carries on the model. Never persisted. */
  readonly inActivity: boolean
}

/** The arguments `makeEndeavor` accepts — canon's `internal init`, widened. */
export interface EndeavorDraft {
  readonly id: string
  readonly title: string
  readonly kind: EndeavorKind
  readonly status?: EndeavorStatus
  readonly sessionPoints?: number | null
  readonly start?: Date | null
  readonly duration?: TimeIntervalSeconds | null
  readonly minimumDuration?: TimeIntervalSeconds | null
  readonly maximumDuration?: TimeIntervalSeconds | null
  readonly repeatConfig?: RepeatConfig | null
  readonly due?: Date | null
  readonly defers?: readonly Defer[]
  readonly performances?: readonly Perform[]
  readonly completed?: Date | null
  readonly value?: number | null
  readonly effort?: number | null
  readonly expiry?: Date | null
  readonly associatedColor?: string | null
  readonly projectId?: string | null
  readonly createdAt?: Date | null
  readonly updatedAt?: Date | null
  readonly isDraft?: boolean
  readonly tags?: readonly EndeavorTag[] | null
  readonly shadows?: readonly Shadow[] | null
  readonly owner?: Owner | null
  readonly list?: AnyEndeavorList | null
  readonly hostedBy?: readonly EndeavorHost[]
  readonly errorMessages?: readonly string[]
  readonly inActivity?: boolean
}

/**
 * The general constructor — canon's `internal init`, carrying every default it
 * declares (`status: .pending`, empty relation arrays, `isDraft: false`).
 *
 * `createdAt` defaults to `null` rather than canon's `Date()`: there is no
 * clock here. Callers that want a creation stamp pass one.
 */
export const makeEndeavor = (draft: EndeavorDraft): Endeavor => ({
  id: draft.id,
  title: draft.title,
  kind: draft.kind,
  status: draft.status ?? Status.pending,
  sessionPoints: draft.sessionPoints ?? null,
  start: draft.start ?? null,
  duration: draft.duration ?? null,
  minimumDuration: draft.minimumDuration ?? null,
  maximumDuration: draft.maximumDuration ?? null,
  repeatConfig: draft.repeatConfig ?? null,
  due: draft.due ?? null,
  defers: draft.defers ?? [],
  performances: draft.performances ?? [],
  completed: draft.completed ?? null,
  value: draft.value ?? null,
  effort: draft.effort ?? null,
  expiry: draft.expiry ?? null,
  associatedColor: draft.associatedColor ?? null,
  projectId: draft.projectId ?? null,
  createdAt: draft.createdAt ?? null,
  updatedAt: draft.updatedAt ?? null,
  isDraft: draft.isDraft ?? false,
  tags: draft.tags ?? null,
  shadows: draft.shadows ?? null,
  owner: draft.owner ?? null,
  list: draft.list ?? null,
  hostedBy: draft.hostedBy ?? [],
  errorMessages: draft.errorMessages ?? [],
  inActivity: draft.inActivity ?? false,
})

/**
 * `Endeavor.event(…)` — the calendar-event builder. Canon sets `kind:
 * .calendarEvent`, no `due` (events are driven by `start`/`duration`), the
 * single supplied `host`, and the shadow when the event mirrors an external
 * one.
 */
export const eventEndeavor = (params: {
  readonly id: string
  readonly title: string
  readonly start: Date
  readonly duration?: TimeIntervalSeconds | null
  readonly host: EndeavorHost
  readonly shadow?: Shadow | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: Kind.calendarEvent,
    start: params.start,
    duration: params.duration ?? null,
    hostedBy: [params.host],
    shadows: params.shadow ? [params.shadow] : null,
  })

/**
 * `Endeavor.task(…)` — the task builder. Note canon's status rule: `complete`
 * picks `.closed`, otherwise `.pending`.
 */
export const taskEndeavor = (params: {
  readonly id: string
  readonly title: string
  readonly start?: Date | null
  readonly due?: Date | null
  readonly duration?: TimeIntervalSeconds | null
  readonly repeatConfig?: RepeatConfig | null
  readonly complete?: boolean
  readonly completed?: Date | null
  readonly createdAt?: Date | null
  readonly host: EndeavorHost
  readonly sessionPoints?: number | null
  readonly shadow?: Shadow | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: Kind.task,
    status: params.complete === true ? Status.closed : Status.pending,
    start: params.start ?? null,
    due: params.due ?? null,
    duration: params.duration ?? null,
    repeatConfig: params.repeatConfig ?? null,
    completed: params.completed ?? null,
    createdAt: params.createdAt ?? null,
    sessionPoints: params.sessionPoints ?? null,
    hostedBy: [params.host],
    shadows: params.shadow ? [params.shadow] : null,
  })

/**
 * `Endeavor.importedReminder(…)` — an item mirrored from a reminders provider
 * once its source metadata has been classified as a task, habit or reminder.
 * Canon never gives it a `duration`; the shadow is required, because the
 * origin is the whole point of the record.
 */
export const importedReminderEndeavor = (params: {
  readonly id: string
  readonly title: string
  readonly kind: EndeavorKind
  readonly start?: Date | null
  readonly due?: Date | null
  readonly repeatConfig?: RepeatConfig | null
  readonly complete?: boolean
  readonly completed?: Date | null
  readonly createdAt?: Date | null
  readonly host: EndeavorHost
  readonly shadow: Shadow
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: params.kind,
    status: params.complete === true ? Status.closed : Status.pending,
    start: params.start ?? null,
    due: params.due ?? null,
    duration: null,
    repeatConfig: params.repeatConfig ?? null,
    completed: params.completed ?? null,
    createdAt: params.createdAt ?? null,
    hostedBy: [params.host],
    shadows: [params.shadow],
  })
