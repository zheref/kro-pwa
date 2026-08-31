/**
 * `Endeavor.Defer` — canon `KroCore/Model/Endeavor/Endeavor.swift`,
 * Supabase table `defers`.
 *
 * One audit entry for an explicit reschedule: **when** the user pushed the
 * endeavor back (`made`), optionally **why** (`reason`), and **to when**
 * (`target`). All three are `let` in canon, so the whole record is `readonly`
 * here.
 *
 * A `Defer` never moves `due` by itself — `withDeferred` writes both, while
 * `withAddedDefer` appends history without touching the schedule. That split
 * is canon's and is preserved in `EndeavorMutations`.
 */

export interface Defer {
  /** When the deferral was made. */
  readonly made: Date
  /** Why, when the user gave a reason. */
  readonly reason: string | null
  /** The moment the endeavor was pushed to. */
  readonly target: Date
}

/** `Defer(made:reason:target:)`, with canon's `reason: nil` default. */
export const makeDefer = (params: {
  readonly made: Date
  readonly reason?: string | null
  readonly target: Date
}): Defer => ({
  made: params.made,
  reason: params.reason ?? null,
  target: params.target,
})
