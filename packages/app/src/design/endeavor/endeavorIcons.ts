/**
 * The SF Symbols this kit needs that the design system's map does not carry
 * yet.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT A FORK.
 * `system/icons/icons.ts` is the one place an SF Symbol name is answered, and
 * its own header says so: *"Adding a row is how a new symbol enters the
 * vocabulary."* That is exactly what should happen to the rows below — they
 * belong in that file. They live here instead because the design-system tier is
 * a merged, closed lane for this child (#42 owns it; #14 consumes it), and
 * forking `icons.ts` to add twenty rows would be the worse of the two
 * violations.
 *
 * The seam is kept honest three ways:
 *   · `endeavorIcon()` resolves the SYSTEM map first, so a symbol both files
 *     know has exactly one answer and it is the system's.
 *   · `endeavorIcons.test.ts` proves the two key sets are DISJOINT, so this
 *     file can never shadow a system row.
 *   · Folding these rows upstream is a one-line-per-row follow-up that deletes
 *     this map entirely; nothing else has to change, because every call site
 *     already goes through `endeavorIcon()`.
 *
 * Keys are KroApple's exact `Image(systemName:)` strings, same as the system
 * map, so a port stays a lookup rather than a judgement call.
 */

import {
  ArrowDown,
  BadgeCheck,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CircleAlert,
  CircleArrowDown,
  CircleCheckBig,
  CircleHelp,
  CirclePause,
  CirclePlay,
  CirclePlus,
  CircleUser,
  Circle,
  Download,
  Eye,
  FileText,
  Heart,
  History,
  Hourglass,
  Inbox,
  Info,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  MemoryStick,
  Moon,
  Network,
  OctagonAlert,
  Palette,
  Repeat2,
  SkipForward,
  Undo2,
  UserCheck,
  WandSparkles,
} from 'lucide-react'
import { SF_SYMBOL_TO_LUCIDE, type SfSymbolName } from '../system/icons/icons'

/**
 * SF Symbol name -> lucide component, for the symbols the endeavor kit uses
 * and the system map has not adopted yet.
 *
 * `tray` resolves to `Inbox` deliberately: lucide ships no open-tray glyph, and
 * the system map already answers the neighbouring `tray.and.arrow.down` with
 * the same component. One product concept, one drawing.
 */
export const ENDEAVOR_SF_SYMBOL_TO_LUCIDE = {
  // Urgency + warning signals
  'arrow.down.circle': CircleArrowDown,
  'exclamationmark.circle.fill': CircleAlert,
  'exclamationmark.octagon.fill': OctagonAlert,
  'clock.badge.exclamationmark.fill': CircleAlert,
  'arrow.down': ArrowDown,

  // Reward + duration. `bolt`, `bolt.fill`, `timer` and `play.fill` moved UP
  // into the system map (KC-IS-#71 item 16); the two sets stay disjoint by test.
  'clock.arrow.circlepath': History,

  // Do-mode actions
  'forward.end': SkipForward,
  'calendar.badge.clock': CalendarClock,
  'person.fill.checkmark': UserCheck,
  'info.circle': Info,
  'info.circle.fill': Info,
  'square.and.arrow.down': Download,
  'wand.and.stars': WandSparkles,

  // Empty states + capture
  tray: Inbox,
  'calendar.badge.plus': CalendarPlus,
  'plus.circle.fill': CirclePlus,

  // Endeavor kinds (KroUI `Endeavor.Kind.glyphName`)
  'arrow.2.circlepath': Repeat2,
  'bell.fill': BellRing,
  'lightbulb.fill': Lightbulb,
  'doc.plaintext': FileText,
  'moon.fill': Moon,

  // Endeavor statuses (KroUI `Endeavor.Status.glyphName`)
  circle: Circle,
  'play.circle': CirclePlay,
  'play.circle.fill': CirclePlay,
  'pause.circle.fill': CirclePause,
  'eye.circle.fill': Eye,
  'person.crop.circle.badge.checkmark': CircleUser,
  'checkmark.seal': BadgeCheck,
  'checkmark.circle': CircleCheckBig,
  'arrow.uturn.forward.circle': Undo2,

  // Detail / property rows
  hourglass: Hourglass,
  paintpalette: Palette,
  'heart.circle.fill': Heart,
  'calendar.circle.fill': CalendarClock,

  // Hosts. `@kro/core`'s `endeavorHostIcon` names these; the two letter-marks
  // (`g.circle.fill`, `m.square.fill`) have no lucide counterpart, so they fall
  // back to a calendar drawing and the provider's NAME carries the identity —
  // which the host chip always prints beside the glyph anyway.
  network: Network,
  memorychip: MemoryStick,
  checklist: ListChecks,
  'g.circle.fill': CalendarDays,
  'm.square.fill': CalendarRange,
  'questionmark.circle': CircleHelp,
} as const satisfies Record<string, LucideIcon>

export type EndeavorSfSymbolName = keyof typeof ENDEAVOR_SF_SYMBOL_TO_LUCIDE

/** Every SF Symbol name this kit can draw — the system's set plus the above. */
export type KitSymbolName = SfSymbolName | EndeavorSfSymbolName

/**
 * The lucide component for an SF Symbol name.
 *
 * The system map wins on any key both maps hold, which is why the test asserts
 * they are disjoint: a shadowing row would be a silent second answer, and a
 * second answer to "which glyph is that" is the whole failure this indirection
 * exists to prevent.
 */
export function endeavorIcon(name: KitSymbolName): LucideIcon {
  const fromSystem = (SF_SYMBOL_TO_LUCIDE as Record<string, LucideIcon>)[name]
  if (fromSystem !== undefined) return fromSystem
  return ENDEAVOR_SF_SYMBOL_TO_LUCIDE[name as EndeavorSfSymbolName]
}

/**
 * The glyph for an SF Symbol name that arrives as a plain `string`.
 *
 * `EndeavorOperationBinding.icon` is typed `string` in `@kro/core` — the vista
 * registry is data, and data cannot be constrained to a union the render tier
 * happens to know. So this is the one resolver that can fail, and it fails
 * VISIBLY: an unmapped symbol draws the help glyph rather than returning
 * `undefined`, which React renders as a crash.
 *
 * `endeavorIcons.test.ts` walks the SHIPPED vista registry and asserts every
 * binding's icon resolves without the fallback, so an unmapped symbol is caught
 * by the suite rather than by a user seeing a question mark.
 */
export function iconForBindingSymbol(name: string): LucideIcon {
  const fromSystem = (SF_SYMBOL_TO_LUCIDE as Record<string, LucideIcon>)[name]
  if (fromSystem !== undefined) return fromSystem
  const fromKit = (ENDEAVOR_SF_SYMBOL_TO_LUCIDE as Record<string, LucideIcon>)[
    name
  ]
  return fromKit ?? CircleHelp
}

/** Whether `name` resolves to a real drawing rather than the help fallback. */
export function isMappedSymbol(name: string): boolean {
  return name in SF_SYMBOL_TO_LUCIDE || name in ENDEAVOR_SF_SYMBOL_TO_LUCIDE
}

export type { LucideIcon }
