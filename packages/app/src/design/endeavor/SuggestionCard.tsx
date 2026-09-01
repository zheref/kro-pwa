/**
 * `SuggestionCard` — canon `KroUI/Components/SuggestionCard.swift`, with its
 * source enum from `KroUI/Models/SuggestionSource.swift`.
 *
 * The integration hint the Do tab scrolls horizontally ("Apple Reminders · 5
 * reminders ready to import") and the Plan tab stacks full width ("Connect
 * Google Calendar"). One component, two widths — canon's `fillsWidth`.
 *
 * ## Geometry, from canon
 *
 * | Canon                        | Here                     |
 * |------------------------------|--------------------------|
 * | `frame(minHeight: 112)`      | `min-h-28`               |
 * | `padding(24)`                | `p-kro-large`            |
 * | icon `36×36`, `size: 26`     | `size-9`, `size={26}`    |
 * | carousel `minWidth 280 / maxWidth 340` | `min-w-70 max-w-85` |
 * | `layoutPriority(1)` on text  | `grow shrink-0 basis-0`  |
 * | `Spacer(minLength: 0)`       | the flex gap             |
 *
 * Canon pins the carousel card at exactly 80pt, which clips a two-line
 * subtitle against a 44pt CTA. The web card is a *minimum* of 112px with 24px
 * padding so title, subtitle and action have room, and `fillsWidth` on a
 * regular-width surface stacks it instead of squeezing it into a carousel.
 *
 * ## `layoutPriority(1)`, and the way it is easy to get backwards
 *
 * Canon's comment on that line says the title must be the LAST thing
 * compressed and the action yields first. SwiftUI expresses that by *raising*
 * the text column's priority; flexbox has no priority, so it is expressed as
 * which item is allowed to shrink:
 *
 *   · the text column is `shrink-0` — it keeps the width it was grown to;
 *   · the CTA is `min-w-0 shrink`, and its label is `truncate`, so it is the
 *     one that gives way in a narrow card.
 *
 * The inverse — `min-w-0 flex-1` on the text and `shrink-0` on the button —
 * type-checks, looks tidy, and is the bug: a narrow card truncates the title
 * to "Connect Goo…" beside a full-size CTA, which is what the Compression
 * story exists to show. Note the longhands rather than `flex-1`: `flex-1` is
 * the `flex: 1 1 0%` SHORTHAND and would quietly restore `flex-shrink: 1`.
 *
 * ## The Apple sources are kept
 *
 * `appleCalendar` and `appleReminders` cannot ever be hosts on the web — the
 * epic puts EventKit out of scope. They stay in the enum anyway: the same
 * component renders the Kro Cloud's *record* of an Apple-hosted endeavor coming
 * down from another device, and deleting the cases would make that unrenderable
 * for a saving of two lines.
 */

import type { ColorRole, SemanticRole } from '../system/tokens/roles'
import {
  colorVar,
  radiusVar,
  semanticVar,
  shadowVar,
} from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export const SuggestionSource = {
  appleReminders: 'appleReminders',
  appleCalendar: 'appleCalendar',
  googleCalendar: 'googleCalendar',
  aiProposal: 'aiProposal',
} as const

export type SuggestionSource =
  (typeof SuggestionSource)[keyof typeof SuggestionSource]

export const suggestionSources: readonly SuggestionSource[] = [
  SuggestionSource.appleReminders,
  SuggestionSource.appleCalendar,
  SuggestionSource.googleCalendar,
  SuggestionSource.aiProposal,
]

/** `SuggestionSource.iconName`. */
export function suggestionIcon(source: SuggestionSource): KitSymbolName {
  switch (source) {
    case SuggestionSource.appleReminders:
      return 'heart.circle.fill'
    case SuggestionSource.appleCalendar:
    case SuggestionSource.googleCalendar:
      return 'calendar.circle.fill'
    case SuggestionSource.aiProposal:
      return 'sparkles'
  }
}

/**
 * `SuggestionSource.actionIconName` — canon's three-way split, kept: "Connect"
 * suggestions get a link glyph, "Import" ones the download arrow, and an AI
 * proposal the wand, "so they visually read as 'Apply this idea'".
 */
