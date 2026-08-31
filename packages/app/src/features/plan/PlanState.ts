/**
 * `PlanState` and its sub-shapes.
 *
 * Split out of `PlanFeature.ts` under `RC-1`'s own escape hatch — *"split into
 * a sibling `<Name>State.ts` only once the interface plus `initialState`
 * exceeds roughly 40 lines"* — which this does several times over. The slice
 * still owns the events and the reducer; this file owns only the shape.
 *
 * ## Two lifecycles, one discriminated field each (`RC-24`)
 *
 * `dayLoad` and `matrixLoad` are single discriminated unions, never an
 * `isLoading` + `exception` pair: the pair can represent "loaded and failed at
 * once", which `UZF-9` forbids by construction.
 *
 * ## `activity` is not a lifecycle, and deliberately is not modelled as one
 *
 * Canon's Plan toolbar shows **one** activity signal for **three** things that
 * genuinely run at the same time — a manual refresh, the app-wide load, and a
 * day's read-ahead window:
 *
 * > The single activity signal the Plan toolbar's refresh control renders,
 * > whichever piece of the day is loading: a manual refresh, Main's load, or a
 * > day's read-ahead window.
 *
 * Three concurrent facts are not one lifecycle, so collapsing them into a
 * discriminated union would lose information (which of them is still running?)
 * and make the "return to the glyph when the **last** one finishes" rule
 * unexpressible. They are kept as three independent markers and the *signal* is
 * derived once, in `selectIsPlanActivityIndicated`. That is the shape `RC-24`
 * asks for — it forbids parallel fields standing in for one lifecycle, not
 * parallel fields describing parallel work.
 *
 * The preload marker is the **day** the in-flight window is centred on rather
 * than a boolean, and that is load-bearing: canon settles a marker only when
 * the response's window matches, so *"a superseded fetch can't stop the spinner
 * for the request that replaced it."*
 *
 * ## Visibility is stored as the lens snapshot's plain subset
 *
 * `EndeavorsLens` and `EndeavorsLensSnapshot` carry `ReadonlySet`s, which are
 * not serialisable and would trip the store's `serializableCheck`. State
 * therefore holds the same eight user-mutable fields as plain arrays, and
 * `selectPlanVista` materialises the real lens on top of `.planDay`'s defaults.
 * The vista's `sort` and `exposes` are never stored, exactly as
 * `lensApplyingSnapshot` refuses to restore them.
 */
import type {
  Endeavor,
  EndeavorComputedState,
  EndeavorGroupingCriteria,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  DayViewRange,
} from '@kro/core'
import { DayViewRange as Range, EndeavorsVistas } from '@kro/core'
import type { PlanDayKey } from './PlanCalendar'
import type { PlanDayCache } from './PlanDayCache'
import { emptyPlanDayCache } from './PlanDayCache'
import type { TimelineEditSession } from './PlanEditSession'
import type { PlanException } from './PlanException'
import { PlanViewMode } from './PlanNavigation'
import type { QuickCreateDraft } from './TimelineSlots'

/**
 * The authoritative selected day's lifecycle.
 *
 * Every non-idle case carries the **day it is about**. Without that, "the
 * authoritative array" and "the selected day" are two facts that can silently
 * disagree the instant the user steps a day, and a stale array would be read as
 * the new day's contents. Carrying the key is also what lets a response for a
 * day the user has already left be recognised as superseded.
 */
export type PlanDayLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly dayKey: PlanDayKey }
  | {
      readonly kind: 'loaded'
      readonly dayKey: PlanDayKey
      readonly events: readonly Endeavor[]
    }
  | {
      readonly kind: 'failed'
      readonly dayKey: PlanDayKey
      readonly exception: PlanException
    }

/** The matrix's own row set — a different query from the timeline's. */
export type PlanMatrixLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly endeavors: readonly Endeavor[] }
  | { readonly kind: 'failed'; readonly exception: PlanException }

/** Which of the three load kinds a day read is. Drives the activity marker. */
export const PlanLoadReason = {
  /** The user pulled the refresh control. */
  manual: 'manual',
  /** The shell asked for this surface's data (mount, tab entry, sign-in). */
  appWide: 'appWide',
} as const

export type PlanLoadReason = (typeof PlanLoadReason)[keyof typeof PlanLoadReason]

