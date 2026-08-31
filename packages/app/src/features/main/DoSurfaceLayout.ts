/**
 * `DoSurfaceLayout` — canon `KroUI/Do/DoSurfaceLayout.swift`, ported cell for
 * cell, plus the one thing the web has to add: a resolver from what a browser
 * can actually observe (pointer coarseness, viewport width) to canon's two
 * inputs.
 *
 * The whole point of canon's file is that the adaptive decisions live in ONE
 * decision table instead of scattered `#if os(...)` checks, and that every cell
 * is unit-testable without a simulator. That property is what is being ported:
 * this module imports no React, touches no DOM, and answers seven questions
 * from two inputs.
 *
 * **All three idioms are kept, including `tablet`.** The issue's framing —
 * "web has no tablet idiom; the sidebar shell covers regular widths" — is about
 * the *shell*, which has exactly two shapes here (tab bar or sidebar). It is
 * not a licence to delete a column of canon's table: `tablet` is precisely the
 * surface that is touch-driven **and** wide, which on the web is a tablet in
 * landscape, and dropping it would silently give that surface the Mac's 28px
 * pointer targets. So the table keeps canon's 3 x 2 grid and the web resolver
 * below maps a real browser onto it — see `resolveDoSurface`.
 */

/**
 * Which class of device is rendering the surface. Canon's `DoSurfaceIdiom`.
 *
 * Canon resolves this from `UIUserInterfaceIdiom`; the web resolves it from
 * the pointer and the viewport (`resolveDoSurface`). Either way the table
 * itself never asks how — it is handed the answer, which is what keeps it
 * testable.
 */
export const DoSurfaceIdiom = {
  /** A phone, and any wider device driven by touch in a narrow window. */
  handheld: 'handheld',
  /** A touch device wide enough to carry the desktop composition. */
  tablet: 'tablet',
  /** A pointer-driven window. */
  desktop: 'desktop',
} as const

export type DoSurfaceIdiom =
  (typeof DoSurfaceIdiom)[keyof typeof DoSurfaceIdiom]

/** Every idiom, in canon's `CaseIterable` declaration order. */
export const ALL_DO_SURFACE_IDIOMS: readonly DoSurfaceIdiom[] = [
  DoSurfaceIdiom.handheld,
  DoSurfaceIdiom.tablet,
  DoSurfaceIdiom.desktop,
]

/**
 * The horizontal size class of the scene. Canon's `DoSurfaceWidth`.
 *
 * On a tablet this is not a constant: Slide Over, a narrow Split View pane or
 * a small Stage Manager window all report `compact` while the device stays an
 * iPad. The web equivalent is a resized browser window, and every rule below
 * that could produce a desktop-shaped layout keys off this rather than off the
 * idiom — which is what keeps multitasking (and window resizing) honest.
 */
export const DoSurfaceWidth = {
  compact: 'compact',
  regular: 'regular',
} as const

export type DoSurfaceWidth =
  (typeof DoSurfaceWidth)[keyof typeof DoSurfaceWidth]

/** Every width, in canon's `CaseIterable` declaration order. */
export const ALL_DO_SURFACE_WIDTHS: readonly DoSurfaceWidth[] = [
  DoSurfaceWidth.compact,
  DoSurfaceWidth.regular,
]

/** The table's two inputs, together. Canon's stored `idiom` + `width`. */
export interface DoSurface {
  readonly idiom: DoSurfaceIdiom
  readonly width: DoSurfaceWidth
}

/**
 * The pointer-primary minimum. Canon's
 * `DoSurfaceLayout.pointerControlSide = 28`.
 */
export const POINTER_CONTROL_SIDE = 28

/**
 * The touch minimum — canon reads `KroTokens.Size.minTouchTarget`, which the
 * design system carries here as `--kro-size-min-touch-target`. It is restated
 * as a number because this module is pure and a CSS custom property cannot be
 * read without a document; the design system's token and this constant are
 * asserted equal by `__tests__/DoSurfaceLayout.test.ts`.
 */
export const TOUCH_CONTROL_SIDE = 44

/** Canon's `minimumControlSpacing` pair — UX guideline 23. */
export const TOUCH_CONTROL_SPACING = 8
export const POINTER_CONTROL_SPACING = 4

