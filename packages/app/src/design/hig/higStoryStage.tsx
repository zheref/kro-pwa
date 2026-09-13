/**
 * The backdrop every HIG story is judged on.
 *
 * A glass toggle, a frosted nav bar and a translucent slider thumb cannot be
 * judged on a white page — the design system's GlassSurface stories and the
 * endeavor kit's Stage make the same point. This is that stage for the HIG
 * gallery, once, so fifty story files do not each invent a slightly different
 * grey.
 *
 * `HigBothSchemes` paints light and dark SIDE BY SIDE in snapshots. The
 * in-app gallery (and Storybook's toolbar) pin one scheme at a time via
 * `GalleryAppearanceProvider`, so every preview on the page moves together.
 *
 * Not a story file itself: it exports no story, and it has a test.
 */

import type { ReactNode } from 'react'
import {
  bothSchemesGridStyle,
  useSchemesToPaint,
  useStoryThemeAttributes,
} from '../storybook/galleryAppearance'

/** The indigoGrape field the shell actually sits on. */
export const HIG_STAGE_BACKDROP =
  'linear-gradient(135deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))'

export interface HigStageProps {
  readonly theme?: 'light' | 'dark'
  /** Draw the gradient instead of the flat page surface. Glass needs this. */
  readonly gradient?: boolean
  readonly width?: number | string
  readonly children: ReactNode
}

export function HigStage({
  theme = 'light',
  gradient = false,
  width = '100%',
  children,
}: HigStageProps) {
  const appearance = useStoryThemeAttributes(theme)
  return (
    <div
      {...appearance}
      data-slot="hig-story-stage"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--kro-space-medium)',
        alignItems: 'stretch',
        padding: 'var(--kro-space-large)',
        minHeight: 200,
        width,
        background: gradient ? HIG_STAGE_BACKDROP : 'var(--kro-color-back)',
        color: 'var(--kro-color-fore)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

/** The same scene in both schemes, side by side. */
export function HigBothSchemes({
  gradient = false,
  children,
}: {
  readonly gradient?: boolean
  readonly children: ReactNode
}) {
  const schemes = useSchemesToPaint()
  return (
    <div style={bothSchemesGridStyle(schemes.length)}>
      {schemes.map((scheme) => (
        <HigStage key={scheme} theme={scheme} gradient={gradient}>
          {children}
        </HigStage>
      ))}
    </div>
  )
}

/** A labelled row inside a variants story. */
export function HigRow({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--kro-color-fore-secondary)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Compact (default) beside comfortable (mobile preview). Every HIG
 * control story that takes `density` uses this so the two sizes are
 * always on screen together.
 */
export function HigDensities({
  render,
  gradient = false,
}: {
  readonly render: (density: 'compact' | 'comfortable') => ReactNode
  readonly gradient?: boolean
}) {
  return (
    <HigStage gradient={gradient}>
      <HigRow label="Compact · default">{render('compact')}</HigRow>
      <HigRow label="Comfortable · mobile">{render('comfortable')}</HigRow>
    </HigStage>
  )
}
