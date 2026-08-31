'use client'

/**
 * Plan's stateful container (`RC-37`; implements `UZF-4`) — the port of
 * `PlanScreen`.
 *
 * The only artifact in this feature that calls both `useAppSelector` and
 * `useAppDispatch`. Every value it hands down came from a named Selector, and
 * every callback it hands down is a `dispatch`. It owns no markup beyond the
 * single `PlanFragment` call and the two destination slots that Fragment takes.
 *
 * ## Why one Page dispatches into four slices
 *
 * A Page is the one artifact allowed to compose across features (`RC-37`), and
 * the shell's own `MainShellPage` already does it and says why. Plan needs it
 * four times, and each is a seam another child built *for* this one:
 *
 *  - `plan` — everything about the day, the edit session and the ghost.
 *  - `capture` — `userDidRequestCapture({ kind, now, initialStart })`, whose
 *    own doc names this call site: *"`initialStart` is the Plan timeline's
 *    press-to-create slot"*. The prompt itself is KC-IS-#24's.
 *  - `endeavorDetail` — `onDetailRequested({ endeavor })`, that slice's stated
 *    entry point for *"another surface [that] asks for Detail"*. The sheet is
 *    KC-IS-#30's.
 *  - `platform` — `vibrateForTimelineHoldThunk`, which KC-IS-#34 built for
 *    exactly this gesture and describes as *"canon's single haptic site"*.
 *    Being a Service, the vibrator is unreachable from a component (`RC-3`,
 *    `RC-6`); the Producer is the only door, and this is the only caller.
 *
 * ## The clock is dispatched, never read in a Selector
 *
 * `PlanState.now` is an injected wall clock — #18's first field, with the note
 * *"never read from `Date.now()` inside this feature"*. So the minute tick is
 * an effect here that dispatches `onClockTicked({ now })`, and the now line,
 * the "is this past" test and the day-picker's today letter all read that one
 * value. A component calling `new Date()` at render would make every one of
 * those disagree with the others by up to a frame.
 *
 * ## Two props, and why they are booleans rather than a connection object
 *
 * The Google connection has no home in the Plan slice — that file is KC-IS-#18's
 * and outside this child's lane — and a Page may not import a Service to ask
 * for it (`RC-6`; `check-uzf-boundaries.mjs` refuses the import outright). So
 * the route resolves it server-side, exactly as `resolveGoogleConnection`'s own
 * header anticipates (*"what a Producer or a page prefetch wants"*), and hands
 * the answer down as plain props — which is the shape `RC-38` sanctions for a
 * Server Page's prefetch. See the PR body for what a slice-resident connection
 * would add, and why it belongs to the child that owns those files.
 */