/**
 * The adaptive contract, as a value.
 *
 * Canon exposes these as computed properties on a struct; TypeScript has no
 * value-type struct with computed members that survives a `structuredClone`
 * through Redux, so `doSurfaceLayout(surface)` returns the resolved row. Every
 * property below is one of canon's, with canon's own reasoning attached.
 */
export interface DoSurfaceLayout {
  readonly idiom: DoSurfaceIdiom
  readonly width: DoSurfaceWidth

  /**
   * Whether this surface is driven by touch rather than by a pointer.
   *
   * Canon: "A tablet with a trackpad attached is still a touch surface — the
   * finger remains a supported input, so the touch minimums stand."
   */
  readonly isTouchPrimary: boolean

  /**
   * Whether the header shows the expanded `☀︎ My Day · <date> · <weekday>`
   * composition instead of the bare short date.
   *
   * Follows the **width**, not the idiom: canon's own bug was an iPad in Slide
   * Over rendering a four-part title into a 320pt column.
   */
  readonly usesExpandedDayTitle: boolean

  /**
   * Whether the header gradient continues past the content's own leading edge,
   * toward the window's. Only meaningful when a sidebar column is beside the
   * content.
   */
  readonly extendsHeaderGradientToLeadingEdge: boolean

  /**
   * Whether the Profile control belongs in this surface's own toolbar.
   *
   * **An ownership question, not a shape question** — which is why, alone
   * among the parity decisions, it does not key off `width`. A layout with a
   * tab bar installs Profile once at the tab's own chrome, so the surface must
   * not add a second one. A sidebar shell has no tab chrome at any width, so
   * if it declined ownership when narrow the control would not fall back
   * anywhere — it would simply disappear.
   */
  readonly showsProfileControl: boolean

  /** The Inbox shortcut. Canon: the same ownership split as Profile. */
  readonly showsInboxControl: boolean

  /**
   * Whether Notifications opens the overdue/expired list *in place* (a popover
   * anchored to the toolbar) rather than scrolling the content to the Overdue
   * section. The scroll is the right answer on a handheld, where a popover
   * adapts into a full-screen sheet and costs more than it gives.
   */
  readonly presentsNotificationsInline: boolean

  /** The minimum side of any interactive control, in CSS pixels. */
  readonly minimumControlSide: number

  /** The minimum gap between two adjacent interactive controls. */
  readonly minimumControlSpacing: number
}

/**
 * Whether the surface is wide enough to carry the desktop composition.
 * Canon's private `isDesktopShaped`.
 */
const isDesktopShaped = (surface: DoSurface): boolean => {
  switch (surface.idiom) {
    case DoSurfaceIdiom.desktop:
      return true
    case DoSurfaceIdiom.tablet:
      return surface.width === DoSurfaceWidth.regular
    case DoSurfaceIdiom.handheld:
      return false
  }
}

/** Canon's `usesExpandedDayTitle` switch. */
const usesExpandedDayTitle = (surface: DoSurface): boolean => {
  switch (surface.idiom) {
    case DoSurfaceIdiom.desktop:
      return true
    case DoSurfaceIdiom.handheld:
      return false
    case DoSurfaceIdiom.tablet:
      return surface.width === DoSurfaceWidth.regular
  }
}

/** Canon's `showsProfileControl` switch — the ownership question. */
const showsProfileControl = (surface: DoSurface): boolean => {
  switch (surface.idiom) {
    case DoSurfaceIdiom.desktop:
      return true
    case DoSurfaceIdiom.handheld:
      return false
    case DoSurfaceIdiom.tablet:
      return true
  }
}

/** The resolved row of canon's decision table for one surface. */
export const doSurfaceLayout = (surface: DoSurface): DoSurfaceLayout => {
  const touchPrimary = surface.idiom !== DoSurfaceIdiom.desktop
  const desktopShaped = isDesktopShaped(surface)
  const profile = showsProfileControl(surface)

  return {
    idiom: surface.idiom,
    width: surface.width,
    isTouchPrimary: touchPrimary,
    usesExpandedDayTitle: usesExpandedDayTitle(surface),
    extendsHeaderGradientToLeadingEdge: desktopShaped,
    showsProfileControl: profile,
    showsInboxControl: profile,
    presentsNotificationsInline: desktopShaped,
    minimumControlSide: touchPrimary
      ? TOUCH_CONTROL_SIDE
      : POINTER_CONTROL_SIDE,
    minimumControlSpacing: touchPrimary
      ? TOUCH_CONTROL_SPACING
      : POINTER_CONTROL_SPACING,
  }
}

