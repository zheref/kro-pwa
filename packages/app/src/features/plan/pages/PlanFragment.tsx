'use client'

/**
 * The Plan surface — the port of `PlanScreen`'s header and `PlanView`'s
 * destination container, as one pure Fragment (`RC-15`: it dispatches nothing).
 *
 * It owns the four things that are true of Plan whichever destination is on
 * screen: the title and mode selector, the status banners, the destination
 * container with its directional slide, and the quick-action button. The
 * destinations themselves arrive as slots.
 *
 * ## The seam KC-IS-#20 plugs into
 *
 * `destinations` is `{ timeline, list?, matrix? }`. This child ships `timeline`
 * and leaves the other two absent, which renders an honest placeholder naming
 * the issue that fills them. #20 supplies `list` and `matrix` — **two props on
 * this Fragment and one call site in `PlanPage`** — and opens no file under
 * `pages/timeline/**`, touches no gesture, and re-derives no geometry. The
 * slide direction, the wrap-around, the FAB rule and the banner column are all
 * here and all mode-agnostic, so they serve the two new destinations without
 * an edit.
 *
 * ## The FAB stands down over the matrix, and so does its glow
 *
 * Canon: *"the tab-aware quick-action button […] stands down over Plan's
 * priority matrix"*, because *"the matrix hides the FAB outright (each quadrant
 * carries its own add actions), so a glow there would be lighting up
 * nothing."* Both answers come from #18's `isPlanFabAvailable` /
 * `isPlanFabGlowActive` rather than from a second rule written here.
 *
 * ## The toolbar controls find their own outlet
 *
 * The shell exposes four placements but a given shell only renders two of them
 * — `navigation`/`primary` on the sidebar, `leading`/`trailing` on the tab bar.
 * Rather than branch on the shell shape (which would mean reading another
 * feature's Selector for a layout question), each control asks
 * `useToolbarOutletPresent` and takes the first placement that exists, falling
 * back to the header itself when there is no shell at all — which is what a
 * story and a render test mount.
 */
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import {
  CHROME_LAYOUT,
  FAB_INSETS,
  type FABMenuEntry,
  GLOW_SHAPES,
  LiquidGlassFABMenu,
  settleMs,
  springEasing,
} from '../../../design/chrome'
import { ICON_SIZE } from '../../../design/system/icons/icons'
import { PageFieldEmpty } from '../../../design/system/gradient/OnGradient'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { cn } from '../../../design/system/utils/cn'
import {
  type ToolbarPlacement,
  ToolbarSlot,
  useToolbarOutletPresent,
} from '../../main/ToolbarSlots'
import type { PlanViewMode } from '../PlanNavigation'
import { PlanViewMode as Mode } from '../PlanNavigation'
import type { PlanVisibility } from '../PlanState'
import { PlanBannersFragment } from './PlanBannersFragment'
import { PlanViewModePickerFragment } from './PlanViewModePickerFragment'
import { areAllPlanFiltersEnabled } from './PlanVisibilityPanelFragment'
import {
  type PlanModeEdge,
  planModeEntryEdge,
  planModeOffsetPercent,
} from './planModeTransition'
import {
  planEventCountLabel,
  planTitleDate,
  planTitleWeekday,
} from './timeline/timelineFormat'
import { useReducedMotionPreference } from './timeline/useTimelineGestures'

/**
 * `FAB_INSETS.modern.trailing`, both axes.
 *
 * Canon's **bottom** inset (53pt) is tab-bar clearance: its FAB floats *over*
 * the bar. This shell renders the tab bar as a sibling of the destination, so
 * the destination's own box already ends above it — re-applying canon's number
 * would park the button a bar's height above nothing.
 */
export const PLAN_FAB_INSET = FAB_INSETS.modern.trailing

/**
 * `PlanLayoutMetrics.scrollBottomInset`, recomputed for that same shell.
 *
 * Canon's 152 + 16 is the tab bar plus the button floating above it plus
 * breathing room. Here only the button overlaps the canvas, so the inset is the
 * disc, its two insets, and canon's own `bottomBreathingRoom`.
 */
export const PLAN_SCROLL_BOTTOM_INSET =
  CHROME_LAYOUT.fabDiameter + PLAN_FAB_INSET * 2 + 16

