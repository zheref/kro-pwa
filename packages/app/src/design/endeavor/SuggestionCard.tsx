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
 * | `frame(height: 80)`          | `h-20`                   |
 * | `padding(16)`                | `p-kro-medium`           |
 * | icon `36×36`, `size: 26`     | `size-9`, `size={26}`    |
 * | carousel `minWidth 373 / maxWidth 453` | inline, canon 280–340 × 4/3 |
 * | `layoutPriority(1)` on text  | `grow shrink-0 basis-0`  |
 * | `Spacer(minLength: 0)`       | the flex gap             |
 *
 * Canon pins the carousel card at exactly 80pt. `fillsWidth` is Plan's stacked
 * banner placement, **not** Do's. The carousel is a third wider than canon's
 * 280–340 so the title and subtitle stop wrapping beside the CTA; the CTA
 * itself then sizes by `density` (the compact button, or the 44px floor).
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

import { useId } from 'react'
import type { ColorRole, SemanticRole } from '../system/tokens/roles'
import { colorVar, radiusVar, semanticVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type ControlDensity, Button } from '../system/primitives/button'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

/** Canon 280 × 4/3 — wide enough that the title does not wrap beside the CTA. */
export const SUGGESTION_CARD_MIN_WIDTH_PX = 373
/** Canon 340 × 4/3. */
export const SUGGESTION_CARD_MAX_WIDTH_PX = 453

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
  /** Banner placement instead of the carousel's 373–453px. */
  readonly fillsWidth?: boolean
  /**
   * Compact is the 28px pointer CTA; comfortable is the 44px touch floor.
   * Defaults compact so a carousel card on desktop does not wrap its title
   * around a 44px pill.
   */
  readonly density?: ControlDensity
  readonly onAction: () => void
  /**
   * Drops the suggestion. Rendered as a word under the action, not a second
   * shaped control and not a glyph beside the card.
   */
  readonly onDismiss?: () => void
  readonly className?: string
}

