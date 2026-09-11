import {
  type MouseEventHandler,
  type ReactNode,
  useCallback,
  useState,
} from 'react'
import { Button } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'
import {
  type FluentControlSize,
  buttonSizeForFluentSize,
  densityForFluentSize,
} from '../sizes'
import type { FluentButtonAppearance } from './appearance'

/**
 * ToggleButton — Fluent 2 "Toggle button", painted with KroGlass.
 *
 * A button that stays pressed. Off is rest, on is selected. Not a
 * switch — that job is HIG Toggle. Role stays `button`; `aria-pressed`
 * is the accessible state. Colour is never the only signal: pressed
 * glass (`kro-glass--pressed`) is the visual one.
 *
 * Wraps `Button`, so the disabled fade lives on that primitive
 * EXACTLY ONCE. Compact (`small`) is the default.
 */

export interface ToggleButtonProps {
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly onCheckedChange?: (checked: boolean) => void
  readonly appearance?: FluentButtonAppearance
  readonly size?: FluentControlSize
  readonly shape?: 'rounded' | 'circular' | 'square'
  readonly disabled?: boolean
  readonly children: ReactNode
  readonly className?: string
  readonly 'aria-label'?: string
  readonly onClick?: MouseEventHandler<HTMLButtonElement>
}

export function ToggleButton({
  checked,
  defaultChecked = false,
  onCheckedChange,
  appearance = 'secondary',
  size = 'small',
  shape = 'rounded',
  disabled,
  children,
  className,
  onClick,
  'aria-label': ariaLabel,
}: ToggleButtonProps) {
  const isControlled = checked !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultChecked)
  const isOn = isControlled ? checked : uncontrolled
  const density = densityForFluentSize(size)

  const userDidToggle = useCallback(() => {
    const next = !isOn
    if (!isControlled) setUncontrolled(next)
    onCheckedChange?.(next)
  }, [isControlled, isOn, onCheckedChange])

  return (
    <Button
      variant={appearance}
      size={buttonSizeForFluentSize(size)}
      shape={shape}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isOn}
      data-slot="toggle-button"
      data-density={density}
      data-checked={isOn ? 'true' : 'false'}
      className={cn(isOn && 'kro-glass kro-glass--pressed', className)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        userDidToggle()
      }}
    >
      {children}
    </Button>
  )
}
