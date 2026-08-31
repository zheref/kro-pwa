/**
 * Sheet-vs-popover mapping — canon `MainScreen.swift`'s two presentation
 * families, resolved from the same decision table the rest of the shell reads.
 *
 * Canon presents the *same content* two ways: the Mac anchors a popover to the
 * toolbar control (`macInboxButton`'s `.popover(item:)`,
 * `macVisibilityButton`, `macProfileButton`, `macNotificationsButton`), while
 * the phone pushes or sheets it. The rule is not "which platform" but "does
 * this surface have room beside the content the user is already reading" —
 * which is exactly `presentsNotificationsInline` in the ported table. So the
 * mapping below asks the table rather than re-deriving a second rule that
 * could drift from it.
 *
 * The sizes are canon's, measured off the Mac's own frames. Four of them are
 * already named by the design system (`POPOVER_SIZE`) and are re-exported
 * through this module rather than restated — a fifth copy of `560 x 620` is
 * how two surfaces end up disagreeing.
 */
import { POPOVER_SIZE } from '../../design/system/primitives/popover'
import { type DoSurface, doSurfaceLayout } from './DoSurfaceLayout'

/**
 * The surfaces that present the same content two ways.
 *
 * Each maps to one canon call site:
 *   `inbox`           `macInboxButton` — `InboxScreen` at 560 x 620
 *   `visibility`      `macVisibilityButton` — the lens filters at 460 x 560
 *   `profile`         `macProfileButton` — `ProfilePopoverView`, width 300
 *   `doNotifications` `macNotificationsButton` — `DoNotificationsView`
 *                     380 x 440 (`DoNotificationsView`'s own frame)
 *   `settings`        `wideBody`'s settings sheet — min 760 x 620
 *   `session`         `SessionScreen` — min width 360, max width 640
 */
export const PresentationSurface = {
  inbox: 'inbox',
  visibility: 'visibility',
  profile: 'profile',
  doNotifications: 'doNotifications',
  settings: 'settings',
  session: 'session',
} as const

export type PresentationSurface =
  (typeof PresentationSurface)[keyof typeof PresentationSurface]

/** A desktop frame, in CSS pixels. Every field optional, as canon's are. */
export interface PresentationSize {
  readonly width?: number
  readonly height?: number
  readonly minWidth?: number
  readonly minHeight?: number
  readonly maxWidth?: number
}

/**
 * Canon's desktop frames, in one place.
 *
 * The first four come from the design system's `POPOVER_SIZE`, which already
 * fixed them for exactly this reason; the last two are canon frames the design
 * system has no primitive for yet (a modal and a full surface, not a popover).
 */
export const PRESENTATION_SIZE: Record<PresentationSurface, PresentationSize> =
  {
    inbox: {
      width: POPOVER_SIZE.inbox.width,
      height: POPOVER_SIZE.inbox.height,
    },
    visibility: {
      width: POPOVER_SIZE.visibility.width,
      height: POPOVER_SIZE.visibility.height,
    },
    profile: { width: POPOVER_SIZE.profile.width },
    doNotifications: {
      width: POPOVER_SIZE.doNotifications.width,
      minHeight: POPOVER_SIZE.doNotifications.minHeight,
    },
    // `wideBody`'s `.sheet(item: settingsModal)` — `.frame(minWidth: 760,
    // minHeight: 620)`. A modal on the Mac too, not a popover: it is a hub,
    // not a shortcut.
    settings: { minWidth: 760, minHeight: 620 },
    // `SessionScreen` — `.frame(minWidth: 360, maxWidth: 640)`, no height.
    session: { minWidth: 360, maxWidth: 640 },
  }

/**
 * How a surface presents itself here.
 *
 * `sheet` is the handheld idiom (a full-width panel rising from the edge);
 * `popover` is the desktop idiom (a panel anchored to its control); `modal` is
 * the one case canon keeps as a centred sheet on both — Settings.
 */
export type PresentationKind = 'sheet' | 'popover' | 'modal'

export interface Presentation {
  readonly kind: PresentationKind
  /** Present only for `popover` and `modal`; a sheet sizes itself. */
  readonly size: PresentationSize | null
}

/**
 * The presentation one surface takes on one shell.
 *
 * Canon's rule, in canon's words: a popover on a handheld "would adapt into a
 * full-screen sheet and cost more than it gives", so the narrow surface takes
 * the sheet outright. `presentsNotificationsInline` is the table cell that
 * answers "is there room beside the content" — the same cell, so the two can
 * never disagree.
 */
export const presentationFor = (
  surface: PresentationSurface,
  doSurface: DoSurface,
): Presentation => {
  const inline = doSurfaceLayout(doSurface).presentsNotificationsInline

  if (!inline) return { kind: 'sheet', size: null }

  // Settings is a modal on every desktop-shaped surface — canon presents it
  // with `.sheet`, not `.popover`, even on the Mac.
  if (surface === PresentationSurface.settings) {
    return { kind: 'modal', size: PRESENTATION_SIZE.settings }
  }

  return { kind: 'popover', size: PRESENTATION_SIZE[surface] }
}

/**
 * The frame as inline style, so a caller does not hand-translate six optional
 * numbers into CSS at every call site.
 */
export const presentationStyle = (
  presentation: Presentation,
): Record<string, string> => {
  const size = presentation.size
  if (size === null) return {}

  const style: Record<string, string> = {}
  if (size.width !== undefined) style.width = `${size.width}px`
  if (size.height !== undefined) style.height = `${size.height}px`
  if (size.minWidth !== undefined) style.minWidth = `${size.minWidth}px`
  if (size.minHeight !== undefined) style.minHeight = `${size.minHeight}px`
  if (size.maxWidth !== undefined) style.maxWidth = `${size.maxWidth}px`
  return style
}
