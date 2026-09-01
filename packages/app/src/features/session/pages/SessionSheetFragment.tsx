'use client'

/**
 * The session sheet's content — the port of `KroUI/Session/SessionSetupView.swift`
 * (`zheref/KroApple@2117efc`, `origin/main` at build time).
 *
 * A pure Fragment (`RC-15`): it reads no store, dispatches nothing, and takes
 * every value and every intent as a prop. That is what lets all five phases be
 * rendered side by side in a story and snapshotted without a `Provider`.
 *
 * ==========================================================================
 * THE FIXED-SLOT CONTRACT — acceptance criterion 1
 * ==========================================================================
 *
 * *"Phase transitions never move surviving elements."* Canon makes that true
 * with two devices, and both are ported literally:
 *
 * 1. **Every region declares its height** — identity 148, dial 212, status 28,
 *    the deck's lead row 38, suggestions 90, the primary action 80. They live in
 *    `SESSION_SLOT_HEIGHT`, next to the canon `.frame(height:)` each came from.
 * 2. **All four phase decks are always mounted, stacked in one cell.** Canon
 *    uses a `ZStack` + `stableControlSlot` (`opacity 0`, `allowsHitTesting`,
 *    `accessibilityHidden`); the web uses a one-cell CSS grid where every deck
 *    occupies `grid-area: 1 / 1` and the inactive ones carry `opacity: 0`,
 *    `pointer-events: none`, `inert` and `aria-hidden`.
 *
 * The consequence is the property the criterion asks for: the deck's height is
 * the *tallest* deck at all times, so switching phase cannot resize it, and the
 * identity, dial and status regions above it cannot move. `__tests__/`
 * asserts it per phase pair by comparing the rendered slot geometry rather than
 * by eye.
 *
 * `inert` **and** `aria-hidden` together, not either alone: `inert` is what
 * removes a hidden deck from the tab order (`opacity: 0` does not), and
 * `aria-hidden` is what removes it from the accessibility tree that Testing
 * Library and screen readers actually read. Canon's `accessibilityHidden(true)`
 * means both.
 *
 * ==========================================================================
 * THE FORCED DARK SCHEME
 * ==========================================================================
 *
 * `SessionSetupScreen` forces `colorScheme: .dark` on both hosts — it can,
 * because every string in this view is hardcoded white. The web equivalent is
 * `data-theme="dark"` on the root, which is exactly what the token layer's
 * `[data-theme]` overrides exist for. So the sheet reads the same in a light
 * app and a dark one **by design**; the pill and the shell behind it still
 * adapt. Every `.white.opacity(x)` below becomes `fore` at `x`%, which under
 * that forced theme is the same colour canon draws.
 *
 * ==========================================================================
 * SF SYMBOL -> LUCIDE, for this surface
 * ==========================================================================
 *
 * | canon                          | here               |
 * |--------------------------------|--------------------|
 * | `xmark`                        | `X`                |
 * | `timer`                        | `Timer`            |
 * | `stopwatch`                    | `Watch`            |
 * | `play.fill`                    | `Play`             |
 * | `pause.fill`                   | `Pause`            |
 * | `stop.fill`                    | `Square`           |
 * | `checkmark.circle.fill`        | `CircleCheckBig`   |
 * | `arrow.clockwise`              | `RotateCw`         |
 * | `arrow.clockwise.circle.fill`  | `RotateCw`         |
 * | `cup.and.saucer.fill`          | `Coffee`           |
 * | `wind`                         | `Wind`             |
 * | `arrow.right.circle`           | `CircleArrowRight` |
 * | `bolt.fill`                    | `Zap`              |
 *
 * Six of those are not in `SF_SYMBOL_TO_LUCIDE` yet. Adding rows there is the
 * design system's lane (`#6`), so they are imported directly here — the same
 * choice `MainShellFragment` makes — and the table above is the record. lucide
 * ships no stopwatch and no filled-circle rotate; `Watch` and `RotateCw` are the
 * nearest, and the button's own fill already carries what the `.fill` suffix
 * meant.
 */
