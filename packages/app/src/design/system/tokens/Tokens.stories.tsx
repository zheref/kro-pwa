import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { readColorRole, readSemanticRole } from './readToken'
import {
  COLOR_ROLES,
  COLOR_ROLE_VARS,
  DISABLED_OPACITY_VAR,
  RADIUS_VARS,
  SEMANTIC_ROLES,
  SEMANTIC_ROLE_VARS,
  SHADOW_VARS,
  SIZE_VARS,
  SPACING_VARS,
} from './roles'
import { decideAccent } from './useAccentColor'
import { StoryGallery } from '../../storybook/storyGallery'

/**
 * The token gallery.
 *
 * Computed values are read AFTER mount. Reading them during render is a
 * hydration mismatch: SSR has no engine and falls back to `var(--kro-…)`,
 * the client has one and paints a hex. The in-app `/storybook` gallery
 * server-renders this module, so first paint is the variable; the hex
 * fills in from `readToken` once the pane exists.
 *
 * `SEMANTIC_ROLES` from `roles.ts`, never `CHIP_ROLES` from
 * `contrastContracts.ts`: the latter imports `tokenSource`, which reads the
 * stylesheet with `node:fs` and belongs to the test tier. The two lists are
 * the same set. Pulling `tokenSource` into this file would also pull it into
 * the in-app Design System gallery, which is a client bundle.
 *
 * Every story renders light and dark SIDE BY SIDE. Two panes on one page is
 * only possible because the theme is keyed off `[data-theme]` as a plain
 * attribute selector; anchoring it to `:root` would force one scheme per page
 * and make comparing them a matter of toggling and remembering.
 */
export default {
  title: 'Design system/Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KroTokens ported from zheref/KroApple@2c1ee45. Values are read from the browser’s computed style, so this page cannot disagree with the stylesheet.',
      },
    },
  },
}

function Pane({
  theme,
  children,
}: {
  theme: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--kro-color-back)',
        color: 'var(--kro-color-fore)',
        padding: 'var(--kro-space-large)',
        minHeight: '100%',
        flex: '1 1 0%',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 'var(--kro-space-medium)',
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--kro-color-fore-secondary)',
        }}
      >
        {theme}
      </h2>
      {children}
    </div>
  )
}

function BothThemes({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Pane theme="light">{children}</Pane>
      <Pane theme="dark">{children}</Pane>
    </div>
  )
}

function Swatch({
  name,
  paint,
  caption,
}: {
  name: string
  paint: string
  caption: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--kro-space-small)',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          flexShrink: 0,
          borderRadius: 'var(--kro-radius-small)',
          background: paint,
          boxShadow: 'inset 0 0 0 1px var(--kro-color-hairline)',
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--kro-color-fore-secondary)' }}>
          {caption}
        </div>
      </div>
    </div>
  )
}

/**
 * Computed swatches cannot be read during render: SSR has no engine, the
 * client does, and that pair is a hydration mismatch. First paint is the
 * CSS variable (same on both sides); the hex is filled in after mount,
 * scoped to the nearest `[data-theme]` pane so light and dark disagree.
 */
function PaintedSwatch({
  name,
  role,
}: {
  name: string
  role: (typeof COLOR_ROLES)[number]
}) {
  const fallback = `var(${COLOR_ROLE_VARS[role]})`
  const rootRef = useRef<HTMLDivElement>(null)
  const [caption, setCaption] = useState(fallback)

  useEffect(() => {
    const scope = rootRef.current?.closest('[data-theme]') ?? null
    const next = readColorRole(role, scope)
    setCaption(next === '' ? fallback : next)
  }, [fallback, role])

  return (
    <div ref={rootRef}>
      <Swatch name={name} paint={fallback} caption={caption} />
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 'var(--kro-space-medium)',
      }}
    >
      {children}
    </div>
  )
}

function PaletteGallery() {
  return (
    <Grid>
      {COLOR_ROLES.map((role) => (
        <PaintedSwatch key={role} name={role} role={role} />
      ))}
    </Grid>
  )
}