/** `.snappy(duration: 0.28, extraBounce: 0)` — canon's mode-swap spring. */
const SLIDE_SPRING = { response: 0.28, dampingFraction: 1 - 0.15 } as const

/** The destinations Plan can show. `list` and `matrix` are KC-IS-#20's. */
export interface PlanDestinationSlots {
  readonly timeline: ReactNode
  readonly list?: ReactNode
  readonly matrix?: ReactNode
}

export interface PlanFragmentProps {
  readonly selectedDate: Date
  /** The day's visible event count — the title's subtitle. */
  readonly eventCount: number
  readonly viewMode: PlanViewMode
  readonly onSelectViewMode: (mode: PlanViewMode) => void

  readonly destinations: PlanDestinationSlots

  readonly staleSyncLabel: string | null
  readonly needsReconnect: boolean
  readonly reconnectDetail?: string | null
  readonly onTapReconnect: () => void

  /** `selectIsPlanActivityIndicated` — the ONE activity signal. */
  readonly isActivityIndicated: boolean
  readonly onTapRefresh: () => void

  readonly visibility: PlanVisibility
  readonly isVisibilityOpen: boolean
  readonly onToggleVisibilityPanel: (open: boolean) => void
  /** The lens panel, already wrapped in this shell's sheet or popover. */
  readonly visibilityPanel?: ReactNode

  readonly isFabAvailable: boolean
  readonly isFabGlowActive: boolean
  readonly fabItems: readonly FABMenuEntry[]

  readonly className?: string
}