import {
  CircleArrowRight,
  CircleCheckBig,
  Coffee,
  Pause,
  Play,
  RotateCw,
  Square,
  Timer,
  Watch,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { DurationDial } from '../../../design/chrome/dial/DurationDial'
import { EmojiPickerPopover } from '../../../design/chrome/emoji/EmojiPickerPopover'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { FocusTimerMode, type TimeIntervalSeconds } from '@kro/core'
import { formatSessionClock } from '../SessionSelectors'
import { SessionPhase } from '../SessionVocabulary'
import {
  SESSION_SLOT_HEIGHT,
  type SessionSuggestion,
  type SessionSurfacePresentation,
  areSessionSuggestionsInteractive,
  formatSessionDurationShort,
  sessionDialState,
  sessionDismissalHint,
  sessionSuggestionsHeading,
} from './sessionSheetModel'

/** Canon's `.white.opacity(x)` under the forced dark scheme. */
const foreAt = (percent: number): string =>
  `color-mix(in srgb, ${colorVar('fore')} ${percent}%, transparent)`

/**
 * The label colour on a saturated fill — and a **named divergence from canon**.
 *
 * Canon draws every one of the three filled buttons (`completeBlue`,
 * `Color.green`, `PastryGreen`) with `.foregroundStyle(.white)`. Measured
 * against this palette under the forced dark scheme those pairs are 3.65:1,
 * 1.92:1 and 2.27:1 — the last two fail even SC 1.4.11's 3:1 non-text bar, and
 * none reaches the epic's own ≥4.5:1 acceptance criterion (AC 9). The design
 * system said as much in advance: `contrastContracts.ts` lists `focusGreen` and
 * `pastryGreen` as *unmeasured* precisely because "the sheet reads its numbers
 * from text roles" and "its label is a chip role" — i.e. nobody had yet put a
 * label directly on them.
 *
 * `absolute` is black under the dark scheme this surface forces, which measures
 * 5.76:1 / 10.9:1 / 10.3:1 on the same three fills. `__tests__/` asserts all
 * three against `tokens.css` itself, so the claim is checked rather than
 * asserted. Adding the matching rows to `contrastContracts.ts` is the design
 * system's lane (`#6`) and is reported as a cross-lane need.
 */
const ON_SATURATED_FILL = colorVar('absolute')

export interface SessionSheetFragmentProps {
  readonly phase: SessionPhase
  readonly presentation: SessionSurfacePresentation
  /** The glyph above the title. Canon's `endeavor.symbol`. */
  readonly symbol: string
  readonly title: string
  /** Canon's `statusLabelSelector` — READY / FOCUSED / PAUSED / COMPLETED / BREAK. */
  readonly statusLabel: string
  readonly mode: FocusTimerMode
  readonly targetDuration: TimeIntervalSeconds
  readonly elapsedDuration: TimeIntervalSeconds
  readonly remainingDuration: TimeIntervalSeconds
  /** Canon's `availablePresets`, in minutes. */
  readonly presets: readonly number[]
  /** Reserved slot — empty in the shipped build; see the note at the region. */
  readonly suggestions: readonly SessionSuggestion[]
  /** Canon's `isSessionRunningSelector` — running, paused or on a break. */
  readonly isSessionInFlight: boolean
  readonly isEditingTitle: boolean
  readonly editedTitle: string
  readonly isEditingSymbol: boolean
  /** `selectTomatoRow` — the capped glyph count and the `× N` overflow. */
  readonly tomatoGlyphs: number
  readonly tomatoOverflowLabel: string | null
  /** The uncapped count, for the row's accessibility label. Canon's own. */
  readonly completedSessionsCount: number
  readonly isStopwatchAvailable: boolean
  readonly areBreaksAvailable: boolean

  /** Omit to render the reserved 36px space instead — the `/execute` column. */
  readonly onTapClose?: () => void
  readonly onTapEditTitle: () => void
  readonly onChangeTitle: (title: string) => void
  readonly onConfirmTitleEdit: () => void
  readonly onCancelTitleEdit: () => void
  readonly onTapSymbol: () => void
  readonly onPickSymbol: (symbol: string) => void
  readonly onDismissSymbolPicker: () => void
  readonly onSelectMode: (mode: FocusTimerMode) => void
  readonly onAdjustDuration: (seconds: TimeIntervalSeconds) => void
  readonly onSelectSuggestion: (suggestion: SessionSuggestion) => void
  readonly onTapPlay: () => void
  readonly onTapPause: () => void
  readonly onTapResume: () => void
  readonly onTapFinishEarly: () => void
  readonly onTapAbort: () => void
  readonly onTapComplete: () => void
  readonly onTapStartNew: () => void
  readonly onTapBreak: () => void
  readonly onTapEndBreak: () => void

  readonly className?: string
  readonly style?: CSSProperties
}

export function SessionSheetFragment(props: SessionSheetFragmentProps) {
  const {
    phase,
    presentation,
    statusLabel,
    mode,
    targetDuration,
    elapsedDuration,
    remainingDuration,
    className,
    style,
  } = props

  const isCountdown = mode === FocusTimerMode.countdown
  const dial = sessionDialState({
    phase,
    isCountdown,
    targetDuration,
    elapsedDuration,
    remainingDuration,
  })

  return (
    <div
      // Canon forces the dark scheme on this surface — see the header.
      data-theme="dark"
      data-kro-session-sheet={phase}
      data-kro-session-presentation={presentation}
      className={cn('flex w-full flex-col text-kro-fore', className)}
      style={style}
    >
      <SessionHeader {...props} />
      <SessionIdentityArea {...props} />

      <div
        data-kro-session-slot="dial"
        className="flex items-center justify-center"
        style={{ height: SESSION_SLOT_HEIGHT.dial }}
      >
        <DurationDial
          seconds={dial.seconds}
          readOnly={!dial.isEditable}
          onChange={props.onAdjustDuration}
          // Canon keeps the preset pills OUT of `dialArea` — they live in the
          // ready deck, below the status label. The kit's dial bundles them, so
          // they are switched off here and rendered where canon puts them.
          presets={[]}
          label={
            dial.isEditable ? 'Session duration' : 'Session time remaining'
          }
        />
      </div>

      <p
        data-kro-session-slot="status"
        className="m-0 flex items-center justify-center font-semibold text-xs"
        style={{
          height: SESSION_SLOT_HEIGHT.status,
          letterSpacing: 2,
          color: foreAt(50),
        }}
      >
        {statusLabel}
      </p>

      <SessionControlsDeck {...props} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header — canon's `headerArea`
// ---------------------------------------------------------------------------

function SessionHeader({
  isSessionInFlight,
  isStopwatchAvailable,
  mode,
  onSelectMode,
  onTapClose,
}: SessionSheetFragmentProps) {
  return (
    <div
      data-kro-session-slot="header"
      className="flex items-center justify-between px-kro-medium pt-kro-medium"
    >
      {onTapClose ? (
        <button
          type="button"
          onClick={onTapClose}
          data-kro-session-close=""
          // Canon's own two labels: a close that leaves the session running has
          // to say so, or it reads as "stop".
          aria-label={
            isSessionInFlight
              ? 'Close session sheet (session keeps running)'
              : 'Close'
          }
          className="inline-flex items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{
            width: SESSION_SLOT_HEIGHT.headerControl,
            height: SESSION_SLOT_HEIGHT.headerControl,
            background: foreAt(15),
          }}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <SessionHeaderSpacer />
      )}

      <div
        data-kro-session-mode-toggle=""
        role="group"
        aria-label="Session mode"
        className="inline-flex rounded-kro-pill"
        style={{
          maxWidth: 260,
          background: foreAt(10),
          // Canon: dimmed and non-interactive once the session is live —
          // changing the mode mid-session would move the finish line.
          opacity: isSessionInFlight ? 0.5 : 1,
          pointerEvents: isSessionInFlight ? 'none' : 'auto',
        }}
      >
        <SessionModeButton
          label="Pomodoro"
          icon={<Timer aria-hidden="true" className="size-3" />}
          isSelected={mode === FocusTimerMode.countdown}
          onSelect={() => onSelectMode(FocusTimerMode.countdown)}
        />
        {/*
          Canon gates the Stopwatch button on the `sessionStopwatch` flag AND
          the `session.enableStopwatch` preference. Both are resolved upstream
          into `isStopwatchAvailable`; at `statusQuo` the flag is off, so the
          shipped toggle offers Pomodoro alone — the honest absence, not a
          disabled control that implies it could be turned on here.
        */}
        {isStopwatchAvailable ? (
          <SessionModeButton
            label="Stopwatch"
            icon={<Watch aria-hidden="true" className="size-3" />}
            isSelected={mode === FocusTimerMode.stopwatch}
            onSelect={() => onSelectMode(FocusTimerMode.stopwatch)}
          />
        ) : null}
      </div>

      {/* Canon's trailing `Color.clear.frame(width: 36, height: 36)` — what
          keeps the mode toggle optically centred against the close button. */}
      <SessionHeaderSpacer />
    </div>
  )
}

function SessionHeaderSpacer() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: SESSION_SLOT_HEIGHT.headerControl,
        height: SESSION_SLOT_HEIGHT.headerControl,
      }}
    />
  )
}

