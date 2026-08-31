/**
 * `EndeavorList` / `AnyEndeavorList` / `Project` / `RemindersList` — canon
 * `KroCore/Model/EndeavorList/`.
 *
 * Swift models this as a protocol with two conformers plus a type-erasing
 * `AnyEndeavorList` box. TypeScript needs no erasure: `AnyEndeavorList` is the
 * **union** of the two concrete lists, discriminated by `source`, and any code
 * that only needs the common surface takes the `EndeavorList` shape both
 * satisfy structurally. `originalValue` therefore has no port — the union
 * member *is* the original value.
 *
 * `color` is canon's `CGColor?` rendered as canon's own wire form: the RGB hex
 * string without alpha that `EndeavorList.colorHexString` vends and
 * `Project.encode` writes. A `CGColor` cannot exist in a platform-free tier,
 * and the hex is what crosses the wire in either direction anyway.
 */

/** The fields every list kind carries, whatever its source. */
export interface EndeavorList {
  readonly id: string
  readonly title: string
  /** RGB hex, no alpha — canon's `colorHexString`. `null` when unset. */
  readonly color: string | null
  readonly inActivity: boolean
}

/** A Kro-owned project. Canon table `projects`. */
export interface Project extends EndeavorList {
  readonly source: 'project'
}

/** A list mirrored from a reminders provider. */
export interface RemindersList extends EndeavorList {
  readonly source: 'reminders'
}

/** Canon's `AnyEndeavorList`, as a discriminated union rather than a box. */
export type AnyEndeavorList = Project | RemindersList

export const makeProject = (params: {
  readonly id: string
  readonly title: string
  readonly color?: string | null
  readonly inActivity?: boolean
}): Project => ({
  source: 'project',
  id: params.id,
  title: params.title,
  color: params.color ?? null,
  inActivity: params.inActivity ?? false,
})

export const makeRemindersList = (params: {
  readonly id: string
  readonly title: string
  readonly color?: string | null
  readonly inActivity?: boolean
}): RemindersList => ({
  source: 'reminders',
  id: params.id,
  title: params.title,
  color: params.color ?? null,
  inActivity: params.inActivity ?? false,
})

/**
 * Canon's `EndeavorList.==`, which compares **only** `id` and `title` — not
 * colour, not activity, and not the source. Two lists that differ solely in
 * their in-flight flag are the same list, which is what keeps a spinner from
 * re-keying a row. Structural `===`/deep equality would answer differently, so
 * this predicate is the one to use.
 */
export const endeavorListsEqual = (
  left: EndeavorList,
  right: EndeavorList,
): boolean => left.id === right.id && left.title === right.title
