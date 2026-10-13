import type { ReactNode } from 'react'
import { GlassSurface } from '../system/glass/GlassSurface'
import { DetailBackdrop } from '../system/gradient/DetailBackdrop'
import { cn } from '../system/utils/cn'

export type MarketingTone = 'canvas' | 'subtle' | 'gradient' | 'glass'
export type MarketingWidth = 'narrow' | 'default' | 'wide'

export interface MarketingSectionProps {
  /** The anchor id: `#id` links, `useActiveSection` and the nav's active link. */
  readonly id: string
  /**
   * The surface behind the content.
   * `canvas` the page; `subtle` one step recessed; `gradient` the indigo→grape
   * field (ink turns white); `glass` a frosted panel over that field.
   */
  readonly tone?: MarketingTone
  /** The content measure: 720px, 1120px or 1320px. */
  readonly width?: MarketingWidth
  /** Render a `section` (a landmark region) or a plain `div`. */
  readonly as?: 'section' | 'div'
  /** The id of the heading that names this section, for `aria-labelledby`. */
  readonly labelledBy?: string
  readonly className?: string
  readonly children: ReactNode
}

const WIDTH_CLASS: Record<MarketingWidth, string | null> = {
  narrow: 'kro-marketing-container--narrow',
  default: null,
  wide: 'kro-marketing-container--wide',
}

/** One full-bleed band of the page with a centred, padded container. */
export function MarketingSection({
  id,
  tone = 'canvas',
  width = 'default',
  as = 'section',
  labelledBy,
  className,
  children,
}: MarketingSectionProps) {
  const Component = as
  const hasField = tone === 'gradient' || tone === 'glass'
  return (
    <Component
      id={id}
      data-tone={tone}
      aria-labelledby={labelledBy}
      className={cn('kro-marketing-section', className)}
    >
      {hasField ? <DetailBackdrop /> : null}
      <div className={cn('kro-marketing-container', WIDTH_CLASS[width])}>
        {tone === 'glass' ? (
          <GlassSurface className="kro-marketing-section__panel">
            {children}
          </GlassSurface>
        ) : (
          children
        )}
      </div>
    </Component>
  )
}
