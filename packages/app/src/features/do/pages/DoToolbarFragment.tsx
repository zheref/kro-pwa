'use client'

/**
 * The Do surface's toolbar controls — the port of BOTH canon toolbar tables:
 * `DoScreen.doToolbar` (compact / iOS) and `MainScreen.macDoToolbar` (desktop).
 *
 * | Mode              | Compact (tab-bar shell)          | Desktop (sidebar shell)                  |
 * |-------------------|----------------------------------|------------------------------------------|
 * | ordinary          | leading: bell                    | navigation: bell (after the shell's Profile) |
 * |                   | trailing: refresh, visibility    | primary: refresh, visibility (before the shell's Inbox) |
 * | mark-complete     | trailing: **Done**               | primary: **Done**                         |
 *
 * Both tables agree on the two things that are easy to get wrong: the bell is
 * **absent** in mark-complete mode (canon guards it with
 * `if !doStore.isInMarkCompleteMode`), and Refresh keeps *exactly* its own
 * footprint while loading — same button, same group, an activity indicator
 * instead of the glyph, and a different label ("Show sync status").
 *
 * ## The notifications split
 *
 * `presentsNotificationsInline` is the one cell that decides it. Inline, the
 * bell **toggles** an anchored panel and never opens it empty ("a second tap on
 * the bell closes the panel the first one opened … with nothing to show, fall
 * through to the same do-nothing the narrow surface performs"). Otherwise the
 * bell raises the scroll intent and the surface jumps to Overdue. Narrowing the
 * window closes an open panel — canon fixes exactly that bug in an `onChange`.
 *
 * ## Why the panels are not Radix poppers
 *
 * The design system measured it and wrote it down: mounting anything built on
 * `@radix-ui/react-popper` costs 5–12 seconds per mount under jsdom, which is
 * why *its own* suites never put a popper panel on screen
 * (`primitives/__tests__/radixEnvironment.tsx`). A toolbar panel that cannot be
 * asserted is worse than one positioned by hand, and both of these are anchored
 * to a known corner of a known bar with a fixed width — there is no collision
 * case a popper would earn its cost on. The compact Visibility presentation
 * still uses the `Sheet` primitive, which is Radix **Dialog** and mounts in
 * milliseconds.
 *
 * `RC-15`: nothing here dispatches. Every control raises a callback, and the
 * two open/closed flags are local view state of the same category as
 * `EndeavorCard`'s popover flags.
 */
import {
  type EndeavorComputedState,
  type EndeavorHost,
  type EndeavorKind,
  endeavorComputedStates,
  endeavorHostDisplayName,
  endeavorHosts,
  endeavorKinds,
} from '@kro/core'
import { Bell, BellDot, Eye, EyeOff, LoaderCircle, RefreshCw } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

/** The wrapper that scopes a control and its panel together — see `AnchoredPanel`. */
const ANCHOR_ATTRIBUTE = 'data-do-toolbar-anchor'
import {
  type EndeavorCardModel,
  KroChip,
  colorTint,
  kindShortLabel,
} from '../../../design/endeavor'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '../../../design/system/primitives/sheet'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { DoSurfaceLayout } from '../../main/DoSurfaceLayout'
import type { ShellShape } from '../../main/DoSurfaceLayout'
import { PRESENTATION_SIZE } from '../../main/MainPresentation'
import { ToolbarSlot, useToolbarOutletPresent } from '../../main/ToolbarSlots'
import type { DoVisibility } from '../DoRules'
import { DoNotificationsFragment } from './DoNotificationsFragment'
import {
  doAllFiltersVisible,
  doComputedStateLabel,
  doNotificationsAccessibilityValue,
  doVisibilityToggled,
} from './doPresentation'

export interface DoToolbarFragmentProps {
  readonly shape: ShellShape
  readonly layout: DoSurfaceLayout
  readonly isInMarkCompleteMode: boolean
  readonly isLoading: boolean
  readonly overdue: readonly EndeavorCardModel[]
  readonly expired: readonly EndeavorCardModel[]
  readonly visibility: DoVisibility
  readonly now: Date
  readonly locale?: string
  readonly onToggleMarkCompleteMode: () => void
  /** The compact surface's scroll-to-Overdue intent. */
  readonly onTapNotifications: () => void
  readonly onRefresh: () => void
  readonly onChangeVisibility: (next: DoVisibility) => void
  readonly className?: string
}