export function PlanFragment({
  selectedDate,
  eventCount,
  viewMode,
  onSelectViewMode,
  destinations,
  staleSyncLabel,
  needsReconnect,
  reconnectDetail = null,
  onTapReconnect,
  isActivityIndicated,
  onTapRefresh,
  visibility,
  isVisibilityOpen,
  onToggleVisibilityPanel,
  visibilityPanel,
  isFabAvailable,
  isFabGlowActive,
  fabItems,
  className,
}: PlanFragmentProps) {
  const reduceMotion = useReducedMotionPreference()
  const edge = useModeEntryEdge(viewMode)

  const destination =
    viewMode === Mode.timeline
      ? destinations.timeline
      : viewMode === Mode.list
        ? destinations.list
        : destinations.matrix

  const allFiltersEnabled = areAllPlanFiltersEnabled(visibility)

  /*
    Where each toolbar control ends up, resolved ONCE here.

    The shell exposes four placements but a given shell renders only two of
    them — `navigation`/`primary` on the sidebar, `leading`/`trailing` on the
    tab bar. Asking `useToolbarOutletPresent` rather than branching on the
    shell shape keeps this Fragment from reading another feature's Selector
    for a layout question. Resolving here rather than inside each control is
    what lets the fallback row below decide its own presence from the same
    fact, instead of inferring it from an empty DOM.
  */
  const refreshPlacement = useToolbarPlacement('navigation', 'leading')
  const visibilityPlacement = useToolbarPlacement('primary', 'trailing')

  return (
    <section
      data-testid="plan-surface"
      data-view-mode={viewMode}
      aria-label="Plan"
      className={cn('relative flex h-full min-h-0 flex-col', className)}
    >
      {/*
        `kro-gradient-headline` on the whole title block, not `text-kro-fore`.

        Plan's LargeScreenTitle paints the same diagonal indigo→grape clip
        *on the header itself* — My Day's twin. The page field is a vertical
        mesh; this slab is the title's own background. `headerDate` is the one
        token the contrast suite asserts against both gradient stops in both
        themes (`contrastContracts.ts`: *"header date on the fixed indigoGrape
        gradient"*).
      */}
      <header
        data-testid="plan-header"
        className="relative flex shrink-0 items-start justify-between gap-kro-medium px-kro-medium pt-kro-small pb-kro-small"
      >
        <GradientBackdrop
          hardEdge
          clip="bottomTrailing"
          bleed="window"
          data-testid="plan-header-title-slab"
        />
        {/*
          Hierarchy is WEIGHT and SIZE, never opacity. Fading a token that was
          contrast-asserted at full strength spends the very margin the
          assertion measured — the same reason `InlineBanner` fills opaquely
          rather than at canon's 0.12.
        */}
        <div className="relative z-10 min-w-0 kro-gradient-headline">
          <h2 className="truncate font-semibold text-2xl">
            {planTitleDate(selectedDate)}{' '}
            <span className="font-normal">
              {planTitleWeekday(selectedDate)}
            </span>
          </h2>
          <p data-testid="plan-subtitle" className="text-sm">
            {planEventCountLabel(eventCount)}
          </p>
        </div>

        <div className="relative z-10">
          <PlanViewModePickerFragment
            selection={viewMode}
            onSelect={onSelectViewMode}
          />
        </div>
      </header>

      {/*
        The two controls Plan contributes to the shell's toolbar. When the
        shell is present each portals into its outlet and this row is not
        rendered at all; with no shell — a story, a render test — they draw
        here.

        The condition is COMPUTED, not left to `:empty`. A portalled
        `ToolbarSlot` renders `null` at this position, but `:empty` is a
        statement about DOM child nodes, and one stray text node — a formatting
        change, a future sibling, an added comment that JSX does not strip —
        would silently un-collapse a row that is supposed to be gone. Asking
        the same question the controls ask (`useToolbarOutletPresent`) makes
        the row's presence follow from the same fact its children do.
      */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-end gap-kro-small px-kro-medium',
          refreshPlacement !== null && visibilityPlacement !== null && 'hidden',
        )}
      >
        {/*
        The leading refresh control — canon's `ToolbarItem(placement:
        .topBarLeading)`. It IS the activity signal: while anything is in
        flight it becomes a spinner, and canon's own label swaps with it.
      */}
        <ToolbarControl placement={refreshPlacement} testId="plan-refresh-slot">
          <button
            type="button"
            data-testid="plan-refresh"
            data-busy={isActivityIndicated ? 'true' : 'false'}
            aria-label={isActivityIndicated ? 'Syncing' : 'Refresh'}
            aria-busy={isActivityIndicated}
            disabled={isActivityIndicated}
            onClick={onTapRefresh}
            className="flex size-8 items-center justify-center rounded-kro-small border-none bg-transparent text-kro-fore hover:text-kro-accent disabled:cursor-default"
          >
            {isActivityIndicated ? (
              <Loader2
                size={ICON_SIZE.medium}
                aria-hidden="true"
                // The one spinner on this surface. `animate-spin` is a CSS
                // animation, so `motion.css`'s blanket reduced-motion rule
                // already stills it — no second suppression here.
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={ICON_SIZE.medium} aria-hidden="true" />
            )}
          </button>
        </ToolbarControl>

        {/* The visibility eye — canon's `ToolbarItemGroup(placement: .topBarTrailing)`. */}
        <ToolbarControl
          placement={visibilityPlacement}
          testId="plan-visibility-slot"
        >
          <button
            type="button"
            data-testid="plan-visibility-toggle"
            aria-label="Visibility Filters"
            aria-expanded={isVisibilityOpen}
            data-filtered={allFiltersEnabled ? 'false' : 'true'}
            onClick={() => onToggleVisibilityPanel(!isVisibilityOpen)}
            className="flex size-8 items-center justify-center rounded-kro-small border-none bg-transparent text-kro-fore hover:text-kro-accent"
          >
            {allFiltersEnabled ? (
              <Eye size={ICON_SIZE.medium} aria-hidden="true" />
            ) : (
              <EyeOff size={ICON_SIZE.medium} aria-hidden="true" />
            )}
          </button>
        </ToolbarControl>
      </div>

      <PlanBannersFragment
        staleSyncLabel={staleSyncLabel}
        needsReconnect={needsReconnect}
        reconnectDetail={reconnectDetail}
        onTapReconnect={onTapReconnect}
        className="shrink-0 px-kro-medium pb-kro-small"
      />

      <div
        data-testid="plan-destination"
        data-entry-edge={edge}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          key={viewMode}
          className="flex min-h-0 flex-1 flex-col"
          style={
            reduceMotion
              ? undefined
              : {
                  animationName: 'kro-plan-mode-enter',
                  animationDuration: `${settleMs(SLIDE_SPRING)}ms`,
                  animationTimingFunction: springEasing(SLIDE_SPRING),
                  animationFillMode: 'both',
                  // The custom properties the keyframes below interpolate, so
                  // one keyframe rule serves both directions.
                  ['--kro-plan-mode-from' as string]: `${planModeOffsetPercent(
                    edge,
                    'absent',
                  )}%`,
                }
          }
        >
          {destination ?? <PlanModePlaceholder mode={viewMode} />}
        </div>

        {/*
          Declared here rather than in the design system's stylesheet: this
          child's lane does not include `design/system/*.css`, and a keyframe
          is the one piece of the slide that cannot be expressed inline. It is
          scoped by its own name and defined once per mounted surface.
        */}
        <style>{`@keyframes kro-plan-mode-enter {
  from { transform: translateX(var(--kro-plan-mode-from)); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`}</style>
      </div>

      {isFabAvailable && (
        <div
          data-testid="plan-fab"
          className="pointer-events-none absolute right-0 bottom-0 z-30 flex justify-end overflow-visible"
          style={{ padding: PLAN_FAB_INSET }}
        >
          <div className="pointer-events-auto">
            <LiquidGlassFABMenu
              items={fabItems}
              mainGlyph="plus"
              mainAccessibilityLabel="Add"
              glow={{ shape: GLOW_SHAPES.circle, inset: 0 }}
              isGlowActive={isFabGlowActive}
            />
          </div>
        </div>
      )}

      {isVisibilityOpen && visibilityPanel}
    </section>
  )
}

