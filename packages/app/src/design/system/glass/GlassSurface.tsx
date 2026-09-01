import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../utils/cn'

/**
 * The named shapes KroGlass is used in. Not a free-form set of props: a
 * material with five named forms is a material; a material with eight
 * booleans is a pile of CSS.
 */
export type GlassMaterial =
  /** A floating card, sheet, popover or content well. 24px blur, full rim. */
  | 'surface'
  /** A small control — pill button, chip, segmented control. 16px blur. */
  | 'control'
  /** Top chrome. Hairline instead of a ring, no corner radius. */
  | 'bar'
  /** A split-view sidebar column. Trailing hairline, 20px corners. */
  | 'sidebar'
  /** A floating tab dock. Capsule inset from the viewport edge. */
  | 'dock'

export interface GlassSurfaceProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * The element to render. A bar is usually a `header`, a control a `button`.
   * Semantics belong to the caller; this component only owns the material.
   */
  readonly as?: ElementType
  readonly material?: GlassMaterial
  /**
   * The element is `position: fixed`.
   *
   * This does more than set `position`. WebKit miscomputes the compositing
   * layer of a fixed element that carries `backdrop-filter`, so the filter
   * always lives on an inner pseudo — and for a fixed bar that pseudo also
   * bleeds 120px upward to cover Safari's collapsing-toolbar strip. Say
   * `fixed` and the material handles both; do not reach for `position: fixed`
   * through `className`, which gets the position without the fix.
   */
  readonly fixed?: boolean
  /** Adds hover, press and focus response. Use it when the surface is a control. */
  readonly interactive?: boolean
  /** Bars only: raise the shadow once content has scrolled beneath. */
  readonly scrolled?: boolean
  readonly children?: ReactNode
}

const MATERIAL_CLASS: Record<GlassMaterial, string | null> = {
  surface: null,
  control: 'kro-glass--control',
  bar: 'kro-glass--bar',
  sidebar: 'kro-glass--sidebar',
  dock: 'kro-glass--dock',
}

/**
 * A surface built from the KroGlass material.
 *
 * Ports the zheref.io recipe: a blurred, saturated backdrop under a
 * translucent tint, a specular sheen, a thin rim and an inner top highlight.
 * Every fallback — reduced transparency, no `backdrop-filter`, no
 * `color-mix()` — is carried by `glass.css`, so a surface never has to
 * feature-detect.
 */
export function GlassSurface({
  as,
  material = 'surface',
  fixed = false,
  interactive = false,
  scrolled = false,
  className,
  children,
  ...rest
}: GlassSurfaceProps) {
  const Component = (as ?? 'div') as ElementType

  return (
    <Component
      className={cn(
        'kro-glass',
        MATERIAL_CLASS[material],
        fixed && 'kro-glass--fixed',
        interactive && 'kro-glass--interactive',
        material === 'bar' && scrolled && 'is-scrolled',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}
