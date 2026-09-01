/**
 * The Triage surface's glyph resolvers.
 *
 * **The rows moved upstream (KC-IS-#71 item 13).** This file used to carry
 * seven SF-Symbol rows of its own — `chevron.backward`, `star.fill`,
 * `bolt.slash`, `star.slash`, `minus`, `person.2.fill`, `square.and.arrow.up` —
 * because `design/system/icons/icons.ts` was a closed lane while the parallel
 * children ran. Its own header said the rows belonged there and that folding
 * them up would delete the map entirely; that is what happened. Two of them
 * (`star.fill`, `minus`) forced the timing: Find named both, and the shared
 * table could not take them while two lane copies were asserted disjoint from
 * it — which is also the end of the deliberate one-row duplication this file
 * used to carry with the capture lane.
 *
 * What is left is the pair of resolvers, and they are left deliberately.
 * `@kro/core`'s `quadrantIcon` answers an `IconRepresentation` whose `glyph`
 * payload is typed `string`, because the domain tier names canon's symbols and
 * cannot know which union the render tier holds. So `triageIconFor` is the
 * resolver that can fail, and it fails **visibly** rather than returning
 * `undefined`, which React renders as a crash.
 *
 * `triageIcons.test.ts` walks all four quadrants and asserts each resolves
 * without the fallback.
 */

import {
  type KitSymbolName,
  type LucideIcon,
  endeavorIcon,
  isMappedSymbol,
} from '../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../design/system/icons/icons'

/** Every SF Symbol name the Triage surface can draw. */
export type TriageSymbolName = KitSymbolName

/** The lucide component for a symbol the type system has already checked. */
export function triageIcon(name: TriageSymbolName): LucideIcon {
  return endeavorIcon(name)
}

/**
 * The glyph for an SF Symbol name that arrives as a plain `string`.
 *
 * The fallback is the warning circle rather than the help mark the other
 * resolvers use: an unrecognised *quadrant* glyph is a mismatch between the
 * domain's table and this one, which is a defect worth looking like one.
 */
export function triageIconFor(name: string): LucideIcon {
  if (isMappedSymbol(name)) return endeavorIcon(name as KitSymbolName)
  return SF_SYMBOL_TO_LUCIDE['exclamationmark.circle']
}

/** Whether `name` resolves to a real drawing rather than the fallback. */
export function isTriageMappedSymbol(name: string): boolean {
  return isMappedSymbol(name)
}

export type { LucideIcon }
