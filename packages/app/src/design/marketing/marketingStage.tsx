/**
 * The backdrop every marketing story is judged on — and the one place a
 * placeholder "screenshot" is made, so no story needs a network or an asset.
 *
 * `data-theme` and `data-kro-idiom` wrap the subtree exactly as the
 * Storybook toolbar does, so a story is correct with or without it. Not a
 * story file: it exports no story, and it has a test.
 */

import type { CSSProperties, ReactNode } from 'react'
import { useStoryThemeAttributes } from '../storybook/galleryAppearance'

export interface MarketingStageProps {
  readonly theme?: 'light' | 'dark'
  /** `mobile` pins the iPhone idiom (pill buttons) like the toolbar does. */
  readonly idiom?: 'desktop' | 'mobile'
  /** Stage width. `390` is the iPhone 15 viewport. */
  readonly width?: number | string
  /**
   * Make the stage the containing block for `position: fixed` children (a
   * nav bar, a back-to-top disc) and give it this height, so they stay inside
   * the story instead of the whole canvas.
   */
  readonly contained?: number
  readonly children: ReactNode
}

export function MarketingStage({
  theme = 'light',
  idiom = 'desktop',
  width = '100%',
  contained,
  children,
}: MarketingStageProps) {
  const appearance = useStoryThemeAttributes(theme)
  const style: CSSProperties = {
    width,
    maxWidth: '100%',
    background: 'var(--kro-color-back)',
    color: 'var(--kro-color-fore)',
    fontFamily: 'system-ui, sans-serif',
    ...(contained === undefined
      ? {}
      : {
          position: 'relative',
          height: contained,
          overflow: 'hidden',
          transform: 'translateZ(0)',
        }),
  }
  return (
    <div
      {...appearance}
      data-kro-idiom={idiom}
      data-slot="marketing-story-stage"
      style={style}
    >
      {children}
    </div>
  )
}

/**
 * A stand-in screenshot as an SVG data URI. Named colours only: an `<img>`
 * cannot read custom properties, and this is a placeholder, not a design value.
 */
export function placeholderShot(width: number, height: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='slateblue'/><stop offset='1' stop-color='purple'/></linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/>` +
    `<rect x='8%' y='12%' width='84%' height='9%' rx='8' fill='white' fill-opacity='.85'/>` +
    `<rect x='8%' y='26%' width='84%' height='9%' rx='8' fill='white' fill-opacity='.6'/>` +
    `<rect x='8%' y='40%' width='84%' height='9%' rx='8' fill='white' fill-opacity='.4'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
