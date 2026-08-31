/**
 * `resolvedKind` — the presentation kind, canon
 * `EndeavorSourceResolution.resolvedKind(for:)` and its `Endeavor.resolvedKind`
 * computed property.
 *
 * > The stored kind is a compatibility fallback, not the final presentation
 * > kind. When the required source evidence is available, the displayed and
 * > actionable kind is computed from current native properties.
 *
 * Every surface reads this, never `endeavor.kind`: *"Kind filters always
 * evaluate the resolved classification rather than the last stored
 * fallback."* A daily Apple reminder is a Habit on Do even when the row Kro
 * persisted last week still says `task`, and it is absent from the priority
 * matrix for the same reason — *"Priority-matrix admission depends only on the
 * final resolved kind, never on where an endeavor is hosted."*
 *
 * ## The vistas handoff
 *
 * `packages/core/src/vistas` currently reads plain `kind` wherever canon reads
 * `resolvedKind`, with a doc note at each site naming this issue — see
 * `EndeavorComputedState.ts` and `EndeavorsLens.ts`, and PR #44's deviation 2.
 * That was correct while nothing could resolve a kind. This function is the
 * replacement, and adopting it is a **vistas-lane** change: this PR does not
 * edit those files. The two call sites are the lens's kind filter and the
 * computed-state guards.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import type { EndeavorKind } from '../endeavor/EndeavorKind'
import { classifyFromEvidence } from './ProviderClassification'
import { rulesetFor, sourceEvidenceFor } from './ProviderEvidence'
import {
  type ReconciliationContext,
  defaultReconciliationContext,
} from './ReconciliationContext'

/**
 * The kind a surface should display and act on.
 *
 * A row no classifying provider claims keeps its stored kind untouched —
 * *"local-only recurring tasks retain their explicitly stored kind and are not
 * reclassified merely because they recur at those frequencies."* That is why
 * the provider gate comes first and is not merely a lookup miss.
 */
export const resolvedKind = (
  endeavor: Endeavor,
  context: ReconciliationContext = defaultReconciliationContext(),
): EndeavorKind => {
  const ruleset = rulesetFor(endeavor, context.rulesets)
  if (ruleset === null) return endeavor.kind
  return classifyFromEvidence(
    ruleset,
    sourceEvidenceFor(endeavor, ruleset.provider),
    endeavor.kind,
  )
}

/**
 * Whether the stored kind and the resolved kind disagree — i.e. whether this
 * row is being presented as something other than what it was persisted as.
 * Useful to a debug surface and to the persistence child (#10), which the
 * spec asks to *"persist the local representation with the resolved
 * classification … so relaunching does not restore a stale kind"*.
 */
export const hasResolvedKindOverride = (
  endeavor: Endeavor,
  context: ReconciliationContext = defaultReconciliationContext(),
): boolean => resolvedKind(endeavor, context) !== endeavor.kind
