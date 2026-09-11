/**
 * Fluent 2 Tag and TagGroup, painted with KroTokens.
 *
 * A value someone picked — a recipient, a category. Colour is never the
 * only signal: the word is required, and a dismiss control names the value
 * it removes.
 */

import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

export type TagAppearance = 'filled' | 'outline' | 'brand'
export type TagSize = 'extra-small' | 'small' | 'medium'
export type TagShape = 'rounded' | 'circular'

export const TAG_APPEARANCES: readonly TagAppearance[] = [
  'filled',
  'outline',
  'brand',
]

export const TAG_SIZES: readonly TagSize[] = ['extra-small', 'small', 'medium']

const SIZE_CLASS: Record<TagSize, string> = {
  'extra-small': 'h-5 gap-1 px-1.5 text-[11px]',
  small: 'h-6 gap-1 px-2 text-xs',
  medium: 'h-8 gap-1.5 px-2.5 text-sm',
}

const DISMISS_SIZE: Record<TagSize, number> = {
  'extra-small': 10,
  small: 12,
  medium: 14,
}

const SHAPE_CLASS: Record<TagShape, string> = {
  rounded: 'rounded-kro-small',
  circular: 'rounded-kro-pill',
}

export function tagPaint(appearance: TagAppearance): CSSProperties {
  if (appearance === 'brand') {
    const accent = colorVar('accent')
    return {
      backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
      color: accent,
    }
  }
  if (appearance === 'outline') {
    return {
      color: colorVar('fore'),
      boxShadow: `inset 0 0 0 1px ${colorVar('hairline')}`,
    }
  }
  return {
    backgroundColor: colorVar('backInner'),
    color: colorVar('fore'),
  }
}

export interface TagProps {
  readonly appearance?: TagAppearance
  readonly size?: TagSize
  readonly shape?: TagShape
  readonly dismissible?: boolean
  readonly onDismiss?: () => void
  readonly icon?: ReactNode
  readonly children: string
  readonly className?: string
}

export function Tag({
  appearance = 'filled',
  size = 'medium',
  shape = 'rounded',
  dismissible = false,
  onDismiss,
  icon,
  children,
  className,
}: TagProps) {
  return (
    <span
      data-slot="tag"
      data-appearance={appearance}
      data-size={size}
      data-shape={shape}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center',
        'font-semibold leading-none',
        SIZE_CLASS[size],
        SHAPE_CLASS[shape],
        className,
      )}
      style={tagPaint(appearance)}
    >
      {icon === undefined ? null : (
        <span className="inline-flex shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
      {dismissible ? (
        <button
          type="button"
          aria-label={`Remove ${children}`}
          onClick={onDismiss}
          className={cn(
            'inline-flex shrink-0 items-center justify-center',
            'rounded-kro-small outline-none',
            'focus-visible:shadow-[var(--kro-ring)]',
          )}
        >
          <X size={DISMISS_SIZE[size]} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </span>
  )
}

export interface TagGroupProps {
  readonly children: ReactNode
  readonly className?: string
}

export function TagGroup({ children, className }: TagGroupProps) {
  return (
    <div
      data-slot="tag-group"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {children}
    </div>
  )
}
