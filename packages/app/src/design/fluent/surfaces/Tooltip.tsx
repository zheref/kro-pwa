import {
  Children,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
  useState,
} from 'react'
import { cn } from '../../system/utils/cn'

/**
 * Tooltip — Fluent 2 supplemental copy near a target.
 *
 * Shown on hover and focus, hidden on leave and blur. `label` names
 * the control (aria-label on the wrapper). `description` adds extra
 * copy via aria-describedby. The bubble is KroGlass; presence, not
 * colour, is the signal.
 */

export type TooltipRelationship = 'label' | 'description'

export interface TooltipProps {
  readonly content: string
  readonly relationship?: TooltipRelationship
  readonly children: ReactNode
  readonly className?: string
}

type TriggerProps = {
  readonly 'aria-describedby'?: string
  readonly onMouseOver?: () => void
  readonly onMouseOut?: () => void
  readonly onFocus?: () => void
  readonly onBlur?: () => void
}

export function Tooltip({
  content,
  relationship = 'label',
  children,
  className,
}: TooltipProps) {
  const tooltipId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = hovered || focused
  const child = Children.only(children)
  const trigger = isValidElement(child)
    ? cloneElement(child as ReactElement<TriggerProps>, {
        ...(relationship === 'description'
          ? { 'aria-describedby': tooltipId }
          : {}),
        onMouseOver: () => setHovered(true),
        onMouseOut: () => setHovered(false),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
      })
    : child

  return (
    <span
      data-slot="tooltip"
      role="group"
      className={cn('relative inline-flex', className)}
      aria-label={relationship === 'label' ? content : undefined}
    >
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className="kro-fluent-tooltip kro-glass top-full left-0 mt-kro-tiny"
      >
        {content}
      </span>
    </span>
  )
}
