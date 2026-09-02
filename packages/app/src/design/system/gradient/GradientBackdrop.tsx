'use client'

import {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/cn'

/**
 * The gradient slabs Kro ships.
 *
 * KroApple's `GradientStyle` declares six cases, but five of them are built
 * from raw SwiftUI system colours (`.orange`, `.blue`, …) and are referenced
 * only by a preview — no shipped surface uses them, and porting a system
 * colour to the web would invent a value canon does not have. `indigoGrape` is
 * the one style the app actually renders, and its two stops are real palette
 * roles with contrast assertions behind them.
 */
export type GradientStyle = 'indigoGrape'

export interface GradientBackdropProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Named `variant` rather than `style` — SwiftUI's parameter name — because
   * `style` on a DOM element already means the inline style object, and a prop
   * that shadows it is a trap for every future caller.
   */
  readonly variant?: GradientStyle
  /**
   * How tall the slab is. Any CSS length.
   *
   * The content that scrolls under it is responsible for its own top padding —
   * this element is a decoration and never pushes layout.
   */
  readonly height?: string
  /**
   * Pin to the viewport rather than to the scroll container.
   *
   * The mobile shell wants `true` (the slab stays, the day scrolls beneath);
   * a scrolling detail page wants the default, so the slab travels with its
   * own content.
   */
  readonly fixed?: boolean
  /**
   * Skip the fade into the page surface at the bottom edge.
   *
   * The fade is on by default because the alternative is a hard horizontal
   * line across the app the moment content scrolls up to it.
   */
  readonly hardEdge?: boolean
  /**
   * How the slab is clipped. `bottomTrailing` is LargeScreenTitle's
   * `UnevenRoundedRectangle(bottomTrailingRadius: 50)` — the header's own
   * background, filling its host and rounding only the bottom-trailing corner.
   *
   * Canon paints a 1000pt gradient *anchored at the title's bottom edge*, so
   * the extra height reaches *up* through the toolbar, not *down* into the
   * day's content. On the web the host is the title component itself (My Day,
   * the remaining-count line, the rings), and this clip fills that box.
   */
  readonly clip?: 'none' | 'bottomTrailing'
  /**
   * Where a `bottomTrailing` clip is allowed to grow.
   *
   * `host` (the default) fills the positioned parent — a story, a test, a
   * header rendered on its own. `window` portals the paint into the shell's
   * `[data-kro-title-slab-host]` so the slab can start at the window's top
   * and leading edges, pass *under* the transparent toolbar, and still clip
   * to the title's bottom-trailing corner. Without that host it falls back
   * to `host`, so a Fragment test never has to mount the shell.
   */
  readonly bleed?: 'host' | 'window'
}

/** Canon's `UnevenRoundedRectangle(bottomTrailingRadius: 50)`. */
export const LARGE_TITLE_TRAILING_RADIUS_PX = 50

/** The empty layer the shell paints so a LargeScreenTitle slab can portal. */
export const TITLE_SLAB_HOST_SELECTOR = '[data-kro-title-slab-host]'

/**
 * The `indigoGrape` header slab, installed as the content's top inset.
 *
 * Decorative by construction: `aria-hidden` and `pointer-events: none`, so it
 * is invisible to assistive technology and never intercepts a tap meant for
 * the content above it. Anything meaningful — the date, the greeting — is
 * rendered by the caller *over* it, in `headerDate`, which the contrast suite
 * asserts against both gradient stops in both schemes.
 */
export function GradientBackdrop({
  variant = 'indigoGrape',
  height = '220px',
  fixed = false,
  hardEdge = false,
  clip = 'none',
  bleed = 'host',
  className,
  style,
  ...rest
}: GradientBackdropProps) {
  const wantsWindow = bleed === 'window' && clip === 'bottomTrailing'
  const measureRef = useRef<HTMLDivElement>(null)
  const [portal, setPortal] = useState<{
    readonly host: Element
    readonly style: CSSProperties
  } | null>(null)

  useLayoutEffect(() => {
    if (!wantsWindow) {
      setPortal(null)
      return
    }

    const host = document.querySelector(TITLE_SLAB_HOST_SELECTOR)
    const header = measureRef.current?.parentElement
    if (host === null || header == null) {
      setPortal(null)
      return
    }

    const measure = () => {
      const shell = host.getBoundingClientRect()
      const box = header.getBoundingClientRect()
      const nextStyle = {
        top: 0,
        left: 0,
        width: `${Math.max(0, box.right - shell.left)}px`,
        height: `${Math.max(0, box.bottom - shell.top)}px`,
      }
      setPortal((current) => {
        if (
          current !== null &&
          current.host === host &&
          current.style.width === nextStyle.width &&
          current.style.height === nextStyle.height
        ) {
          return current
        }
        return { host, style: nextStyle }
      })
    }

    measure()
    let frame = 0
    const scheduleMeasure = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasure)
    observer?.observe(header)
    observer?.observe(host)
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('scroll', scheduleMeasure, true)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure, true)
    }
  }, [wantsWindow])

  const visual = (
    portaled: boolean,
    extraStyle?: CSSProperties,
    ref?: typeof measureRef,
  ) => (
    <div
      ref={ref}
      aria-hidden="true"
      data-gradient-variant={variant}
      data-gradient-clip={clip}
      data-gradient-bleed={bleed}
      className={cn(
        'kro-gradient-backdrop',
        fixed && 'kro-gradient-backdrop--fixed',
        hardEdge && 'kro-gradient-backdrop--hard',
        clip === 'bottomTrailing' && 'kro-gradient-backdrop--large-title',
        portaled && 'kro-gradient-backdrop--window-bleed',
        className,
      )}
      style={{
        // The title clip fills its positioned host. A CSS height would paint
        // a 360px slab down through Suggestions, which is the failure this
        // clip exists to prevent — canon's extra height reaches *up*.
        ...(clip === 'bottomTrailing'
          ? {}
          : ({ '--kro-gradient-height': height } as CSSProperties)),
        ...style,
        ...extraStyle,
      }}
      {...rest}
    />
  )

  if (wantsWindow && portal !== null) {
    return (
      <>
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        />
        {createPortal(visual(true, portal.style), portal.host)}
      </>
    )
  }

  return visual(false, undefined, wantsWindow ? measureRef : undefined)
}

export type GradientContentProps = ComponentPropsWithoutRef<'div'>

/**
 * The content layer that sits over a `GradientBackdrop`.
 *
 * It exists so the stacking order is decided once, here, rather than by every
 * surface remembering to raise itself above a decoration it did not add.
 */
export function GradientContent({ className, ...rest }: GradientContentProps) {
  return <div className={cn('kro-gradient-content', className)} {...rest} />
}
