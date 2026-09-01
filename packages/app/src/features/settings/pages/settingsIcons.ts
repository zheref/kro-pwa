/**
 * The Settings vocabulary's glyph resolver.
 *
 * **The rows moved upstream (KC-IS-#71 item 8).** This file used to carry ~30
 * SF-Symbol rows of its own — `sunrise`, `cup.and.saucer`, `speaker.wave.2`,
 * the sign-in methods, the sync footer — because `design/system/icons/icons.ts`
 * was a closed lane while the parallel children ran, and forking the map for
 * one surface was the smaller, reversible mistake. They are in that file now,
 * which is where its own header always said a new symbol enters the vocabulary.
 *
 * What is left is the resolver, and it is left deliberately: a settings surface
 * holds its glyph as a plain `string` off the preference schema, not as a
 * `KitSymbolName`, so it cannot use the compile-checked `endeavorIcon`. It
 * needs the VISIBLE failure — an unmapped name draws the help glyph rather than
 * returning `undefined`, which React renders as a crash.
 *
 * `settingsIcons.test.ts` still walks the shipped schema and asserts every
 * declared glyph resolves without that fallback, so a new preference option
 * with an unmapped symbol fails the suite rather than showing a question mark.
 */

export {
  iconForBindingSymbol as settingsIcon,
  isMappedSymbol as isSettingsSymbolMapped,
  type LucideIcon,
} from '../../../design/endeavor/endeavorIcons'
