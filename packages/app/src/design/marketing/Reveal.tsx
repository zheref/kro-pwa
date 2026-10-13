'use client'

import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { prefersReducedMotion } from '../system/motion/motion'
import { cn } from '../system/utils/cn'

export interface RevealProps {
  /** The element to render. Default `div`. */
  readonly as?: ElementType
  /** Delay before the reveal starts, in ms — stagger siblings with it. */
  readonly delay?: number
  readonly className?: string
  readonly children: ReactNode
}

type Phase = 'idle' | 'armed' | 'visible'

/** The watchdog: if the observer never reports, show the content anyway. */
const WATCHDOG_MS = 400

/**
 * Fade-and-rise on first scroll into view.
 *
 * Progressive by construction. The server-rendered class is plain
 * `kro-reveal`, which is visible, so no-JS, crawlers and print see everything.
 * On mount only an element whose top is BELOW the viewport is armed (hidden);
 * anything already on screen is left alone, so nothing visible ever flickers
 * out and back. Under reduced motion, or without `IntersectionObserver`, it is
 * a plain wrapper.
 */
export function Reveal({ as, delay = 0, className, children }: RevealProps) {
  const Component = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    const el = ref.current
    if (el === null) return
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return
    }
    if (el.getBoundingClientRect().top <= window.innerHeight) return

    setPhase('armed')
    let reported = false
    const observer = new IntersectionObserver(
      (entries) => {
        reported = true
        if (entries.some((entry) => entry.isIntersecting)) {
          setPhase('visible')
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    const watchdog = window.setTimeout(() => {
      if (!reported) {
        setPhase('visible')
        observer.disconnect()
      }
    }, WATCHDOG_MS)
    return () => {
      window.clearTimeout(watchdog)
      observer.disconnect()
    }
  }, [])

  const style: CSSProperties | undefined =
    delay > 0
      ? ({ '--kro-reveal-delay': `${delay}ms` } as CSSProperties)
      : undefined

  return (
    <Component
      ref={ref}
      data-reveal={phase}
      className={cn(
        'kro-reveal',
        phase === 'armed' && 'is-armed',
        phase === 'visible' && 'is-armed is-visible',
        className,
      )}
      style={style}
    >
      {children}
    </Component>
  )
}
