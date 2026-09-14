import type { ReactNode } from 'react'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * Card — Fluent 2 container for one concept: header, preview, body,
 * footer.
 *
 * Appearance is fill, outline or none — never colour alone as the
 * grouping signal. The card radius and (for filled) the surface
 * shadow are. Size is padding, mapped onto Kro space tokens.
 */

export type CardAppearance =
  | 'filled'
  | 'filled-alternative'
  | 'outline'
  | 'subtle'

export type CardOrientation = 'vertical' | 'horizontal'

export interface CardProps {
  readonly appearance?: CardAppearance
  readonly size?: FluentControlSize
  readonly orientation?: CardOrientation
  readonly children: ReactNode
  readonly className?: string
}

const APPEARANCE_CLASS: Record<CardAppearance, string> = {
  filled: 'bg-kro-absolute shadow-kro-surface',
  'filled-alternative': 'bg-kro-back-inner',
  outline: 'border border-kro-hairline bg-transparent',
  subtle: 'bg-transparent',
}

const PADDING_CLASS: Record<FluentControlSize, string> = {
  small: 'p-kro-small',
  medium: 'p-kro-medium',
  large: 'p-kro-large',
}

export interface CardHeaderProps {
  readonly header: string
  readonly description?: string
  readonly action?: ReactNode
  readonly className?: string
}

export function CardHeader({
  header,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-start justify-between gap-kro-small',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-kro-tiny">
        <h3 className="m-0 font-semibold text-kro-fore">{header}</h3>
        {description === undefined ? null : (
          <p className="m-0 text-kro-fore-secondary">{description}</p>
        )}
      </div>
      {action === undefined ? null : <div className="shrink-0">{action}</div>}
    </div>
  )
}

export interface CardPreviewProps {
  readonly children: ReactNode
  readonly className?: string
}

export function CardPreview({ children, className }: CardPreviewProps) {
  return (
    <div data-slot="card-preview" className={cn('overflow-hidden', className)}>
      {children}
    </div>
  )
}

export interface CardFooterProps {
  readonly children: ReactNode
  readonly className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-kro-small text-kro-fore-secondary',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Card({
  appearance = 'filled',
  size = 'medium',
  orientation = 'vertical',
  children,
  className,
}: CardProps) {
  const density = densityForFluentSize(size)

  return (
    <div
      data-slot="card"
      data-appearance={appearance}
      data-size={size}
      data-density={density}
      data-orientation={orientation}
      className={cn(
        'flex rounded-kro-card',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        APPEARANCE_CLASS[appearance],
        PADDING_CLASS[size],
        'gap-kro-small',
        className,
      )}
    >
      {children}
    </div>
  )
}
