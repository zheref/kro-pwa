import type { ReactNode } from 'react'
import { SessionSheetFragment } from './SessionSheetFragment'
import { sessionSheetMocks } from './SessionSurfaceMocks'
import { SessionSurfacePresentation } from './sessionSheetModel'

/**
 * The session sheet, in every phase the surface claims to support.
 *
 * These are the stories the issue's acceptance criteria are read against, and
 * every one is built from `sessionSheetMocks` — which runs the real Selectors
 * over a `SessionMocks` state, which was itself produced by the real Shifters.
 * So a story here cannot show a sheet the phase machine could not reach.
 *
 * **The sheet forces the dark scheme, and that is canon.**
 * `SessionSetupScreen` sets `colorScheme: .dark` on both of its hosts because
 * every string in the view is hardcoded white. So a light-mode app and a
 * dark-mode app render this surface identically **by design** — the stage
 * behind it changes, the sheet does not. The scheme pair that *is* meaningful
 * belongs to the pill, and it is rendered side by side in
 * `SessionPillFragment.stories.tsx`.
 *
 * `PhaseSlotGrid` is the visual half of acceptance criterion 1: five phases at
 * one width, with a ruler behind them. Anything that moved between two columns
 * would be visible as a step; the *assertion* lives in
 * `__tests__/SessionSheetFragment.test.tsx`, which compares the reserved slot
 * geometry per phase pair rather than trusting an eye.
 */
export default {
  title: 'Session/Session sheet',
  component: SessionSheetFragment,
  parameters: { layout: 'fullscreen' },
}

const STAGE_BACKDROP =
  'linear-gradient(150deg, #221b3d 0%, #2f2350 45%, #3a1f45 100%)'

