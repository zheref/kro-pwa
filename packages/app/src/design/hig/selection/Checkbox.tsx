import {
  type ComponentPropsWithoutRef,
  useCallback,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_HIT,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Checkbox — HIG "Checkboxes", painted with KroTokens.
 *
 * Apple's box is a binary that can sit next to a row label. Ours keeps the
 * native checkbox (so the platform owns the tick and the indeterminate
 * affordance) and only restyles the face via `kro-hig-check`. The 22px glyph
 * is the compact mark; the hit wrapper follows compact / comfortable
 * density. Colour is never the only signal: the tick is the state.
 *
 * The disabled fade is applied EXACTLY ONCE, in `hig.css` on `:disabled`.
 * A wrapper that also dims its subtree would multiply the two to ~0.38
 * and drop the control below the 3:1 floor for UI elements.
 */

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'type'> {
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly onCheckedChange?: (checked: boolean) => void
  readonly label?: string
  readonly density?: ControlDensity
}

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: CheckboxProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = checked !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultChecked)
  const isOn = isControlled ? checked : uncontrolled

  const userDidToggle = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next)
      onCheckedChange?.(next)
    },
    [isControlled, onCheckedChange],
  )

  const box = (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        DENSITY_HIT[density],
      )}
    >
      <input
        id={controlId}
        type="checkbox"
        checked={isOn}
        disabled={disabled}
        data-slot="checkbox"
        data-density={density}
        className={cn('kro-hig-check', className)}
        {...rest}
        onChange={(event) => {
          userDidToggle(event.target.checked)
        }}
      />
    </span>
  )

  if (label === undefined) return box

  return (
    <div
      className={cn(
        'inline-flex items-center gap-kro-small text-kro-fore',
        DENSITY_TYPE[density],
      )}
    >
      {box}
      <label htmlFor={controlId}>{label}</label>
    </div>
  )
}
