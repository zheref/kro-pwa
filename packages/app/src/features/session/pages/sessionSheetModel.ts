/**
 * The session surface's presentation vocabulary — every decision canon makes
 * inside `SessionSetupView.swift` that is a *pure function of the phase*, pulled
 * out of the renderer so it can be unit-tested without a DOM and so the sheet,
 * the pill and the `/execute` column cannot answer it three different ways.
 *
 * CANON PIN. `zheref/KroApple@2117efc` — `origin/main` at build time, re-fetched
 * per the epic's rule. The epic pins `@2c1ee45` and the chrome kit ported its
 * geometry at `@9d1e395`; the divergences that matter to this file are named in
 * the PR body and, where they change behaviour, at the declaration below.
 *
 * ## Nothing here reads state, a clock, or a store
 *
 * Every export is a total function of its arguments. That is what lets the
 * fixed-slot contract (`SESSION_SLOT_HEIGHT`) be asserted directly, rather than
 * inferred from a rendered tree, and it is why `RC-5`'s "no derived logic in a
 * component" has somewhere to go that is not a Selector — these are
 * presentation constants, not reads of `RootState`.
 */
import type { TimeIntervalSeconds } from '@kro/core'
import { CHROME_LAYOUT } from '../../../design/chrome/layout/chromeLayout'
import { colorVar } from '../../../design/system/tokens/roles'
import { SessionPhase, type SessionTint } from '../SessionVocabulary'

/**
 * How the session surface is hosted — canon's `SessionSetupPresentation`, plus
 * the one case the web adds.
 *
 * Canon (`@2117efc`) declares two: `.sheet` (the iPhone/iPad glass sheet) and
 * `.sidePanel` (the macOS page-owned glass panel opened over the current page).
 * The web has a third host canon has no equivalent for — the `/execute`
 * destination, which *is* a page rather than something layered over one — so
 * `inline` is named rather than smuggled in as "a side panel that happens not to
 * float". The three differ in exactly two observable ways: the container they
 * sit in, and the dismissal hint (`sessionDismissalHint`).
 */
export const SessionSurfacePresentation = {
  /** Canon `.sheet` — the handheld bottom sheet. */
  sheet: 'sheet',
  /** Canon `.sidePanel`, as a modal at the shell's pinned session frame. */
  modal: 'modal',
  /** Web-only: the `/execute` destination's own column. */
  inline: 'inline',
} as const

export type SessionSurfacePresentation =
  (typeof SessionSurfacePresentation)[keyof typeof SessionSurfacePresentation]

/**
 * Canon's `dismissalHint` — `"Swipe down to dismiss"` on iOS, `"Close to
 * dismiss"` on macOS.
 *
 * The branch is on the *host*, not the platform, which is what makes it port
 * cleanly: a bottom sheet is dismissed by dragging it down on any device, and a
 * panel or a page is not.
 */
export const sessionDismissalHint = (
  presentation: SessionSurfacePresentation,
): string =>
  presentation === SessionSurfacePresentation.sheet
    ? 'Swipe down to dismiss'
    : 'Close to dismiss'

/**
 * Which dial canon renders for a phase — `SessionSetupView.dialArea`, branch for
 * branch, with the *value* it shows.
 *
 * Only the `ready` countdown is editable; everything else is a read-out. The
 * stopwatch shows `0` before it starts and its elapsed total afterwards, a
 * break always shows its remaining time, and every other live phase shows the
 * countdown's remaining time.
 */
export interface SessionDialState {
  readonly seconds: TimeIntervalSeconds
  readonly isEditable: boolean
}

export const sessionDialState = (params: {
  readonly phase: SessionPhase
  readonly isCountdown: boolean
  readonly targetDuration: TimeIntervalSeconds
  readonly elapsedDuration: TimeIntervalSeconds
  readonly remainingDuration: TimeIntervalSeconds
}): SessionDialState => {
  const { phase, isCountdown, targetDuration, elapsedDuration, remainingDuration } =
    params
  if (phase === SessionPhase.break) {
    return { seconds: remainingDuration, isEditable: false }
  }
  if (!isCountdown) {
    return {
      seconds: phase === SessionPhase.ready ? 0 : elapsedDuration,
      isEditable: false,
    }
  }
  if (phase === SessionPhase.ready) {
    return { seconds: targetDuration, isEditable: true }
  }
  return { seconds: remainingDuration, isEditable: false }
}

/**
 * The suggestion region's heading — canon's two literals, and the rule that
 * picks between them (`docs/Features/Session.md` § Stable session layout:
 * *"Before focus begins, the suggestion region says 'Maybe do this in
 * parallel?'; during an active or paused focus session, that same region says
 * 'Maybe do this next?'"*).
 */
export const sessionSuggestionsHeading = (phase: SessionPhase): string =>
  phase === SessionPhase.ready
    ? 'MAYBE DO THIS IN PARALLEL?'
    : 'MAYBE DO THIS NEXT?'

/** Whether a suggestion may be tapped — canon's `isInteractive`, `ready` only. */
export const areSessionSuggestionsInteractive = (phase: SessionPhase): boolean =>
  phase === SessionPhase.ready

/**
 * One suggestion card, as the sheet renders it.
 *
 * A deliberately small shape rather than the full `EndeavorCardModel` canon
 * passes: the sheet reads four fields, and taking the whole card model would tie
 * this lane to the endeavor tier's shape for no gain. `#22`'s slice carries no
 * suggestions yet — see `SessionSheetFragment`'s note on the reserved slot.
 */
