import type { CSSProperties } from 'react'
import { colorVar, radiusVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'
import { Avatar, avatarSizePx, type AvatarSize } from './Avatar'

/**
 * Avatar group — Fluent 2 Content, painted with KroTokens.
 *
 * Several people, spread or stacked. Overflow is a last avatar whose
 * accessible name is "N more" — the count is a word, not a colour.
 */

export type AvatarGroupLayout = 'spread' | 'stack'

export interface AvatarGroupProps {
  readonly names: readonly string[]
  readonly layout?: AvatarGroupLayout
  readonly max?: number
  readonly size?: AvatarSize
}

function partitionNames(
  names: readonly string[],
  max: number,
): {
  readonly shown: readonly string[]
  readonly overflow: number
} {
  if (max < 1 || names.length <= max) {
    return { shown: names, overflow: 0 }
  }
  const shownCount = max - 1
  return {
    shown: names.slice(0, shownCount),
    overflow: names.length - shownCount,
  }
}

function stackItemStyle(index: number, overlap: number): CSSProperties {
  return {
    marginInlineStart: index === 0 ? 0 : -overlap,
    zIndex: index,
    boxShadow: `0 0 0 2px ${colorVar('back')}`,
    borderRadius: radiusVar('pill'),
  }
}

export function AvatarGroup({
  names,
  layout = 'spread',
  max = 3,
  size = 32,
}: AvatarGroupProps) {
  const { shown, overflow } = partitionNames(names, max)
  const overlap = Math.round(avatarSizePx(size) * 0.28)

  return (
    <span
      data-slot="avatar-group"
      className={cn(
        'inline-flex items-center',
        layout === 'spread' && 'gap-kro-tiny',
      )}
    >
      {shown.map((name, index) => (
        <span
          key={name}
          className="inline-flex"
          style={
            layout === 'stack' ? stackItemStyle(index, overlap) : undefined
          }
        >
          <Avatar name={name} size={size} color="colorful" />
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className="inline-flex"
          style={
            layout === 'stack'
              ? stackItemStyle(shown.length, overlap)
              : undefined
          }
        >
          <Avatar
            name={`${overflow} more`}
            initials={`+${overflow}`}
            size={size}
            color="neutral"
          />
        </span>
      ) : null}
    </span>
  )
}
