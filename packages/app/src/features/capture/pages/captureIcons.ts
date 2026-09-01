/**
 * The capture surfaces' glyph resolvers.
 *
 * **The rows moved upstream (KC-IS-#71 item 13).** This file used to carry
 * eight SF-Symbol rows of its own — `repeat.circle`, `cloud.fill`, `iphone`,
 * `clock.badge.checkmark`, `xmark.circle.fill`, `star.fill`, `tray.full`,
 * `rectangle.split.2x2.fill` — because `design/system/icons/icons.ts` was a
 * closed lane while the parallel children ran. Its own header said the rows
 * belonged there and that folding them up would delete the map entirely; that
 * is what happened. `star.fill` was the row that forced the timing: Find named
 * it too, and the shared table could not take it while two lane copies were
 * asserted disjoint from it.
 *
 * What is left is the pair of resolvers, and they are left deliberately.
 * `CaptureRules`' glyph tables (`captureKindGlyph`, `captureDestinationGlyph`,
 * `inboxRowButtons[].icon`) are typed `string`, because the logic tier names
 * canon's symbols and cannot know which union the render tier holds. So
 * `captureIconFor` is the resolver that can fail, and it fails VISIBLY: an
 * unmapped symbol draws the help glyph rather than returning `undefined`,
 * which React renders as a crash.
 *
 * `captureIcons.test.ts` walks every one of those tables and asserts each entry
 * resolves without the fallback.
 */

import {
  type KitSymbolName,
  type LucideIcon,
  endeavorIcon,
  iconForBindingSymbol,
  isMappedSymbol,
} from '../../../design/endeavor/endeavorIcons'

/** Every SF Symbol name the capture surfaces can draw. */
export type CaptureSymbolName = KitSymbolName

/** The lucide component for a symbol the type system has already checked. */
export function captureIcon(name: CaptureSymbolName): LucideIcon {
  return endeavorIcon(name)
}

/** The glyph for an SF Symbol name that arrives as a plain `string`. */
export function captureIconFor(name: string): LucideIcon {
  return iconForBindingSymbol(name)
}

/** Whether `name` resolves to a real drawing rather than the help fallback. */
export function isCaptureMappedSymbol(name: string): boolean {
  return isMappedSymbol(name)
}

export type { LucideIcon }