/** The three concurrent in-flight markers behind one rendered signal. */
export interface PlanActivity {
  readonly isRefreshing: boolean
  readonly isAppLoading: boolean
  /** Day the in-flight preload is centred on, or `null` when none is running. */
  readonly preloadCenterDayKey: PlanDayKey | null
}

/** The persisted, user-mutable half of the `.planDay` lens, in plain form. */
export interface PlanVisibility {
  readonly hiddenKinds: readonly EndeavorKind[]
  readonly hiddenHosts: readonly EndeavorHost[]
  readonly hiddenStatuses: readonly EndeavorStatus[]
  readonly hiddenComputedStates: readonly EndeavorComputedState[]
  readonly hiddenCalendarIds: readonly string[]
  readonly searchQuery: string
  readonly showArchived: boolean
  readonly grouping: EndeavorGroupingCriteria
}

/** One visibility toggle, by axis. */
export type PlanVisibilityToggle =
  | { readonly axis: 'kind'; readonly value: EndeavorKind }
  | { readonly axis: 'host'; readonly value: EndeavorHost }
  | { readonly axis: 'status'; readonly value: EndeavorStatus }
  | { readonly axis: 'computedState'; readonly value: EndeavorComputedState }
  | { readonly axis: 'calendar'; readonly value: string }

export interface PlanState {
  /** Injected wall clock. Never read from `Date.now()` inside this feature. */
  readonly now: Date
  readonly selectedDate: Date
  readonly viewMode: PlanViewMode
  /** The five-day picker's batch centre; `null` until it first renders. */
  readonly dayPickerCenter: Date | null

  /** The authoritative selected day. Never written by a preload. */
  readonly dayLoad: PlanDayLoadState
  /** The −3…+3 read-ahead buffer, excluding the authoritative day. */
  readonly preloadedDays: PlanDayCache
  /** The day the installed buffer is centred on. */
  readonly preloadedCenterDayKey: PlanDayKey | null

  readonly matrixLoad: PlanMatrixLoadState
  readonly activity: PlanActivity

  readonly editSession: TimelineEditSession | null
  readonly quickCreate: QuickCreateDraft | null

  readonly dayViewRange: DayViewRange
  readonly showCompletedInTimeline: boolean
  /** `timelineQuickEventCreation`, cached at `onViewLoaded` as canon caches it. */
  readonly isQuickEventCreationEnabled: boolean

  readonly visibility: PlanVisibility
}

/**
 * The lens defaults `.planDay` ships, flattened. Read from the registry rather
 * than restated, so a change to the vista cannot silently disagree with the
 * slice's initial state.
 */
const planDayLensDefaults = EndeavorsVistas.planDay.lens

export const initialPlanVisibility: PlanVisibility = {
  hiddenKinds: [...planDayLensDefaults.hiddenKinds],
  hiddenHosts: [...planDayLensDefaults.hiddenHosts],
  hiddenStatuses: [...planDayLensDefaults.hiddenStatuses],
  hiddenComputedStates: [...planDayLensDefaults.hiddenComputedStates],
  hiddenCalendarIds: [...planDayLensDefaults.hiddenCalendarIds],
  searchQuery: planDayLensDefaults.searchQuery,
  showArchived: planDayLensDefaults.showArchived,
  grouping: planDayLensDefaults.grouping,
}

/**
 * `now` and `selectedDate` are the **epoch** rather than `new Date()`: a slice's
 * initial state is evaluated at module load, and seeding it from the wall clock
 * would make every suite's baseline depend on when it ran. `onViewLoaded`
 * stamps the real instant, which is why it carries one.
 */
export const PLAN_EPOCH = new Date(0)

export const initialPlanState: PlanState = {
  now: PLAN_EPOCH,
  selectedDate: PLAN_EPOCH,
  viewMode: PlanViewMode.timeline,
  dayPickerCenter: null,
  dayLoad: { kind: 'idle' },
  preloadedDays: emptyPlanDayCache,
  preloadedCenterDayKey: null,
  matrixLoad: { kind: 'idle' },
  activity: {
    isRefreshing: false,
    isAppLoading: false,
    preloadCenterDayKey: null,
  },
  editSession: null,
  quickCreate: null,
  dayViewRange: Range.full,
  showCompletedInTimeline: true,
  isQuickEventCreationEnabled: false,
  visibility: initialPlanVisibility,
}
