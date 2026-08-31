'use client'

/**
 * The Session Pill — the port of
 * `KroUI/Fragments/SessionPill/SessionPillView.swift` plus the placement
 * `Kro/Application/Main/MainScreen.swift`'s `sessionPillOverlay` gives it
 * (`zheref/KroApple@2117efc`).
 *
 * A pure Fragment (`RC-15`): it reads no store and dispatches nothing. Its
 * whole surface arrives as one value — `selectSessionPillState`, which `#21`
 * built for exactly this so the pill cannot render a combination the phase
 * machine could not produce (running with a mark-complete button, say).
 *
 * ==========================================================================
 * GEOMETRY — every number is derived, none is typed here
 * ==========================================================================
 *
 * Canon anchors the pill to the bottom-trailing corner *beside* the FAB:
 * leading inset `pillLeadingPadding` (20), trailing inset
 * `fabTrailingPadding + fabDiameter + pillToastSpacing` (which the chrome kit
 * already exports as `pillTrailingPadding()`), bottom inset
 * `pillBottomPadding` (61 — one point above the FAB's own, because the glass
 * reads optically lower at identical paddings), height `pillHeight` (62, the
 * FAB's diameter, so the two share a baseline). All of it comes from
 * `CHROME_LAYOUT` via `SESSION_PILL_BOX`; the kit's own header says why a
 * literal here would drift.
 *
 * ==========================================================================
 * THE CROSS-FADE, AND WHY IT IS A PROP RATHER THAN A CONDITIONAL MOUNT
 * ==========================================================================
 *
 * `MainScreen` keeps the overlay **always in the layout** and animates
 * `.opacity(isSessionPillVisible ? 1 : 0)` over `.easeInOut(duration: 0.22)`,
 * *"so the overlay can crossfade rather than pop"* — its own words. The same
 * 0.22s ease is already in the chrome kit as `TOAST_LIFT` (canon uses one ease
 * for both), so it is read from there rather than retyped.
 *
 * Visibility has two inputs and canon ANDs them:
 * `runningSession != nil && sessionSetup == nil` — the pill is on screen when a
 * session exists **and** the full surface is not presented. `isVisible` here is
 * that conjunction, decided by the Page.
 *
 * ==========================================================================
 * THE TINT
 * ==========================================================================
 *
 * `docs/Features/Session.md` § Visual contract: vivid while something is
 * advancing (green focus, beige break), and **no custom tint at all** while
 * paused or concluded, so the pill *"blends with the chrome rather than imposing
 * a colour while nothing is advancing"*. `sessionPillTint` returns `null` for
 * that case and the glass is left alone — the port of "inherits the system
 * Liquid Glass appearance".
 *
 * ==========================================================================
 * THE TRAILING BUTTON'S CONTRAST FLIP
 * ==========================================================================
 *
 * Canon flips the pause button's fill by colour scheme — a darker translucent
 * ink in light mode, a lighter one in dark — because the glass beneath it
 * follows the scheme. The web gets that free from the token layer: `total` is
 * black in light and white in dark, so one `color-mix` over `total` reproduces
 * both of canon's cases without a media query. The **resume** affordance stays
 * a solid green pill in both schemes, which canon calls *"a constant call to
 * action"*, and the concluded state's checkmark stays solid `completeBlue`.
 */
