import {
  Children,
  type FocusEvent,
  type MouseEvent,
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
  readonly onMouseOver?: (event: MouseEvent<HTMLElement>) => void
  readonly onMouseOut?: (event: MouseEvent<HTMLElement>) => void
  readonly onFocus?: (event: FocusEvent<HTMLElement>) => void
  readonly onBlur?: (event: FocusEvent<HTMLElement>) => void
}

function describedBy(
  relationship: TooltipRelationship,
  existing: string | undefined,
  tooltipId: string,
): string | undefined {
  if (relationship !== 'description') return existing
  return [existing, tooltipId].filter(Boolean).join(' ')
}

function withTooltipTrigger(
  child: ReactElement<TriggerProps>,
  tooltipId: string,
  relationship: TooltipRelationship,
  setHovered: (hovered: boolean) => void,
  setFocused: (focused: boolean) => void,
): ReactElement<TriggerProps> {
  const existing = child.props
  const nextDescribedBy = describedBy(
    relationship,
    existing['aria-describedby'],
    tooltipId,
  )
  return cloneElement(child, {
    ...(nextDescribedBy !== undefined
      ? { 'aria-describedby': nextDescribedBy }
      : {}),
    onMouseOver: (event) => {
      existing.onMouseOver?.(event)
      setHovered(true)
    },
    onMouseOut: (event) => {
      existing.onMouseOut?.(event)
      setHovered(false)
    },
    onFocus: (event) => {
      existing.onFocus?.(event)
      setFocused(true)
    },
    onBlur: (event) => {
      existing.onBlur?.(event)
      setFocused(false)
    },
  })
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
    ? withTooltipTrigger(
        child as ReactElement<TriggerProps>,
        tooltipId,
        relationship,
        setHovered,
        setFocused,
      )
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
