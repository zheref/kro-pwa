import { LiquidGlassFAB } from '../fab/LiquidGlassFAB'
import { BothSchemes, Stage } from '../Stage'
import { GLOW_SHAPES, RotatingGlow } from './RotatingGlow'

/**
 * RotatingGlow — the two-hue sweep cast from behind the FAB.
 *
 * WHAT TO LOOK FOR, in order of how easy it is to get wrong:
 *
 *  1. It reads as TRAVELLING, not pulsing. The emerald-to-lime boundary should
 *     move round the rim at a steady brightness. If the whole halo brightens
 *     and dims in place, the second hue has been lost and the sweep has become
 *     a single-colour opacity ramp.
 *  2. The button is NOT tinted. The disc's glass must stay neutral: the band is
 *     cut out of the content's own silhouette precisely so the glass has
 *     nothing green to sample. Green creeping into the disc means the cut-out
 *     has failed.
 *  3. Light LEAVES the drawn edge. There should be no gap between the disc and
 *     the start of the glow.
 *  4. Clicks land. The FAB in every story is a real button — press it.
 *  5. Under `prefers-reduced-motion: reduce` the sweep SETTLES STILL and stays
 *     visible. Toggle it in the OS (macOS: Settings › Accessibility › Display ›
 *     Reduce motion) and reload; there is no story switch, because a switch
 *     would test the switch rather than the setting.
 */
export default {
  title: 'Design system/Chrome/RotatingGlow',
  component: RotatingGlow,
  parameters: { layout: 'fullscreen' },
}

function Centre({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      {children}
    </div>
  )
}

export const OnTheFAB = {
  name: 'On the FAB — canon`s ringEmerald to glowLime',
  render: () => (
    <BothSchemes height={280}>
      {() => (
        <Centre>
          <RotatingGlow shape={GLOW_SHAPES.circle}>
            <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
          </RotatingGlow>
        </Centre>
      )}
    </BothSchemes>
  ),
}

export const TwoHuesVersusOne = {
  name: 'Two hues versus one — why the second hue exists',
  render: () => (
    <Stage theme="dark" height={280} label="Left: two hues (travels). Right: one (pulses).">
      <Centre>
        <RotatingGlow hues={['ringEmerald', 'glowLime']}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Two hues" />
        </RotatingGlow>
        <RotatingGlow hues={['ringEmerald']}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="One hue" />
        </RotatingGlow>
      </Centre>
    </Stage>
  ),
}

export const Shapes = {
  name: 'Every shape — circle, capsule, rounded rectangle',
  render: () => (
    <Stage height={280} label="One construction, three silhouettes">
      <Centre>
        <RotatingGlow shape={GLOW_SHAPES.circle}>
          <div
            className="kro-glass kro-glass--control"
            style={{ width: 62, height: 62, borderRadius: '50%' }}
          />
        </RotatingGlow>
        <RotatingGlow shape={GLOW_SHAPES.capsule}>
          <div
            className="kro-glass kro-glass--control"
            style={{ width: 180, height: 54, borderRadius: 9999 }}
          />
        </RotatingGlow>
        <RotatingGlow shape={GLOW_SHAPES.roundedRectangle(18)}>
          <div
            className="kro-glass"
            style={{ width: 160, height: 100, borderRadius: 18 }}
          />
        </RotatingGlow>
      </Centre>
    </Stage>
  ),
}

export const Settled = {
  name: 'Settled — what reduced motion shows',
  render: () => (
    <BothSchemes height={280}>
      {() => (
        <Centre>
          {/*
            `secondsPerRevolution={0}` holds the sweep at 0deg, which is exactly
            what Reduce Motion produces. The glow is not dropped — the treatment
            that ships is still on screen, just not turning.
          */}
          <RotatingGlow secondsPerRevolution={0}>
            <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
          </RotatingGlow>
        </Centre>
      )}
    </BothSchemes>
  ),
}

export const Inactive = {
  name: 'Inactive — the glow is removed, not frozen',
  render: () => (
    <Stage height={240} label="isActive: false">
      <Centre>
        <RotatingGlow isActive>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Glowing" />
        </RotatingGlow>
        <RotatingGlow isActive={false}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Plain" />
        </RotatingGlow>
      </Centre>
    </Stage>
  ),
}

export const Reach = {
  name: 'Spread versus blur — brightness against reach',
  render: () => (
    <Stage theme="dark" height={280} label="spread 3/5 = 5 · blur 5/10/2">
      <Centre>
        <RotatingGlow spread={3} blurRadius={5}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Canon default" />
        </RotatingGlow>
        <RotatingGlow spread={3} blurRadius={10}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Longer reach" />
        </RotatingGlow>
        <RotatingGlow spread={5} blurRadius={2}>
          <LiquidGlassFAB glyph="plus" accessibilityLabel="Flat ring" />
        </RotatingGlow>
      </Centre>
    </Stage>
  ),
}
