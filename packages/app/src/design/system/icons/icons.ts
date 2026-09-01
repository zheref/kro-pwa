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
 *   · `react-icons` was a dependency of `apps/web` when this was decided, but
 *     it ships bundles of whole families and has no SF-Symbols-shaped subset,
 *     so it was never a candidate here — it stayed only for the Chakra
 *     surfaces it served, and #79 uninstalled it with them.
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
 *
 * ## The lane-local maps that folded in here (KC-IS-#71)
 *
 * While the feature children ran in parallel this file was a closed lane, so
 * four surfaces each grew their own map beside it — and every one of those
 * files said, in its own header, that the rows belonged here and that folding
 * them up would delete the map entirely. That is what happened:
 *
 *   · **Settings** (item 8) — ~30 preference-schema glyphs (`sunrise`,
 *     `cup.and.saucer`, `speaker.wave.2`, the sign-in methods, the sync footer).
 *   · **Session** (item 16, from KC-PR-#72) — `stop.fill`, `cup.and.saucer.fill`,
 *     `timer`, `stopwatch`, `arrow.clockwise`, `wind`, `arrow.right.circle`,
 *     `bolt.fill`.
 *   · **Find / Detail** (item 13, from KC-PR-#68) — the nine rows those
 *     surfaces were drawing with the nearest mapped neighbour:
 *     `line.3.horizontal.decrease.circle`, `slider.horizontal.3`, `textformat`,
 *     `circle.lefthalf.filled`, `star.fill`, `flame.fill`, `folder`, `minus`,
 *     `flag.checkered`.
 *   · **Capture and Triage** — folded in the same pass, because `star.fill` and
 *     `minus` were in both of their maps AND in Find's nine, and the three
 *     could not land here while two lane copies stayed disjoint from it.
 *
 * `bolt`, `bolt.fill`, `timer` and `play.fill` moved UP from the endeavor kit's
 * own map rather than being copied: `endeavorIcons.test.ts` asserts the two key
 * sets are disjoint, which is what keeps "which glyph is that symbol" a
 * question with exactly one answer.
 */

import {
  AlarmClockCheck,
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowRightCircle,
  Bell,
  CalendarRange,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CirclePause,
  CircleX,
  Clock,
  ClockAlert,
  Cloud,
  CloudOff,
  Coffee,
  Contrast,
  CreditCard,
  Ellipsis,
  Eye,
  Flag,
  FlagTriangleRight,
  Flame,
  Folder,
  Globe,
  Grid2x2,
  Hand,
  House,
  Inbox,
  KeyRound,
  Layers,
  ListFilter,
  LogOut,
  type LucideIcon,
  Mail,
  Menu,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCw,
  Search,
  Settings,
  Share2,
  Sigma,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Star,
  StarOff,
  SunMedium,
  Sunrise,
  Sunset,
  Tag,
  Target,
  Timer,
  Trash2,
  TriangleAlert,
  Trophy,
  Type,
  User,
  UserRound,
  Users,
  Volume2,
  Wind,
  X,
  Zap,
  ZapOff,
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
  minus: Minus,
  folder: Folder,
  'tray.and.arrow.down': Inbox,
  // Neither `tray.full` nor `repeat.circle` has a lucide counterpart of its
  // own; one product concept, one drawing — the same call the kit already made
  // for `tray`.
  'tray.full': Inbox,
  'repeat.circle': Repeat,
  archivebox: Archive,
  pencil: Pencil,
  trash: Trash2,
  'chevron.backward': ChevronLeft,
  'clock.badge.checkmark': AlarmClockCheck,
  'xmark.circle.fill': CircleX,
  'rectangle.split.2x2.fill': Grid2x2,
  'square.and.arrow.up': Share2,
  'person.2.fill': Users,
  'bolt.slash': ZapOff,
  'star.slash': StarOff,
  'cloud.fill': Cloud,
  iphone: Smartphone,

  // Session
  play: Play,
  'play.fill': Play,
  pause: Pause,
  'pause.circle': CirclePause,
  'stop.fill': Square,
  timer: Timer,
  stopwatch: Timer,
  bolt: Zap,
  'bolt.fill': Zap,
  'clock.badge.xmark': ClockAlert,
  'cup.and.saucer': Coffee,
  'cup.and.saucer.fill': Coffee,
  wind: Wind,
  'arrow.right.circle': ArrowRightCircle,
  'arrow.clockwise': RotateCw,
  'arrow.triangle.2.circlepath': RotateCw,

  // Signals
  'exclamationmark.triangle': TriangleAlert,
  'exclamationmark.circle': CircleAlert,
  sparkles: Sparkles,
  star: Star,
  'star.fill': Star,
  'star.circle': Trophy,
  flame: Flame,
  'flame.fill': Flame,
  'flag.checkered': FlagTriangleRight,
  trophy: Trophy,
  'party.popper': Sparkles,

  // Lenses, sorting and grouping
  'line.3.horizontal.decrease.circle': ListFilter,
  'slider.horizontal.3': SlidersHorizontal,
  'arrow.up.and.down': SlidersHorizontal,
  'arrow.up.arrow.down': SlidersHorizontal,
  'rectangle.3.group': Layers,
  'square.stack.3d.up': Layers,
  textformat: Type,
  function: Sigma,
  eye: Eye,

  // Preferences — the schema's own vocabulary (`SettingOptions.ts`)
  globe: Globe,
  house: House,
  sunrise: Sunrise,
  sunset: Sunset,
  'sun.max': SunMedium,
  'bell.badge': Bell,
  'circle.lefthalf.filled': Contrast,
  'calendar.day.timeline.left': CalendarRange,
  'hand.tap': Hand,
  'speaker.wave.2': Volume2,
  creditcard: CreditCard,

  // Account, integrations and the sync footer
  'icloud.fill': Cloud,
  'icloud.slash': CloudOff,
  'checkmark.icloud': Cloud,
  'person.crop.circle.badge.questionmark': UserRound,
  // `apple.logo` has no lucide counterpart and lucide's `Apple` is a fruit, so
  // the row draws a neutral key rather than a wrong mark; the *buttons* on the
  // auth surface carry the real brand artwork (`ProviderMarks`).
  'apple.logo': KeyRound,
  'f.circle.fill': KeyRound,
  'envelope.fill': Mail,
  'rectangle.portrait.and.arrow.right': LogOut,
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
