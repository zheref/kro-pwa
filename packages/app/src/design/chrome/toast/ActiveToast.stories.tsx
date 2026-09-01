import { LiquidGlassFAB } from '../fab/LiquidGlassFAB'
import { BothSchemes, Stage } from '../Stage'
import {
  CHROME_LAYOUT,
  FAB_INSETS,
  pillTrailingPadding,
} from '../layout/chromeLayout'
import { ActiveToastLayer } from './ActiveToastLayer'
import { ActiveToastView } from './ActiveToastView'
import { type ActiveToastInput, toActiveToast } from './activeToast'

/**
 * ActiveToast — the placement, stacking and lift matrix.
 *
 * WHAT TO LOOK FOR, against `docs/Features/ActiveToast.md`:
 *
 *  · PLACEMENT. The toast's vertical centre lines up with the FAB's. It stops
 *    96px short of the trailing edge, so it never runs under the disc, and sits
 *    16px in from the leading edge and 24px off the bottom.
 *  · SHAPE. 16px corners, at least 72px tall, capped at ~360px wide, on the
 *    glass material.
 *  · STACKING. One action sits alone; two stack VERTICALLY with the
 *    affirmative one on top, and both still fit inside the pill.
 *  · LIFT. With the Session Pill present the toast rises entirely above it,
 *    leaving canon's 15px gap. The two "lift" stories are the same toast with
 *    and without a session running — compare the gaps, not the absolute
 *    positions.
 *
 * The stages below use `position="absolute"` so each matrix cell is its own
 * bottom-right corner. In the app the layer is `fixed` to the viewport.
 */
export default {
  title: 'Design system/Chrome/ActiveToast',
  component: ActiveToastView,
  parameters: { layout: 'fullscreen' },
}

const COMPLETED: ActiveToastInput = {
  message: '"Buy groceries" marked complete',
  icon: 'checkmark.circle.fill',
  iconColor: 'green',
  iconSize: 20,
  rewardAmount: 30,
  primaryAction: { title: 'Undo', onSelect: () => {} },
}

const DEFERRED: ActiveToastInput = {
  message: '"Team meeting" deferred to 3:00 PM',
  icon: 'clock',
  iconColor: 'orange',
  iconSize: 18,
  primaryAction: { title: 'Undo', onSelect: () => {} },
  secondaryAction: { title: 'View', style: 'prominent', onSelect: () => {} },
}

const DELETED: ActiveToastInput = {
  message: '"Old project" deleted',
  icon: 'trash',
  iconColor: 'red',
  iconSize: 18,
  primaryAction: { title: 'Undo', style: 'destructive', onSelect: () => {} },
}

const SAVED: ActiveToastInput = {
  message: 'Changes saved successfully',
  icon: 'checkmark',
  iconColor: 'green',
  duration: 3,
}

const LONG: ActiveToastInput = {
  message:
    '"Write comprehensive documentation for the new API endpoints" marked complete',
  icon: 'sparkles',
  iconColor: 'blue',
  iconSize: 18,
  rewardAmount: 150,
  primaryAction: { title: 'Undo', onSelect: () => {} },
  secondaryAction: { title: 'Share', style: 'prominent', onSelect: () => {} },
}

/** The FAB, at canon's inset, so the toast's clearance can be judged. */
function CornerFab() {
  return (
    <div
      style={{
        position: 'absolute',
        right: FAB_INSETS.modern.trailing,
        bottom: FAB_INSETS.modern.bottom,
      }}
    >
      <LiquidGlassFAB glyph="plus" accessibilityLabel="Quick add" />
    </div>
  )
}

/** A stand-in for `#22`'s Session Pill, at the geometry this kit publishes. */
function SessionPillStandIn() {
  return (
    <div
      className="kro-glass kro-glass--control"
      style={{
        position: 'absolute',
        right: pillTrailingPadding(),
        bottom: CHROME_LAYOUT.pillBottomPadding,
        left: CHROME_LAYOUT.pillLeadingPadding,
        height: CHROME_LAYOUT.pillHeight,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        color: 'var(--kro-color-fore)',
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--kro-color-focus-green)',
        }}
      />
      Session · 18:24 left
    </div>
  )
}

export const Placement = {
  name: 'Placement — centred on the FAB, 96px clear of it',
  render: () => (
    <BothSchemes height={300}>
      {() => (
        <>
          <CornerFab />
          <ActiveToastLayer
            toast={toActiveToast(COMPLETED)}
            position="absolute"
          />
        </>
      )}
    </BothSchemes>
  ),
}

export const StackedActions = {
  name: 'Stacking — one action, two stacked, none',
  render: () => (
    <Stage height={420} label="Trailing actions">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <ActiveToastView toast={toActiveToast(COMPLETED)} />
        <ActiveToastView toast={toActiveToast(DEFERRED)} />
        <ActiveToastView toast={toActiveToast(SAVED)} />
      </div>
    </Stage>
  ),
}

export const ActionStyles = {
  name: 'Action styles — standard, destructive, prominent',
  render: () => (
    <BothSchemes height={420}>
      {() => (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 16,
            padding: 20,
          }}
        >
          <ActiveToastView toast={toActiveToast(COMPLETED)} />
          <ActiveToastView toast={toActiveToast(DELETED)} />
          <ActiveToastView toast={toActiveToast(LONG)} />
        </div>
      )}
    </BothSchemes>
  ),
}

export const LiftWithoutPill = {
  name: 'Lift — no session running (baseline)',
  render: () => (
    <Stage height={320} label="No pill">
      <CornerFab />
      <ActiveToastLayer toast={toActiveToast(COMPLETED)} position="absolute" />
    </Stage>
  ),
}

export const LiftAbovePill = {
  name: 'Lift — session running, toast fully above the pill',
  render: () => (
    <BothSchemes height={360}>
      {() => (
        <>
          <CornerFab />
          <SessionPillStandIn />
          <ActiveToastLayer
            toast={toActiveToast(COMPLETED)}
            position="absolute"
            isSessionPillVisible
          />
        </>
      )}
    </BothSchemes>
  ),
}

export const LongMessage = {
  name: 'Long message — clamped at two lines, still 360px wide',
  render: () => (
    <Stage theme="dark" height={320} label="Two-line clamp">
      <CornerFab />
      <ActiveToastLayer toast={toActiveToast(LONG)} position="absolute" />
    </Stage>
  ),
}
