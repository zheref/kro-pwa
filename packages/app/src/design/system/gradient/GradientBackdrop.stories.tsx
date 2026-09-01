import { GlassSurface } from '../glass/GlassSurface'
import { GradientBackdrop, GradientContent } from './GradientBackdrop'

/**
 * The `indigoGrape` header slab.
 *
 * The acceptance criterion is behavioural — "renders as a top inset that
 * content scrolls beneath" — so every story here is a scroll container with
 * real content in it. A static swatch would show the colours and prove nothing
 * about the thing being asked for.
 */
export default {
  title: 'Design system/GradientBackdrop',
  component: GradientBackdrop,
  parameters: { layout: 'fullscreen' },
}

function Day({ rows = 24 }: { rows?: number }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--kro-space-small)' }}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: filler rows generated from a fixed count — nothing reorders and there is no id
          key={`row-${index}`}
          style={{
            background: 'var(--kro-color-absolute)',
            borderRadius: 'var(--kro-radius-surface)',
            boxShadow: 'var(--kro-shadow-surface)',
            padding: 'var(--kro-space-medium)',
            color: 'var(--kro-color-fore)',
          }}
        >
          Endeavor {index + 1}
        </div>
      ))}
    </div>
  )
}

function Headline() {
  return (
    <div style={{ paddingBottom: 'var(--kro-space-large)' }}>
      <p
        className="kro-gradient-headline"
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.06em',
        }}
      >
        FRIDAY 30 AUGUST
      </p>
      <h1 style={{ margin: '4px 0 0', fontSize: 30, color: '#fff' }}>My Day</h1>
      <p
        style={{
          margin: '6px 0 0',
          color: 'rgb(255 255 255 / 0.85)',
          fontSize: 15,
        }}
      >
        4 left today
      </p>
    </div>
  )
}

function Scroller({
  theme = 'light',
  fixed = false,
  hardEdge = false,
}: {
  theme?: 'light' | 'dark'
  fixed?: boolean
  hardEdge?: boolean
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'auto',
        background: 'var(--kro-color-back)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <GradientBackdrop fixed={fixed} hardEdge={hardEdge} height="220px" />
      <GradientContent style={{ padding: 'var(--kro-space-large)' }}>
        <Headline />
        <Day />
      </GradientContent>
    </div>
  )
}

export const TopInset = {
  name: 'Top inset · content scrolls beneath',
  render: () => <Scroller />,
}

export const FixedToViewport = {
  name: 'Fixed to the viewport · the mobile shell',
  render: () => <Scroller fixed />,
}

export const HardEdge = {
  name: 'Hard edge · the fade turned off',
  render: () => <Scroller hardEdge />,
}

export const DarkScheme = {
  name: 'Dark scheme',
  render: () => <Scroller theme="dark" />,
}

export const UnderGlass = {
  name: 'Behind a glass bar · the desktop slab',
  render: () => (
    <div style={{ position: 'relative', height: '100vh', overflow: 'auto' }}>
      <GradientBackdrop fixed height="260px" />
      <GlassSurface
        as="header"
        material="bar"
        fixed
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          padding: '0 20px',
          fontWeight: 600,
          color: '#fff',
        }}
      >
        My Day
      </GlassSurface>
      <GradientContent
        style={{
          padding: 'var(--kro-space-large)',
          paddingTop: 76,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <Headline />
        <Day />
      </GradientContent>
    </div>
  ),
}