function SemanticChip({ role }: { role: (typeof SEMANTIC_ROLES)[number] }) {
  const fallback = `var(${SEMANTIC_ROLE_VARS[role]})`
  const rootRef = useRef<HTMLDivElement>(null)
  const [caption, setCaption] = useState('')

  useEffect(() => {
    const scope = rootRef.current?.closest('[data-theme]') ?? null
    setCaption(readSemanticRole(role, scope))
  }, [role])

  return (
    <div ref={rootRef}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: '28px',
          padding: '0 12px',
          borderRadius: 'var(--kro-radius-pill)',
          background: fallback,
          color: 'var(--kro-color-absolute)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {role}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: fallback,
        }}
      >
        tint as label{caption === '' ? '' : ` · ${caption}`}
      </div>
    </div>
  )
}

function SemanticGallery() {
  return (
    <Grid>
      {SEMANTIC_ROLES.map((role) => (
        <SemanticChip key={role} role={role} />
      ))}
    </Grid>
  )
}

function ScaleGallery() {
  return (
    <div style={{ display: 'grid', gap: 'var(--kro-space-large)' }}>
      <section>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>
          Spacing — the 4pt rhythm
        </h3>
        {Object.entries(SPACING_VARS).map(([name, variable]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <span style={{ width: '84px', fontSize: 12 }}>{name}</span>
            <div
              style={{
                height: '16px',
                width: `var(${variable})`,
                background: 'var(--kro-color-accent)',
                borderRadius: 'var(--kro-radius-small)',
              }}
            />
          </div>
        ))}
      </section>

      <section>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Radii</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(RADIUS_VARS).map(([name, variable]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '72px',
                  height: '56px',
                  background: 'var(--kro-color-back-inner)',
                  borderRadius: `var(${variable})`,
                  boxShadow: 'inset 0 0 0 1px var(--kro-color-hairline)',
                }}
              />
              <div style={{ fontSize: 11, marginTop: 4 }}>{name}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Sizing and opacity</h3>
        <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18 }}>
          {Object.entries(SIZE_VARS).map(([name, variable]) => (
            <li key={name}>
              {name} — <code>{variable}</code>
            </li>
          ))}
          <li>
            disabled — <code>{DISABLED_OPACITY_VAR}</code> (apply once per
            control)
          </li>
        </ul>
      </section>
    </div>
  )
}

function ElevationGallery() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--kro-space-large)',
        flexWrap: 'wrap',
      }}
    >
      {Object.entries(SHADOW_VARS).map(([name, variable]) => (
        <div
          key={name}
          style={{
            width: '180px',
            height: '110px',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--kro-color-absolute)',
            borderRadius: 'var(--kro-radius-surface)',
            boxShadow: `var(${variable})`,
            fontSize: 13,
          }}
        >
          {name}
        </div>
      ))}
    </div>
  )
}

const Palette = {
  name: 'Palette · every role, both themes',
  render: () => (
    <BothThemes>
      <PaletteGallery />
    </BothThemes>
  ),
}

const SemanticRoles = {
  name: 'Semantic roles · chips, both themes',
  render: () => (
    <BothThemes>
      <SemanticGallery />
    </BothThemes>
  ),
}

const Scales = {
  name: 'Spacing, radii and sizing',
  render: () => (
    <BothThemes>
      <ScaleGallery />
    </BothThemes>
  ),
}

const Elevation = {
  name: 'Elevation',
  render: () => (
    <BothThemes>
      <ElevationGallery />
    </BothThemes>
  ),
}

const AccentTheming = {
  name: 'Accent theming',
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--kro-space-medium)' }}>
        <p style={{ fontSize: 13, margin: 0, maxWidth: '46ch' }}>
          A user accent is written together with the label colour that reads on
          it. Choosing the better of black and white can never do worse than
          4.58:1 on an opaque fill, so a re-tint cannot make a primary button
          unreadable.
        </p>
        {['#5e6472', '#663399', '#b0b9d4', '#c78c00'].map((accent) => {
          const decision = decideAccent(accent)
          return (
            <div
              key={accent}
              style={
                {
                  '--kro-color-accent': decision.accent,
                  '--kro-color-on-accent': decision.onAccent,
                } as CSSProperties
              }
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: 'var(--kro-radius-pill)',
                  background: 'var(--kro-color-accent)',
                  color: 'var(--kro-color-on-accent)',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Start session · {accent} · {decision.contrast.toFixed(2)}:1
              </span>
            </div>
          )
        })}
      </div>
    </BothThemes>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Palette.render()}
      {SemanticRoles.render()}
      {Scales.render()}
      {Elevation.render()}
      {AccentTheming.render()}
    </StoryGallery>
  ),
}
