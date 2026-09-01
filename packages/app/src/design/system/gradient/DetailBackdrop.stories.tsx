import { GlassSurface } from '../glass/GlassSurface'
import { DetailBackdrop } from './DetailBackdrop'

/**
 * The page field glass has to refract. A static swatch of the two stops
 * would show the colours and prove nothing about why this layer exists.
 */
export default {
  title: 'Design system/DetailBackdrop',
  component: DetailBackdrop,
  parameters: { layout: 'fullscreen' },
}

export const PageField = {
  name: 'Page field · vertical ramp',
  render: () => (
    <div style={{ position: 'relative', height: '100vh' }}>
      <DetailBackdrop />
    </div>
  ),
}

export const UnderGlass = {
  name: 'Behind a glass sidebar · the refraction the field exists for',
  render: () => (
    <div
      data-theme="light"
      style={{
        position: 'relative',
        display: 'flex',
        gap: 8,
        height: '100vh',
        padding: 8,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <DetailBackdrop />
      <GlassSurface
        material="sidebar"
        style={{
          position: 'relative',
          width: 220,
          padding: 12,
          color: 'var(--kro-color-fore)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Kro</p>
        <p style={{ margin: '8px 0 0', fontSize: 14 }}>Today</p>
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>Plan</p>
      </GlassSurface>
      <div style={{ position: 'relative', flex: 1, color: '#fff' }}>
        <h1 style={{ margin: 16, fontSize: 32 }}>My Day</h1>
      </div>
    </div>
  ),
}

export const DarkScheme = {
  name: 'Dark scheme',
  render: () => (
    <div data-theme="dark" style={{ position: 'relative', height: '100vh' }}>
      <DetailBackdrop />
      <GlassSurface
        material="dock"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          left: 16,
          display: 'flex',
          justifyContent: 'space-around',
          padding: 12,
          color: 'var(--kro-color-fore)',
        }}
      >
        <span>Search</span>
        <span>Plan</span>
        <span>Do</span>
        <span>Earn</span>
      </GlassSurface>
    </div>
  ),
}
