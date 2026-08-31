/**
 * The backdrop every story in this kit is judged on.
 *
 * A card with a shadow, a glass overlay and a translucent pill cannot be judged
 * on a white page — the design system's own `GlassSurface.stories` makes the
 * same point and puts its material over a gradient for the same reason. This is
 * that stage, once, so fourteen story files do not each invent a slightly
 * different grey.
 *
 * `Stage` renders BOTH schemes when asked, because "both themes" is an
 * acceptance criterion of this kit and a reviewer should not have to toggle an
 * OS setting to check it. `data-theme` is an attribute selector in `tokens.css`
 * precisely so a `div` can carry a scheme — see the note at the top of that
 * file.
 *
 * Not a story file itself: it exports no story, and it has a test, so the
 * repo's new-source-file guard is satisfied the ordinary way rather than through
 * the stories exemption.
 */

import type { ReactNode } from 'react'

/** The indigoGrape-adjacent gradient the Do surface sits on. */
export const STAGE_BACKDROP =
  'linear-gradient(135deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))'

export interface StageProps {
  readonly theme?: 'light' | 'dark'
  /** Draw the gradient instead of the flat page surface. */
  readonly gradient?: boolean
  readonly width?: number | string
  readonly children: ReactNode
}

export function Stage({
  theme = 'light',
  gradient = false,
  width = '100%',
  children,
}: StageProps) {
  return (
    <div
      data-theme={theme}
      data-slot="story-stage"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--kro-space-medium)',
        alignItems: 'flex-start',
        padding: 'var(--kro-space-large)',
        minHeight: 160,
        width,
        background: gradient ? STAGE_BACKDROP : 'var(--kro-color-back)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

/** The same scene in both schemes, side by side. */
export function BothSchemes({
  gradient = false,
  children,
}: {
  readonly gradient?: boolean
  readonly children: ReactNode
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light" gradient={gradient}>
        {children}
      </Stage>
      <Stage theme="dark" gradient={gradient}>
        {children}
      </Stage>
    </div>
  )
}

/** A labelled cell, for the matrix stories. */
export function Cell({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--kro-color-fore-secondary)',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