export function DoToolbarFragment(props: DoToolbarFragmentProps) {
  const {
    shape,
    layout,
    isInMarkCompleteMode,
    isLoading,
    overdue,
    expired,
    visibility,
    now,
    locale,
    onToggleMarkCompleteMode,
    onTapNotifications,
    onRefresh,
    onChangeVisibility,
    className,
  } = props

  const [isPanelOpen, setPanelOpen] = useState(false)
  const [isVisibilityOpen, setVisibilityOpen] = useState(false)

  const inline = layout.presentsNotificationsInline
  const badgeCount = overdue.length + expired.length
  const hasNotifications = badgeCount > 0

  /*
    Canon's `onChange(of: presentsNotificationsInline)`. Narrowing the window
    hides the panel through the `isPresented` getter but never runs the setter,
    so the flag stays true and the panel reappears on its own when the window
    widens again. Clear it explicitly.
  */
  useEffect(() => {
    if (!inline) setPanelOpen(false)
  }, [inline])

  const leadingPlacement = shape === 'sidebar' ? 'navigation' : 'leading'
  const trailingPlacement = shape === 'sidebar' ? 'primary' : 'trailing'

  const controlStyle = {
    minWidth: `${layout.minimumControlSide}px`,
    minHeight: `${layout.minimumControlSide}px`,
  }

  const bell = (
    <div className="relative inline-flex" data-do-toolbar-anchor="">
      <ToolbarButton
        label="Notifications"
        accessibilityValue={doNotificationsAccessibilityValue({
          presentsInline: inline,
          overdueCount: overdue.length,
          expiredCount: expired.length,
        })}
        expanded={inline ? isPanelOpen : undefined}
        style={controlStyle}
        onClick={() => {
          if (!inline) {
            onTapNotifications()
            return
          }
          // Toggle, not set — and never present an empty panel.
          if (isPanelOpen) setPanelOpen(false)
          else if (hasNotifications) setPanelOpen(true)
        }}
      >
        {hasNotifications ? (
          <BellDot
            size={20}
            aria-hidden="true"
            data-testid="do-bell-badged"
            style={{ color: colorVar('kroRed') }}
          />
        ) : (
          <Bell size={20} aria-hidden="true" />
        )}
      </ToolbarButton>

      {inline && isPanelOpen ? (
        <AnchoredPanel align="start" onDismiss={() => setPanelOpen(false)}>
          <DoNotificationsFragment
            overdue={overdue}
            expired={expired}
            now={now}
            locale={locale}
            onDismiss={() => setPanelOpen(false)}
          />
        </AnchoredPanel>
      ) : null}
    </div>
  )

  const refresh = (
    <ToolbarButton
      label={isLoading ? 'Show sync status' : 'Refresh'}
      style={controlStyle}
      onClick={onRefresh}
    >
      {isLoading ? (
        <LoaderCircle
          size={20}
          aria-hidden="true"
          data-testid="do-refresh-spinner"
          className="motion-safe:animate-spin"
        />
      ) : (
        <RefreshCw size={20} aria-hidden="true" />
      )}
    </ToolbarButton>
  )

  const allVisible = doAllFiltersVisible(visibility)
  const visibilityControl = (
    <div className="relative inline-flex" data-do-toolbar-anchor="">
      <ToolbarButton
        label="Visibility Filters"
        expanded={isVisibilityOpen}
        style={controlStyle}
        onClick={() => setVisibilityOpen(!isVisibilityOpen)}
      >
        {allVisible ? (
          <Eye size={20} aria-hidden="true" />
        ) : (
          <EyeOff size={20} aria-hidden="true" data-testid="do-visibility-filtered" />
        )}
      </ToolbarButton>

      {inline && isVisibilityOpen ? (
        <AnchoredPanel align="end" onDismiss={() => setVisibilityOpen(false)}>
          <VisibilityPanel
            visibility={visibility}
            onChange={onChangeVisibility}
          />
        </AnchoredPanel>
      ) : null}
    </div>
  )

  const done = (
    <button
      type="button"
      onClick={onToggleMarkCompleteMode}
      data-testid="do-done-control"
      className="px-2 font-semibold text-base text-white"
      style={controlStyle}
    >
      Done
    </button>
  )

  return (
    <>
      <Placed
        placement={leadingPlacement}
        className={className}
        gap={layout.minimumControlSpacing}
      >
        {isInMarkCompleteMode ? null : bell}
      </Placed>

      <Placed
        placement={trailingPlacement}
        className={className}
        gap={layout.minimumControlSpacing}
      >
        {isInMarkCompleteMode ? (
          done
        ) : (
          <>
            {refresh}
            {visibilityControl}
          </>
        )}
      </Placed>

      {/*
        The compact Visibility presentation. Canon sheets it on a handheld
        because a popover there "would adapt into a full-screen sheet and cost
        more than it gives" — the same sentence that decides the notifications
        split, read for the other surface.
      */}
      {inline ? null : (
        <Sheet open={isVisibilityOpen} onOpenChange={setVisibilityOpen}>
          <SheetContent
            aria-label="Visibility"
            data-testid="do-visibility-sheet"
          >
            <SheetTitle>Visibility</SheetTitle>
            <VisibilityPanel
              visibility={visibility}
              onChange={onChangeVisibility}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* Placement                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Controls in a shell toolbar slot — or inline, where there is no shell.
 *
 * `useToolbarOutletPresent` exists for exactly this: *"useful to a feature that
 * wants to fall back to in-content chrome outside a shell (a story, a test)."*
 * Without the fallback every story of this Fragment would render nothing.
 */
function Placed({
  placement,
  gap,
  className,
  children,
}: {
  readonly placement: 'navigation' | 'primary' | 'leading' | 'trailing'
  readonly gap: number
  readonly className?: string
  readonly children: ReactNode
}) {
  const present = useToolbarOutletPresent(placement)
  const row = (
    <div
      data-testid={`do-toolbar-${placement}`}
      className={cn('flex items-center', className)}
      style={{ gap }}
    >
      {children}
    </div>
  )

  return present ? (
    <ToolbarSlot placement={placement}>{row}</ToolbarSlot>
  ) : (
    row
  )
}

function ToolbarButton({
  label,
  accessibilityValue,
  expanded,
  style,
  onClick,
  children,
}: {
  readonly label: string
  readonly accessibilityValue?: string
  readonly expanded?: boolean
  readonly style: { minWidth: string; minHeight: string }
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // Canon's `.accessibilityValue(...)`. An empty value is no value — the
      // attribute is omitted rather than set to "".
      aria-description={
        accessibilityValue === undefined || accessibilityValue === ''
          ? undefined
          : accessibilityValue
      }
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-kro-small text-white',
        'outline-none hover:text-kro-accent focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={style}
    >
      {children}
    </button>
  )
}

/**
 * A glass panel hanging off the control above it.
 *
 * Escape closes it and the click that opened it is not treated as an outside
 * click, because the handler is attached on the next frame — the two behaviours
 * a popover has that a bare `div` does not, added deliberately rather than
 * inherited from a library whose cost is measured above.
 */
function AnchoredPanel({
  align,
  onDismiss,
  children,
}: {
  readonly align: 'start' | 'end'
  readonly onDismiss: () => void
  readonly children: ReactNode
}) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        onDismiss()
        return
      }
      /*
        The TRIGGER counts as inside. Without this, a second click on the bell
        is two events in the wrong order: the outside-click handler closes the
        panel, and the button's own `onClick` — which toggles — then sees a
        closed panel and re-opens it. Scoping to the anchor (which wraps the
        control *and* the panel) is what makes the toggle behave like canon's,
        where a second tap closes what the first opened.
      */
      const anchor = panelRef.current?.closest(`[${ANCHOR_ATTRIBUTE}]`) ?? null
      if (anchor !== null && anchor.contains(target)) return
      if (target.closest(`[data-panel="${id}"]`)) return
      onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    // Attached on the next macrotask so the click that OPENED the panel is not
    // also the click that closes it.
    const frame = setTimeout(
      () => document.addEventListener('mousedown', onPointerDown),
      0,
    )
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      clearTimeout(frame)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [id, onDismiss])

  /*
    `kro-glass` MUST NOT sit on the positioned element — the same trap
    `EndeavorCard` documents. `glass.css` declares `.kro-glass { position:
    relative }` as UNLAYERED css, and unlayered css outranks every `@layer`,
    Tailwind's utilities included. So `absolute top-full … kro-glass` silently
    resolves to `position: relative`, the panel rejoins the flow, and it grows
    the toolbar it is anchored to — measured at ~600px of extra bar height,
    which pushed the whole title row down the page. The material therefore
    lives on an inner element that fills this one.
  */
  return (
    <div
      ref={panelRef}
      data-panel={id}
      data-testid="do-anchored-panel"
      className={cn(
        'absolute top-full z-50 mt-2',
        align === 'start' ? 'left-0' : 'right-0',
      )}
    >
      <div
        className="kro-glass overflow-hidden"
        style={{ borderRadius: radiusVar('surface') }}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Visibility                                                               */
/* ------------------------------------------------------------------------ */

/**
 * The Do lens's exposed toggles.
 *
 * Canon's `EndeavorsLensFiltersSheet` also carries a **calendars** section. It
 * is deliberately absent here: the calendar list is the Google Calendar child's
 * (`KC-IS-#33`), and a section that could only ever render empty would be a
 * promise this surface cannot keep. `hiddenCalendarIds` is still read by
 * `doAllFiltersVisible`, so the eye glyph is already correct for the day that
 * section arrives.
 */
function VisibilityPanel({
  visibility,
  onChange,
}: {
  readonly visibility: DoVisibility
  readonly onChange: (next: DoVisibility) => void
}) {
  return (
    <div
      data-testid="do-visibility-panel"
      className="flex flex-col gap-kro-medium overflow-y-auto p-kro-medium"
      style={{
        width: PRESENTATION_SIZE.visibility.width,
        maxWidth: '100%',
        maxHeight: 'min(70vh, 520px)',
      }}
    >
      <FilterGroup title="Kinds">
        {endeavorKinds.map((kind: EndeavorKind) => (
          <FilterChip
            key={kind}
            label={kindShortLabel(kind)}
            isHidden={visibility.hiddenKinds.includes(kind)}
            onToggle={() =>
              onChange({
                ...visibility,
                hiddenKinds: doVisibilityToggled(visibility.hiddenKinds, kind),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="States">
        {endeavorComputedStates.map((state: EndeavorComputedState) => (
          <FilterChip
            key={state}
            label={doComputedStateLabel(state)}
            isHidden={visibility.hiddenComputedStates.includes(state)}
            onToggle={() =>
              onChange({
                ...visibility,
                hiddenComputedStates: doVisibilityToggled(
                  visibility.hiddenComputedStates,
                  state,
                ),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Sources">
        {endeavorHosts.map((host: EndeavorHost) => (
          <FilterChip
            key={host}
            label={endeavorHostDisplayName(host)}
            isHidden={visibility.hiddenHosts.includes(host)}
            onToggle={() =>
              onChange({
                ...visibility,
                hiddenHosts: doVisibilityToggled(visibility.hiddenHosts, host),
              })
            }
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-kro-small">
      <h3
        className="m-0 font-semibold text-xs uppercase tracking-wide"
        style={{ color: colorVar('foreSecondary') }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap gap-kro-small">{children}</div>
    </section>
  )
}

function FilterChip({
  label,
  isHidden,
  onToggle,
}: {
  readonly label: string
  readonly isHidden: boolean
  readonly onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isHidden}
      onClick={onToggle}
      className="outline-none focus-visible:shadow-[var(--kro-ring)] rounded-kro-pill"
      style={{ minHeight: 'var(--kro-size-min-touch-target)' }}
    >
      <KroChip
        title={label}
        emphasis={isHidden ? 'outline' : 'prominent'}
        tint={colorTint(isHidden ? 'badgeNeutral' : 'accent')}
      />
    </button>
  )
}
