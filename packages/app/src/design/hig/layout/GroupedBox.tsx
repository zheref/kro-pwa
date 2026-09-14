import { Children, Fragment, type ReactNode, isValidElement } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * GroupedBox — HIG "Boxes", painted with KroTokens.
 *
 * Apple's box is a rounded grouping of related rows. Ours keeps that
 * purpose (a card of related content, not a generic div with a border)
 * and paints with `absolute` fill, the card radius and the surface
 * shadow. The optional title sits ABOVE the card — iOS grouped-inset
 * style — so the card edge stays clean. Colour is never the grouping
 * signal: the radius and the shadow are.
 *
 * `glass` swaps the opaque fill for KroGlass. The material lives in
 * `glass.css`; this component only asks for it.
 */

export interface GroupedBoxProps {
  readonly title?: string
  readonly footer?: ReactNode
  readonly divided?: boolean
  readonly material?: 'card' | 'glass'
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function GroupedBox({
  title,
  footer,
  divided = false,
  material = 'card',
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: GroupedBoxProps) {
  const rows = Children.toArray(children).filter(isValidElement)

  return (
    <section
      data-slot="grouped-box"
      data-density={density}
      className={cn(
        'flex w-full flex-col',
        density === 'compact' ? 'gap-kro-tiny' : 'gap-kro-small',
        className,
      )}
    >
      {title === undefined ? null : (
        <h2
          data-slot="grouped-box-title"
          className={cn(
            'm-0 px-kro-tiny font-semibold uppercase tracking-wide text-kro-fore-secondary',
            DENSITY_TYPE[density],
          )}
        >
          {title}
        </h2>
      )}
      <div
        data-slot="grouped-box-card"
        data-material={material}
        className={cn(
          'overflow-hidden',
          density === 'comfortable' && 'p-kro-tiny',
          material === 'glass'
            ? 'kro-glass rounded-kro-surface'
            : 'rounded-kro-card bg-kro-absolute shadow-kro-surface',
        )}
      >
        {divided
          ? rows.map((row, index) => (
              <Fragment key={row.key ?? index}>
                {index === 0 ? null : (
                  <div
                    aria-hidden
                    data-slot="grouped-box-divider"
                    className="h-px bg-kro-hairline"
                  />
                )}
                {row}
              </Fragment>
            ))
          : children}
      </div>
      {footer === undefined ? null : (
        <div
          data-slot="grouped-box-footer"
          className={cn(
            'px-kro-tiny text-kro-fore-secondary',
            DENSITY_TYPE[density],
          )}
        >
          {footer}
        </div>
      )}
    </section>
  )
}