export function suggestionActionIcon(source: SuggestionSource): KitSymbolName {
  switch (source) {
    case SuggestionSource.appleReminders:
    case SuggestionSource.appleCalendar:
      return 'square.and.arrow.down'
    case SuggestionSource.googleCalendar:
      return 'arrow.right'
    case SuggestionSource.aiProposal:
      return 'wand.and.stars'
  }
}

/**
 * `SuggestionSource.iconTint`, as a token role.
 *
 * Canon's `.blue`, `.indigo` and `.purple` are raw system tints; the port uses
 * the contrast-verified badge palette instead, for the same reason
 * `endeavorProjections` does — the CTA capsule paints its label white on this
 * colour, and a raw system tint under white text measures ≈2.2:1.
 */
export function suggestionTint(source: SuggestionSource): {
  readonly color?: ColorRole
  readonly semantic?: SemanticRole
} {
  switch (source) {
    case SuggestionSource.appleReminders:
      return { color: 'badgeBlue' }
    case SuggestionSource.appleCalendar:
      return { semantic: 'hostAppleCalendar' }
    case SuggestionSource.googleCalendar:
      return { color: 'badgeIndigo' }
    case SuggestionSource.aiProposal:
      return { color: 'badgePurple' }
  }
}

function tintValue(source: SuggestionSource): string {
  const tint = suggestionTint(source)
  return tint.semantic === undefined
    ? colorVar(tint.color ?? 'accent')
    : semanticVar(tint.semantic)
}

export interface SuggestionCardModel {
  readonly title: string
  readonly subtitle: string
  readonly actionTitle: string
  readonly source: SuggestionSource
}

export interface SuggestionCardProps {
  readonly model: SuggestionCardModel
  /** Set while an async flow is in flight, to prevent a double-tap. */
  readonly isActionDisabled?: boolean
  /** Banner placement instead of the carousel's 280–340px. */
  readonly fillsWidth?: boolean
  readonly onAction: () => void
  readonly className?: string
}

export function SuggestionCard({
  model,
  isActionDisabled = false,
  fillsWidth = false,
  onAction,
  className,
}: SuggestionCardProps) {
  const Icon = endeavorIcon(suggestionIcon(model.source))
  const ActionIcon = endeavorIcon(suggestionActionIcon(model.source))
  const tint = tintValue(model.source)

  return (
    <div
      data-slot="suggestion-card"
      className={cn(
        'flex min-h-28 items-center gap-kro-medium overflow-hidden p-kro-large',
        fillsWidth ? 'w-full' : 'w-70 min-w-70 max-w-85 shrink-0',
        className,
      )}
      style={{
        backgroundColor: colorVar('absolute'),
        borderRadius: radiusVar('surface'),
        boxShadow: shadowVar('subtle'),
      }}
    >
      <Icon
        size={26}
        aria-hidden
        className="size-9 shrink-0"
        style={{ color: tint }}
      />

      {/* The text column yields LAST — see the layoutPriority note above. It
          grows into the free space and then refuses to shrink; the CTA below
          is the item that gives way. */}
      <div
        data-slot="suggestion-card-text"
        className="flex shrink-0 grow basis-0 flex-col gap-0.5"
      >
        <p
          className="m-0 line-clamp-2 text-sm font-bold"
          style={{ color: colorVar('fore') }}
        >
          {model.title}
        </p>
        <p
          className="m-0 line-clamp-2 text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          {model.subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={isActionDisabled}
        className={cn(
          // `min-w-0 shrink`: the CTA is the item that compresses, so the title
          // beside it is the last thing to lose width — canon's
          // `layoutPriority(1)` on the text column, read as a flex rule.
          'inline-flex min-w-0 shrink items-center gap-1 px-3 text-xs font-semibold text-white',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
          'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        )}
        style={{
          minHeight: 'var(--kro-size-min-touch-target)',
          borderRadius: radiusVar('pill'),
          backgroundColor: tint,
        }}
      >
        <ActionIcon size={13} aria-hidden className="shrink-0" />
        <span className="truncate">{model.actionTitle}</span>
      </button>
    </div>
  )
}
