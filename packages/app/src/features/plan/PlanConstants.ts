/**
 * Every number the Plan timeline's geometry and gestures are made of, ported
 * from canon and gathered in one module.
 *
 * The reason this is a module rather than literals at the call sites is stated
 * by the issue this implements: *"the exact numbers here (snap, catchments,
 * bands, scoring of columns) are canon UX that took KroApple many iterations;
 * web must inherit, not rediscover."* A constant that lives in one place can be
 * diffed against canon; one spelled out at four call sites drifts at three of
 * them.
 *
 * Sources, per group:
 *
 * | Group | Canon |
 * | --- | --- |
 * | Geometry | `KroUI/Plan/TimelineLayout.swift` → `TimelineLayoutMetrics` |
 * | Snap & slots | `KroUI/Plan/TimelineLayout.swift` → `TimelineLayout` |
 * | Gesture timings | `KroUI/Plan/TimelineDayView.swift` |
 * | Ripple | `KroUI/Plan/TimelineDayView.swift` → `BlockRippleTiming` |
 * | Preload | `Kro/Application/Plan/PlanProducer.swift` |
 * | Day picker | `KroUI/Plan/TimelineDayView.swift` → `datePicker` |
 *
 * ## Points became pixels, and seconds gained a milliseconds twin
 *
 * Canon's lengths are SwiftUI points. On the web the same numbers are CSS
 * pixels — the `_PX` suffix says which unit the value is in so a consumer never
 * has to guess, and the issue's own wording ("60px/hour grid") is what fixes
 * the 1:1 mapping.
 *
 * Canon's gesture durations are `Double` seconds, because that is what
 * SwiftUI's `minimumDuration:` takes. Every web consumer of the same value
 * needs milliseconds (`setTimeout`, CSS `transition-duration`). Both are
 * exported, with the millisecond form **derived** from the second form, so the
 * pair cannot drift the way two hand-written literals would.
 */
import { type TimeIntervalSeconds, SECONDS_PER_HOUR } from '@kro/core'

// ---------------------------------------------------------------- geometry

/** `TimelineLayoutMetrics.hourHeight` — vertical space allotted to one hour. */
export const TIMELINE_HOUR_HEIGHT_PX = 60

/**
 * `TimelineLayoutMetrics.minimumCardHeight` — the floor that keeps a 10-minute
 * event tappable. Applied to the *rendered* height only; the event's real
 * duration is never altered to match.
 */
export const TIMELINE_MINIMUM_CARD_HEIGHT_PX = 30

/** `TimelineLayoutMetrics.horizontalInset` — breathing room either side. */
export const TIMELINE_HORIZONTAL_INSET_PX = 12

/** `TimelineLayoutMetrics.hourLabelWidth` — the leading hour-label gutter. */
export const TIMELINE_HOUR_LABEL_WIDTH_PX = 52

// ------------------------------------------------------------ snap & slots

/**
 * The snap grain every edit-mode drag quantises to, in seconds. Canon writes
 * the literal `900` inline in all three gesture handlers; it is named once
 * here so the three can be proven identical.
 */
export const TIMELINE_SNAP_SECONDS: TimeIntervalSeconds = 900

/**
 * The shortest event an edit may produce. Equal to the snap grain, which is
 * why a handle drag can never land a card between two grid marks *and* below
 * the floor at the same time.
 */
export const TIMELINE_MINIMUM_DURATION_SECONDS: TimeIntervalSeconds = 900

/** `TimelineLayout.slotMinutes` — the quick-create slot grain. */
export const TIMELINE_SLOT_MINUTES = 15

/** Slots per rendered hour — canon's `60 / slotMinutes`. */
export const TIMELINE_SLOTS_PER_HOUR = 60 / TIMELINE_SLOT_MINUTES

/** `TimelineLayout.slotDefaultDurationMinutes` — the ghost's length. */
export const TIMELINE_SLOT_DEFAULT_DURATION_MINUTES = 60

/** The same default as seconds — the uncommitted ghost is one hour long. */
export const TIMELINE_SLOT_DEFAULT_DURATION_SECONDS: TimeIntervalSeconds =
  TIMELINE_SLOT_DEFAULT_DURATION_MINUTES * 60

