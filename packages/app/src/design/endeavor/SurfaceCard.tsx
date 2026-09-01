/**
 * `SurfaceCard`, `CardRowStack`, `SectionCard` — canon
 * `KroUI/Components/SurfaceCard.swift`.
 *
 * The app's grouped-content card, as a component rather than a modifier, "so
 * the common 'header above a card of divider-separated rows' shape has one
 * spelling" (canon's words). The Endeavor Detail surfaces were a bare scroll
 * view with full-bleed dividers, which is why they read flat next to the rest
 * of the app; these three are what those surfaces were missing.
 *
 * Canon's `kroCardSurface()` modifier is `absolute` fill + `surface` radius +
 * the card shadow. All three are design-system tokens here, so the card's
 * elevation is re-tuned in `tokens.css` and lands without an edit.
 *
 * `padding: null` is canon's escape hatch, kept: pass it when the content
 * supplies its own row insets, so the hairlines inside `CardRowStack` can run
 * edge to edge instead of stopping at the card's padding.
 */

import { Children, Fragment, type ReactNode, isValidElement } from 'react'
import {
  colorVar,
  radiusVar,
  shadowVar,
  spacingVar,
} from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export interface SurfaceCardProps {
  /** `undefined` means the default inset; `null` means "the content owns it". */
  readonly padding?: string | null
  readonly isElevated?: boolean
  readonly children: ReactNode
  readonly className?: string
}

export function SurfaceCard({
  padding = spacingVar('medium'),
  isElevated = true,
  children,
  className,
}: SurfaceCardProps) {
  return (
    <div
      data-slot="surface-card"
      className={cn('w-full overflow-hidden', className)}
      style={{
        padding: padding ?? undefined,
        backgroundColor: colorVar('absolute'),
        borderRadius: radiusVar('surface'),
        boxShadow: isElevated ? shadowVar('card') : undefined,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Rows inside a card, separated by INSET hairlines.
 *
 * The inset is the whole point and canon says so: a separator that starts after
 * the icon column reads as a grouped list, and one that runs edge to edge reads
 * as a series of cut lines. iOS gets this free from `List`; the web does not.
 *
 * The separator is a rendered element BETWEEN rows, as in canon, rather than a
 * `border-top` on every row but the first. A border would have to be inset by
 * shifting the row itself, which moves the row's content too — the visual bug
 * this whole component exists to avoid, arriving through the fix.
 */
export function CardRowStack({
  separatorInset = spacingVar('medium'),
  children,
  className,
}: {
  readonly separatorInset?: string
  readonly children: ReactNode
  readonly className?: string
}) {
  const rows = Children.toArray(children).filter(isValidElement)

  return (
    <div
      data-slot="card-row-stack"
      className={cn('flex w-full flex-col', className)}
    >
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 ? null : (
            <div
              aria-hidden
              data-slot="card-row-separator"
              style={{
                height: '0.75px',
                marginLeft: separatorInset,
                backgroundColor: colorVar('hairline'),
              }}
            />
          )}
          {row}
        </Fragment>
      ))}
    </div>
  )
}

/** One row of a `CardRowStack`. Owns its own insets, as canon's rows do. */
export function CardRow({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div data-slot="card-row" className={cn('px-kro-medium py-2.5', className)}>
      {children}
    </div>
  )
}

/**
 * `SectionCard` — the composition every Endeavor surface uses: a header
 * OUTSIDE the card (so the card edge stays clean) with the grouped content
 * inside it.
 *
 * The header is inlined rather than lifted into a `FormSectionHeader` of its
 * own: canon has a separate component because four other surfaces reuse it, and
 * none of those four is in this kit's lane. Extracting it when the second
 * consumer arrives is a smaller change than un-forking two headers later.
 */
export interface SectionCardProps {
  readonly title: string
  readonly icon?: KitSymbolName
  readonly count?: number
  readonly actionTitle?: string
  readonly onAction?: () => void
  readonly padding?: string | null
  readonly children: ReactNode
  readonly className?: string
}

export function SectionCard({
  title,
  icon,
  count,
  actionTitle,
  onAction,
  padding,
  children,
  className,
}: SectionCardProps) {
  const Icon = icon === undefined ? null : endeavorIcon(icon)
  const hasAction = actionTitle !== undefined && onAction !== undefined

  return (
    <section className={cn('flex w-full flex-col gap-kro-small', className)}>
      <header className="flex items-center gap-kro-small px-kro-tiny">
        {Icon === null ? null : (
          <Icon
            size={14}
            strokeWidth={2.5}
            aria-hidden
            style={{ color: colorVar('foreSecondary') }}
          />
        )}
        <h2
          className="m-0 text-[13px] font-semibold uppercase tracking-wide"
          style={{ color: colorVar('foreSecondary') }}
        >
          {title}
        </h2>
        {count === undefined ? null : (
          <span
            className="text-[13px] font-semibold"
            style={{ color: colorVar('foreSecondary') }}
          >
            {count}
          </span>
        )}
        <span className="flex-1" />
        {hasAction ? (
          <button
            type="button"
            onClick={onAction}
            className={cn(
              'inline-flex h-7 items-center rounded-kro-small px-2 text-[13px] font-semibold',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{ color: colorVar('accent') }}
          >
            {actionTitle}
          </button>
        ) : null}
      </header>
      <SurfaceCard padding={padding}>{children}</SurfaceCard>
    </section>
  )
}
