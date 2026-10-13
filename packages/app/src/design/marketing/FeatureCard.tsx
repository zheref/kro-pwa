import type { CSSProperties } from 'react'
import { ICON_SIZE, type LucideIcon } from '../system/icons/icons'
import { type ColorRole, colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'

export interface FeatureCardProps {
  readonly icon: LucideIcon
  readonly title: string
  readonly body: string
  /** The colour role of the top bar and icon tile. Default the live accent. */
  readonly accentRole?: ColorRole
  /** Makes the whole card a link, via a stretched anchor on the title. */
  readonly href?: string
  readonly className?: string
}

/** A feature: tinted icon tile, title, one paragraph, a 3px accent bar. */
export function FeatureCard({
  icon: Icon,
  title,
  body,
  accentRole = 'accent',
  href,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn('kro-feature-card', className)}
      style={{ '--kro-card-accent': colorVar(accentRole) } as CSSProperties}
    >
      <span className="kro-feature-card__icon" aria-hidden="true">
        <Icon size={ICON_SIZE.medium} />
      </span>
      <h3 className="kro-feature-card__title">
        {href === undefined ? (
          title
        ) : (
          <a className="kro-feature-card__link" href={href}>
            {title}
          </a>
        )}
      </h3>
      <p className="kro-feature-card__body">{body}</p>
    </article>
  )
}