/**
 * The length canon assumes when an event carries a `start` but no `duration`
 * and something has to draw or drag it — the `?? 3600` fallback repeated
 * through `TimelineDayView`'s edit-mode handlers.
 *
 * Deliberately **not** used by the layout pass, which reads `duration ?? 0`
 * instead: an event with no duration occupies no time on the grid, but is still
 * an hour long the moment the user grabs it. Canon carries both, and the
 * asymmetry is real rather than an oversight — see `TimelineLayout.ts`.
 */
export const TIMELINE_FALLBACK_EVENT_DURATION_SECONDS: TimeIntervalSeconds =
  SECONDS_PER_HOUR

// -------------------------------------------------------- gesture timings

/**
 * `TimelineDayView.editModeHoldDuration` — how long a press on an existing
 * block must be held before it arms edit mode.
 *
 * Longer than the empty-canvas hold on purpose: *"entering edit mode arms drag
 * and resize handles on something that already exists, so it should take a
 * deliberate hold rather than a moment's hesitation over a block."*
 */
export const EDIT_MODE_HOLD_DURATION_SECONDS = 0.6

/** `editModeHoldDuration`, in milliseconds — see the module note. */
export const EDIT_MODE_HOLD_DURATION_MS = EDIT_MODE_HOLD_DURATION_SECONDS * 1000

/**
 * `TimelineDayView.blockPressMaxDistance` — how far a press on a block may
 * travel before it stops counting as a press, in px. Small, *"so sliding a
 * finger off to scroll releases the block immediately."*
 */
export const BLOCK_PRESS_MAX_DISTANCE_PX = 10

/**
 * `TimelineDayView.slotPressDuration` — the hold that counts as "create an
 * event here". *"Short enough to feel immediate, long enough that a finger
 * resting on the canvas before flicking to scroll does not trip it."*
 */
export const SLOT_PRESS_DURATION_SECONDS = 0.3

/** `slotPressDuration`, in milliseconds. */
export const SLOT_PRESS_DURATION_MS = SLOT_PRESS_DURATION_SECONDS * 1000

/** `TimelineDayView.slotPressMaxDistance`, in px. */
export const SLOT_PRESS_MAX_DISTANCE_PX = 12

/**
 * `BlockRippleTiming` — how long a block's press feedback runs.
 *
 * The asymmetry is the point, and canon spells out why: the deepened fill
 * *"lands with no animation at all — a press has to be acknowledged on the
 * frame it happens"*, so only the release is eased. Do not "fix" the two into
 * one duration.
 */
export const BLOCK_RIPPLE_TIMING = {
  /** Expansion of the wave under a finger that is still down. */
  holdSeconds: 0.38,
  /** Fade of the press feedback once the finger lifts. */
  releaseSeconds: 0.22,
} as const

/** `BlockRippleTiming`, in milliseconds. */
export const BLOCK_RIPPLE_TIMING_MS = {
  holdMs: BLOCK_RIPPLE_TIMING.holdSeconds * 1000,
  releaseMs: BLOCK_RIPPLE_TIMING.releaseSeconds * 1000,
} as const

/**
 * `withAnimation(.easeInOut(duration: 0.15))` around entering and leaving edit
 * mode, and `.interactiveSpring(duration: 0.15)` around the reflow preview.
 * One number in canon, one here.
 */
export const EDIT_MODE_TRANSITION_SECONDS = 0.15

/** `EDIT_MODE_TRANSITION_SECONDS`, in milliseconds. */
export const EDIT_MODE_TRANSITION_MS = EDIT_MODE_TRANSITION_SECONDS * 1000

// ------------------------------------------------------- preload & picker

/**
 * `PlanFeature.timelinePrefetchRadiusDays` — the read-ahead radius either side
 * of the selected day, giving canon's −3…+3 buffer (7 days, one range request
 * per host).
 */
export const TIMELINE_PRELOAD_RADIUS_DAYS = 3

/**
 * How many day chips the picker shows — canon's `ForEach(-2...2)`.
 * `TIMELINE_DAY_PICKER_SPAN` is that range's half-width.
 */
export const TIMELINE_DAY_PICKER_SPAN = 2

/** The five visible day chips. Derived, so the two can never disagree. */
export const TIMELINE_DAY_PICKER_VISIBLE_DAYS = TIMELINE_DAY_PICKER_SPAN * 2 + 1
