/**
 * The Triage surface's presentation helpers — everything the render tier needs
 * that is genuinely about *drawing and gesture*, and nothing that is about the
 * product's rules.
 *
 * The split is deliberate and it is the epic's: *"every rule a pure
 * reducer/shifter; UI carries zero arithmetic"*. So the value↔importance link,
 * the effort×reward ratio, the expiry presets, the selected-first ordering and
 * the confirm gate are all `@kro/app`'s `features/triage/**` logic tier
 * (KC-IS-#25) and are only *read* here. What lives in this file is the other
 * half — the numbers canon keeps in `InboxScreen.swift`'s `TriageCarousel` and
 * the two `<input>` formats the web has and SwiftUI does not:
 *
 *   · the edge strip's width, the dismissal threshold and the drag's minimum
 *     distance, ported verbatim from canon's carousel;
 *   · `datetime-local` value formatting, which is a browser control's wire
 *     format rather than a product rule.
 *
 * Everything here is a **pure function of its arguments**. Nothing reads a
 * clock, the DOM or a store, so "released at 17.9% springs back and at 18.1%
 * completes" is a plain unit test rather than a simulated gesture.
 */

// ---------------------------------------------------------------------------
// The carousel's gesture geometry — canon's `TriageCarousel`
// ---------------------------------------------------------------------------

/**
 * `edgeSwipeStartWidth: CGFloat = 72` — *"a 72pt-wide edge strip accepts the
 * drag — wide enough to be comfortable without intercepting touches deeper
 * into the form"*.
 *
 * Ported as 72 **CSS pixels**, which is the honest reading: a SwiftUI point and
 * a CSS pixel are both the platform's density-independent unit, so the strip
 * covers the same physical band of the screen on both stacks.
 */
export const TRIAGE_EDGE_STRIP_WIDTH = 72

/**
 * `dismissThresholdFraction: CGFloat = 0.18` — *"releasing the drag past ~18%
 * of the screen width completes the dismissal; releasing earlier springs the
 * carousel back"*.
 *
 * **A named reading.** Canon multiplies this by the *carousel's* width
 * (`GeometryReader`'s `proxy.size.width`), not by the device screen's. On a
 * phone the Inbox sheet is full-width and the two are the same number, which is
 * why the doc's prose can say "screen width" without ambiguity. On the web they
 * genuinely differ — the desktop Inbox is a 560 x 620 popover — so the port
 * follows canon's *code* and measures the carousel, which is also the only
 * reading under which the gesture feels the same in both presentations.
 */
export const TRIAGE_DISMISS_THRESHOLD_FRACTION = 0.18

/**
 * `DragGesture(minimumDistance: 10)` — *"so simple taps (which never move
 * 10pt) never activate the drag"*.
 *
 * The web needs this for a second reason canon does not have: a pointer that
 * has been captured retargets its subsequent `click`, so arming the drag on the
 * first move would swallow the back chevron's tap.
 */
export const TRIAGE_DRAG_MINIMUM_DISTANCE = 10

/** Whether a drag starting at `x` is inside the leading edge strip. */
export const isTriageEdgeStripStart = (x: number): boolean =>
  x <= TRIAGE_EDGE_STRIP_WIDTH

/**
 * `let dx = max(0, min(value.translation.width, width))` — the live offset.
 *
 * Clamped at both ends: a leftward drag is not a back-swipe (so it reads 0
 * rather than pulling the panel off its leading edge), and the panel never
 * travels further than the carousel is wide.
 */
export const triageCarouselOffset = (
  translationX: number,
  carouselWidth: number,
): number => {
  if (!Number.isFinite(translationX) || !Number.isFinite(carouselWidth)) return 0
  return Math.max(0, Math.min(translationX, Math.max(0, carouselWidth)))
}

/**
 * `value.translation.width > width * dismissThresholdFraction` — whether
 * releasing here completes the dismissal rather than springing back.
 *
 * Strictly greater, as canon writes it: releasing at exactly the threshold
 * springs back. A non-positive carousel width (an unmeasured element, which is
 * every element under jsdom) can never complete — the alternative is `0 > 0`
 * being decided by rounding, and a gesture that dismisses on a zero-width
 * surface is a bug, not an edge case.
 */
export const triageCarouselCompletes = (
  translationX: number,
  carouselWidth: number,
): boolean => {
  if (!Number.isFinite(translationX) || !Number.isFinite(carouselWidth)) {
    return false
  }
  if (carouselWidth <= 0) return false
  return translationX > carouselWidth * TRIAGE_DISMISS_THRESHOLD_FRACTION
}

// ---------------------------------------------------------------------------
// The two rating rows
// ---------------------------------------------------------------------------

/** `ForEach(1...5)` — the five steps every `RatingRow` draws. */
export const TRIAGE_RATING_STEPS: readonly number[] = [1, 2, 3, 4, 5]

/**
 * `.opacity((rating ?? 0) >= step ? 1.0 : 0.25)` — whether this step is lit.
 *
 * A cleared rating counts as 0, which lights nothing; this is the same
 * `?? 0` coalescing `valueBumpedByQuadrant` applies one tier down, so the row
 * and the promotion rule cannot disagree about what "cleared" means.
 */
export const isTriageRatingStepLit = (
  rating: number | null,
  step: number,
): boolean => (rating ?? 0) >= step

// ---------------------------------------------------------------------------
// `datetime-local` — the browser control's wire format
// ---------------------------------------------------------------------------

const pad = (value: number, width = 2): string =>
  String(value).padStart(width, '0')

/**
 * A `Date` as `<input type="datetime-local">` reads it: `YYYY-MM-DDTHH:mm` in
 * **local** components, never an ISO instant.
 *
 * `toISOString()` would be the obvious thing and is the wrong thing: it
 * converts to UTC, so a user in UTC+2 dialling 09:00 would see 07:00 come back.
 * Canon has no equivalent because SwiftUI's `DatePicker` binds a `Date`
 * directly; this is the web control's own format and nothing else.
 */
export const dateTimeInputValue = (value: Date): string =>
  `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`

/**
 * The inverse: what the user dialled, as a local `Date`.
 *
 * `null` for anything the control could not fill (it emits `''` while the user
 * is mid-edit), so a half-typed field never reaches a reducer as an
 * `Invalid Date`. Seconds and milliseconds are zeroed, matching the control's
 * own minute granularity — which is also what makes an "An hour later" preset
 * comparison exact rather than off by the seconds the seed happened to carry.
 */
export const parseDateTimeInput = (raw: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw)
  if (match === null) return null
  const [, year, month, day, hour, minute] = match
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  )
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** The scheduled date / expiry as the section header prints it. */
export const formatTriageMoment = (value: Date, locale?: string): string =>
  value.toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