function Stage({
  label,
  width = 390,
  children,
}: {
  readonly label: string
  readonly width?: number
  readonly children: ReactNode
}) {
  return (
    <div
      style={{
        width,
        background: STAGE_BACKDROP,
        fontFamily: 'system-ui, sans-serif',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          margin: 0,
          padding: '8px 12px 0',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'rgb(255 255 255 / 0.6)',
        }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

function Row({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 16 }}>
      {children}
    </div>
  )
}

// -- Ready ------------------------------------------------------------------

export const ReadyCountdown = {
  name: 'Ready — countdown (shipped flags)',
  render: () => (
    <Stage label="Ready · Pomodoro · statusQuo">
      <SessionSheetFragment {...sessionSheetMocks.ready} />
    </Stage>
  ),
}

export const ReadyWithSuggestions = {
  name: 'Ready — parallel-task suggestions',
  render: () => (
    <Stage label="Ready · maybe do this in parallel?">
      <SessionSheetFragment {...sessionSheetMocks.readyWithSuggestions} />
    </Stage>
  ),
}

export const ReadyStopwatchAvailable = {
  name: 'Ready — stopwatch flag on',
  render: () => (
    <Stage label="Ready · sessionStopwatch enabled">
      <SessionSheetFragment {...sessionSheetMocks.readyEverythingOn} />
    </Stage>
  ),
}

export const ReadyBlankSession = {
  name: 'Ready — blank focus session',
  render: () => (
    <Stage label="Ready · not yet promoted to an endeavor">
      <SessionSheetFragment {...sessionSheetMocks.readyAnonymous} />
    </Stage>
  ),
}

export const EditingTitle = {
  name: 'Ready — tap-to-edit title',
  render: () => (
    <Stage label="Ready · the title IS the tap target">
      <SessionSheetFragment {...sessionSheetMocks.editingTitle} />
    </Stage>
  ),
}

// -- Running ----------------------------------------------------------------

export const Running = {
  name: 'Running — ten minutes in',
  render: () => (
    <Stage label="Running · green tint · 15:00 left">
      <SessionSheetFragment {...sessionSheetMocks.running} />
    </Stage>
  ),
}

export const RunningWithNextSuggestion = {
  name: 'Running — one centred suggestion',
  render: () => (
    <Stage label="Running · maybe do this next?">
      <SessionSheetFragment {...sessionSheetMocks.runningWithNextSuggestion} />
    </Stage>
  ),
}

export const RunningTomatoOverflow = {
  name: 'Running — twelve tomatoes',
  render: () => (
    <Stage label="Running · ten glyphs then × 12">
      <SessionSheetFragment {...sessionSheetMocks.runningTomatoOverflow} />
    </Stage>
  ),
}

// -- Paused -----------------------------------------------------------------

export const Paused = {
  name: 'Paused — frozen figure',
  render: () => (
    <Stage label="Paused · resume is the vivid call to action">
      <SessionSheetFragment {...sessionSheetMocks.paused} />
    </Stage>
  ),
}

export const PausedInline = {
  name: 'Paused — desktop column',
  render: () => (
    <Stage label='Paused · inline · "Close to dismiss"' width={640}>
      <SessionSheetFragment {...sessionSheetMocks.pausedInline} />
    </Stage>
  ),
}

export const PausedWithSuggestions = {
  name: 'Paused — suggestions still reserved',
  render: () => (
    <Stage label="Paused · the region keeps its 90px">
      <SessionSheetFragment
        {...sessionSheetMocks.paused}
        suggestions={sessionSheetMocks.readyWithSuggestions.suggestions}
      />
    </Stage>
  ),
}

// -- Concluded --------------------------------------------------------------

export const Concluded = {
  name: 'Concluded — shipped flags (no Break)',
  render: () => (
    <Stage label="Concluded · Complete blue · Start New green">
      <SessionSheetFragment {...sessionSheetMocks.concluded} />
    </Stage>
  ),
}

export const ConcludedWithBreak = {
  name: 'Concluded — break flag on',
  render: () => (
    <Stage label="Concluded · all three choices">
      <SessionSheetFragment {...sessionSheetMocks.concludedWithBreak} />
    </Stage>
  ),
}

export const ConcludedLongTitle = {
  name: 'Concluded — long title',
  render: () => (
    <Stage label="Concluded · the title clamps at two lines">
      <SessionSheetFragment {...sessionSheetMocks.concludedLongTitle} />
    </Stage>
  ),
}

// -- Break ------------------------------------------------------------------

export const BreakRunning = {
  name: 'Break — two minutes in',
  render: () => (
    <Stage label="Break · beige · pastry-green primary">
      <SessionSheetFragment {...sessionSheetMocks.onBreak} />
    </Stage>
  ),
}

export const BreakNearlyOver = {
  name: 'Break — thirty seconds left',
  render: () => (
    <Stage label="Break · 00:30 remaining">
      <SessionSheetFragment {...sessionSheetMocks.breakNearlyOver} />
    </Stage>
  ),
}

export const BreakInline = {
  name: 'Break — desktop column',
  render: () => (
    <Stage label="Break · inline" width={640}>
      <SessionSheetFragment {...sessionSheetMocks.breakInline} />
    </Stage>
  ),
}

// -- The fixed-slot contract ------------------------------------------------

export const PhaseSlotGrid = {
  name: 'Fixed slots — all five phases side by side',
  render: () => (
    <Row>
      {(
        [
          ['Ready', sessionSheetMocks.ready],
          ['Running', sessionSheetMocks.running],
          ['Paused', sessionSheetMocks.paused],
          ['Concluded', sessionSheetMocks.concludedWithBreak],
          ['Break', sessionSheetMocks.onBreak],
        ] as const
      ).map(([label, props]) => (
        <Stage key={label} label={label} width={300}>
          <SessionSheetFragment {...props} />
        </Stage>
      ))}
    </Row>
  ),
}

/**
 * The emoji picker, open.
 *
 * **Excluded from the Vitest story snapshots** — it mounts a Radix popper
 * panel, which costs 5–12 seconds per mount under jsdom (measured in
 * `design/system/primitives/__tests__/radixEnvironment.tsx`, where it turned
 * `make test` red). The design system excludes its own popper panels for the
 * same reason, and the trigger's contract is asserted closed instead. This
 * story is where the open panel is judged.
 */
export const EmojiPickerOpen = {
  name: 'Symbol picker open (not snapshotted — Radix popper)',
  render: () => (
    <Stage label="Ready · picking a glyph replaces it in the title">
      <SessionSheetFragment
        {...sessionSheetMocks.ready}
        presentation={SessionSurfacePresentation.sheet}
        isEditingSymbol
      />
    </Stage>
  ),
}
