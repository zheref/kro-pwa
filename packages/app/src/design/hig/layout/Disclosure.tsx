import { ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Disclosure — HIG "Disclosure controls", painted with KroTokens.
 *
 * Native `<details>` / `<summary>` so open state, keyboard and
 * assistive tech are the browser's. The summary is a density row; the
 * chevron (not colour, not a custom height animation) is the open
 * signal. Height is left to the element — a JS collapse would fight
 * `prefers-reduced-motion`. The chevron uses `kro-motion-quick`,
 * whose duration token already collapses under reduced motion.
 */

export interface DisclosureProps {
  readonly title: string
  readonly defaultOpen?: boolean
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function Disclosure({
  title,
  defaultOpen = false,
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <details
      data-slot="disclosure"
      data-density={density}
      className={cn('group w-full', className)}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary
        className={cn(
          'flex cursor-default list-none items-center gap-kro-small px-kro-medium text-kro-fore',
          DENSITY_ROW[density],
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <ChevronRight
          aria-hidden
          size={16}
          strokeWidth={2}
          className="kro-motion-quick shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="font-medium">{title}</span>
      </summary>
      <div
        data-slot="disclosure-body"
        className="px-kro-medium pb-kro-medium text-kro-fore"
      >
        {children}
      </div>
    </details>
  )
}
