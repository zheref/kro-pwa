/**
 * The SF Symbols the capture surfaces name that neither the design system's map
 * nor the endeavor kit's extension carries yet.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT A FORK. Exactly the seam
 * `design/endeavor/endeavorIcons.ts` already established, for the same reason:
 * `design/system/icons/icons.ts` is the one place an SF Symbol is answered, and
 * these eight rows belong there — but the design-system tier is a merged, closed
 * lane for this child (KC-IS-#6 owns it), and editing it would put a feature
 * child inside a lane it does not hold.
 *
 * The seam is kept honest three ways, the same three:
 *   · `captureIcon()` resolves the SYSTEM map first, then the endeavor kit's,
 *     then this one — so a symbol two files know has exactly one answer and it
 *     is the more general file's.
 *   · `captureIcons.test.ts` proves the key sets are DISJOINT, so this file can
 *     never shadow a row above it.
 *   · Folding these rows upstream deletes this map entirely; every call site
 *     already goes through `captureIcon()`.
 *
 * Keys are KroApple's exact `Image(systemName:)` strings, taken from
 * `CaptureRules`' ported glyph tables and `InboxView.swift`'s section headers,
 * so a port stays a lookup rather than a judgement call.
 */
import {
  AlarmClockCheck,
  CircleHelp,
  CircleX,
  Cloud,
  Grid2x2,
  Inbox,
  type LucideIcon,
  Repeat,
  Smartphone,
  Star,
} from 'lucide-react'
import {
  ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
  endeavorIcon,
  type KitSymbolName,
} from '../../../design/endeavor/endeavorIcons'
import { SF_SYMBOL_TO_LUCIDE } from '../../../design/system/icons/icons'

/**
 * SF Symbol name -> lucide component, for the symbols the capture prompt and
 * the Inbox use and neither map above has adopted.
 *
 * Two rows draw a glyph another key already draws, deliberately:
 *   · `repeat.circle` (the Habit kind chip) reuses `Repeat`, because lucide
 *     ships no circled repeat and one product concept deserves one drawing —
 *     the same call `endeavorIcons.ts` makes for `tray`.
 *   · `tray.full` (the Pending Triage section header) reuses `Inbox`, for the
 *     same reason `tray` does.
 */
export const CAPTURE_SF_SYMBOL_TO_LUCIDE = {
  // Kind chips (`EndeavorKind.glyph`)
  'repeat.circle': Repeat,

  // Hosting destinations (`EndeavorHostingDestination.glyph`)
  'cloud.fill': Cloud,
  iphone: Smartphone,

  // The prompt's date/time row
  'clock.badge.checkmark': AlarmClockCheck,
  'xmark.circle.fill': CircleX,
  'star.fill': Star,

  // Inbox sections and row buttons
  'tray.full': Inbox,
  'rectangle.split.2x2.fill': Grid2x2,
} as const satisfies Record<string, LucideIcon>

export type CaptureSfSymbolName = keyof typeof CAPTURE_SF_SYMBOL_TO_LUCIDE

/** Every SF Symbol name the capture surfaces can draw. */
export type CaptureSymbolName = KitSymbolName | CaptureSfSymbolName

/**
 * The lucide component for an SF Symbol name.
 *
 * The system map wins, then the endeavor kit's, then this one — which is why
 * the suite asserts all three key sets are disjoint: a shadowing row would be a
 * silent second answer to "which glyph is that", and a second answer is the
 * whole failure this indirection exists to prevent.
 */
export function captureIcon(name: CaptureSymbolName): LucideIcon {
  const known =
    (name as string) in SF_SYMBOL_TO_LUCIDE ||
    (name as string) in ENDEAVOR_SF_SYMBOL_TO_LUCIDE
  if (known) return endeavorIcon(name as KitSymbolName)
  return CAPTURE_SF_SYMBOL_TO_LUCIDE[name as CaptureSfSymbolName]
}

/**
 * The glyph for an SF Symbol name that arrives as a plain `string`.
 *
 * `CaptureRules`' glyph tables (`captureKindGlyph`,
 * `captureDestinationGlyph`, `inboxRowButtons[].icon`) are typed `string`,
 * because the logic tier names canon's symbols and cannot know which union the
 * render tier happens to hold. So this is the one resolver that can fail, and
 * it fails VISIBLY: an unmapped symbol draws the help glyph rather than
 * returning `undefined`, which React renders as a crash.
 *
 * `captureIcons.test.ts` walks every one of those tables and asserts each entry
 * resolves without the fallback — the same guarantee `iconForBindingSymbol`
 * gives the vista registry.
 */
export function captureIconFor(name: string): LucideIcon {
  if (isCaptureMappedSymbol(name)) return captureIcon(name as CaptureSymbolName)
  return CircleHelp
}

/** Whether `name` resolves to a real drawing rather than the help fallback. */
export function isCaptureMappedSymbol(name: string): boolean {
  return (
    name in SF_SYMBOL_TO_LUCIDE ||
    name in ENDEAVOR_SF_SYMBOL_TO_LUCIDE ||
    name in CAPTURE_SF_SYMBOL_TO_LUCIDE
  )
}

export type { LucideIcon }
