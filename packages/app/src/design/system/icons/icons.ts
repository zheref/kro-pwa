/**
 * The icon set, decided once.
 *
 * DECISION: lucide-react.
 *
 * Why, against the alternatives that were live:
 *   · It is shadcn/ui's default, so every vendored primitive's upstream source
 *     already imports from it. Choosing anything else means editing an import
 *     in every component we copy in, forever.
 *   · It is a tree-shaken per-icon ESM export, so the shell pays for the
 *     glyphs it renders and not for a font or a sprite sheet.
 *   · Its drawing conventions — 24px grid, 2px round-cap strokes, optical
 *     centring — are the same conventions SF Symbols draws to, so a KroApple
 *     screen and its web counterpart read as the same product. A filled set
 *     (Material Symbols, Font Awesome solid) would not.
 *   · `react-icons` is already a dependency of `apps/web`, but it ships
 *     bundles of whole families and has no SF-Symbols-shaped subset; it stays
 *     only until the Chakra surfaces it serves are retired (#22).
 *
 * WHAT THIS FILE IS. KroApple names glyphs as SF Symbols strings all over its
 * views (`"checkmark.circle.fill"`, `"tray.and.arrow.down"`). Porting a screen
 * means answering "which lucide icon is that" — and answering it the same way
 * every time. This is that mapping, in one place, so the answer is a lookup
 * rather than a judgement call made twice.
 *
 * Only symbols the ported surfaces actually use are listed. Adding a row is
 * how a new symbol enters the vocabulary; `icons.test.ts` proves every row
 * resolves to a real component, so a typo fails the suite instead of
 * rendering nothing.
 */

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock,
  Ellipsis,
  Flag,
  Inbox,
  type LucideIcon,
  Menu,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag,
  Target,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'

/**
 * SF Symbol name -> lucide component.
 *
 * Keys are KroApple's exact `Image(systemName:)` strings so a port can be done
 * by search-and-replace and reviewed by comparing two literal lists.
 */
export const SF_SYMBOL_TO_LUCIDE = {
  // Navigation and chrome
  'line.3.horizontal': Menu,
  magnifyingglass: Search,
  gearshape: Settings,
  'person.crop.circle': User,
  'chevron.left': ChevronLeft,
  'chevron.right': ChevronRight,
  'chevron.up': ChevronUp,
  'chevron.down': ChevronDown,
  'arrow.left': ArrowLeft,
  'arrow.right': ArrowRight,
  ellipsis: Ellipsis,
  xmark: X,

  // Endeavor kinds and states
  checkmark: Check,
  'checkmark.circle.fill': CheckCircle2,
  calendar: Calendar,
  clock: Clock,
  repeat: Repeat,
  bell: Bell,
  flag: Flag,
  tag: Tag,
  target: Target,

  // Capture, triage, inbox
  plus: Plus,
  'tray.and.arrow.down': Inbox,
  archivebox: Archive,
  pencil: Pencil,
  trash: Trash2,

  // Session
  play: Play,
  pause: Pause,

  // Signals
  'exclamationmark.triangle': TriangleAlert,
  'exclamationmark.circle': CircleAlert,
  sparkles: Sparkles,
  star: Star,
} as const satisfies Record<string, LucideIcon>

export type SfSymbolName = keyof typeof SF_SYMBOL_TO_LUCIDE

/**
 * The lucide component for an SF Symbol name.
 *
 * Typed so an unmapped symbol is a compile error rather than a blank space in
 * the UI — the failure mode of a `Record<string, Icon>` lookup that returns
 * `undefined`.
 */
export function iconForSymbol(name: SfSymbolName): LucideIcon {
  return SF_SYMBOL_TO_LUCIDE[name]
}

/**
 * The size an icon is drawn at. Three steps on the same 4pt rhythm as the
 * spacing scale, so a glyph never needs a number invented for it at a call
 * site.
 *
 * Every size must stay smaller than the smallest target it can sit inside
 * (the 28px pointer target), because the hit area is expanded by the control,
 * not by the glyph — `--kro-size-min-touch-target` is what guarantees the
 * 44px floor regardless of which of these is drawn.
 */
export const ICON_SIZE = {
  /** Inline with body text. */
  small: 16,
  /** The default: toolbar and row glyphs. */
  medium: 20,
  /** Empty states and hero affordances, which set their own frame. */
  large: 28,
} as const

export type IconSize = keyof typeof ICON_SIZE

export type { LucideIcon }
