/**
 * Fluent 2 Badge and CounterBadge, painted with KroTokens.
 *
 * Colour is never the only signal: a badge always carries visible text (or,
 * for a counter dot, a spoken count). Appearances map onto the same
 * prominent / ghost / outline / 16% tint recipe as KroChip.
 */

import type { CSSProperties, ReactNode } from 'react'
import type { ColorRole } from '../../system/tokens/roles'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

export type BadgeAppearance = 'filled' | 'ghost' | 'outline' | 'tint'
export type BadgeSize =
  | 'tiny'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
export type BadgeShape = 'rounded' | 'circular' | 'square'
export type BadgeColor =
  | 'brand'
  | 'danger'
  | 'important'
  | 'informative'
  | 'severe'
  | 'subtle'
  | 'success'
  | 'warning'

export const BADGE_COLOR_ROLES: Record<BadgeColor, ColorRole> = {
  brand: 'accent',
  danger: 'bannerDanger',
  important: 'payneGray',
  informative: 'cozyBlue',
  severe: 'bannerWarning',
  subtle: 'mist',
  success: 'focusGreen',
  warning: 'badgeOrange',
}

export const BADGE_COLORS: readonly BadgeColor[] = [
  'brand',
  'danger',
  'important',
  'informative',
  'severe',
  'subtle',
  'success',
  'warning',
]

export const BADGE_APPEARANCES: readonly BadgeAppearance[] = [
  'filled',
  'ghost',
  'outline',
  'tint',
]

export const BADGE_SIZES: readonly BadgeSize[] = [
  'tiny',
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
]

export const DEFAULT_OVERFLOW_COUNT = 99

const SIZE_CLASS: Record<BadgeSize, string> = {
  tiny: 'h-4 min-w-4 px-1 text-[10px]',
  'extra-small': 'h-5 min-w-5 px-1.5 text-[10px]',
  small: 'h-6 min-w-6 px-2 text-[11px]',
  medium: 'h-7 min-w-7 px-2.5 text-xs',
  large: 'h-8 min-w-8 px-3 text-[13px]',
  'extra-large': 'h-9 min-w-9 px-3.5 text-sm',
}

const SHAPE_CLASS: Record<BadgeShape, string> = {
  rounded: 'rounded-kro-small',
  circular: 'rounded-kro-pill',
  square: 'rounded-[2px]',
}

/**
 * Filled label colour. Light fills (`mist`, `cozyBlue`) need charcoal;
 * brand uses `onAccent` so it follows the live accent; everything else is
 * snow on a dark chip/banner token.
 */
export function badgeFilledForeground(color: BadgeColor): ColorRole {
  if (color === 'brand') return 'onAccent'
  if (color === 'subtle' || color === 'informative') return 'charcoal'
  return 'snow'
}

export function badgePaint(
  appearance: BadgeAppearance,
  color: BadgeColor,
): CSSProperties {
  const value = colorVar(BADGE_COLOR_ROLES[color])
  if (appearance === 'filled') {
    return {
      backgroundColor: value,
      color: colorVar(badgeFilledForeground(color)),
    }
  }
  if (appearance === 'ghost') {
    return { color: value }
  }
  if (appearance === 'outline') {
    return {
      color: value,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${value} 55%, transparent)`,
    }
  }
  return {
    backgroundColor: `color-mix(in srgb, ${value} 16%, transparent)`,
    color: value,
  }
}

function isTextChild(children: ReactNode): boolean {
  return typeof children === 'string' || typeof children === 'number'
}

export interface BadgeProps {
  readonly appearance?: BadgeAppearance
  readonly size?: BadgeSize
  readonly shape?: BadgeShape
  readonly color?: BadgeColor
  readonly children: ReactNode
  readonly className?: string
  readonly 'aria-label'?: string
}

export function Badge({
  appearance = 'filled',
  size = 'medium',
  shape = 'rounded',
  color = 'brand',
  children,
  className,
  'aria-label': ariaLabel,
}: BadgeProps) {
  const named = !isTextChild(children)
  const classNames = cn(
    'inline-flex max-w-full shrink-0 items-center justify-center',
    'font-semibold leading-none whitespace-nowrap',
    SIZE_CLASS[size],
    SHAPE_CLASS[shape],
    className,
  )
  const style = badgePaint(appearance, color)

  if (named) {
    return (
      <span
        data-slot="badge"
        data-appearance={appearance}
        data-size={size}
        data-shape={shape}
        data-color={color}
        role="img"
        aria-label={ariaLabel ?? 'Badge'}
        className={classNames}
        style={style}
      >
        {children}
      </span>
    )
  }

  return (
    <span
      data-slot="badge"
      data-appearance={appearance}
      data-size={size}
      data-shape={shape}
      data-color={color}
      className={classNames}
      style={style}
    >
      {children}
    </span>
  )
}

export type CounterBadgeSize = 'tiny' | 'small' | 'medium'

export interface CounterBadgeProps {
  readonly count: number
  readonly overflowCount?: number
  readonly color?: BadgeColor
  readonly size?: CounterBadgeSize
  readonly dot?: boolean
  readonly className?: string
}

export function formatCounterCount(
  count: number,
  overflowCount: number = DEFAULT_OVERFLOW_COUNT,
): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (safe > overflowCount) return `${overflowCount}+`
  return String(safe)
}

const COUNTER_SIZE_CLASS: Record<CounterBadgeSize, string> = {
  tiny: 'h-4 min-w-4 px-1 text-[10px]',
  small: 'h-5 min-w-5 px-1.5 text-[10px]',
  medium: 'h-6 min-w-6 px-1.5 text-[11px]',
}

const DOT_SIZE_CLASS: Record<CounterBadgeSize, string> = {
  tiny: 'size-2',
  small: 'size-2.5',
  medium: 'size-3',
}

export function CounterBadge({
  count,
  overflowCount = DEFAULT_OVERFLOW_COUNT,
  color = 'brand',
  size = 'medium',
  dot = false,
  className,
}: CounterBadgeProps) {
  const display = formatCounterCount(count, overflowCount)
  const paint = badgePaint('filled', color)

  if (dot) {
    return (
      <span
        role="status"
        data-slot="counter-badge"
        data-dot=""
        data-color={color}
        data-size={size}
        aria-label={display}
        className={cn(
          'inline-flex shrink-0 rounded-kro-pill',
          DOT_SIZE_CLASS[size],
          className,
        )}
        style={{ backgroundColor: paint.backgroundColor }}
      />
    )
  }

  return (
    <span
      role="status"
      data-slot="counter-badge"
      data-color={color}
      data-size={size}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        'rounded-kro-pill font-semibold leading-none',
        COUNTER_SIZE_CLASS[size],
        className,
      )}
      style={paint}
    >
      {display}
    </span>
  )
}