// ---------------------------------------------------------------------------
// The web resolver — the one thing canon does not have to answer
// ---------------------------------------------------------------------------

/**
 * The compact/regular boundary, in CSS pixels.
 *
 * 768 rather than one of Tailwind's other stops because it is the width at
 * which the sidebar (min 180 / ideal 200, canon's
 * `navigationSplitViewColumnWidth`) plus a readable detail column both fit —
 * below it the sidebar would eat a third of the window.
 */
export const REGULAR_WIDTH_BREAKPOINT = 768

/** What the browser can observe about its input device. */
export type PointerKind = 'coarse' | 'fine'

export interface SurfaceObservation {
  /** `matchMedia('(pointer: coarse)')` — a finger rather than a cursor. */
  readonly pointer: PointerKind
  /** `window.innerWidth`, in CSS pixels. */
  readonly viewportWidth: number
}

/**
 * Maps what a browser can see onto canon's two inputs.
 *
 * The mapping, stated as a table so it can be argued with:
 *
 * | pointer | width    | idiom    | shell   |
 * |---------|----------|----------|---------|
 * | coarse  | compact  | handheld | tab bar |
 * | coarse  | regular  | tablet   | sidebar |
 * | fine    | compact  | handheld | tab bar |
 * | fine    | regular  | desktop  | sidebar |
 *
 * A **fine pointer in a narrow window** resolves to `handheld`, not to a
 * narrow desktop: canon has no desktop-at-compact-width composition, and the
 * tab bar is the layout that actually works at 375px. It costs that surface
 * the 44px touch targets, which is the safe direction to be wrong in.
 */
export const resolveDoSurface = (
  observation: SurfaceObservation,
): DoSurface => {
  const width =
    observation.viewportWidth >= REGULAR_WIDTH_BREAKPOINT
      ? DoSurfaceWidth.regular
      : DoSurfaceWidth.compact

  if (width === DoSurfaceWidth.compact) {
    return { idiom: DoSurfaceIdiom.handheld, width }
  }

  return {
    idiom:
      observation.pointer === 'coarse'
        ? DoSurfaceIdiom.tablet
        : DoSurfaceIdiom.desktop,
    width,
  }
}

/**
 * The shell's shape. Two values, because the web has two shells — this is the
 * "web has no tablet idiom" rule, expressed where it actually applies.
 *
 * `handheld` gets the tab bar; everything else gets the sidebar. That is the
 * same split canon draws with `showsProfileControl`: the container that owns
 * the tab chrome is the one that keeps Profile and Inbox out of its headers.
 */
export type ShellShape = 'tabBar' | 'sidebar'

export const shellShapeFor = (surface: DoSurface): ShellShape =>
  surface.idiom === DoSurfaceIdiom.handheld ? 'tabBar' : 'sidebar'

/**
 * How much of the viewport's bottom edge the tab bar occupies.
 *
 * Derived from the same two numbers `TabBarFragment` lays itself out with — a
 * `minimumControlSide` tall button between two `minimumControlSpacing`
 * paddings — so nudging either moves the reservation with it instead of
 * leaving a literal behind.
 *
 * WHY IT EXISTS. On iOS a tab is a safe area and SwiftUI has already excluded
 * the bar from it, which is why canon can anchor the Active Toast 24pt off "the
 * bottom" and mean 24pt above the bar. Here the bar is an ordinary flex child,
 * so the viewport's bottom edge is *below* it and a viewport-anchored surface
 * lands underneath. Chrome that anchors to that edge reads this through the
 * design system's `SHELL_BOTTOM_INSET_VAR`, which `MainShellFragment`
 * publishes; the kit never imports the shell to ask.
 */
export const tabBarReservedHeight = (layout: DoSurfaceLayout): number =>
  layout.minimumControlSide + 2 * layout.minimumControlSpacing

/** The inset for a shell shape — the sidebar shell has no bottom chrome. */
export const shellBottomInset = (
  shape: ShellShape,
  layout: DoSurfaceLayout,
): number => (shape === 'tabBar' ? tabBarReservedHeight(layout) : 0)

/** The surface a server render assumes before the browser has been measured. */
export const SSR_DEFAULT_SURFACE: DoSurface = {
  idiom: DoSurfaceIdiom.desktop,
  width: DoSurfaceWidth.regular,
}
