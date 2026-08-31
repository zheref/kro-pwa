import type { ReactNode } from 'react'
import { GlassSurface } from './GlassSurface'

/**
 * KroGlass, on the busy backdrops it has to survive.
 *
 * A glass material can only be judged over something. Every story below puts
 * it over a gradient and text, because that is where a blur that is too weak,
 * a rim that is too faint or a sheen that is too strong actually shows.
 *
 * Two of the three behaviours this material exists for cannot be asserted in
 * jsdom and are checked here by eye:
 *   · the fixed bar stays welded to the viewport top in Safari (the reason the
 *     filter lives on a pseudo-element);
 *   · `prefers-reduced-transparency` produces an opaque surface with no sheen.
 *     Toggle it in the OS (macOS: Settings › Accessibility › Display › Reduce
 *     transparency) and reload — the stories need no switch of their own.
 */
export default {
  title: 'Design system/KroGlass',
  component: GlassSurface,
  parameters: { layout: 'fullscreen' },
}

const PHOTO_BACKDROP =
  'linear-gradient(120deg, #5856d6 0%, #663399 40%, #b7162f 70%, #c78c00 100%)'

function Stage({
  theme = 'light',
  children,
  height = 420,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
  height?: number
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        minHeight: height,
        padding: 'var(--kro-space-large)',
        background: PHOTO_BACKDROP,
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Text under the glass — the only honest test of a blur. */}
      <p
        style={{
          position: 'absolute',
          inset: '24px',
          margin: 0,
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'rgb(255 255 255 / 0.55)',
        }}
      >
        Plan · Do · Earn · Find. Plan · Do · Earn · Find. Plan · Do · Earn · Find. Plan ·
        Do · Earn · Find.
      </p>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

function CardBody() {
  return (
    <div style={{ padding: 'var(--kro-space-large)' }}>
      <h3 style={{ margin: 0, fontSize: 17, color: 'var(--kro-color-fore)' }}>
        Write the KroTokens port
      </h3>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 14,
          color: 'var(--kro-color-fore-secondary)',
        }}
      >
        Due today · 25 minutes
      </p>
    </div>
  )
}

export const Surface = {
  name: 'Surface · a floating card',
  render: () => (
    <Stage>
      <GlassSurface style={{ maxWidth: 380 }}>
        <CardBody />
      </GlassSurface>
    </Stage>
  ),
}

export const Control = {
  name: 'Control · the shallower blur',
  render: () => (
    <Stage height={240}>
      <div style={{ display: 'flex', gap: 'var(--kro-space-small)', flexWrap: 'wrap' }}>
        <GlassSurface
          as="button"
          material="control"
          interactive
          style={{ padding: '0 20px', fontWeight: 600, color: 'var(--kro-color-fore)' }}
        >
          Start session
        </GlassSurface>
        <GlassSurface
          as="button"
          material="control"
          interactive
          style={{ width: 44, color: 'var(--kro-color-fore)' }}
        >
          +
        </GlassSurface>
      </div>
      <p style={{ marginTop: 16, fontSize: 13, color: 'rgb(255 255 255 / 0.9)' }}>
        14px blur at 160% saturation. A 20px blur behind a 14px label reads as smeared.
      </p>
    </Stage>
  ),
}

export const FixedBar = {
  name: 'Bar · fixed, with content scrolling beneath',
  render: () => (
    <div style={{ position: 'relative', height: '100vh', overflow: 'auto' }}>
      <GlassSurface
        as="header"
        material="bar"
        fixed
        scrolled
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 56,
          padding: '0 20px',
          fontWeight: 600,
          color: 'var(--kro-color-fore)',
        }}
      >
        Kro
      </GlassSurface>
      <div
        style={{
          paddingTop: 56,
          background: PHOTO_BACKDROP,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {Array.from({ length: 30 }, (_, index) => (
          <p
            key={`row-${index}`}
            style={{ margin: 0, padding: '14px 20px', color: '#fff', fontSize: 18 }}
          >
            Row {index + 1} — scroll this under the bar. In Safari the bar must stay
            welded to the top edge; that is what the pseudo-element filter buys.
          </p>
        ))}
      </div>
    </div>
  ),
}

export const DarkScheme = {
  name: 'Dark scheme',
  render: () => (
    <Stage theme="dark">
      <GlassSurface style={{ maxWidth: 380 }}>
        <CardBody />
      </GlassSurface>
      <div style={{ height: 16 }} />
      <GlassSurface
        as="button"
        material="control"
        interactive
        style={{ padding: '0 20px', fontWeight: 600, color: 'var(--kro-color-fore)' }}
      >
        Start session
      </GlassSurface>
    </Stage>
  ),
}

export const BothSchemes = {
  name: 'Both schemes, side by side',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light" height={320}>
        <GlassSurface>
          <CardBody />
        </GlassSurface>
      </Stage>
      <Stage theme="dark" height={320}>
        <GlassSurface>
          <CardBody />
        </GlassSurface>
      </Stage>
    </div>
  ),
}
