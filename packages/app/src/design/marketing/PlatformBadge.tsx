import type { ReactNode } from 'react'
import { Badge, type BadgeColor } from '../fluent/status/Badge'
import { ICON_SIZE, type LucideIcon } from '../system/icons/icons'
import { cn } from '../system/utils/cn'

export type PlatformStatus = 'live' | 'testflight' | 'in-progress' | 'coming'

export interface PlatformBadgeProps {
  readonly icon: LucideIcon
  /** The platform: "iPhone", "Mac", "Web". */
  readonly label: string
  /** Availability. Its words are part of the accessible name. */
  readonly status: PlatformStatus
  /** Renders a link. */
  readonly href?: string
  /** Renders a button (when there is no `href`). */
  readonly onClick?: () => void
  readonly className?: string
}

export const PLATFORM_STATUS_TEXT: Record<PlatformStatus, string> = {
  live: 'Live',
  testflight: 'TestFlight',
  'in-progress': 'In progress',
  coming: 'Coming soon',
}

const STATUS_COLOR: Record<PlatformStatus, BadgeColor> = {
  live: 'success',
  testflight: 'brand',
  'in-progress': 'warning',
  coming: 'subtle',
}

/** A platform chip: glyph, name and a status tag. Link, button or static. */
export function PlatformBadge({
  icon: Icon,
  label,
  status,
  href,
  onClick,
  className,
}: PlatformBadgeProps) {
  const content: ReactNode = (
    <>
      <Icon aria-hidden="true" size={ICON_SIZE.medium} />
      <span>{label}</span>
      <Badge appearance="tint" size="small" color={STATUS_COLOR[status]}>
        {PLATFORM_STATUS_TEXT[status]}
      </Badge>
    </>
  )
  const classes = cn('kro-platform-badge', className)
  if (href !== undefined) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {content}
      </a>
    )
  }
  if (onClick !== undefined) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <span className={classes}>{content}</span>
}
