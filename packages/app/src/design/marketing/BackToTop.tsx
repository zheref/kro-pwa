'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ICON_SIZE } from '../system/icons/icons'
import { prefersReducedMotion } from '../system/motion/motion'
import { cn } from '../system/utils/cn'

export interface BackToTopProps {
  /** Accessible name. Default "Back to top". */
  readonly label?: string
  readonly className?: string
}

/** Scroll depth, in viewport heights, at which the button appears. */
export const BACK_TO_TOP_THRESHOLD = 0.8

/**
 * A fixed glass disc that appears after 0.8 viewport heights of scroll and
 * returns to the top — smoothly, or instantly under reduced motion. Hidden
 * from focus and assistive tech until it shows.
 */
export function BackToTop({
  label = 'Back to top',
  className,
}: BackToTopProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () =>
      setVisible(window.scrollY > window.innerHeight * BACK_TO_TOP_THRESHOLD)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <button
      type="button"
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'kro-glass kro-glass--control kro-glass--interactive kro-back-to-top',
        visible && 'is-visible',
        className,
      )}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
      }
    >
      <ArrowUp aria-hidden="true" size={ICON_SIZE.medium} />
    </button>
  )
}
