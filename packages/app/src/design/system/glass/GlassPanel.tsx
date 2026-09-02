import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../utils/cn'
import { type GlassMaterial, GlassSurface } from './GlassSurface'

/**
 * The three floating columns the shell composes. Named kinds rather than a
 * bag of layout props: a sidebar, a content well and a tab dock are the
 * shapes; padding and flex live at the call site that knows the idiom.
 */
export type GlassPanelKind = 'sidebar' | 'content' | 'dock'

export interface GlassPanelProps extends ComponentPropsWithoutRef<'div'> {
  readonly kind?: GlassPanelKind
  readonly as?: ElementType
  readonly children?: ReactNode
}

const KIND_MATERIAL: Record<GlassPanelKind, GlassMaterial> = {
  sidebar: 'sidebar',
  content: 'surface',
  dock: 'dock',
}

const KIND_LAYOUT: Record<GlassPanelKind, string> = {
  sidebar: 'flex-col',
  content: 'flex-col',
  dock: 'flex-row',
}

/**
 * A flex well built from KroGlass — the reusable pane the shell's sidebar,
 * destination column and tab dock all share, so a new surface does not
 * re-derive `overflow` + `min-h-0` + the material.
 */
export function GlassPanel({
  kind = 'content',
  as,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  return (
    <GlassSurface
      as={as}
      material={KIND_MATERIAL[kind]}
      className={cn(
        'flex min-h-0 min-w-0 overflow-hidden',
        KIND_LAYOUT[kind],
        className,
      )}
      {...rest}
    >
      {children}
    </GlassSurface>
  )
}
