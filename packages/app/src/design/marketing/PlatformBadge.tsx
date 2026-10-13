import type { ReactNode } from 'react'
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

/**
 * A platform chip: glyph, name and a status tag. Link, button or static.
 *
 * The status tag is not the system `Badge`: its tint recipe paints the label
 * in the hue itself, and on the 16 % tint `mist`, `focusGreen` and
 * `badgeOrange` land at 1.1–4.3:1 in light. Here the hue lives in the tint and
 * a dot (`data-status` picks it in `marketing.css`), and the words are `fore`,
 * so every status reads at body contrast in both schemes.
 */
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
      <span className="kro-platform-badge__status" data-status={status}>
        {PLATFORM_STATUS_TEXT[status]}
      </span>
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
