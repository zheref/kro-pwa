import { Info } from 'lucide-react'
import { useId, useState } from 'react'
import { Label } from '../../hig/layout/Label'
import { DENSITY_HIT, DENSITY_TYPE } from '../../system/density'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * InfoLabel — Fluent 2 InfoLabel, painted with KroTokens.
 *
 * A label plus an info button. The extra copy lives in a KroGlass panel
 * that starts closed. This is a local toggle, not a Radix popover, so
 * a jsdom test that renders the closed control does not stall on a
 * popper.
 *
 * The button is named "More info"; the glyph is hidden from AT.
 */

export interface InfoLabelProps {
  readonly label: string
  readonly info: string
  readonly size?: FluentControlSize
  readonly htmlFor?: string
  readonly className?: string
}

export function InfoLabel({
  label,
  info,
  size = 'medium',
  htmlFor,
  className,
}: InfoLabelProps) {
  const generatedId = useId()
  const panelId = `${generatedId}-info`
  const [open, setOpen] = useState(false)
  const density = densityForFluentSize(size)

  return (
    <div
      data-slot="info-label"
      data-density={density}
      className={cn(
        'relative inline-flex items-center gap-kro-tiny text-kro-fore',
        className,
      )}
    >
      <Label htmlFor={htmlFor} density={density}>
        {label}
      </Label>
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center justify-center rounded-kro-small',
          'text-kro-fore-secondary',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
          DENSITY_HIT[density],
        )}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <Info aria-hidden="true" className="size-3.5" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'kro-glass absolute top-full left-0 z-50 mt-kro-tiny',
            'max-w-xs rounded-kro-field px-kro-small py-kro-small',
            'text-kro-fore',
            DENSITY_TYPE[density],
          )}
        >
          {info}
        </div>
      ) : null}
    </div>
  )
}