import { Check, Pause, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import { TOAST_LIFT } from '../../../design/chrome/layout/chromeMotion'
import { GlassSurface } from '../../../design/system/glass/GlassSurface'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { pillTrailingPadding } from '../../../design/chrome/layout/chromeLayout'
import type { SessionPillState } from '../SessionSelectors'
import { SessionPillAffordance } from '../SessionVocabulary'
import { SESSION_PILL_BOX, sessionPillTint } from './sessionSheetModel'

export interface SessionPillFragmentProps {
  /** `selectSessionPillState` — title, symbol, clock, tint and affordance. */
  readonly pill: SessionPillState
  /**
   * Canon's `runningSession != nil && sessionSetup == nil`. Separate from
   * `pill.isVisible` because the second half of that conjunction — whether the
   * full surface is up — is the shell's knowledge, not the slice's.
   */
  readonly isVisible: boolean
  /** Tap anywhere but the trailing button — reopens the session surface. */
  readonly onTapBody: () => void
  readonly onTapPause: () => void
  readonly onTapResume: () => void
  readonly onTapComplete: () => void
  /**
   * `fixed` pins the pill to the viewport, which is what the shell wants;
   * `absolute` pins it to the nearest positioned ancestor, which is what a
   * story and a test want so the pill can be shown inside a box. Same seam,
   * and the same reason, as `ActiveToastLayer`'s.
   */
  readonly position?: 'fixed' | 'absolute'
  readonly className?: string
  readonly style?: CSSProperties
}

export function SessionPillFragment({
  pill,
  isVisible,
  onTapBody,
  onTapPause,
  onTapResume,
  onTapComplete,
  position = 'fixed',
  className,
  style,
}: SessionPillFragmentProps) {
  const tint = sessionPillTint(pill.tint)

  return (
    <div
      data-kro-session-pill-layer=""
      data-kro-session-pill-visible={isVisible ? 'true' : 'false'}
      // Canon keeps the overlay in the layout and crossfades it, so this layer
      // is always mounted. `inert` + `aria-hidden` are what actually take it
      // out of reach while it is faded out.
      inert={!isVisible}
      aria-hidden={isVisible ? undefined : true}
      className={className}
      style={{
        position,
        // The layer spans from the leading inset to the trailing one; the pill
        // inside it HUGS ITS CONTENT and is pushed to the trailing edge, which
        // is what canon's `ZStack(alignment: .bottomTrailing)` does — the
        // leading padding is a cap on how far a long title may reach, never a
        // width. Stretching it instead produced a 1300px bar on desktop.
        left: SESSION_PILL_BOX.leading,
        right: pillTrailingPadding(),
        bottom: SESSION_PILL_BOX.bottom,
        display: 'flex',
        justifyContent: 'flex-end',
        opacity: isVisible ? 1 : 0,
        // NEVER on the layer: it is a full-width box with no paint, so a
        // pointer-transparent layer is the only thing that keeps the sidebar
        // and the tab bar underneath it clickable. `ActiveToastLayer` makes the
        // same split for the same reason.
        pointerEvents: 'none',
        transitionProperty: 'opacity',
        transitionDuration: `${TOAST_LIFT.ms}ms`,
        transitionTimingFunction: TOAST_LIFT.easing,
        ...style,
      }}
    >
      <GlassSurface
        material="surface"
        data-kro-session-pill={pill.tint}
        className="flex min-w-0 max-w-full items-center overflow-hidden"
        style={{
          height: SESSION_PILL_BOX.height,
          // Inline, not `rounded-kro-pill`: `.kro-glass` declares its own
          // `border-radius` **unlayered**, and an unlayered rule beats every
          // Tailwind utility whatever the specificity — so the class loses and
          // the capsule comes out at the 20px surface radius. Same cascade
          // defect the two portalled hosts hit; see `SESSION_GLASS_OVERRIDES`.
          borderRadius: 'var(--kro-radius-pill)',
          pointerEvents: isVisible ? 'auto' : 'none',
          // `null` means "no custom tint" — the pill takes the plain glass.
          ...(tint === null ? {} : { backgroundColor: tint }),
        }}
      >
        <button
          type="button"
          onClick={onTapBody}
          data-kro-session-pill-body=""
          aria-label={`${pill.title}, ${pill.clockLabel}`}
          title="Opens the session sheet"
          className="flex min-w-0 items-center gap-2.5 self-stretch pr-1.5 pl-4 text-left outline-none focus-visible:shadow-[var(--kro-ring)]"
        >
          {pill.symbol.length > 0 ? (
            <span
              aria-hidden="true"
              className="shrink-0 text-center"
              style={{ width: 26, fontSize: 20, lineHeight: 1 }}
            >
              {pill.symbol}
            </span>
          ) : null}

          {/* Canon's `Spacer(minLength: 8)` is the gap; the title is what
              shrinks when the pill runs out of room. */}
          <span className="min-w-0 truncate font-semibold text-kro-fore text-sm">
            {pill.title}
          </span>

          <span
            data-kro-session-pill-clock=""
            className="shrink-0 font-medium font-mono text-kro-fore text-sm tabular-nums"
          >
            {pill.clockLabel}
          </span>
        </button>

        <PillTrailingButton
          affordance={pill.affordance}
          onTapPause={onTapPause}
          onTapResume={onTapResume}
          onTapComplete={onTapComplete}
        />
      </GlassSurface>
    </div>
  )
}

/**
 * The single trailing affordance — pause, resume, or the blue checkmark.
 *
 * One button in three costumes rather than three buttons, because canon's
 * diagram (`docs/Features/Session.md` § Pill affordance per phase) is a state
 * machine over one control: `WithPause -> WithResume -> WithComplete -> Hidden`.
 * `sessionPillAffordanceForPhase` already decided which; this only draws it.
 */
function PillTrailingButton({
  affordance,
  onTapPause,
  onTapResume,
  onTapComplete,
}: {
  readonly affordance: SessionPillAffordance
  readonly onTapPause: () => void
  readonly onTapResume: () => void
  readonly onTapComplete: () => void
}) {
  if (affordance === SessionPillAffordance.none) return null

  const isComplete = affordance === SessionPillAffordance.markComplete
  const isResume = affordance === SessionPillAffordance.resume

  const label = isComplete
    ? 'Mark task complete'
    : isResume
      ? 'Resume session'
      : 'Pause session'

  const background = isComplete
    ? colorVar('completeBlue')
    : isResume
      ? colorVar('focusGreen')
      : // Canon's scheme flip, expressed once: `total` is black in light and
        // white in dark, so a single translucent wash over it is canon's
        // "darker fill in light, lighter fill in dark".
        `color-mix(in srgb, ${colorVar('total')} 32%, transparent)`

  // Black on `completeBlue`/`focusGreen` and white on the translucent wash —
  // the same measured pairing the sheet's filled buttons use. See
  // `SessionSheetFragment`'s `ON_SATURATED_FILL` note.
  const foreground =
    isComplete || isResume ? colorVar('absolute') : colorVar('fore')

  const onClick = isComplete
    ? onTapComplete
    : isResume
      ? onTapResume
      : onTapPause

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-kro-session-pill-affordance={affordance}
      className={cn(
        'mr-[7px] inline-flex shrink-0 items-center justify-center rounded-full',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        width: SESSION_PILL_BOX.toggleDiameter,
        height: SESSION_PILL_BOX.toggleDiameter,
        background,
        color: foreground,
        transitionProperty: 'background-color, color',
        transitionDuration: `${TOAST_LIFT.ms}ms`,
        transitionTimingFunction: TOAST_LIFT.easing,
      }}
    >
      {isComplete ? (
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      ) : isResume ? (
        <Play
          aria-hidden="true"
          className="size-3.5"
          fill="currentColor"
          // Canon's optical centring of the play glyph inside a circle.
          style={{ transform: 'translateX(1px)' }}
        />
      ) : (
        <Pause aria-hidden="true" className="size-3.5" fill="currentColor" />
      )}
    </button>
  )
}
