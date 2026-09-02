/**
 * `design/chrome` — the cross-feature bottom chrome and the shared controls
 * that sit on top of every surface.
 *
 * Layout:
 *   `layout/`  the canon geometry (`MainScreen`'s constants) and the springs
 *              this tier animates on, both derived rather than retyped.
 *   `fab/`     LiquidGlassFAB and its unfurling menu.
 *   `glow/`    the rotating two-hue glow cast behind the FAB.
 *   `toast/`   the ActiveToast model, view, placement layer and host.
 *   `dial/`    the DurationDial and its preset pills.
 *   `rings/`   the Day Progress Rings.
 *   `emoji/`   the emoji picker and its popover presentation.
 *
 * `RC-14`: nothing here imports react-redux, a slice or a Producer. Every one
 * of these takes plain values and intent closures — including the toast host,
 * which is React state behind a context precisely so a feature can raise a
 * toast without this tier ever learning that a store exists.
 *
 * NOT WIRED INTO `design/index.ts` YET. `#15`'s exclusive file lane is
 * `design/chrome/**`, and the parent barrel is outside it — re-exporting from
 * there would collide with `#14`, which is adding its own line to the same
 * file. Consumers reach this tier through `@kro/app/design/chrome` once the
 * shell child adds the one line; the PR body says so.
 */

export {
  CHROME_LAYOUT,
  FAB_INSETS,
  SHELL_BOTTOM_INSET_FALLBACK,
  SHELL_BOTTOM_INSET_VAR,
  SHELL_GUTTER,
  TOAST_DURATION_SECONDS,
  type FabInsetVariant,
  clampToastDuration,
  pillBottomOffset,
  pillTrailingPadding,
  toastBottomOffset,
  toastLiftAbovePill,
} from './layout/chromeLayout'
export {
  CHROME_SPRINGS,
  SAMPLE_COUNT,
  SETTLE_RESIDUAL,
  TOAST_LIFT,
  type CanonSpring,
  type ChromeSpringName,
  settleMs,
  springEasing,
  springTransition,
} from './layout/chromeMotion'

export { useDisclosure } from './useDisclosure'

export {
  DEFAULT_GLOW_BLUR_RADIUS,
  DEFAULT_GLOW_HUES,
  DEFAULT_GLOW_SPREAD,
  GLOW_SHAPES,
  type RotatingGlowProps,
  type RotatingGlowShape,
  RotatingGlow,
  glowPlumeMargin,
  shouldGlowAnimate,
} from './glow/RotatingGlow'

export {
  FAB_GLYPH_SIZE,
  type LiquidGlassFABProps,
  LiquidGlassFAB,
} from './fab/LiquidGlassFAB'
export {
  type FABMenuEntry,
  type LiquidGlassFABMenuProps,
  LiquidGlassFABMenu,
} from './fab/LiquidGlassFABMenu'

export {
  TOAST_ICON_COLOR_VAR,
  type ActiveToastInput,
  type ActiveToastModel,
  type ToastAction,
  type ToastActionStyle,
  type ToastIconColor,
  resetActiveToastSequence,
  toActiveToast,
} from './toast/activeToast'
export {
  type ActiveToastViewProps,
  ActiveToastView,
} from './toast/ActiveToastView'
export {
  type ActiveToastLayerProps,
  ActiveToastLayer,
} from './toast/ActiveToastLayer'
export {
  type ActiveToastController,
  type ActiveToastHostProps,
  ActiveToastHost,
  useActiveToasts,
} from './toast/ActiveToastHost'

export {
  DEFAULT_DIAMETER,
  DEFAULT_DURATION_PRESETS,
  DEFAULT_MAX_SECONDS,
  DEFAULT_STEP_SECONDS,
  TICK_RING_WIDTH,
  type DurationDialProps,
  DurationDial,
  angleFromCentre,
  durationForAngle,
  formatDigital,
} from './dial/DurationDial'

export {
  DEFAULT_RING_DIAMETER,
  DEFAULT_RING_LINE_WIDTH,
  DEFAULT_RING_SPACING,
  TRACK_OPACITY,
  type ActivityRing,
  type ActivityRingsProps,
  ActivityRings,
  clampProgress,
  dayProgressRings,
  ringPathDiameter,
} from './rings/ActivityRings'

export {
  DEFAULT_EMOJI_CATEGORIES,
  EMOJI_GRID_COLUMNS,
  type EmojiCategory,
} from './emoji/emojiCategories'
export { type EmojiPickerProps, EmojiPicker } from './emoji/EmojiPicker'
export {
  EMOJI_POPOVER_SIZE,
  type EmojiPickerPopoverProps,
  EmojiPickerPopover,
} from './emoji/EmojiPickerPopover'