export interface SessionSuggestion {
  readonly id: string
  readonly symbol: string
  readonly title: string
  /** Seconds, or `null` when the endeavor has no duration. */
  readonly duration: TimeIntervalSeconds | null
  /** The reward bolt's number. `0` hides the bolt, as canon does. */
  readonly rewardPoints: number
}

/**
 * Canon's `formatDurationShort` — `1h 30m` / `2h` / `45m`.
 *
 * Truncating division, exactly as canon's `Int(interval) / 60` is, so a
 * 90-second suggestion reads `1m` on both platforms rather than `2m` here.
 */
export const formatSessionDurationShort = (
  seconds: TimeIntervalSeconds,
): string => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.trunc(seconds)) : 0
  const totalMinutes = Math.trunc(safe / 60)
  const hours = Math.trunc(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

/**
 * The tint the surface wears — canon's `SessionSetupScreen.tintForPhase` for the
 * sheet, and `SessionSetupView.detailTint` for the panel. The two are the same
 * hues at different strengths, so one function returns a CSS colour built from
 * the palette role rather than two functions returning two literals.
 *
 * `ready`/`concluded` deliberately have **no** hue: canon uses a fixed dark
 * wash there (`Color(red: 0.07, green: 0.07, blue: 0.11)` / `Color.indigo`),
 * which on the web is the sheet's own glass over the app background. Returning
 * `null` says "no tint" rather than inventing a colour the palette has no role
 * for.
 */
export const sessionSurfaceTint = (phase: SessionPhase): string | null => {
  switch (phase) {
    case SessionPhase.running:
      return `color-mix(in srgb, ${colorVar('focusGreen')} 50%, transparent)`
    case SessionPhase.break:
      return `color-mix(in srgb, ${colorVar('breakBeige')} 60%, transparent)`
    case SessionPhase.paused:
      return `color-mix(in srgb, ${colorVar('mist')} 40%, transparent)`
    default:
      return null
  }
}

/**
 * The pill's tint — `docs/Features/Session.md` § Visual contract, read off the
 * phase-tint vocabulary `#21` already derived (`SessionTint`).
 *
 * `chrome` returns `null`, which is the whole point of that case: the pill drops
 * its custom tint and inherits the system glass, *"so the pill blends with the
 * chrome rather than imposing a colour while nothing is advancing"*.
 */
export const sessionPillTint = (tint: SessionTint): string | null => {
  switch (tint) {
    case 'focus':
      return `color-mix(in srgb, ${colorVar('focusGreen')} 50%, transparent)`
    case 'break':
      return `color-mix(in srgb, ${colorVar('breakBeige')} 60%, transparent)`
    default:
      return null
  }
}

/**
 * The layout slots, in pixels — canon's own frame heights, which are what makes
 * acceptance criterion 1 (*"phase transitions never move surviving elements"*)
 * a property of the markup instead of a hope.
 *
 * Canon reserves each of these with an explicit `.frame(height:)` and overlays
 * the four phase decks in a `ZStack` whose inactive members keep their space
 * (`stableControlSlot`). The web does the same with a one-cell grid: every deck
 * occupies row 1 / column 1, so the deck's height is the tallest deck and no
 * phase change can resize it.
 */
export const SESSION_SLOT_HEIGHT = {
  /** `taskIdentityArea` — `.frame(height: 148, alignment: .top)`. */
  identity: 148,
  /** `dialArea` — `.frame(height: 212)`. */
  dial: 212,
  /** The status label — `.frame(height: 28)`. */
  status: 28,
  /** `presetPillsArea` / `focusedTimeArea` — `.frame(height: 38)`. */
  deckLead: 38,
  /** `taskSuggestionsArea` — `.frame(height: 90, alignment: .top)`. */
  suggestions: 90,
  /** `playButtonArea` and the focused controls row — `.frame(height: 80)`. */
  primaryAction: 80,
  /** The close button's disc — `.frame(width: 36, height: 36)`. */
  headerControl: 36,
} as const

/**
 * The session surface's own frame, taken from the shell's pinned constants
 * rather than restated — `MainPresentation.PRESENTATION_SIZE.session`
 * (`minWidth: 360, maxWidth: 640`).
 *
 * Re-exported through this module so a reader of the session lane finds the
 * number beside the surface that uses it, while the *declaration* stays in the
 * one place the shell already keeps it.
 */
export { PRESENTATION_SIZE as SESSION_PRESENTATION_SIZE } from '../../main/MainPresentation'

/**
 * The pill's box, derived from the chrome kit's canon geometry.
 *
 * `MainScreen.sessionPillOverlay` pads the pill by `pillLeadingPadding` on the
 * leading edge, `fabTrailingPadding + fabDiameter + pillToastSpacing` on the
 * trailing edge (which `pillTrailingPadding()` already computes) and
 * `pillBottomPadding` at the bottom, at `pillHeight` tall. Every number is read
 * from `CHROME_LAYOUT`, never typed here — the kit's header says exactly why.
 */
export const SESSION_PILL_BOX = {
  height: CHROME_LAYOUT.pillHeight,
  bottom: CHROME_LAYOUT.pillBottomPadding,
  leading: CHROME_LAYOUT.pillLeadingPadding,
  /** `height - 14`, canon's trailing-button diameter. */
  toggleDiameter: CHROME_LAYOUT.pillHeight - 14,
  /** `.padding(.trailing, 7)` on the trailing button. */
  togglePadding: 7,
} as const
