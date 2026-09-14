import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Label — HIG "Labels", painted with KroTokens.
 *
 * Names a control or a value. Never the only way a colour-coded state
 * is communicated: `destructive` is `banner-danger` AND the words in
 * the children (a test asserts the text is present). Compact (13px) is
 * the default; comfortable (15px) is the mobile preview. Secondary is
 * the quieter caption.
 */

export type LabelTone = 'primary' | 'secondary' | 'destructive'
export type LabelSize = 'sm' | 'md'
export type LabelAs = 'label' | 'p' | 'span'

export interface LabelProps {
  readonly as?: LabelAs
  readonly tone?: LabelTone
  readonly size?: LabelSize
  readonly density?: ControlDensity
  readonly htmlFor?: string
  readonly children: ReactNode
  readonly className?: string
}

const TONE_CLASS: Record<LabelTone, string> = {
  primary: 'text-kro-fore font-medium',
  secondary: 'text-kro-fore-secondary',
  destructive: 'text-kro-banner-danger font-medium',
}

const SIZE_CLASS: Record<LabelSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[15px]',
}

export function Label({
  as,
  tone = 'primary',
  size,
  density = DEFAULT_CONTROL_DENSITY,
  htmlFor,
  children,
  className,
}: LabelProps) {
  const Component = as ?? (htmlFor === undefined ? 'span' : 'label')
  const resolvedSize = size ?? (density === 'comfortable' ? 'md' : 'sm')
  const classes = cn(TONE_CLASS[tone], SIZE_CLASS[resolvedSize], className)

  if (Component === 'label') {
    return (
      <label
        data-slot="label"
        data-density={density}
        htmlFor={htmlFor}
        className={classes}
      >
        {children}
      </label>
    )
  }

  if (Component === 'p') {
    return (
      <p
        data-slot="label"
        data-density={density}
        className={cn('m-0', classes)}
      >
        {children}
      </p>
    )
  }

  return (
    <span data-slot="label" data-density={density} className={classes}>
      {children}
    </span>
  )
}
