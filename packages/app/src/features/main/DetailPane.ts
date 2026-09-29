/**
 * The window's trailing glass detail pane — canon's
 * `MainFeature.DetailPaneSegment` and `State.detailPaneEndeavor` (KroApple
 * `#517`, spec `docs/Features/MacDetailPane.md`).
 *
 * The pane holds one of four segments, and each segment has two modes picked
 * by whether an endeavor is selected:
 *
 * | Segment        | With an endeavor         | With none                    |
 * | -------------- | ------------------------ | ---------------------------- |
 * | `sessionSetup` | Set up a session for it  | Set up an arbitrary new task |
 * | `performance`  | Its recorded sessions    | The whole day's reading      |
 * | `plan`         | Its details              | The day's timeline, read-only |
 * | `inbox`        | The Inbox page           | The Inbox page               |
 *
 * **`inbox` is a web-only divergence.** Canon's `DetailPaneSegment` has three
 * cases; its Inbox is a sheet or popover. The fourth segment hosts the real
 * Inbox page — Triage opens inside it — and is where a capture routed to the
 * Inbox lands on a pane host. It reads no endeavor: the Inbox is its own
 * list. It is gated by the web-only `detailPaneInbox` flag (see
 * `docs/Features/MacDetailPane.md`), and every canon-mirroring table here
 * lists it last so the three canon segments keep canon's order.
 *
 * Only the sidebar shell renders the pane — the web's twin of canon's
 * macOS-only presentation. The tab-bar shell keeps its sheets.
 */
import { assertNever } from '@kro/core'

/**
 * Canon's `DetailPaneSegment.allCases`, in the toolbar's own order — plus the
 * web-only `inbox`, last, shown only while `detailPaneInbox` is on.
 */
export const DETAIL_PANE_SEGMENTS = [
  'sessionSetup',
  'performance',
  'plan',
  'inbox',
] as const

export type DetailPaneSegment = (typeof DETAIL_PANE_SEGMENTS)[number]

/**
 * The endeavor the pane is reading.
 *
 * A shell-owned pair rather than the domain `Endeavor`: `RC-20` keeps this
 * slice out of the endeavor pool's shape, and the header needs nothing but
 * the name. Redundancy: `title` is a copy taken when the pane was pointed at
 * the endeavor, so the header does not need a cross-slice read to render.
 */
export interface DetailPaneEndeavor {
  readonly id: string
  readonly title: string
}

/**
 * Canon's `detailPaneSegment` + `detailPaneEndeavor`, as one field.
 *
 * `segment === null` is "the pane is hidden". The endeavor survives a dismiss
 * the way canon's does — reopening a segment from the toolbar reads the same
 * endeavor it was last pointed at.
 */
export interface DetailPaneState {
  readonly segment: DetailPaneSegment | null
  readonly endeavor: DetailPaneEndeavor | null
}

export const closedDetailPane: DetailPaneState = {
  segment: null,
  endeavor: null,
}

/** Canon's `DetailPaneSegment.title` — the toolbar control's label. */
export const detailPaneSegmentLabel = (segment: DetailPaneSegment): string => {
  switch (segment) {
    case 'sessionSetup':
      return 'Session'
    case 'performance':
      return 'Performance'
    case 'plan':
      return 'Plan'
    case 'inbox':
      return 'Inbox'
    default:
      return assertNever(segment)
  }
}

/**
 * Canon's `title(forEndeavorNamed:)` — what the pane's own header says,
 * in terms of what it is currently reading.
 */
export const detailPaneTitle = (
  segment: DetailPaneSegment,
  endeavorName: string | null,
): string => {
  switch (segment) {
    case 'sessionSetup':
      return endeavorName === null ? 'New Session' : 'Session Setup'
    case 'performance':
      return endeavorName === null ? 'Day Progress' : 'Endeavor Activity'
    case 'plan':
      return endeavorName === null ? 'Timeline' : 'Details'
    case 'inbox':
      // Web-only; the Inbox reads no endeavor, so both modes are one title.
      return 'Inbox'
    default:
      return assertNever(segment)
  }
}

/**
 * One place the pane can be — a segment reading an endeavor (or the day).
 * What a drill-in pushes and a Back pops.
 */
/**
 * The segments the toolbar group offers: canon's three always, `inbox` only
 * while the web-only `detailPaneInbox` flag is on.
 */
export const detailPaneSegmentsOffered = (
  isInboxEnabled: boolean,
): readonly DetailPaneSegment[] =>
  DETAIL_PANE_SEGMENTS.filter(
    (segment) => segment !== 'inbox' || isInboxEnabled,
  )

/** Whether a segment reads the pointed-at endeavor at all (the Inbox does not). */
export const detailPaneSegmentReadsEndeavor = (
  segment: DetailPaneSegment,
): boolean => segment !== 'inbox'

export interface DetailPaneLocation {
  readonly segment: DetailPaneSegment
  readonly endeavor: DetailPaneEndeavor | null
}
