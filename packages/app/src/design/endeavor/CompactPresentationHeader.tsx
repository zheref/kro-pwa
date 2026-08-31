/**
 * `CompactPresentationHeader` — canon
 * `KroUI/Components/CompactPresentationHeader.swift`.
 *
 * Content-owned navigation chrome for compact presentations. Canon's reason is
 * a macOS one: popovers and auxiliary modal windows use this instead of a
 * `NavigationStack` toolbar so their controls stay INSIDE the presentation
 * rather than being merged into the owning window's toolbar.
 *
 * The web has the same problem wearing different clothes. A sheet or popover
 * rendered into a portal has no toolbar to inherit, so every one of them would
 * otherwise invent its own title row — four surfaces, four paddings, four
 * close-button sizes. This is that row, once.
 *
 * The leading control is a 30px circle, canon's exact geometry. That is BELOW
 * the 44px touch floor as drawn, so the button carries a 44px minimum hit area
 * with the circle centred inside it: on iOS the same control gets its floor
 * from `.kroMinTouchTarget`, which does not change the drawing either.
 */

import { colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { endeavorIcon } from './endeavorIcons'

const ChevronLeft = endeavorIcon('chevron.left')
const Close = endeavorIcon('xmark')

export type CompactHeaderLeadingAction =
  | { readonly kind: 'back'; readonly onPress: () => void }
  | { readonly kind: 'dismiss'; readonly onPress: () => void }

export interface CompactPresentationHeaderProps {
  readonly title: string
  readonly subtitle?: string
  readonly leadingAction?: CompactHeaderLeadingAction
  readonly className?: string
}

export function CompactPresentationHeader({
  title,
  subtitle,
  leadingAction,
  className,
}: CompactPresentationHeaderProps) {
  const Glyph = leadingAction?.kind === 'back' ? ChevronLeft : Close
  const label = leadingAction?.kind === 'back' ? 'Back' : 'Close'

  return (
    <header
      data-slot="compact-presentation-header"
      className={cn('flex w-full items-center gap-2.5 px-3 py-2.5', className)}
      style={{
        backgroundColor: `color-mix(in srgb, ${colorVar('fore')} 2.5%, transparent)`,
      }}
    >
      {leadingAction === undefined ? null : (
        <button
          type="button"
          aria-label={label}
          onClick={leadingAction.onPress}
          // The circle is 30px, per canon. The 44px floor is the BUTTON's, so
          // the hit area grows and the drawing does not.
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            minWidth: 'var(--kro-size-min-touch-target)',
            minHeight: 'var(--kro-size-min-touch-target)',
          }}
        >
          <span
            aria-hidden
            className="inline-flex size-[30px] items-center justify-center rounded-kro-pill"
            style={{
              backgroundColor: `color-mix(in srgb, ${colorVar('fore')} 8%, transparent)`,
              color: colorVar('fore'),
            }}
          >
            <Glyph size={11} strokeWidth={2.75} />
          </span>
        </button>
      )}

      <div className="flex min-w-0 flex-col gap-px">
        <p
          className="m-0 truncate text-base font-semibold"
          style={{ color: colorVar('fore') }}
        >
          {title}
        </p>
        {subtitle === undefined ? null : (
          <p
            className="m-0 truncate text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  )
}
