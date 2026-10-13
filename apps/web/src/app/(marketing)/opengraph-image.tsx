import { ImageResponse } from 'next/og'

/**
 * The landing's social card (1200×630), generated at build time.
 *
 * The gradient is canon's `indigoGrape` header slab — `#5856d6 → #663399`
 * (`--kro-color-header-gradient-indigo` → `…-grape` in the design tokens).
 * An image renderer cannot read a CSS custom property, so these two literals
 * are the one sanctioned restatement, as `manifest.ts` notes for `theme_color`.
 *
 * Default (Node.js) runtime: with no request-time input the card is rendered
 * once at build and served as a static file; edge would buy nothing here.
 */
export const alt = 'Kro — Control your time, do not let time control you.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #5856d6 0%, #663399 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 200, fontWeight: 800, letterSpacing: -6 }}>
        Kro
      </div>
      <div style={{ fontSize: 44, marginTop: 24, opacity: 0.92 }}>
        Control your time, do not let time control you.
      </div>
    </div>,
    size,
  )
}
