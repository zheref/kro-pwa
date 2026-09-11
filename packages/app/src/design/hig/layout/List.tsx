import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * List — HIG "Lists and tables", painted with KroTokens.
 *
 * A grouped list of related rows inside an `absolute` card. Rows keep
 * the density floor. Hairlines sit between rows, not around the
 * card. Selected is a trailing check PLUS `aria-current` — colour is
 * never the only signal.
 *
 * The disabled fade is applied EXACTLY ONCE, when `disabled` is set.
 * A wrapper that also dims its subtree would multiply the two.
 */

export interface ListProps {
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function List({
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ListProps) {
  return (
    <div
      data-slot="list"
      data-density={density}
      className={cn(
        'overflow-hidden rounded-kro-card bg-kro-absolute',
        '[&_[data-slot=list-row]+[data-slot=list-row]]:border-t',
        '[&_[data-slot=list-row]+[data-slot=list-row]]:border-kro-hairline',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface ListSectionProps {
  readonly header?: string
  readonly footer?: string
  readonly children: ReactNode
  readonly className?: string
}

export function ListSection({
  header,
  footer,
  children,
  className,
}: ListSectionProps) {
  return (
    <div data-slot="list-section" className={className}>
      {header === undefined ? null : (
        <div
          data-slot="list-section-header"
          className="px-kro-medium pt-kro-small pb-kro-tiny text-[13px] font-semibold uppercase tracking-wide text-kro-fore-secondary"
        >
          {header}
        </div>
      )}
      {children}
      {footer === undefined ? null : (
        <div
          data-slot="list-section-footer"
          className="px-kro-medium pt-kro-tiny pb-kro-small text-[13px] text-kro-fore-secondary"
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export interface ListRowProps {
  readonly title: string
  readonly subtitle?: string
  readonly leading?: ReactNode
  readonly trailing?: ReactNode
  readonly selected?: boolean
  readonly disabled?: boolean
  readonly onClick?: () => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  selected = false,
  disabled = false,
  onClick,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ListRowProps) {
  const classes = cn(
    'flex w-full items-center gap-kro-small px-kro-medium text-left text-kro-fore',
    DENSITY_ROW[density],
    onClick !== undefined &&
      'outline-none focus-visible:shadow-[var(--kro-ring)]',
    disabled && 'pointer-events-none opacity-[var(--kro-opacity-disabled)]',
    className,
  )

  const body = (
    <>
      {leading === undefined ? null : (
        <span data-slot="list-row-leading" className="shrink-0">
          {leading}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        {subtitle === undefined ? null : (
          <span className="text-[13px] text-kro-fore-secondary">
            {subtitle}
          </span>
        )}
      </span>
      {trailing === undefined ? null : (
        <span
          data-slot="list-row-trailing"
          className="shrink-0 text-kro-fore-secondary"
        >
          {trailing}
        </span>
      )}
      {selected ? (
        <Check
          aria-hidden
          data-slot="list-row-check"
          size={16}
          strokeWidth={2.5}
          className="shrink-0"
        />
      ) : null}
    </>
  )

  if (onClick === undefined) {
    return (
      <div
        data-slot="list-row"
        data-density={density}
        aria-current={selected ? 'true' : undefined}
        className={classes}
      >
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-slot="list-row"
      data-density={density}
      disabled={disabled}
      aria-current={selected ? 'true' : undefined}
      className={classes}
      onClick={onClick}
    >
      {body}
    </button>
  )
}