import type { Endeavor, EndeavorOperation, PlanListGrouping, PlanListSort } from '@kro/core'
import {
  planListGroupingOption,
  planListSortOption,
} from '@kro/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FABMenuEntry } from '../../../design/chrome'
import { presentationFor } from '../../main/MainPresentation'
import { useSurfaceLayout } from '../../main/useSurfaceLayout'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  PopoverContent,
  Popover,
  PopoverAnchor,
} from '../../../design/system/primitives/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../../design/system/primitives/sheet'
import { CaptureKind, captureKindLabel } from '../../capture/CaptureRules'
import { userDidRequestCapture } from '../../capture/CaptureFeature'
import { onDetailRequested } from '../../endeavorDetail/EndeavorDetailFeature'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { navigateToDestinationThunk } from '../../main/MainProducer'
import { DestinationKind } from '../../main/SidebarDestination'
import {
  loadSettingsThunk,
  updateSettingThunk,
} from '../../settings/SettingsProducer'
import { vibrateForTimelineHoldThunk } from '../../platform/PlatformProducer'
import {
  onViewLoaded,
  onClockTicked,
  userDidAssignToQuadrant,
  userDidDragEditHandle,
  userDidGrabEditHandle,
  userDidHoldEventBlock,
  userDidPressTimelineSlot,
  userDidReleaseEditHandle,
  userDidSelectDate,
  userDidSelectViewMode,
  userDidStepDay,
  userDidTapOutsideEditingBlock,
  userDidToggleVisibility,
} from '../PlanFeature'
import {
  type TimelineDragHandle,
  timelineEditableEnd,
} from '../PlanEditSession'
import { PlanViewMode } from '../PlanNavigation'
import {
  loadPlanDayThunk,
  loadPlanMatrixThunk,
  preloadPlanDaysThunk,
  updateEventTimeThunk,
} from '../PlanProducer'
import {
  selectPlanMatrixItems,
  selectPlanMatrixPickerCandidates,
  selectPlanVista,
  selectCanRefreshPlan,
  selectIsPlanActivityIndicated,
  selectIsPlanFabAvailable,
  selectIsPlanFabGlowActive,
  selectIsPlanQuickCreateAvailable,
  selectIsPlanShowingToday,
  selectPlanAuthoritativeEvents,
  selectPlanDayPickerDates,
  selectPlanEditPreview,
  selectPlanEditingEndeavorId,
  selectPlanHourBand,
  selectPlanNow,
  selectPlanQuickCreateDraft,
  selectPlanSelectedDate,
  selectPlanSlotCount,
  selectPlanTimelineEvents,
  selectPlanTimelinePlacements,
  selectPlanViewMode,
} from '../PlanSelectors'
import { PlanLoadReason } from '../PlanState'
import { timelineSlotStart } from '../TimelineSlots'
import { PlanListFragment } from './list/PlanListFragment'
import { deletePlanEndeavorThunk } from './list/PlanListProducer'
import {
  selectPlanListGrouping,
  selectPlanListSections,
  selectPlanListSort,
  selectPlanRowCapabilities,
} from './list/PlanListSelectors'
import { PlanMatrixFragment } from './matrix/PlanMatrixFragment'
import {
  type PlanMatrixQuadrant,
  eisenhowerQuadrantFor,
} from './matrix/planMatrixPresentation'
import { PickEndeavorFragment } from './picker/PickEndeavorFragment'
import { PlanVisibilityFragment } from './visibility/PlanVisibilityFragment'
import {
  DAY_PICKER_HEIGHT,
  PlanDayPickerFragment,
} from './PlanDayPickerFragment'
import { PLAN_SCROLL_BOTTOM_INSET, PlanFragment } from './PlanFragment'
import { TimelineFragment } from './timeline/TimelineFragment'

/** `PlanLayoutMetrics.dayPickerTopGap` + `topBreathingRoom`, canon's two gaps. */
const DAY_PICKER_TOP_GAP = 8
const TOP_BREATHING_ROOM = 14

/**
 * `PlanLayoutMetrics.topContentInset` for this shell.
 *
 * Canon folds the navigation bar and the large title in because its canvas
 * runs edge to edge under both. Here the header is a normal block above the
 * canvas, so the only chrome the content has to clear is the floating picker
 * itself plus canon's own two gaps.
 */
export const PLAN_TIMELINE_TOP_INSET =
  DAY_PICKER_TOP_GAP + DAY_PICKER_HEIGHT + TOP_BREATHING_ROOM

/** How often the injected clock advances. Canon's Plan ticks on the minute. */
const CLOCK_TICK_MS = 60_000

export interface PlanPageProps {
  /**
   * Whether the Google grant has stopped working — the route's server-side
   * `resolveGoogleConnection`, reduced to the one question canon's reconnect
   * banner asks (`googleCalendarNeedsReconnect`).
   */
  readonly googleNeedsReconnect?: boolean
  /** The reason, for the banner's supporting line. */
  readonly googleReconnectDetail?: string | null
  /**
   * Canon's `lastSyncedLabel` — the rate-limit line, already composed. `null`
   * hides the banner, which is the shipping state until a slice holds the sync
   * error (see the header note and the PR body).
   */
  readonly staleSyncLabel?: string | null
  /**
   * What the reconnect banner's button does.
   *
   * Supplied by `apps/web`, not performed here: starting the OAuth flow is a
   * full-document navigation to `/api/google/connect`, and `RC-17` keeps every
   * navigation out of a component. The platform shell is where a `window` call
   * belongs (`RC-40`, `RC-48`), and taking it as a callback is also what makes
   * the banner assertable without a jsdom navigation stub.
   */
  readonly onTapReconnect?: () => void
}