/**
 * Which side the destination on screen arrived from.
 *
 * Canon settles the direction *before* the swap renders
 * (`entryEdge = Self.entryEdge(from: oldMode, to: newMode)` un-animated, then
 * the animated assignment). Here the previous mode is held in a ref and read
 * during the render that first shows the new one, which is the same ordering:
 * the value is already correct on the frame the new destination mounts, so the
 * animation never plays one frame in the wrong direction.
 */
function useModeEntryEdge(mode: PlanViewMode): PlanModeEdge {
  const previous = useRef<PlanViewMode>(mode)
  const edge = useRef<PlanModeEdge>('trailing')

  if (previous.current !== mode) {
    edge.current = planModeEntryEdge(previous.current, mode)
    previous.current = mode
  }

  // Refs rather than state, and the assignment is idempotent: React's Strict
  // Mode renders twice, and the second pass sees `previous.current === mode`
  // and leaves the edge alone. A `useState` here would be correct too, at the
  // cost of a second render on every mode change — for a value that is only
  // ever read during the render that already knows it changed.
  return edge.current
}

/**
 * Which of two placements this shell actually renders, or `null` for neither.
 *
 * A hook rather than a branch inside the control, so the fallback row can read
 * the same answer — see the note at its call site.
 */
function useToolbarPlacement(
  first: ToolbarPlacement,
  second: ToolbarPlacement,
): ToolbarPlacement | null {
  const hasFirst = useToolbarOutletPresent(first)
  const hasSecond = useToolbarOutletPresent(second)
  return hasFirst ? first : hasSecond ? second : null
}

/**
 * A control placed into the shell's toolbar, or drawn where it stands.
 *
 * With no shell at all — a story, a render test — `placement` is `null` and
 * the control renders in place, so it is always reachable and a test never has
 * to mount the whole shell to assert on it.
 */
function ToolbarControl({
  placement,
  testId,
  children,
}: {
  readonly placement: ToolbarPlacement | null
  readonly testId: string
  readonly children: ReactNode
}) {
  if (placement === null) return <span data-testid={testId}>{children}</span>

  return (
    <ToolbarSlot placement={placement}>
      <span data-testid={testId}>{children}</span>
    </ToolbarSlot>
  )
}

/**
 * What LIST and MATRIX render until KC-IS-#20 fills them.
 *
 * Deliberately honest rather than decorative: it names the mode, says the
 * surface is not built yet, and names the issue that builds it. A mocked-up
 * list would be worse than an empty one — it would look shipped.
 */
function PlanModePlaceholder({ mode }: { readonly mode: PlanViewMode }) {
  const label = mode === Mode.list ? 'List' : 'Priority Matrix'

  return (
    <PageFieldEmpty
      data-testid="plan-mode-placeholder"
      data-mode={mode}
      title={label}
      description={`${label} is not built yet — it arrives with the Plan list and priority matrix child (KC-IS-#20). The timeline is the destination this child ships.`}
    />
  )
}
