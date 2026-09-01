import type { CSSProperties, ReactNode } from 'react'

/**
 * The backdrop every chrome story is judged against.
 *
 * A glass FAB, a glass toast and a glow all need something busy underneath
 * them: over a flat fill a blur that is too weak, a rim that is too faint or a
 * glow that tints the button it sits behind all look fine. The design system's
 * own `GlassSurface.stories` makes the same argument and uses the same
 * gradient; this is that stage, shared by the chrome set so the two galleries
 * are comparable at a glance.
 *
 * NOT A COMPONENT OF THE KIT. It is exported only so the stories in this folder
 * can share it, and it takes a `theme` because the chrome stories render light
 * and dark SIDE BY SIDE rather than behind a toolbar toggle — which is what
 * turns "does this pair still read?" into something you can see instead of
 * something you have to remember.
 */

export const STAGE_BACKDROP =
  'linear-gradient(120deg, #5856d6 0%, #663399 40%, #b7162f 70%, #c78c00 100%)'

export interface StageProps {
  readonly theme?: 'light' | 'dark'
  readonly height?: number
  readonly label?: string
  readonly children: ReactNode
  readonly style?: CSSProperties
}

export function Stage({
  theme = 'light',
  height = 360,
  label,
  children,
  style,
}: StageProps) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        minHeight: height,
        overflow: 'hidden',
        background: STAGE_BACKDROP,
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Text under the glass — the only honest test of a blur. */}
      <p
        style={{
          position: 'absolute',
          inset: 24,
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'rgb(255 255 255 / 0.5)',
          pointerEvents: 'none',
        }}
      >
        Plan · Do · Earn · Find. Plan · Do · Earn · Find. Plan · Do · Earn ·
        Find.
      </p>
      {label ? (
        <p
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'rgb(255 255 255 / 0.85)',
          }}
        >
          {label}
        </p>
      ) : null}
      {children}
    </div>
  )
}

/** Light and dark, side by side — the pairing the chrome stories default to. */
export function BothSchemes({
  height = 360,
  children,
}: {
  height?: number
  children: (theme: 'light' | 'dark') => ReactNode
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light" height={height} label="Light">
        {children('light')}
      </Stage>
      <Stage theme="dark" height={height} label="Dark">
        {children('dark')}
      </Stage>
    </div>
  )
}
