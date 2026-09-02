import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../utils/cn'

/**
 * Ink for copy that sits on the page field (`DetailBackdrop`), never inside a
 * card or a glass well.
 *
 * Hierarchy is weight and size, never opacity: fading a colour that the
 * contrast suite asserts at full strength spends the margin the assertion
 * measured. `snow` is white in both schemes; the ramp is dark either way.
 */
export interface OnGradientProps extends ComponentPropsWithoutRef<'span'> {
  readonly as?: ElementType
  readonly children?: ReactNode
}

export function OnGradient({
  as,
  className,
  children,
  ...rest
}: OnGradientProps) {
  const Component = (as ?? 'span') as ElementType

  return (
    <Component className={cn('kro-on-gradient', className)} {...rest}>
      {children}
    </Component>
  )
}

/**
 * The uppercase section label that lives *outside* a grouped card, on the
 * page field. Settings, Earn and Account all share this shape; inventing a
 * second one would re-lose the contrast the field requires.
 */
export function FieldSectionLabel({
  className,
  children,
  ...rest
}: Omit<OnGradientProps, 'as'>) {
  return (
    <OnGradient
      as="h3"
      className={cn(
        'm-0 px-kro-tiny font-semibold text-[13px] uppercase tracking-wide',
        className,
      )}
      {...rest}
    >
      {children}
    </OnGradient>
  )
}

export interface PageFieldEmptyProps extends ComponentPropsWithoutRef<'div'> {
  readonly as?: ElementType
  readonly icon?: ReactNode
  readonly title: string
  readonly description?: string
  readonly titleId?: string
}

/**
 * A centred empty / not-yet-built destination on the page field.
 *
 * Destinations that have not landed, Plan modes that have not landed, and any
 * future "nothing here" all share this so the on-gradient ink cannot drift
 * per call site.
 */
export function PageFieldEmpty({
  as,
  icon,
  title,
  description,
  titleId,
  className,
  children,
  ...rest
}: PageFieldEmptyProps) {
  const Component = (as ?? 'div') as ElementType

  return (
    <Component
      className={cn(
        'flex h-full flex-col items-center justify-center',
        'gap-kro-small p-kro-x-large text-center',
        className,
      )}
      {...rest}
    >
      {icon}
      <OnGradient as="h2" id={titleId} className="m-0 font-semibold text-2xl">
        {title}
      </OnGradient>
      {description === undefined ? null : (
        <OnGradient as="p" className="m-0 max-w-prose font-normal text-sm">
          {description}
        </OnGradient>
      )}
      {children}
    </Component>
  )
}
