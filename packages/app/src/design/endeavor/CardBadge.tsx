/**
 * `CardBadge` — the 20pt capsule in an endeavor card's top corners.
 *
 * Canon: `KroUI/Components/EndeavorCard.swift`, the struct of the same name.
 * The geometry is canon and is asserted in `CardBadge.test.tsx`, because
 * `docs/Features/EndeavorCard.md` calls the Do-tab corner composition "the
 * reference" that Android matches: a badge that drifts here drifts the contract
 * two other platforms are held to.
 *
 * | Canon (pt)                | Here (px)                    |
 * |---------------------------|------------------------------|
 * | `frame(height: 20)`       | `h-5`                        |
 * | `padding(.horizontal, 6)` | `px-1.5`                     |
 * | `padding(.vertical, 3)`   | `py-[3px]`                   |
 * | `HStack(spacing: 2)`      | `gap-0.5`                    |
 * | `.caption2` `.bold`       | `text-[11px] font-bold`      |
 * | icon `.system(size: 10)`  | `size={10}`                  |
 * | `clipShape(Capsule())`    | `rounded-kro-pill`           |
 *
 * ## The two colour adaptations, and why
 *
 * `AthensGray` and `ScotchMist` are **non-adaptive** in canon — one Display-P3
 * value each, no dark variant — and `tokens.css` ports them that way, so both
 * pills stay light chips in both schemes. That is deliberate parity, not an
 * oversight, and it is what forces the foregrounds:
 *
 *   · canon's urgency foregrounds are `.gray` / `.orange` / `.kroRed`. On
 *     `AthensGray` the last two measure ≈2.9:1 and ≈3.4:1 — under AA. The port
 *     substitutes the design system's three FIXED-VALUE dark roles
 *     (`payneGray`, `bannerWarning`, `bannerDanger`), which read as the same
 *     grey / orange / red and measure 5.19:1, 7.08:1 and 8.48:1.
 *   · canon's reward foreground is `Color(red: 0.6, green: 0.5, blue: 0.0)`,
 *     which is 2.82:1 on `ScotchMist`. `bannerWarning` is the same deep amber
 *     family and measures 5.85:1.
 *
 * The scheme-flipping badge palette (`badgeOrange`, `badgeRed`, …) is NOT
 * usable here: it lightens in dark mode while the pill fill does not, which
 * would take the pair to ≈2:1 exactly where it looks safest. Every number above
 * is re-measured from `tokens.css` by `badgeContrast.test.ts`, in both schemes,
 * so a token re-tune cannot quietly break the pills.
 */

import type { ColorRole } from '../system/tokens/roles'
import { colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import {
  EndeavorUrgency,
  urgencyDisplayTitle,
  urgencyIconSymbol,
} from './endeavorCardModel'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export interface CardBadgeProps {
  readonly backgroundRole: ColorRole
  readonly foregroundRole: ColorRole
  readonly iconSymbol?: KitSymbolName
  readonly title: string
  /**
   * Circle form: canon drops the label on a `small` card and draws the glyph in
   * a 20×20 circle instead, keeping the accessible name.
   */
  readonly compact?: boolean
  /**
   * Spoken name, when the visible label is not one. "50" is a fine badge and a
   * useless announcement; "50 reward points" is both.
   */
  readonly accessibleName?: string
  readonly className?: string
}

export function CardBadge({
  backgroundRole,
  foregroundRole,
  iconSymbol,
  title,
  compact = false,
  accessibleName,
  className,
}: CardBadgeProps) {
  const Icon = iconSymbol === undefined ? null : endeavorIcon(iconSymbol)
  const style = {
    backgroundColor: colorVar(backgroundRole),
    color: colorVar(foregroundRole),
  }

  if (compact) {
    return (
      <span
        // `role="img"`: the badge is a single graphic whose accessible name
        // replaces its contents. Without a role, a `<span>`'s `aria-label` is
        // simply ignored — the circle form announced nothing at all, because
        // the glyph inside it is `aria-hidden`.
        role="img"
        aria-label={accessibleName ?? title}
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-kro-pill',
          className,
        )}
        style={style}
      >
        {Icon === null ? null : (
          <Icon size={10} strokeWidth={2.75} aria-hidden />
        )}
      </span>
    )
  }

  return (
    <span
      // `role="img"` for the same reason as the circle form above — and with
      // the same `?? title` fallback, because a named role with no name
      // announces LESS than a bare `<span>`: it hides the visible label from
      // assistive technology and puts nothing in its place.
      role="img"
      aria-label={accessibleName ?? title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-0.5 rounded-kro-pill px-1.5 py-[3px]',
        'text-[11px] font-bold leading-none',
        className,
      )}
      style={style}
    >
      {Icon === null ? null : <Icon size={10} strokeWidth={2.75} aria-hidden />}
      {title}
    </span>
  )
}

/* ------------------------------------------------------------------------ */
/* The two canon badges                                                      */
/* ------------------------------------------------------------------------ */

/** The urgency pill's foreground, per the contrast note at the top of the file. */
export function urgencyForegroundRole(urgency: EndeavorUrgency): ColorRole {
  switch (urgency) {
    case EndeavorUrgency.low:
      return 'payneGray'
    case EndeavorUrgency.medium:
      return 'bannerWarning'
    case EndeavorUrgency.high:
      return 'bannerDanger'
  }
}

/** Canon's `badgeBackgroundColor` — `AthensGray` for all three levels. */
export const URGENCY_BACKGROUND_ROLE: ColorRole = 'athensGray'

/** The reward pill's fill and label. */
export const REWARD_BACKGROUND_ROLE: ColorRole = 'scotchMist'
export const REWARD_FOREGROUND_ROLE: ColorRole = 'bannerWarning'

export interface UrgencyBadgeProps {
  readonly urgency: EndeavorUrgency
  /** Small cards draw the circle form. */
  readonly compact?: boolean
}

/**
 * The top-left pill.
 *
 * It renders for every level it is asked about — hiding it on Low is the CARD's
 * decision, stated once in `EndeavorCard`, so the story matrix can still show
 * what a Low pill would look like and a Find row can still print one.
 */
export function UrgencyBadge({ urgency, compact = false }: UrgencyBadgeProps) {
  return (
    <CardBadge
      backgroundRole={URGENCY_BACKGROUND_ROLE}
      foregroundRole={urgencyForegroundRole(urgency)}
      iconSymbol={urgencyIconSymbol(urgency)}
      title={urgencyDisplayTitle(urgency)}
      compact={compact}
    />
  )
}

/** The top-right pill: bolt + amount, always shown. */
export function RewardBadge({ amount }: { readonly amount: number }) {
  return (
    <CardBadge
      backgroundRole={REWARD_BACKGROUND_ROLE}
      foregroundRole={REWARD_FOREGROUND_ROLE}
      iconSymbol="bolt.fill"
      title={String(amount)}
      accessibleName={`${amount} reward points`}
    />
  )
}
