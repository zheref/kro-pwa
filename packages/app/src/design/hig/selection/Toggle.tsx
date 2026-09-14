import {
  type ComponentPropsWithoutRef,
  useCallback,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Toggle — HIG "Toggles", painted with KroGlass.
 *
 * Apple's switch is a 51×31 capsule whose knob slides. Ours keeps that
 * layout and that purpose (a binary, not a "tappable label that happens
 * to look filled") and swaps the system green for accent-tinted glass,
 * the knob for `on-accent` / `absolute`. Colour is never the only signal:
 * the knob's position is the state, and `aria-checked` is the accessible one.
 *
 * Compact (40×24) is the default. Comfortable (51×31) is the mobile preview.
 *
 * The disabled fade is applied EXACTLY ONCE, in `hig.css` on `:disabled`.
 * A wrapper that also dims its subtree would multiply the two to ~0.38
 * and drop the control below the 3:1 floor for UI elements.
 */

export interface ToggleProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'role'> {
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly onCheckedChange?: (checked: boolean) => void
  readonly label?: string
  readonly density?: ControlDensity
}

export function Toggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
  onClick,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: ToggleProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = checked !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultChecked)
  const isOn = isControlled ? checked : uncontrolled

  const userDidToggle = useCallback(() => {
    const next = !isOn
    if (!isControlled) setUncontrolled(next)
    onCheckedChange?.(next)
  }, [isControlled, isOn, onCheckedChange])

  const switchControl = (
    <button
      id={controlId}
      type="button"
      role="switch"
      aria-checked={isOn}
      data-checked={isOn ? 'true' : 'false'}
      data-density={density}
      data-slot="toggle"
      disabled={disabled}
      className={cn(
        'kro-hig-toggle kro-glass kro-glass--control kro-glass--interactive',
        isOn && 'kro-glass--accent',
        className,
      )}
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        userDidToggle()
      }}
    >
      <span className="kro-hig-toggle-knob" aria-hidden="true" />
    </button>
  )

  if (label === undefined) return switchControl

  return (
    <div
      className={cn(
        'inline-flex items-center gap-kro-small text-kro-fore',
        DENSITY_TYPE[density],
      )}
    >
      {switchControl}
      <label htmlFor={controlId}>{label}</label>
    </div>
  )
}
