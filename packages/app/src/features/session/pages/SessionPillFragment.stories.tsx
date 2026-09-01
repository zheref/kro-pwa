import type { ReactNode } from 'react'
import { ActiveToastLayer } from '../../../design/chrome/toast/ActiveToastLayer'
import { toActiveToast } from '../../../design/chrome/toast/activeToast'
import { SessionPillFragment } from './SessionPillFragment'
import { sessionPillMocks } from './SessionSurfaceMocks'

/**
 * The Session Pill, in every state the affordance diagram names, and in both
 * schemes.
 *
 * **This is the surface where light and dark genuinely differ.** The sheet
 * forces the dark scheme (canon does), but the pill takes the system glass and
 * its trailing button flips its fill by scheme — a darker ink over light glass,
 * a lighter one over dark. So every story below renders the pair side by side,
 * which is the only way to see whether both still read.
 *
 * The stage carries text under the pill on purpose: over a flat fill a blur
 * that is too weak looks fine. The chrome kit's own stories make the same
 * argument.
 *
 * Every entry comes from `sessionPillMocks`, i.e. from `selectSessionPillState`
 * run over a state the real Shifters produced — so the pill cannot be
 * snapshotted showing a tint and an affordance that no phase pairs together.
 */
export default {
  title: 'Session/Session pill',
  component: SessionPillFragment,
  parameters: { layout: 'fullscreen' },
}

const STAGE_BACKDROP =
  'linear-gradient(120deg, #5856d6 0%, #663399 40%, #b7162f 70%, #c78c00 100%)'

function Stage({
  theme,
  label,
  height = 190,
  children,
}: {
  readonly theme: 'light' | 'dark'
  readonly label: string
  readonly height?: number
  readonly children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        background: STAGE_BACKDROP,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p
        style={{
          position: 'absolute',
          inset: 16,
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'rgb(255 255 255 / 0.45)',
          pointerEvents: 'none',
        }}
      >
        Plan · Do · Earn · Find. Plan · Do · Earn · Find.
      </p>
      <p
        style={{
          position: 'absolute',
          top: 6,
          left: 10,
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'rgb(255 255 255 / 0.85)',
        }}
      >
        {`${label} · ${theme}`}
      </p>
      {/* A stand-in for the FAB, so the pill's trailing inset is visible. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 12,
          bottom: 60,
          width: 62,
          height: 62,
          borderRadius: '50%',
          background: 'rgb(255 255 255 / 0.22)',
        }}
      />
      {children}
    </div>
  )
}

const bothSchemes = (
  label: string,
  render: (theme: 'light' | 'dark') => ReactNode,
  height?: number,
) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
    <Stage theme="light" label={label} height={height}>
      {render('light')}
    </Stage>
    <Stage theme="dark" label={label} height={height}>
      {render('dark')}
    </Stage>
  </div>
)

const noop = () => {}

const pill = (pillState: (typeof sessionPillMocks)['running']) => (
  <SessionPillFragment
    pill={pillState}
    isVisible
    position="absolute"
    onTapBody={noop}
    onTapPause={noop}
    onTapResume={noop}
    onTapComplete={noop}
  />
)

export const Running = {
  name: 'Running — green glass, pause',
  render: () => bothSchemes('Running', () => pill(sessionPillMocks.running)),
}

export const Paused = {
  name: 'Paused — untinted glass, solid-green resume',
  render: () => bothSchemes('Paused', () => pill(sessionPillMocks.paused)),
}

export const OnBreak = {
  name: 'Break — beige glass, "Break" in place of the title',
  render: () => bothSchemes('Break', () => pill(sessionPillMocks.onBreak)),
}

export const Concluded = {
  name: 'Concluded — untinted glass, blue Mark complete',
  render: () =>
    bothSchemes('Concluded', () => pill(sessionPillMocks.concluded)),
}

export const LongTitle = {
  name: 'Running — a title long enough to truncate',
  render: () =>
    bothSchemes('Long title', () =>
      pill({
        ...sessionPillMocks.running,
        title: 'Write comprehensive documentation for the new public API',
      }),
    ),
}

export const StopwatchClock = {
  name: 'Running — a stopwatch past the hour',
  render: () =>
    bothSchemes('Past an hour', () =>
      pill({ ...sessionPillMocks.running, clockLabel: '1:02:11' }),
    ),
}

export const FadedOut = {
  name: 'Hidden — the crossfade’s other end',
  render: () =>
    bothSchemes('Sheet presented', () => (
      <SessionPillFragment
        pill={sessionPillMocks.running}
        // Canon keeps the overlay in the layout and animates its opacity, so
        // the hidden state is a real rendered state rather than an unmount.
        isVisible={false}
        position="absolute"
        onTapBody={noop}
        onTapPause={noop}
        onTapResume={noop}
        onTapComplete={noop}
      />
    )),
}

/**
 * The toast lifted clear of the **real** pill — acceptance criterion 3.
 *
 * `#15` already ships a `LiftAbovePill` story, but it had to stand the pill in
 * with a grey rectangle: the pill did not exist yet. This is the same layout
 * with the real thing underneath, which is the only version that proves the two
 * agree — both read their geometry from `CHROME_LAYOUT`, and the lift is
 * `pillBottomPadding + pillHeight + pillToastSpacing − toastBottomPadding`,
 * derived rather than measured.
 *
 * **This is also the only place the pairing can be seen at all today.** No
 * merged surface mounts `ActiveToastHost` at shell level yet, so the built app
 * has no toast to lift — reported as a cross-lane need rather than mounted from
 * this lane, where it would have to be a sibling of the pill rather than an
 * ancestor of the tree that raises toasts.
 */
export const ToastLiftAbovePill = {
  name: 'Toast lifts clear of the pill (AC 3)',
  render: () =>
    bothSchemes(
      'Toast + pill',
      () => (
        <>
          <ActiveToastLayer
            toast={toActiveToast({
              message: 'Prepare slides marked complete',
              icon: 'checkmark.circle.fill',
              primaryAction: { title: 'Undo', onSelect: noop },
            })}
            isSessionPillVisible
            position="absolute"
          />
          {pill(sessionPillMocks.running)}
        </>
      ),
      // Tall enough to hold the lift: the toast rises
      // `pillBottomPadding + pillHeight + pillToastSpacing − toastBottomPadding`
      // clear of the pill, so a 190px stage clips the thing being demonstrated.
      300,
    ),
}

export const NoSession = {
  name: 'Ready — nothing to show, nothing offered',
  render: () =>
    bothSchemes('Ready', () => (
      <SessionPillFragment
        pill={sessionPillMocks.hidden}
        isVisible={false}
        position="absolute"
        onTapBody={noop}
        onTapPause={noop}
        onTapResume={noop}
        onTapComplete={noop}
      />
    )),
}
