import type { MouseEventHandler, ReactNode } from 'react'
import { Button } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'
import {
  type FluentControlSize,
  buttonSizeForFluentSize,
  densityForFluentSize,
} from '../sizes'
import type { FluentButtonAppearance } from './appearance'

/**
 * CompoundButton — Fluent 2 "Compound button", painted with KroTokens.
 *
 * A button with a title and a supporting line. The extra detail is how
 * the caller chooses; colour is never the only signal. Wraps `Button`,
 * so the disabled fade lives on that primitive EXACTLY ONCE.
 *
 * Compact (`small`) is the default. Comfortable (`medium`) is mobile.
 * `large` is the 44px floor.
 */

export interface CompoundButtonProps {
  readonly appearance?: FluentButtonAppearance
  readonly size?: FluentControlSize
  readonly shape?: 'rounded' | 'circular' | 'square'
  readonly disabled?: boolean
  readonly icon?: ReactNode
  readonly secondaryContent: string
  readonly children: ReactNode
  readonly className?: string
  readonly onClick?: MouseEventHandler<HTMLButtonElement>
}

export function CompoundButton({
  appearance = 'secondary',
  size = 'small',
  shape = 'rounded',
  disabled,
  icon,
  secondaryContent,
  children,
  className,
  onClick,
}: CompoundButtonProps) {
  const density = densityForFluentSize(size)

  return (
    <Button
      variant={appearance}
      size={buttonSizeForFluentSize(size)}
      shape={shape}
      disabled={disabled}
      onClick={onClick}
      data-slot="compound-button"
      data-density={density}
      className={cn(
        'h-auto items-start whitespace-normal py-kro-tiny text-left',
        className,
      )}
    >
      {icon}
      <span className="flex flex-col items-start gap-0">
        <span className="font-medium">{children}</span>
        <span
          className={cn(
            'font-normal',
            appearance === 'primary'
              ? 'text-kro-on-accent/80'
              : 'text-kro-fore-secondary',
          )}
        >
          {secondaryContent}
        </span>
      </span>
    </Button>
  )
}