export function SuggestionCard({
  model,
  isActionDisabled = false,
  fillsWidth = false,
  density = 'compact',
  onAction,
  onDismiss,
  className,
}: SuggestionCardProps) {
  const showsActionGlyph = model.source !== SuggestionSource.googleCalendar
  const ActionIcon = showsActionGlyph
    ? endeavorIcon(suggestionActionIcon(model.source))
    : null
  const tint = tintValue(model.source)

  return (
    <div
      data-slot="suggestion-card"
      data-density={density}
      className={cn(
        'flex min-h-20 items-center gap-kro-small p-kro-medium',
        fillsWidth ? 'w-full' : 'shrink-0',
        className,
      )}
      style={{
        backgroundColor: colorVar('absolute'),
        borderRadius: radiusVar('surface'),
        boxShadow: 'inset 0 0 0 1px var(--kro-glass-rim)',
        ...(fillsWidth
          ? {}
          : {
              width: SUGGESTION_CARD_MIN_WIDTH_PX,
              minWidth: SUGGESTION_CARD_MIN_WIDTH_PX,
              maxWidth: SUGGESTION_CARD_MAX_WIDTH_PX,
            }),
      }}
    >
      {model.source === SuggestionSource.googleCalendar ? (
        <GoogleCalendarMark className="mr-kro-small size-9 shrink-0" />
      ) : (
        <SuggestionGlyph source={model.source} tint={tint} />
      )}

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

      <div className="grid shrink-0 grid-cols-1 gap-1">
        <Button
          variant="ghost"
          size={density === 'comfortable' ? 'lg' : 'sm'}
          disabled={isActionDisabled}
          onClick={onAction}
          className="w-full min-w-0 shrink"
          style={{
            backgroundColor: 'var(--kro-color-fore)',
            color: 'var(--kro-color-absolute)',
          }}
        >
          {ActionIcon === null ? null : (
            <ActionIcon size={13} aria-hidden className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{model.actionTitle}</span>
        </Button>
        {onDismiss === undefined ? null : (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'inline-flex w-full items-center justify-center',
              density === 'comfortable'
                ? 'h-11 rounded-kro-small px-kro-medium text-sm'
                : 'h-7 rounded-kro-small px-2.5 text-xs',
              'cursor-default bg-transparent font-medium text-kro-fore-secondary',
              'hover:text-kro-fore',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

function SuggestionGlyph({
  source,
  tint,
}: {
  readonly source: SuggestionSource
  readonly tint: string
}) {
  const Icon = endeavorIcon(suggestionIcon(source))
  return (
    <Icon
      size={26}
      aria-hidden
      className="mr-kro-small size-9 shrink-0"
      style={{ color: tint }}
    />
  )
}

/**
 * Google's 2026 Calendar product icon, the public mark that replaced the
 * 2020 four-corner "31". Used only to name the service this card connects.
 */
export function GoogleCalendarMark({
  className,
}: {
  readonly className?: string
}) {
  const raw = useId().replace(/:/g, '')
  const maskA = `${raw}-a`
  const maskC = `${raw}-c`
  const gradB = `${raw}-b`
  const gradD = `${raw}-d`
  const blurE = `${raw}-e`
  return (
    <svg
      viewBox="0 0 800 859.0954"
      fill="none"
      aria-hidden
      data-testid="google-calendar-mark"
      className={className}
    >
      <path
        fill="#bbe2ff"
        d="M 64.743253,150.86554 C 64.743253,67.543758 132.28701,0 215.60879,0 h 368.78242 c 83.32178,0 150.86554,67.543758 150.86554,150.86554 v 159.24695 c 0,83.32178 -67.54376,150.86554 -150.86554,150.86554 H 215.60879 c -83.32178,0 -150.865537,-67.54376 -150.865537,-150.86554 z"
      />
      <path
        fill="#3c90ff"
        d="M 1.1859076,216.8273 C -9.5475474,135.25514 53.952176,62.86064 136.22104,62.86064 h 527.55792 c 82.2741,0 145.76859,72.3945 135.03513,153.96666 l -32.12702,244.15073 32.12702,244.15072 c 10.73346,81.57216 -52.76103,153.96666 -135.03513,153.96666 H 136.22104 c -82.274102,0 -145.7685874,-72.3945 -135.0351324,-153.96666 L 33.312933,460.97803 Z"
      />
      <mask
        id={maskA}
        width="154"
        height="152"
        x="19"
        y="20"
        maskUnits="userSpaceOnUse"
      >
        <path
          fill="#3c90ff"
          d="M 19.867,49.392 C 17.818,33.82 29.94,20 45.645,20 h 100.71 c 15.706,0 27.827,13.82 25.778,29.392 L 166,96 l 6.133,46.608 C 174.182,158.18 162.061,172 146.355,172 H 45.645 C 29.939,172 17.818,158.18 19.867,142.608 L 26,96 Z"
        />
      </mask>
      <g
        mask={`url(#${maskA})`}
        transform="matrix(5.2383867,0,0,5.2383867,-102.88512,-41.907093)"
      >
        <path
          fill={`url(#${gradB})`}
          d="M 0,0 H 166 V 76 H 0 Z"
          transform="matrix(1,0,0,-1,13,172)"
        />
      </g>
      <mask
        id={maskC}
        width="154"
        height="152"
        x="19"
        y="20"
        maskUnits="userSpaceOnUse"
      >
        <path
          fill="#3186ff"
          d="M 19.867,49.392 C 17.818,33.82 29.94,20 45.645,20 h 100.71 c 15.706,0 27.827,13.82 25.778,29.392 L 166,96 l 6.133,46.608 C 174.182,158.18 162.061,172 146.355,172 H 45.645 C 29.939,172 17.818,158.18 19.867,142.608 L 26,96 Z"
        />
      </mask>
      <g
        mask={`url(#${maskC})`}
        transform="matrix(5.2383867,0,0,5.2383867,-102.88512,-41.907093)"
      >
        <path
          fill={`url(#${gradD})`}
          d="M 32,27.2 C 32,16.596 40.596,8 51.2,8 h 89.6 C 151.404,8 160,16.596 160,27.2 V 96 H 32 Z"
          filter={`url(#${blurE})`}
        />
      </g>
      <path
        fill="#ffffff"
        d="m 291.84303,656.55843 q -32.90754,0 -56.45409,-10.70202 -23.54655,-10.70203 -39.86412,-28.62779 -16.05566,-18.19815 -22.74508,-35.58436 -6.68942,-17.3862 -5.34839,-21.13689 a 10.84346,10.84346 0 0 1 5.34839,-5.88794 l 29.70165,-11.77066 q 3.74021,-1.8701 7.4909,-0.53431 3.74021,1.06863 8.82668,12.30497 5.35363,11.23634 14.98178,23.8137 a 74.908929,74.908929 0 0 0 23.54655,19.52871 q 13.65124,6.95658 33.70902,6.95658 32.37323,0 51.37286,-18.72724 19.26155,-18.72723 19.26155,-47.62217 0,-31.3046 -20.33542,-48.16173 Q 321.00513,473.283 287.55803,473.283 H 259.4698 a 9.9529347,9.9529347 0 0 1 -6.95657,-2.67158 q -2.67158,-2.94397 -2.67682,-6.68942 v -28.62778 q 0,-4.01785 2.67158,-6.68942 a 9.5338637,9.5338637 0 0 1 6.96181,-2.94398 h 24.34279 q 29.96881,0 48.16172,-16.32281 18.19292,-16.32281 18.19292,-42.27378 0,-25.67857 -16.32281,-41.46707 -16.32282,-15.7885 -44.94536,-15.7885 -16.05566,0 -27.82631,5.35364 a 60.241447,60.241447 0 0 0 -20.33542,14.98178 118.91138,118.91138 0 0 0 -14.71463,19.8011 q -6.14986,10.16771 -9.90055,11.23634 -3.7402,0.80148 -7.22373,-1.33579 l -28.09347,-13.64599 q -3.47829,-1.87535 -4.54692,-5.88795 -1.06863,-4.0126 6.42226,-18.72723 7.75805,-14.98179 23.54131,-30.50313 a 110.00612,110.00612 0 0 1 36.92539,-24.08086 q 21.13689,-8.56476 49.23036,-8.55953 52.17433,0 82.67222,27.55392 30.50312,27.29199 30.50312,72.24259 0,31.03744 -14.98178,53.77728 -14.71987,22.7346 -41.73947,32.11131 v 1.06863 q 32.64039,9.62815 51.36762,35.31196 18.99963,25.42189 18.99439,60.73386 0,50.57138 -35.3172,82.94461 -35.30673,32.37323 -92.03846,32.37323 z m 268.46732,-6.1551 q -4.54692,0 -8.03045,-3.47829 a 11.78637,11.78637 0 0 1 -3.20589,-8.29237 V 341.11326 l -60.19954,43.34241 q -3.21637,2.40966 -7.49613,1.60819 a 10.267238,10.267238 0 0 1 -6.41702,-4.0126 l -17.39145,-24.62042 a 10.372006,10.372006 0 0 1 -1.87534,-7.4909 q 0.80147,-4.27452 4.27976,-6.68418 l 106.75308,-76.25519 q 1.34103,-1.06863 2.94398,-1.60295 1.60818,-0.80147 3.74544,-0.80147 h 22.47792 q 4.54692,0 7.22374,3.21113 2.94397,2.9335 2.94397,7.49089 v 363.3345 q 0,4.81932 -3.47829,8.29237 a 10.476773,10.476773 0 0 1 -8.03045,3.47829 z"
      />
      <defs>
        <linearGradient
          id={gradB}
          x1="83"
          x2="83"
          y1="76"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4fa0ff" />
          <stop offset="1" stopColor="#3186ff" />
        </linearGradient>
        <linearGradient
          id={gradD}
          x1="89.06"
          x2="89.06"
          y1="21.75"
          y2="96.39"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a9a8ff" />
          <stop offset="0.8" stopColor="#3c90ff" />
        </linearGradient>
        <filter
          id={blurE}
          width="152"
          height="112"
          x="20"
          y="-4"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  )
}
