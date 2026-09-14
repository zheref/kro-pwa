import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { DENSITY_HIT } from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Carousel — Fluent 2 cycle of peer content.
 *
 * Pagination is numbered ("3 of 7"), never dots-only, so position is
 * a word as well as a place. Previous and Next are named in
 * `aria-label` and disabled at the ends. There is no interval
 * autoplay — reduced motion is CSS, and a timer would fight it.
 */

export interface CarouselSlide {
  readonly id: string
  readonly title: string
  readonly content: ReactNode
}

export interface CarouselProps {
  readonly slides: readonly CarouselSlide[]
  readonly index?: number
  readonly defaultIndex?: number
  readonly onIndexChange?: (index: number) => void
  readonly label?: string
  readonly className?: string
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(index, 0), length - 1)
}

export function Carousel({
  slides,
  index,
  defaultIndex = 0,
  onIndexChange,
  label,
  className,
}: CarouselProps) {
  const isControlled = index !== undefined
  const [uncontrolled, setUncontrolled] = useState(() =>
    clampIndex(defaultIndex, slides.length),
  )
  const current = clampIndex(isControlled ? index : uncontrolled, slides.length)
  const slide = slides[current]
  const lastIndex = Math.max(slides.length - 1, 0)
  const ariaLabel = label ?? slides[0]?.title ?? 'Carousel'
  const pageLabel =
    slides.length === 0 ? '0 of 0' : `${current + 1} of ${slides.length}`

  function goTo(next: number) {
    if (next < 0 || next >= slides.length) return
    if (!isControlled) setUncontrolled(next)
    onIndexChange?.(next)
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-slot="carousel"
      className={cn(
        'flex flex-col gap-kro-small rounded-kro-card',
        'bg-kro-absolute p-kro-medium shadow-kro-surface',
        className,
      )}
    >
      <div data-slot="carousel-slide" className="min-h-0 text-kro-fore">
        {slide === undefined ? null : (
          <>
            <p className="m-0 mb-kro-tiny font-semibold">{slide.title}</p>
            {slide.content}
          </>
        )}
      </div>
      <div className="flex items-center gap-kro-small">
        <button
          type="button"
          aria-label="Previous"
          disabled={current <= 0 || slides.length === 0}
          className={cn(
            'inline-flex items-center justify-center rounded-kro-small',
            DENSITY_HIT.comfortable,
            'text-kro-fore outline-none',
            'focus-visible:shadow-[var(--kro-ring)]',
            'disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          onClick={() => goTo(current - 1)}
        >
          <ChevronLeft aria-hidden size={16} strokeWidth={2} />
        </button>
        <p
          aria-live="polite"
          className="m-0 min-w-0 flex-1 text-kro-fore-secondary"
        >
          {pageLabel}
        </p>
        <button
          type="button"
          aria-label="Next"
          disabled={current >= lastIndex || slides.length === 0}
          className={cn(
            'inline-flex items-center justify-center rounded-kro-small',
            DENSITY_HIT.comfortable,
            'text-kro-fore outline-none',
            'focus-visible:shadow-[var(--kro-ring)]',
            'disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          onClick={() => goTo(current + 1)}
        >
          <ChevronRight aria-hidden size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