function SessionModeButton({
  label,
  icon,
  isSelected,
  onSelect,
}: {
  readonly label: string
  readonly icon: ReactNode
  readonly isSelected: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      data-kro-session-mode={isSelected ? 'selected' : 'available'}
      className="inline-flex items-center gap-1 rounded-kro-pill font-medium text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        padding: '8px 16px',
        minHeight: 'var(--kro-size-min-pointer-target)',
        color: colorVar('fore'),
        background: isSelected ? foreAt(20) : 'transparent',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Identity — canon's `taskIdentityArea`
// ---------------------------------------------------------------------------

function SessionIdentityArea(props: SessionSheetFragmentProps) {
  const {
    phase,
    symbol,
    title,
    isEditingTitle,
    editedTitle,
    isEditingSymbol,
    tomatoGlyphs,
    tomatoOverflowLabel,
    completedSessionsCount,
    onTapEditTitle,
    onChangeTitle,
    onConfirmTitleEdit,
    onCancelTitleEdit,
    onTapSymbol,
    onPickSymbol,
    onDismissSymbolPicker,
  } = props

  const isBreak = phase === SessionPhase.break

  return (
    <div
      data-kro-session-slot="identity"
      className="flex flex-col items-start gap-kro-small px-8 pt-kro-medium"
      style={{ height: SESSION_SLOT_HEIGHT.identity, alignItems: 'center' }}
    >
      {/*
        The glyph is the emoji picker's trigger — canon's `symbolView`, whose
        popover is anchored to it. Disabled on a break: the title is replaced by
        the "On a break?" copy and there is no endeavor symbol to re-glyph.
      */}
      <EmojiPickerPopover
        selection={symbol}
        open={isEditingSymbol}
        onOpenChange={(open) =>
          open ? onTapSymbol() : onDismissSymbolPicker()
        }
        onPick={onPickSymbol}
      >
        <button
          type="button"
          disabled={isBreak}
          data-kro-session-symbol=""
          aria-label="Change session symbol"
          title="Opens an emoji picker"
          className="inline-flex items-center justify-center rounded-kro-small outline-none focus-visible:shadow-[var(--kro-ring)] disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]"
          style={{ minWidth: 56, minHeight: 56, fontSize: 48, lineHeight: 1 }}
        >
          {symbol}
        </button>
      </EmojiPickerPopover>

      {isBreak ? (
        <p
          data-kro-session-break-copy=""
          className="m-0 whitespace-pre-line text-center font-bold text-2xl"
        >
          {'On a break?\nReady?'}
        </p>
      ) : (
        <>
          {isEditingTitle ? (
            <input
              // Canon's `TextField("Session Title", …)` — return commits,
              // tapping outside commits, Escape reverts.
              // biome-ignore lint/a11y/noAutofocus: the field REPLACES the title the user just tapped; landing focus anywhere else loses the edit they explicitly started
              autoFocus
              data-kro-session-title-field=""
              aria-label="Session title"
              placeholder="Session Title"
              value={editedTitle}
              onChange={(event) => onChangeTitle(event.target.value)}
              onBlur={onConfirmTitleEdit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onConfirmTitleEdit()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onCancelTitleEdit()
                }
              }}
              className="text-center font-bold text-2xl outline-none focus-visible:shadow-[var(--kro-ring)]"
              style={{
                maxWidth: 280,
                width: '100%',
                padding: '8px 12px',
                color: colorVar('fore'),
                background: foreAt(15),
                borderRadius: radiusVar('small'),
                border: 'none',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onTapEditTitle}
              data-kro-session-title=""
              aria-label={title}
              title="Edit session title"
              className="line-clamp-2 text-center font-bold text-2xl outline-none focus-visible:shadow-[var(--kro-ring)]"
              style={{ maxWidth: 280, color: colorVar('fore') }}
            >
              {title}
            </button>
          )}

          {/*
            The tomato row. Hidden at zero, capped at ten glyphs with a numeric
            `× N` beyond that — `selectTomatoRow` already decided both numbers,
            so the markup only draws them.
          */}
          {tomatoGlyphs > 0 ? (
            <p
              data-kro-session-tomatoes=""
              className="m-0 flex items-center pt-1"
              style={{ gap: 2 }}
              // The row IS one graphic: every glyph inside is `aria-hidden`,
              // so the count only reaches assistive technology through this
              // name — and a `<p>`'s name is ignored without a role that
              // supports one.
              role="img"
              aria-label={`${completedSessionsCount} completed sessions`}
            >
              {Array.from({ length: tomatoGlyphs }, (_, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: the glyphs are identical and positional; there is no id to key on
                  key={index}
                  aria-hidden="true"
                  style={{ fontSize: 16, lineHeight: 1 }}
                >
                  🍅
                </span>
              ))}
              {tomatoOverflowLabel ? (
                <span
                  aria-hidden="true"
                  data-kro-session-tomato-overflow=""
                  className="pl-1 font-semibold text-xs"
                  style={{ color: foreAt(70) }}
                >
                  {tomatoOverflowLabel}
                </span>
              ) : null}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The controls deck — canon's `controlsDeck` + `stableControlSlot`
// ---------------------------------------------------------------------------

function SessionControlsDeck(props: SessionSheetFragmentProps) {
  const { phase } = props
  return (
    <div
      data-kro-session-slot="deck"
      className="grid w-full pt-kro-medium"
      // `minmax(0, 1fr)`, never a bare `1fr`. A bare `1fr` is
      // `minmax(auto, 1fr)`, so the column's MINIMUM is the widest child's
      // max-content — and every deck shares this one cell, including the one
      // holding a horizontally-scrolling preset row. Measured on a 390px
      // viewport: the decks came out 465px wide inside a 360px panel and every
      // phase's copy sat off-centre. The `0` minimum is what lets the
      // `overflow-x-auto` rows actually scroll instead of pushing the column.
      style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
    >
      <StableControlSlot name="ready" isVisible={phase === SessionPhase.ready}>
        <ReadyControls {...props} />
      </StableControlSlot>
      <StableControlSlot
        name="focused"
        isVisible={
          phase === SessionPhase.running || phase === SessionPhase.paused
        }
      >
        <FocusedControls {...props} />
      </StableControlSlot>
      <StableControlSlot
        name="concluded"
        isVisible={phase === SessionPhase.concluded}
      >
        <ConcludedControls {...props} />
      </StableControlSlot>
      <StableControlSlot name="break" isVisible={phase === SessionPhase.break}>
        <BreakControls {...props} />
      </StableControlSlot>
    </div>
  )
}

/**
 * Canon's `stableControlSlot`. Every deck keeps its space; only one is visible,
 * hit-testable and in the accessibility tree.
 */
function StableControlSlot({
  name,
  isVisible,
  children,
}: {
  readonly name: string
  readonly isVisible: boolean
  readonly children: ReactNode
}) {
  return (
    <div
      data-kro-session-deck={name}
      data-kro-session-deck-visible={isVisible ? 'true' : 'false'}
      inert={!isVisible}
      aria-hidden={isVisible ? undefined : true}
      className="flex min-w-0 flex-col items-center"
      style={{
        gridArea: '1 / 1',
        minWidth: 0,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ready — canon's `readyControls`
// ---------------------------------------------------------------------------

function ReadyControls(props: SessionSheetFragmentProps) {
  const { mode, presentation, presets, targetDuration, onAdjustDuration } =
    props
  const isCountdown = mode === FocusTimerMode.countdown

  return (
    <div
      className="flex w-full min-w-0 flex-col items-center"
      style={{ gap: 20 }}
    >
      <div
        data-kro-session-slot="deck-lead"
        data-kro-session-presets=""
        role="group"
        aria-label="Duration presets"
        inert={!isCountdown}
        aria-hidden={isCountdown ? undefined : true}
        className="flex w-full min-w-0 items-center justify-center overflow-x-auto px-kro-medium"
        style={{
          height: SESSION_SLOT_HEIGHT.deckLead,
          gap: 10,
          opacity: isCountdown ? 1 : 0,
          pointerEvents: isCountdown ? 'auto' : 'none',
        }}
      >
        {presets.map((minutes) => {
          const isSelected = Math.round(targetDuration / 60) === minutes
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={isSelected}
              data-kro-session-preset={isSelected ? 'selected' : 'available'}
              onClick={() => onAdjustDuration(minutes * 60)}
              className="shrink-0 rounded-kro-pill text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
              style={{
                padding: '8px 16px',
                fontWeight: isSelected ? 700 : 500,
                color: colorVar('fore'),
                background: isSelected ? foreAt(25) : foreAt(10),
                border: `1px solid ${isSelected ? foreAt(50) : 'transparent'}`,
              }}
            >
              {`${minutes}m`}
            </button>
          )
        })}
      </div>

      <SessionSuggestionsArea {...props} />

      <div
        data-kro-session-slot="primary-action"
        className="flex items-end"
        style={{ height: SESSION_SLOT_HEIGHT.primaryAction }}
      >
        <CircleActionButton
          label="Start session"
          testAttribute="play"
          diameter={72}
          background={colorVar('focusGreen')}
          foreground={ON_SATURATED_FILL}
          onClick={props.onTapPlay}
        >
          <Play aria-hidden="true" className="size-7" fill="currentColor" />
        </CircleActionButton>
      </div>

      <div className="flex flex-col items-center gap-1 pb-6">
        <p className="m-0 text-sm" style={{ color: foreAt(60) }}>
          Tap to start
        </p>
        <p className="m-0 text-xs" style={{ color: foreAt(35) }}>
          {sessionDismissalHint(presentation)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Running / Paused — canon's `focusedControls`
// ---------------------------------------------------------------------------

function FocusedControls(props: SessionSheetFragmentProps) {
  const {
    phase,
    mode,
    elapsedDuration,
    remainingDuration,
    onTapPause,
    onTapResume,
  } = props
  const isRunning = phase === SessionPhase.running
  const clock = formatSessionClock(
    mode === FocusTimerMode.countdown ? remainingDuration : elapsedDuration,
  )

  return (
    <div
      className="flex w-full min-w-0 flex-col items-center"
      style={{ gap: 20 }}
    >
      <p
        data-kro-session-slot="deck-lead"
        data-kro-session-focused-clock=""
        className="m-0 flex items-center justify-center font-medium font-mono text-lg tabular-nums"
        style={{ height: SESSION_SLOT_HEIGHT.deckLead, color: foreAt(60) }}
      >
        {clock}
      </p>

      <SessionSuggestionsArea {...props} />

      <div
        data-kro-session-slot="primary-action"
        className="flex items-end justify-center"
        style={{ height: SESSION_SLOT_HEIGHT.primaryAction, gap: 24 }}
      >
        {isRunning ? (
          <CircleActionButton
            label="Pause session"
            testAttribute="pause"
            diameter={72}
            background={foreAt(15)}
            foreground={colorVar('fore')}
            onClick={onTapPause}
          >
            <Pause aria-hidden="true" className="size-7" fill="currentColor" />
          </CircleActionButton>
        ) : (
          <CircleActionButton
            label="Resume session"
            testAttribute="resume"
            diameter={72}
            background={colorVar('focusGreen')}
            foreground={ON_SATURATED_FILL}
            onClick={onTapResume}
          >
            <Play aria-hidden="true" className="size-7" fill="currentColor" />
          </CircleActionButton>
        )}

        <SessionStopMenu {...props} />
      </div>

      <p className="m-0 pb-6 text-sm" style={{ color: foreAt(50) }}>
        {isRunning ? 'Session in progress' : 'Paused'}
      </p>
    </div>
  )
}

/**
 * Canon's stop `Menu` — "Finish Early" and "Abort".
 *
 * A disclosure trigger over a labelled group of ordinary buttons, deliberately
 * **not** `role="menu"`: that role promises the ARIA menu interaction model
 * (arrow keys, roving tabindex, type-ahead) which this does not implement, and
 * announcing an interaction model that is not there is worse than announcing
 * none. `LiquidGlassFABMenu` makes the same call for the same reason, and this
 * follows it so the two menus in the bottom chrome behave alike.
 *
 * `inert` while closed is what keeps the two actions out of the tab order —
 * the thing `opacity: 0` alone does not do.
 */
function SessionStopMenu({
  onTapFinishEarly,
  onTapAbort,
}: SessionSheetFragmentProps) {
  const [isOpen, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || !isOpen) return
      event.stopPropagation()
      close()
    },
    [close, isOpen],
  )

  return (
    <div className="relative flex items-end" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Stop session"
        aria-expanded={isOpen}
        aria-controls={menuId}
        data-kro-session-stop=""
        onClick={() => setOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--kro-ring)]"
        style={{ width: 56, height: 56, background: foreAt(15) }}
      >
        <Square aria-hidden="true" className="size-5" fill="currentColor" />
      </button>

      <div
        id={menuId}
        role="group"
        aria-label="Stop session"
        inert={!isOpen}
        aria-hidden={isOpen ? undefined : true}
        data-kro-session-stop-menu={isOpen ? 'open' : 'closed'}
        className="kro-glass absolute bottom-[64px] left-1/2 z-10 flex w-40 -translate-x-1/2 flex-col rounded-kro-card p-1"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <StopMenuItem
          label="Finish Early"
          onSelect={() => {
            close()
            onTapFinishEarly()
          }}
        />
        <StopMenuItem
          label="Abort"
          isDestructive
          onSelect={() => {
            close()
            onTapAbort()
          }}
        />
      </div>
    </div>
  )
}

function StopMenuItem({
  label,
  isDestructive = false,
  onSelect,
}: {
  readonly label: string
  readonly isDestructive?: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-kro-small px-kro-small text-left text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        minHeight: 'var(--kro-size-min-pointer-target)',
        color: isDestructive ? colorVar('kroRed') : colorVar('fore'),
      }}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Concluded — canon's `concludedControls`
// ---------------------------------------------------------------------------

function ConcludedControls({
  elapsedDuration,
  areBreaksAvailable,
  onTapComplete,
  onTapStartNew,
  onTapBreak,
}: SessionSheetFragmentProps) {
  return (
    <div
      className="flex w-full min-w-0 flex-col items-center"
      style={{ gap: 24 }}
    >
      <p className="m-0 font-semibold text-xl">Session Completed!</p>

      <p
        data-kro-session-concluded-total=""
        className="m-0 font-medium font-mono text-base tabular-nums"
        style={{ color: foreAt(60) }}
      >
        {`${formatSessionClock(elapsedDuration)} focused`}
      </p>

      <div
        className="flex w-full flex-col px-kro-medium"
        style={{ gap: 12 }}
        data-kro-session-conclusion-actions=""
      >
        {/*
          Complete Task is the primary action and wears `completeBlue` — the
          same palette token every mark-complete affordance in the product
          uses, including the endeavor cards and the pill's own checkmark.
        */}
        <button
          type="button"
          onClick={onTapComplete}
          data-kro-session-action="complete"
          className="flex w-full items-center justify-center gap-2 rounded-kro-surface font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{
            height: 56,
            color: ON_SATURATED_FILL,
            background: colorVar('completeBlue'),
            boxShadow: `0 4px 10px color-mix(in srgb, ${colorVar('completeBlue')} 40%, transparent)`,
          }}
        >
          <CircleCheckBig aria-hidden="true" className="size-5" />
          Complete Task
        </button>

        <div className="flex w-full" style={{ gap: 12 }}>
          {/* Start New — the vivid green that reads as "do another rep". */}
          <button
            type="button"
            onClick={onTapStartNew}
            data-kro-session-action="start-new"
            className="flex flex-1 items-center justify-center gap-2 rounded-kro-card font-medium text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{
              height: 48,
              color: ON_SATURATED_FILL,
              background: colorVar('focusGreen'),
              boxShadow: `0 3px 8px color-mix(in srgb, ${colorVar('focusGreen')} 35%, transparent)`,
            }}
          >
            <RotateCw aria-hidden="true" className="size-4" />
            Start New
          </button>

          {/*
            Break keeps a neutral translucent fill so it never competes with
            Start New — and it is offered only when the `sessionBreak` flag AND
            the `session.enableBreaks` preference both allow it. At `statusQuo`
            the flag is off, so the shipped conclusion screen shows two buttons.
          */}
          {areBreaksAvailable ? (
            <button
              type="button"
              onClick={onTapBreak}
              data-kro-session-action="break"
              className="flex flex-1 items-center justify-center gap-2 rounded-kro-card font-medium text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
              style={{
                height: 48,
                color: colorVar('fore'),
                background: foreAt(15),
              }}
            >
              <Coffee aria-hidden="true" className="size-4" />
              Break
            </button>
          ) : null}
        </div>
      </div>

      <p className="m-0 pb-6 text-xs" style={{ color: foreAt(40) }}>
        What would you like to do next?
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Break — canon's `breakControls`
// ---------------------------------------------------------------------------

function BreakControls({
  remainingDuration,
  onTapEndBreak,
}: SessionSheetFragmentProps) {
  return (
    <div
      className="flex w-full min-w-0 flex-col items-center"
      style={{ gap: 24 }}
    >
      <p className="m-0 font-semibold text-xl">Break Time</p>

      <p
        data-kro-session-break-remaining=""
        className="m-0 font-medium font-mono text-base tabular-nums"
        style={{ color: foreAt(60) }}
      >
        {`${formatSessionClock(remainingDuration)} remaining`}
      </p>

      <div className="flex w-full flex-col px-kro-medium" style={{ gap: 12 }}>
        <button
          type="button"
          onClick={onTapEndBreak}
          data-kro-session-action="end-break"
          className="flex w-full items-center justify-center gap-2 rounded-kro-surface font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{
            height: 56,
            // Pastry green — canon's `Color("PastryGreen")`, a real palette
            // role here rather than an asset-catalogue name.
            color: ON_SATURATED_FILL,
            background: colorVar('pastryGreen'),
            boxShadow: `0 4px 10px color-mix(in srgb, ${colorVar('pastryGreen')} 40%, transparent)`,
          }}
        >
          <RotateCw aria-hidden="true" className="size-5" />
          Start Focus Session
        </button>
      </div>

      <p className="m-0 pb-6 text-xs" style={{ color: foreAt(40) }}>
        Tap to end break and continue working
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggestions — canon's `taskSuggestionsArea`
// ---------------------------------------------------------------------------

/**
 * The reserved suggestion region.
 *
 * **The slot is always there; the content is not.** `#21`'s session slice
 * carries no suggestions — sourcing them means reading the endeavor tier's
 * scoring, which is another child's lane — so the shipped surface renders this
 * region empty, exactly as canon does when `parallelTasks` is empty: reserved
 * height, `opacity: 0`, out of the tab order and out of the accessibility tree.
 * That is what keeps the fixed-slot contract true the day the suggestions
 * arrive: nothing above or below this region moves when they do.
 *
 * The stories fill it, so the populated layout is real evidence rather than a
 * promise.
 */
function SessionSuggestionsArea({
  phase,
  suggestions,
  onSelectSuggestion,
}: SessionSheetFragmentProps) {
  const isEmpty = suggestions.length === 0
  const isInteractive = areSessionSuggestionsInteractive(phase)
  const isSingle = suggestions.length === 1

  return (
    <section
      data-kro-session-slot="suggestions"
      data-kro-session-suggestions={isEmpty ? 'empty' : 'populated'}
      aria-label={sessionSuggestionsHeading(phase)}
      inert={isEmpty}
      aria-hidden={isEmpty ? true : undefined}
      className="flex w-full min-w-0 flex-col justify-start gap-3 overflow-hidden"
      style={{
        height: SESSION_SLOT_HEIGHT.suggestions,
        opacity: isEmpty ? 0 : 1,
        pointerEvents: isEmpty ? 'none' : 'auto',
      }}
    >
      <p
        className="m-0 flex items-center gap-1.5 px-kro-medium font-semibold text-xs"
        style={{ letterSpacing: 1, color: foreAt(50) }}
      >
        {phase === SessionPhase.ready ? (
          <Wind aria-hidden="true" className="size-3" />
        ) : (
          <CircleArrowRight aria-hidden="true" className="size-3" />
        )}
        {sessionSuggestionsHeading(phase)}
      </p>

      {/* Canon centres a lone suggestion and scrolls a row of several. */}
      <div
        className={cn(
          'flex px-kro-medium',
          isSingle ? 'justify-center' : 'overflow-x-auto',
        )}
        style={{ gap: 10 }}
      >
        {suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            isInteractive={isInteractive}
            onSelect={onSelectSuggestion}
          />
        ))}
      </div>
    </section>
  )
}

function SuggestionItem({
  suggestion,
  isInteractive,
  onSelect,
}: {
  readonly suggestion: SessionSuggestion
  readonly isInteractive: boolean
  readonly onSelect: (suggestion: SessionSuggestion) => void
}) {
  const card = (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
        {suggestion.symbol}
      </span>
      <span className="flex flex-col items-start gap-0.5">
        <span className="max-w-40 truncate font-medium text-sm">
          {suggestion.title}
        </span>
        {suggestion.duration !== null || suggestion.rewardPoints > 0 ? (
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: foreAt(60) }}
          >
            {suggestion.duration !== null ? (
              <span>{formatSessionDurationShort(suggestion.duration)}</span>
            ) : null}
            {suggestion.duration !== null && suggestion.rewardPoints > 0 ? (
              <span aria-hidden="true">•</span>
            ) : null}
            {suggestion.rewardPoints > 0 ? (
              <span className="flex items-center gap-0.5">
                <Zap aria-hidden="true" className="size-3" />
                {suggestion.rewardPoints}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </span>
  )

  const boxStyle: CSSProperties = {
    padding: '10px 14px',
    background: foreAt(10),
    color: colorVar('fore'),
  }

  return isInteractive ? (
    <button
      type="button"
      data-kro-session-suggestion={suggestion.id}
      onClick={() => onSelect(suggestion)}
      className="shrink-0 rounded-kro-card outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={boxStyle}
    >
      {card}
    </button>
  ) : (
    <span
      data-kro-session-suggestion={suggestion.id}
      className="shrink-0 rounded-kro-card"
      style={boxStyle}
    >
      {card}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function CircleActionButton({
  label,
  testAttribute,
  diameter,
  background,
  foreground,
  onClick,
  children,
}: {
  readonly label: string
  readonly testAttribute: string
  readonly diameter: number
  readonly background: string
  readonly foreground: string
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-kro-session-action={testAttribute}
      className="inline-flex items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        width: diameter,
        height: diameter,
        background,
        color: foreground,
        boxShadow: `0 4px 10px color-mix(in srgb, ${background} 40%, transparent)`,
      }}
    >
      {children}
    </button>
  )
}
