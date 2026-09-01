'use client'

/**
 * The My Day header — the port of `LargeScreenTitle` as `DoScreen` configures
 * it (`Kro/Components/LargeScreenTitle.swift`, `DoScreen.dayHeader`).
 *
 * A pure Fragment (`RC-15`): it reads no store, dispatches nothing, and takes
 * every string already resolved by `doHeaderContent`. That split is what lets
 * the compact/regular composition be a table test rather than a rendered
 * assertion about which branch a media query took.
 *
 * ## The gradient IS painted here — on the content column
 *
 * Canon's `LargeScreenTitle` carries its own `LinearGradient` clipped to a
 * 50px bottom-trailing round. The web shell paints that slab on the content
 * column (`shell-large-title-slab`), from the sidebar's trailing edge to the
 * window's trailing edge. This header stays transparent and draws its copy in
 * the on-gradient ink so the two do not double the ramp — the page field
 * (`DetailBackdrop`) is a vertical mesh; the title slab is the diagonal clip.
 *
 * ## Ink
 *
 * White at three weights, which is `LargeScreenTitle`'s own `ink` before a
 * palette is published (`appPalette?.onGradient ?? .white`): full for the
 * title, 0.9 for the glyph, 0.68 for the weekday specifier and 0.7 for the
 * subtitle. The short date is the one exception — it is `headerDate`, the
 * shared Apple-Calendar red, which the design system's contrast suite asserts
 * against **both** gradient stops in both schemes.
 */
import { Sun } from 'lucide-react'
import { ActivityRings, type ActivityRing } from '../../../design/chrome'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { DoHeaderContent } from './doPresentation'

/** Canon's `Image(systemName:).font(.system(size: 27, weight: .semibold))`. */
const SUN_GLYPH_SIZE = 27

export interface DoHeaderFragmentProps {
  /** Every string, already decided by `doHeaderContent`. */
  readonly content: DoHeaderContent
  /**
   * The day-progress arcs, outermost first. Empty renders nothing — the
   * "no denominator, no ring" rule is `dayProgressRings`', not this view's.
   */
  readonly rings: readonly ActivityRing[]
  /**
   * `selectAreDoRingsVisible` — the `doActivityRings` kill switch AND'd with
   * "not in bulk mark-complete mode". Separate from `rings.length` on purpose:
   * "the flag is off" and "today asked nothing of you" are different facts and
   * the header must not conflate them.
   */
  readonly showsRings: boolean
  readonly className?: string
}

export function DoHeaderFragment({
  content,
  rings,
  showsRings,
  className,
}: DoHeaderFragmentProps) {
  const drawsRings = showsRings && rings.length > 0

  return (
    <header
      data-testid="do-header"
      data-expanded={content.showsSunGlyph}
      className={cn(
        'flex items-center gap-kro-medium px-kro-medium py-[13px]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-1.5">
          {content.showsSunGlyph ? (
            <Sun
              size={SUN_GLYPH_SIZE}
              strokeWidth={2.25}
              aria-hidden="true"
              data-testid="do-header-sun"
              className="self-center"
              style={{ color: 'rgb(255 255 255 / 0.9)' }}
            />
          ) : null}

          <h1
            className="m-0 font-bold text-[34px] leading-tight text-white"
            data-testid="do-header-title"
          >
            {content.title}
          </h1>

          {content.titleDetail === null ? null : (
            <span
              data-testid="do-header-date"
              className="font-semibold text-[17px]"
              style={{ color: colorVar('headerDate') }}
            >
              {content.titleDetail}
            </span>
          )}

          {content.titleSpecifier === null ? null : (
            <span
              data-testid="do-header-weekday"
              className="font-medium text-sm"
              style={{ color: 'rgb(255 255 255 / 0.68)' }}
            >
              {content.titleSpecifier}
            </span>
          )}
        </div>

        {content.subtitle === null ? null : (
          <p
            data-testid="do-header-subtitle"
            className="m-0 text-sm"
            style={{ color: 'rgb(255 255 255 / 0.7)' }}
          >
            {content.subtitle}
          </p>
        )}
      </div>

      {/*
        `ml-auto` rather than a spacer element: canon's `Spacer()` between the
        text block and the trailing slot is exactly "push the trailing content
        to the edge", and an empty flex child would be one more node for a
        screen reader to walk past.
      */}
      {drawsRings ? (
        <div className="ml-auto shrink-0" data-testid="do-header-rings">
          <ActivityRings rings={rings} />
        </div>
      ) : null}
    </header>
  )
}
