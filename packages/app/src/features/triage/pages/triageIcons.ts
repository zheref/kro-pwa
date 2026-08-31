/**
 * The SF Symbols the Triage surface names that neither the design system's map
 * nor the endeavor kit's extension carries yet.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT A FORK. Exactly the seam
 * `design/endeavor/endeavorIcons.ts` established and
 * `features/capture/pages/captureIcons.ts` re-used, for the same reason:
 * `design/system/icons/icons.ts` is the one place an SF Symbol is answered, and
 * these seven rows belong there — but the design-system tier is a merged,
 * closed lane for this child (KC-IS-#6 owns it), and editing it would put a
 * feature child inside a lane it does not hold.
 *
 * The seam is kept honest three ways, the same three:
 *   · `triageIcon()` resolves the SYSTEM map first, then the endeavor kit's,
 *     then this one — so a symbol two files know has exactly one answer and it
 *     is the more general file's.
 *   · `triageIcons.test.ts` proves the key sets are DISJOINT, so this file can
 *     never shadow a row above it, and walks `@kro/core`'s own quadrant glyph
 *     table so a quadrant can never reach a user as a blank.
 *   · Folding these rows upstream deletes this map entirely; every call site
 *     already goes through `triageIcon()` / `triageIconFor()`.
 *
 * It deliberately does **not** import the capture lane's map, even though
 * `star.fill` appears in both: one feature reaching into a sibling feature's
 * module is what `UZF-6` forbids outright, and the two maps are independent
 * lanes that fold into the same upstream file. Duplicating one row is the
 * cheaper of the two wrongs, and the same call `TriageProducer` makes about
 * `readStoredEndeavors`.
 *
 * Keys are KroApple's exact `Image(systemName:)` strings, taken from
 * `KroUI/Triage/TriageView.swift` and `@kro/core`'s `quadrantIcon`, so a port
 * stays a lookup rather than a judgement call.
 */
import {
  ChevronLeft,
  type LucideIcon,
  Minus,
  Share2,
  Star,
  StarOff,
  Users,
  ZapOff,
} from 'lucide-react'
import {
  ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
  type KitSymbolName,
  endeavorIcon,
} from '../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../design/system/icons/icons'

/**
 * SF Symbol name -> lucide component, for the symbols the Triage form uses and
 * neither map above has adopted.
 *
 * Two rows draw a glyph another key already draws, deliberately:
 *   · `chevron.backward` (the header's dismiss control) reuses `ChevronLeft`,
 *     because SwiftUI's `.backward` is the same drawing in a left-to-right
 *     layout and lucide ships no direction-aware chevron — the mirroring is a
 *     `dir`-driven CSS concern, not a second glyph.
 *   · `star.fill` (the reward badge and the matrix's "Important" row) reuses
 *     `Star`, because lucide's star is filled by `fill`, not by a second icon.
 */
export const TRIAGE_SF_SYMBOL_TO_LUCIDE = {
  // The header
  'chevron.backward': ChevronLeft,
  'star.fill': Star,

  // The matrix's unselected axis rows (`bolt.fill` is the kit's already)
  'bolt.slash': ZapOff,
  'star.slash': StarOff,

  // The reward stepper's minus control (`plus` is the system map's already)
  minus: Minus,

  // Quadrant glyphs (`quadrantIcon`) the two maps above do not carry
  'person.2.fill': Users,

  // The Delegate quadrant's secondary action
  'square.and.arrow.up': Share2,
} as const satisfies Record<string, LucideIcon>

export type TriageSfSymbolName = keyof typeof TRIAGE_SF_SYMBOL_TO_LUCIDE

/** Every SF Symbol name the Triage surface can draw. */
export type TriageSymbolName = KitSymbolName | TriageSfSymbolName

/**
 * The lucide component for an SF Symbol name.
 *
 * The system map wins, then the endeavor kit's, then this one — which is why
 * the suite asserts all three key sets are disjoint: a shadowing row would be a
 * silent second answer to "which glyph is that", and a second answer is the
 * whole failure this indirection exists to prevent.
 */
export function triageIcon(name: TriageSymbolName): LucideIcon {
  const known =
    (name as string) in SF_SYMBOL_TO_LUCIDE ||
    (name as string) in ENDEAVOR_SF_SYMBOL_TO_LUCIDE
  if (known) return endeavorIcon(name as KitSymbolName)
  return TRIAGE_SF_SYMBOL_TO_LUCIDE[name as TriageSfSymbolName]
}

/**
 * The glyph for an SF Symbol name that arrives as a plain `string`.
 *
 * `@kro/core`'s `quadrantIcon` answers an `IconRepresentation` whose `glyph`
 * payload is typed `string`, because the domain tier names canon's symbols and
 * cannot know which union the render tier happens to hold. So this is the one
 * resolver that can fail, and it fails **visibly**: an unmapped symbol draws
 * the help glyph rather than returning `undefined`, which React renders as a
 * crash.
 *
 * `triageIcons.test.ts` walks all four quadrants and asserts each resolves
 * without the fallback — the same guarantee `captureIconFor` gives the capture
 * lane's glyph tables.
 */
export function triageIconFor(name: string): LucideIcon {
  if (isTriageMappedSymbol(name)) return triageIcon(name as TriageSymbolName)
  return SF_SYMBOL_TO_LUCIDE['exclamationmark.circle']
}

/** Whether `name` resolves to a real drawing rather than the fallback. */
export function isTriageMappedSymbol(name: string): boolean {
  return (
    name in SF_SYMBOL_TO_LUCIDE ||
    name in ENDEAVOR_SF_SYMBOL_TO_LUCIDE ||
    name in TRIAGE_SF_SYMBOL_TO_LUCIDE
  )
}

export type { LucideIcon }
