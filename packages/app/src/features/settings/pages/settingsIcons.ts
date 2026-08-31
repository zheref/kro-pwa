/**
 * The Settings vocabulary's SF Symbol → lucide rows.
 *
 * The design system owns the shared mapping (`design/system/icons/icons.ts`)
 * and the Endeavor kit adds its own rows on top of it
 * (`design/endeavor/endeavorIcons.ts`). Between them they answer for the
 * glyphs those surfaces draw — and for almost none of the ~30 symbols the
 * preference schema declares (`sunrise`, `cup.and.saucer`, `paintpalette`,
 * `speaker.wave.2`, …), because no shipped surface had drawn them yet.
 *
 * So this is the same pattern the Endeavor kit already established: a lane's
 * own rows, resolved *after* the shared maps so a symbol both know stays one
 * answer. `settingsIcons.test.ts` asserts the rows are disjoint from the
 * shared maps, which is what keeps that true.
 *
 * **Upstream candidate.** These rows belong in
 * `design/system/icons/icons.ts` once a second surface needs them — that file
 * is outside this issue's lane, and forking the map for one lane is the
 * smaller, reversible mistake. Named in the PR body.
 */
import {
  Bell,
  CalendarRange,
  CircleHelp,
  CirclePause,
  Cloud,
  CloudOff,
  Coffee,
  Contrast,
  CreditCard,
  Eye,
  Flame,
  Globe,
  Hand,
  House,
  KeyRound,
  Layers,
  LogOut,
  type LucideIcon,
  Mail,
  RotateCw,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  Sunrise,
  Sunset,
  Timer,
  Trophy,
  UserRound,
  Volume2,
} from 'lucide-react'
import {
  iconForBindingSymbol,
  isMappedSymbol,
} from '../../../design/endeavor/endeavorIcons'

/** SF Symbol name → lucide component, for the symbols Settings draws. */
export const SETTINGS_SF_SYMBOL_TO_LUCIDE = {
  // Schema glyphs — `SettingOptions.ts`
  globe: Globe,
  sunrise: Sunrise,
  sunset: Sunset,
  'bell.badge': Bell,
  flame: Flame,
  'circle.lefthalf.filled': Contrast,
  'calendar.day.timeline.left': CalendarRange,
  house: House,
  'hand.tap': Hand,
  'arrow.up.and.down': SlidersHorizontal,
  'arrow.up.arrow.down': SlidersHorizontal,
  'rectangle.3.group': Layers,
  function: Sigma,
  trophy: Trophy,
  'party.popper': Sparkles,
  'cup.and.saucer': Coffee,
  stopwatch: Timer,
  'pause.circle': CirclePause,
  'arrow.triangle.2.circlepath': RotateCw,
  'sun.max': SunMedium,
  'speaker.wave.2': Volume2,
  // The Do visibility filter's glyph. It is a non-preference option and no pane
  // renders it, but the map answers for every declared glyph so a future
  // surface cannot meet a question mark.
  eye: Eye,
  // Hub rows — `SettingsFeature.Section.systemImage`
  'slider.horizontal.3': SlidersHorizontal,
  'star.circle': Trophy,
  'square.stack.3d.up': Layers,
  creditcard: CreditCard,
  // Integrations and the sync footer
  'icloud.fill': Cloud,
  'icloud.slash': CloudOff,
  'checkmark.icloud': Cloud,
  'person.crop.circle.badge.questionmark': UserRound,
  // Sign-in methods — the Profile pane's "Method" and "Connected" rows.
  // `apple.logo` has no lucide counterpart and lucide's `Apple` is a fruit, so
  // the row draws a neutral key rather than a wrong mark; the *buttons* on the
  // auth surface carry the real brand artwork (`ProviderMarks`).
  'apple.logo': KeyRound,
  'envelope.fill': Mail,
  'f.circle.fill': KeyRound,
  'rectangle.portrait.and.arrow.right': LogOut,
} as const satisfies Record<string, LucideIcon>

export type SettingsSymbolName = keyof typeof SETTINGS_SF_SYMBOL_TO_LUCIDE

/**
 * The glyph for any SF Symbol name a settings surface holds.
 *
 * Order matters: the shared maps win, so a symbol both know keeps one answer.
 * An unmapped name draws the help glyph rather than returning `undefined`,
 * which React renders as a crash — the same visible failure
 * `iconForBindingSymbol` chose, for the same reason.
 */
export function settingsIcon(name: string): LucideIcon {
  if (isMappedSymbol(name)) return iconForBindingSymbol(name)
  return (
    (SETTINGS_SF_SYMBOL_TO_LUCIDE as Record<string, LucideIcon>)[name] ??
    CircleHelp
  )
}

/** Whether `name` draws a real glyph rather than the help fallback. */
export function isSettingsSymbolMapped(name: string): boolean {
  return isMappedSymbol(name) || name in SETTINGS_SF_SYMBOL_TO_LUCIDE
}

export type { LucideIcon }
