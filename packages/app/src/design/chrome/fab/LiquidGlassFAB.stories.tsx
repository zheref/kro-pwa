import { BothSchemes, Stage } from '../Stage'
import { CHROME_LAYOUT, FAB_INSETS } from '../layout/chromeLayout'
import { LiquidGlassFAB } from './LiquidGlassFAB'

/**
 * LiquidGlassFAB — the 62px disc, on the backdrops it has to survive.
 *
 * WHAT TO LOOK FOR. The disc is 62px across in every story and reads as a lens
 * over the gradient rather than as a coloured button; the glyph is 24px and
 * optically centred; the material is the shallower `control` blur, so the glyph
 * stays crisp. The two anchored stories put it at canon's real insets — the
 * iOS-26 pair (12 / 53) and the legacy pair (16 / 60) — because "does it sit in
 * the right corner" is a question no unit test answers.
 */
export default {
  title: 'Design system/Chrome/LiquidGlassFAB',
  component: LiquidGlassFAB,
  parameters: { layout: 'fullscreen' },
}

export const PerTabGlyphs = {
  name: 'Per-tab glyphs, both schemes',
  render: () => (
    <BothSchemes height={220}>
      {() => (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
          <LiquidGlassFAB glyph="magnifyingglass" accessibilityLabel="Search" />
          <LiquidGlassFAB glyph="play" accessibilityLabel="Start session" />
        </div>
      )}
    </BothSchemes>
  ),
}

export const AnchoredModern = {
  name: `Anchored — iOS 26 insets (${FAB_INSETS.modern.trailing} / ${FAB_INSETS.modern.bottom})`,
  render: () => (
    <Stage height={320} label="iOS 26 tab bar">
      <div
        style={{
          position: 'absolute',
          right: FAB_INSETS.modern.trailing,
          bottom: FAB_INSETS.modern.bottom,
        }}
      >
        <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
      </div>
      {/* A stand-in for the tab bar the FAB has to clear. */}
      <div
        style={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: 49,
          background: 'rgb(0 0 0 / 0.25)',
        }}
      />
    </Stage>
  ),
}

export const AnchoredLegacy = {
  name: `Anchored — legacy insets (${FAB_INSETS.legacy.trailing} / ${FAB_INSETS.legacy.bottom})`,
  render: () => (
    <Stage theme="dark" height={320} label="Legacy tab bar">
      <div
        style={{
          position: 'absolute',
          right: FAB_INSETS.legacy.trailing,
          bottom: FAB_INSETS.legacy.bottom,
        }}
      >
        <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
      </div>
      <div
        style={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: 56,
          background: 'rgb(0 0 0 / 0.25)',
        }}
      />
    </Stage>
  ),
}

export const Disabled = {
  name: 'Disabled — the fade applied exactly once',
  render: () => (
    <BothSchemes height={200}>
      {() => (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add (disabled)" disabled />
        </div>
      )}
    </BothSchemes>
  ),
}

export const SizeAgainstTargets = {
  name: `Size — ${CHROME_LAYOUT.fabDiameter}px against the 44px and 28px floors`,
  render: () => (
    <Stage height={220} label="Target floors">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px dashed rgb(255 255 255 / 0.8)',
          }}
        />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px dashed rgb(255 255 255 / 0.8)',
          }}
        />
      </div>
    </Stage>
  ),
}
