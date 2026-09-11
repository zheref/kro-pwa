import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '../../system/utils/cn'

/**
 * Link — Fluent 2 "Link", painted with KroTokens.
 *
 * Interactive text that navigates. With `href` it is an `<a>`; without,
 * a `type="button"` control for in-page actions. Default is accent +
 * underline; subtle is secondary copy that underlines on hover.
 *
 * THE DISABLED FADE IS APPLIED EXACTLY ONCE. A wrapper that also dims
 * this would multiply `--kro-opacity-disabled` and drop below the 3:1
 * floor for UI elements.
 */

export type LinkAppearance = 'default' | 'subtle'

export interface LinkProps {
  readonly appearance?: LinkAppearance
  readonly inline?: boolean
  readonly disabled?: boolean
  readonly href?: string
  readonly children: ReactNode
  readonly className?: string
  readonly onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
}

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'
const ANCHOR_FADE = 'opacity-[var(--kro-opacity-disabled)]'

export function Link({
  appearance = 'default',
  inline = false,
  disabled,
  href,
  children,
  className,
  onClick,
}: LinkProps) {
  const classes = cn(
    'cursor-default outline-none kro-motion-quick',
    'focus-visible:shadow-[var(--kro-ring)]',
    appearance === 'subtle'
      ? 'text-kro-fore-secondary hover:underline'
      : 'underline text-kro-accent',
    inline ? 'inline' : 'inline-flex items-center',
    className,
  )

  if (href !== undefined) {
    return (
      <a
        data-slot="link"
        data-appearance={appearance}
        href={href}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={cn(
          classes,
          disabled && 'pointer-events-none',
          disabled && ANCHOR_FADE,
        )}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      data-slot="link"
      data-appearance={appearance}
      disabled={disabled}
      className={cn(classes, 'disabled:pointer-events-none', DISABLED_FADE)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