export function PlanPage({
  googleNeedsReconnect = false,
  googleReconnectDetail = null,
  staleSyncLabel = null,
  onTapReconnect = () => {},
}: PlanPageProps) {
  const dispatch = useAppDispatch()
  const surface = useSurfaceLayout()

  const now = useAppSelector(selectPlanNow)
  const selectedDate = useAppSelector(selectPlanSelectedDate)
  const viewMode = useAppSelector(selectPlanViewMode)
  const dayPickerDates = useAppSelector(selectPlanDayPickerDates)
  const isShowingToday = useAppSelector(selectIsPlanShowingToday)
  const band = useAppSelector(selectPlanHourBand)
  const slotCount = useAppSelector(selectPlanSlotCount)
  const placements = useAppSelector(selectPlanTimelinePlacements)
  const events = useAppSelector(selectPlanTimelineEvents)
  const authoritative = useAppSelector(selectPlanAuthoritativeEvents)
  const isQuickCreateAvailable = useAppSelector(selectIsPlanQuickCreateAvailable)
  const quickCreate = useAppSelector(selectPlanQuickCreateDraft)
  const editingEndeavorId = useAppSelector(selectPlanEditingEndeavorId)
  const editPreview = useAppSelector(selectPlanEditPreview)
  const isActivityIndicated = useAppSelector(selectIsPlanActivityIndicated)
  const canRefresh = useAppSelector(selectCanRefreshPlan)
  const isFabAvailable = useAppSelector(selectIsPlanFabAvailable)
  const isFabGlowActive = useAppSelector(selectIsPlanFabGlowActive)
  const visibility = useAppSelector((state) => state.plan.visibility)
  const vista = useAppSelector(selectPlanVista)

  // KC-IS-#20's destinations.
  const listSections = useAppSelector(selectPlanListSections)
  const listGrouping = useAppSelector(selectPlanListGrouping)
  const listSort = useAppSelector(selectPlanListSort)
  const rowCapabilities = useAppSelector(selectPlanRowCapabilities)
  const matrixItems = useAppSelector(selectPlanMatrixItems)
  const pickerCandidates = useAppSelector(selectPlanMatrixPickerCandidates)

  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false)
  /**
   * Which quadrant the add-existing picker is open for, or `null`.
   *
   * Presentation state, exactly like `isVisibilityOpen` above: canon models the
   * picker as a *presented* child (`@Presents var pickEndeavor`) whose lifetime
   * is the sheet's, and the search string and selection inside it live in the
   * Fragment for the same reason (see its header). Nothing derived from either
   * survives dismissal.
   */
  const [pickerQuadrant, setPickerQuadrant] = useState<PlanMatrixQuadrant | null>(
    null,
  )

  /**
   * The route mounted.
   *
   * `DestinationPage` sent this for every destination while they were all
   * placeholders, and it is what makes the URL the authority: a pasted link, a
   * back step and a forward step all arrive as a fresh mount, and the shell's
   * sidebar highlight, heading and tab selection follow without any component
   * reading a router (`RC-17`, `RC-63`). Replacing that placeholder with a real
   * Page means this Page now owns the signal — a Page is the one artifact
   * allowed to dispatch across slices (`RC-37`), which is the same allowance
   * `MainShellPage` uses to consume the capture slice's routing one-shot.
   *
   * Without it the shell keeps whatever it was last told, which is exactly the
   * defect the first screenshot pass caught: `/plan` served the timeline under
   * a header still reading "My Day".
   */
  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({ destination: { kind: DestinationKind.plan } }),
    )
  }, [dispatch])

  // Mount: stamp the clock and the day, then read the authoritative day and
  // its read-ahead window. Canon's `.task { store.send(.started) }`.
  useEffect(() => {
    const today = new Date()
    dispatch(
      onViewLoaded({
        now: today,
        selectedDate: today,
        // The flag is cached in the slice at `onViewLoaded` exactly as canon
        // caches it, so no Selector ever reaches for a flag service. Reading
        // it here would need the Service this Page may not import (`RC-6`);
        // the slice's own default is `statusQuo`, which ships it enabled.
        isQuickEventCreationEnabled: true,
      }),
    )
  }, [dispatch])

  // The minute clock. A dispatched tick rather than a `new Date()` at render,
  // so every consumer of `now` agrees.
  useEffect(() => {
    const timer = setInterval(
      () => dispatch(onClockTicked({ now: new Date() })),
      CLOCK_TICK_MS,
    )
    return () => clearInterval(timer)
  }, [dispatch])

  // Every selected day reads its own events and re-centres the buffer. The
  // effects are aborted on supersession, which is the one silent exit
  // (`UZF-14`) — a day the user has already left must not paint.
  useEffect(() => {
    const day = dispatch(
      loadPlanDayThunk({ day: selectedDate, reason: PlanLoadReason.appWide }),
    )
    const window = dispatch(preloadPlanDaysThunk({ center: selectedDate }))
    return () => {
      day.abort()
      window.abort()
    }
  }, [dispatch, selectedDate])

  /*
    The endeavor POOL — the whole local mirror, read fresh on entry.

    Canon's reason for the matrix having its own query is *"the matrix must
    receive fresh recurrence evidence on every visit"*, and the LIST needs the
    same pool for a different reason: the day's own fetch is start-driven and
    cannot return an untimed task due today (`PlanHosts`: *"Endeavors with no
    `start` are not returned"*), while canon's list is explicitly timed rows
    **plus** those. The picker draws its candidates from the same pool. So the
    one load serves three consumers, and the timeline — which wants only the
    day's range — still does not pay for it.
  */
  useEffect(() => {
    if (
      viewMode !== PlanViewMode.priorityMatrix &&
      viewMode !== PlanViewMode.list
    ) {
      return
    }
    const effect = dispatch(loadPlanMatrixThunk())
    return () => effect.abort()
  }, [dispatch, viewMode])

  /*
    The two Plan list preferences.

    Canon reads them at `.started` from the preferences provider
    (`provider.pick(.planListSort)`). On this stack the provider is the settings
    slice, and `loadSettingsThunk` is idempotent — it re-reads the whole
    snapshot from the local store — so dispatching it here costs one read and
    means the list opens on the user's saved modes rather than on the declared
    defaults. `selectPlanListSort` / `selectPlanListGrouping` fall back to those
    defaults until it lands, so nothing renders undefined in the meantime.
  */
  useEffect(() => {
    const effect = dispatch(loadSettingsThunk())
    return () => effect.abort()
  }, [dispatch])

  const onTapRefresh = useCallback(() => {
    // Canon's `guard !state.isRefreshing`, read before dispatching rather than
    // re-flipped in an arm the thunk's `.pending` already owns.
    if (!canRefresh) return
    void dispatch(
      loadPlanDayThunk({ day: selectedDate, reason: PlanLoadReason.manual }),
    )
  }, [canRefresh, dispatch, selectedDate])

  const onViewDetail = useCallback(
    (endeavor: Endeavor) => {
      dispatch(onDetailRequested({ endeavor }))
    },
    [dispatch],
  )

  /* --------------------------------------------------- KC-IS-#20 wiring */

  /**
   * Everything Plan has fetched, by id — the pool the list rows, the matrix
   * cards and the picker all name their targets from.
   *
   * The authoritative day comes first so an optimistically-edited row wins over
   * the mirror's older copy of the same id.
   */
  const endeavorsById = useMemo(() => {
    const index = new Map<string, Endeavor>()
    for (const endeavor of pickerCandidates) index.set(endeavor.id, endeavor)
    for (const endeavor of authoritative) index.set(endeavor.id, endeavor)
    return index
  }, [authoritative, pickerCandidates])

  const openDetailFor = useCallback(
    (endeavorId: string) => {
      const endeavor = endeavorsById.get(endeavorId)
      if (endeavor === undefined) return
      dispatch(onDetailRequested({ endeavor }))
    },
    [dispatch, endeavorsById],
  )

  /**
   * A row gesture, routed to the one place that serves it.
   *
   * `.planDay` declares three operations and each has a different owner:
   *
   *  - **viewDetail** — `endeavorDetail`'s own entry point, the same one the
   *    timeline's card tap uses.
   *  - **delete** — `deletePlanEndeavorThunk`, then a re-read of the two arrays
   *    that hold the row. The thunk has no reducer arm on purpose (see its
   *    header): re-reading is what keeps the day and the pool from disagreeing
   *    about what still exists.
   *  - **startSession** — canon sends `.main(.onUserWantsToStartEvent(endeavor,
   *    nil))` and Main presents the Session surface for that endeavor. The web
   *    has the destination but not the hand-off — session setup takes its
   *    identity from KC-IS-#22's surface, which is in flight — so this
   *    navigates to Execute and the endeavor is **not** carried. Named as a
   *    divergence in the PR body and reported as a cross-lane need; a control
   *    that goes to the right screen is honest, a control that does nothing is
   *    not.
   *
   * Anything else the registry grows is ignored rather than guessed at.
   */
  const onRowOperation = useCallback(
    (operation: EndeavorOperation, endeavorId: string) => {
      if (operation === 'viewDetail') {
        openDetailFor(endeavorId)
        return
      }

      if (operation === 'delete') {
        void dispatch(
          deletePlanEndeavorThunk({ endeavorId, now: new Date() }),
        ).then(() => {
          void dispatch(
            loadPlanDayThunk({
              day: selectedDate,
              reason: PlanLoadReason.manual,
            }),
          )
          void dispatch(loadPlanMatrixThunk())
        })
        return
      }

      if (operation === 'startSession') {
        void dispatch(
          navigateToDestinationThunk({
            destination: { kind: DestinationKind.session },
          }),
        )
      }
    },
    [dispatch, openDetailFor, selectedDate],
  )

  /** One preference write, through the same Producer the Settings pane uses. */
  const onSelectGrouping = useCallback(
    (grouping: PlanListGrouping) => {
      void dispatch(
        updateSettingThunk({ key: planListGroupingOption.key, value: grouping }),
      )
    },
    [dispatch],
  )

  const onSelectSort = useCallback(
    (sort: PlanListSort) => {
      void dispatch(
        updateSettingThunk({ key: planListSortOption.key, value: sort }),
      )
    },
    [dispatch],
  )

  /**
   * Canon's `onAddNewToMatrixQuadrant: onAddNewTask` — the capture prompt,
   * pre-set to Task. The quadrant is deliberately NOT carried: canon does not
   * carry it either, because the new task lands in the quadrant its due date
   * and value put it in, and inventing a pre-assignment would make the board
   * disagree with `PlanMatrixResolution`.
   */
  const onAddNewToQuadrant = useCallback(() => {
    dispatch(
      userDidRequestCapture({
        kind: CaptureKind.task,
        now,
        initialStart: null,
      }),
    )
  }, [dispatch, now])

  /**
   * Confirming the picker — canon's `.picked(endeavors, quadrant)` arm, one
   * dispatch per row.
   *
   * `userDidAssignToQuadrant` resolves each endeavor into the quadrant with
   * #18's deterministic assignment (the due date and value that make the
   * *derived* classification come out as that quadrant) and replaces every
   * fetched copy together. Canon follows it with a persist effect
   * (`produceMatrixResolvedEffect`); no such Producer exists in this feature
   * yet, so the assignment is in-memory until the next write — reported as a
   * cross-lane need in the PR body.
   */
  const onConfirmPicker = useCallback(
    (endeavorIds: readonly string[]) => {
      const quadrant = pickerQuadrant
      if (quadrant === null) return
      for (const endeavorId of endeavorIds) {
        dispatch(
          userDidAssignToQuadrant({
            endeavorId,
            quadrant: eisenhowerQuadrantFor(quadrant),
          }),
        )
      }
      setPickerQuadrant(null)
    },
    [dispatch, pickerQuadrant],
  )

  const onHoldBlock = useCallback(
    (endeavor: Endeavor) => {
      dispatch(userDidHoldEventBlock({ endeavorId: endeavor.id }))
      // Canon buzzes on entering edit mode, and on a platform with no vibrator
      // the Producer resolves `ok(false)` rather than failing — so this is
      // silent where the API is absent, never conditional here.
      void dispatch(vibrateForTimelineHoldThunk())
    },
    [dispatch],
  )

  const onGrabHandle = useCallback(
    (handle: TimelineDragHandle) => {
      dispatch(userDidGrabEditHandle({ handle }))
    },
    [dispatch],
  )

  const onDragHandle = useCallback(
    (translationPx: number) => {
      dispatch(userDidDragEditHandle({ translationPx }))
    },
    [dispatch],
  )

  const onReleaseHandle = useCallback(() => {
    dispatch(userDidReleaseEditHandle())
  }, [dispatch])

  /**
   * Commit — canon's `exitEditMode`.
   *
   * The times are read *before* the arm runs, because the arm clears the
   * session. The row itself comes from the authoritative array rather than
   * from `selectPlanTimelineEvents`, which already has the draft substituted
   * into it — persisting that copy would write the preview's own rescheduling
   * twice.
   */
  const onTapOutsideEditing = useCallback(() => {
    const endeavor =
      editingEndeavorId === null
        ? undefined
        : authoritative.find((candidate) => candidate.id === editingEndeavorId)
    const preview = editPreview

    dispatch(userDidTapOutsideEditingBlock())

    if (endeavor === undefined || preview === null) return
    // The SAME `end` the session was armed with — `end ?? start + (duration ??
    // 3600)`. Comparing against `duration ?? 0` instead would make a
    // durationless event look moved on every release and write on a gesture
    // that changed nothing.
    const originalStart = endeavor.start?.getTime() ?? null
    const originalEnd = timelineEditableEnd(endeavor)?.getTime() ?? null
    // Canon writes only when something moved: *"a hold-then-release with no
    // drag is not an edit and must not dirty the row."*
    if (
      originalStart === preview.start.getTime() &&
      originalEnd === preview.end.getTime()
    ) {
      return
    }
    void dispatch(
      updateEventTimeThunk({
        endeavor,
        start: preview.start,
        end: preview.end,
        /*
          `new Date()`, NOT the injected `now` — and the difference is the
          point, so it is written here rather than left to look like an
          oversight.

          Two different clocks are in play. `PlanState.now` is **domain time**:
          it ticks on the minute and every surface that renders "when" reads
          it, which is why the ghost, the now line and the is-this-past test
          all take it and therefore always agree with one another. This
          argument is **write time** — it becomes the row's
          `updatedAtEpochMillis`, the watermark last-write-wins sync compares
          (`SyncBookkeeping`). A watermark taken from a minute-ticked clock can
          be up to 60 s stale, and two edits made a minute apart could stamp
          the *same* value, which is precisely the comparison sync must not be
          handed.

          `MainShellPage` supplies `new Date()` to `createProjectThunk` and
          `deleteProjectThunk` for the same reason, and the Producer takes the
          instant as an argument (rather than reading one) so a test still
          asserts on the write it asked for.
        */
        now: new Date(),
      }),
    )
  }, [authoritative, dispatch, editPreview, editingEndeavorId])

  /**
   * Empty canvas — seed the ghost, then open the prompt pre-set to Event.
   *
   * The order is canon's, and its comment says why: *"mark the slot first so
   * the uncommitted block is already on screen behind the prompt as it rises."*
   * The haptic fires only for the hold — *"a double-tap already confirms itself
   * visually and needs no buzz."*
   */
  const onPressSlot = useCallback(
    (index: number, isHold: boolean) => {
      if (!isQuickCreateAvailable) return
      dispatch(userDidPressTimelineSlot({ index, startHour: band.start }))
      if (isHold) void dispatch(vibrateForTimelineHoldThunk())
      dispatch(
        userDidRequestCapture({
          kind: CaptureKind.event,
          now,
          // The slot's own moment, so the prompt opens already scheduled —
          // the exact case `userDidRequestCapture`'s doc names. Derived from
          // the same `timelineSlotStart` the slice used, rather than re-read
          // from state, so the ghost and the prompt cannot disagree.
          initialStart: timelineSlotStart(index, selectedDate, band.start),
        }),
      )
    },
    [band.start, dispatch, isQuickCreateAvailable, now, selectedDate],
  )

  const fabItems = useMemo<readonly FABMenuEntry[]>(() => {
    const entries = [
      { kind: CaptureKind.task, glyph: 'checkmark' },
      { kind: CaptureKind.event, glyph: 'calendar' },
      { kind: CaptureKind.reminder, glyph: 'bell' },
      { kind: CaptureKind.habit, glyph: 'repeat' },
    ] as const
    return entries.map(({ kind, glyph }) => ({
      id: kind,
      label: captureKindLabel(kind),
      glyph,
      onSelect: () =>
        dispatch(userDidRequestCapture({ kind, now, initialStart: null })),
    }))
  }, [dispatch, now])

  const presentation = presentationFor('visibility', surface)

  /*
    The lens panel, now driven by the vista rather than by a fixed section list.

    `PlanVisibilityFragment` renders exactly what `.planDay` declares in
    `lens.exposes` (kinds · hosts · calendars · computed states) and reuses
    KC-IS-#19's own rows to do it — see its header. The swap is what makes
    acceptance criterion 3 structural instead of coincidental.
  */
  const panel = (
    <PlanVisibilityFragment
      vista={vista}
      visibility={visibility}
      onToggle={(toggle) => dispatch(userDidToggleVisibility(toggle))}
    />
  )

  const visibilityPanel =
    presentation.kind === 'popover' ? (
      <Popover open onOpenChange={(open) => setIsVisibilityOpen(open)}>
        <PopoverAnchor className="absolute top-0 right-kro-medium" />
        <PopoverContent
          align="end"
          data-testid="plan-visibility-popover"
          style={{
            width: presentation.size?.width,
            maxHeight: presentation.size?.height,
            overflowY: 'auto',
          }}
        >
          {panel}
        </PopoverContent>
      </Popover>
    ) : (
      <Sheet open onOpenChange={(open) => setIsVisibilityOpen(open)}>
        <SheetContent side="bottom" data-testid="plan-visibility-sheet">
          <SheetTitle>Visibility</SheetTitle>
          <SheetDescription>
            Choose which endeavors this day shows.
          </SheetDescription>
          {panel}
        </SheetContent>
      </Sheet>
    )

  /* The five-day picker, shared by the two day-scoped destinations. */
  const dayPicker = (
    <PlanDayPickerFragment
      dates={dayPickerDates}
      selectedDate={selectedDate}
      now={now}
      onSelectDate={(date) => dispatch(userDidSelectDate({ date }))}
      onStepDay={(days) => dispatch(userDidStepDay({ days }))}
      className="pt-kro-small"
    />
  )

  const timeline = (
    <TimelineFragment
      placements={placements}
      selectedDate={selectedDate}
      now={now}
      band={band}
      isShowingToday={isShowingToday}
      slotCount={slotCount}
      isQuickCreateAvailable={isQuickCreateAvailable}
      quickCreate={quickCreate}
      editingEndeavorId={editingEndeavorId}
      topInsetPx={PLAN_TIMELINE_TOP_INSET}
      bottomInsetPx={PLAN_SCROLL_BOTTOM_INSET}
      overlay={dayPicker}
      onViewDetail={onViewDetail}
      onHoldBlock={onHoldBlock}
      onGrabHandle={onGrabHandle}
      onDragHandle={onDragHandle}
      onReleaseHandle={onReleaseHandle}
      onTapOutsideEditing={onTapOutsideEditing}
      onPressSlot={onPressSlot}
    />
  )

  const list = (
    <PlanListFragment
      sections={listSections}
      capabilities={rowCapabilities}
      grouping={listGrouping}
      sort={listSort}
      now={now}
      topInsetPx={PLAN_TIMELINE_TOP_INSET}
      bottomInsetPx={PLAN_SCROLL_BOTTOM_INSET}
      overlay={dayPicker}
      onSelectGrouping={onSelectGrouping}
      onSelectSort={onSelectSort}
      onOperation={onRowOperation}
      onOpenDetail={openDetailFor}
    />
  )

  /*
    The matrix carries NO day picker: it is not a day view. Canon keeps its
    query separate for the same reason, and #18's `selectPlanMatrixItems` reads
    the whole pool rather than the selected day.
  */
  const matrix = (
    <PlanMatrixFragment
      items={matrixItems}
      onAddNew={onAddNewToQuadrant}
      onAddExisting={setPickerQuadrant}
      onTapItem={openDetailFor}
    />
  )

  /*
    The add-existing picker, presented the way this shell presents a browsing
    list: a sheet on the handheld shell, a popover-sized panel on the desktop
    one. `PresentationSurface.inbox` is the frame borrowed — canon has no Mac
    popover for the picker (it pushes a navigation destination), and the Inbox
    is the shell constant for *"a list you pick from"*. Adding a `pickEndeavor`
    surface to `MainPresentation.ts` is a cross-lane follow-up.
  */
  const pickerPresentation = presentationFor('inbox', surface)

  const pickerContent =
    pickerQuadrant === null ? null : (
      <PickEndeavorFragment
        quadrant={pickerQuadrant}
        endeavors={pickerCandidates}
        grouping={listGrouping}
        now={now}
        onConfirm={onConfirmPicker}
        onDismiss={() => setPickerQuadrant(null)}
        onViewDetail={openDetailFor}
      />
    )

  const picker =
    pickerQuadrant === null ? null : pickerPresentation.kind === 'popover' ? (
      <Popover
        open
        onOpenChange={(open) => {
          if (!open) setPickerQuadrant(null)
        }}
      >
        <PopoverAnchor className="absolute top-0 right-kro-medium" />
        <PopoverContent
          align="end"
          data-testid="plan-picker-popover"
          style={{
            width: pickerPresentation.size?.width,
            maxHeight: pickerPresentation.size?.height,
            overflowY: 'auto',
          }}
        >
          {pickerContent}
        </PopoverContent>
      </Popover>
    ) : (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) setPickerQuadrant(null)
        }}
      >
        <SheetContent
          side="bottom"
          data-testid="plan-picker-sheet"
          className="max-h-[85vh] overflow-y-auto"
        >
          <SheetTitle>Add existing</SheetTitle>
          <SheetDescription>
            Choose tasks to move into this quadrant.
          </SheetDescription>
          {pickerContent}
        </SheetContent>
      </Sheet>
    )

  return (
    <>
    {picker}
    <PlanFragment
      selectedDate={selectedDate}
      eventCount={events.length}
      viewMode={viewMode}
      onSelectViewMode={(mode) => dispatch(userDidSelectViewMode({ mode }))}
      // The seam KC-IS-#19 left: two props, one call site, and nothing under
      // `pages/timeline/**` moved to fill it.
      destinations={{ timeline, list, matrix }}
      staleSyncLabel={staleSyncLabel}
      needsReconnect={googleNeedsReconnect}
      reconnectDetail={googleReconnectDetail}
      onTapReconnect={onTapReconnect}
      isActivityIndicated={isActivityIndicated}
      onTapRefresh={onTapRefresh}
      visibility={visibility}
      isVisibilityOpen={isVisibilityOpen}
      onToggleVisibilityPanel={setIsVisibilityOpen}
      visibilityPanel={visibilityPanel}
      isFabAvailable={isFabAvailable}
      isFabGlowActive={isFabGlowActive}
      fabItems={fabItems}
    />
    </>
  )
}
