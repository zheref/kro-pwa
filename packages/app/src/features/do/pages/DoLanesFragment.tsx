'use client'

/**
 * The day, as a vertical stack of horizontal lanes — the port of `DoView`'s
 * scrolling body (`KroUI/Do/DoView.swift`).
 *
 * ## The order is a value, not a sequence of blocks
 *
 * Canon renders Suggestions → Reminders → Calendar → Now! → Overdue → Due Soon
 * → Expired → Next → Anytime → Completed Today, and that order is acceptance
 * criterion 2 of the epic. The six task lanes come from `DO_TASK_SECTIONS`
 * rather than from six hand-written blocks, so reordering them is a change to a
 * table a test can read — not a diff nobody notices.
 *
 * ## The hero lane is leading-anchored; the HERO is what is centred
 *
 * `docs/Features/Do.md` at `2117efc` (past the epic's pin) is explicit: *"The
 * row always begins at the standard leading inset and never centers or
 * distributes its cards to absorb spare width."* What is centred is the
 * top-scoring card **within the ranked sequence** — `selectFeaturedNowEndeavors`
 * arranges hero-centred, the Selector takes the centred window, and this lane
 * draws the middle index large. The geometry itself lives in
 * `doFeaturedLaneLayout.ts`, ported from canon's own extracted
 * `EndeavorLaneLayout` so it is unit-testable without a DOM.
 *
 * ## `RC-15`
 *
 * Nothing here dispatches. The one piece of local state is the lane's measured
 * pixel width — view geometry, the same category as the popover `open` flags
 * inside `EndeavorCard`, and deliberately *not* the capacity: the capacity is
 * feature state, so the measurement is reported upward and comes back through
 * the store.
 */
import {
  Bell,
  Calendar,
  CircleCheckBig,
  ClockAlert,
  Infinity as InfinityGlyph,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EmptyDayStateView,
  EndeavorCard,
  type EndeavorCardModel,
  REWARD_BACKGROUND_ROLE,
  REWARD_FOREGROUND_ROLE,
  SuggestionCard,
  type SuggestionCardModel,
  formatTime,
  formatTimeRange,
} from '../../../design/endeavor'
import { colorVar, radiusVar, semanticVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { DoLane, type DoLanes } from '../DoRules'
import type { DoSuggestionSource } from '../DoSuggestions'
import type { DoCardHandlers, DoSuggestionHandlers } from './doCardHandlers'
import {
  DO_LANE_CARD_SPACING,
  FEATURED_LANE_METRICS,
  featuredCardWidths,
  featuredHeroIndex,
} from './doFeaturedLaneLayout'
import {
  DO_TASK_SECTIONS,
  type DoSectionDescriptor,
  type DoSectionGlyph,
  DoViewSection,
  doEventsBadgeText,
  doRemindersBadgeText,
  doSectionBadgeText,
} from './doPresentation'
import type { DoTasksListDestination } from './DoTasksListFragment'

/**
 * Canon's per-section SF Symbols, resolved to lucide.
 *
 * They are not in the design kit's symbol table on purpose: that table carries
 * the glyphs the *components* draw, and these belong to this surface's section
 * headers. `MainShellFragment` resolves the shell's own chrome glyphs the same
 * way.
 */
const SECTION_GLYPH: Record<
  DoSectionGlyph,
  (props: { size: number; 'aria-hidden': true }) => ReactNode
> = {
  // `exclamationmark.triangle.fill`
  overdue: (props) => <TriangleAlert {...props} />,
  // `clock.badge.exclamationmark.fill`
  dueSoon: (props) => <ClockAlert {...props} />,
  // `clock.badge.xmark` — the nearest lucide clock-with-a-mark.
  expired: (props) => <ClockAlert {...props} />,
  next: (props) => <ClockAlert {...props} />,
  // `infinity`
  anytime: (props) => <InfinityGlyph {...props} />,
  // `checkmark.circle.fill`
  completed: (props) => <CircleCheckBig {...props} />,
  // `bell.fill`
  reminders: (props) => <Bell {...props} />,
  // `calendar`
  calendar: (props) => <Calendar {...props} />,
  // `sparkles`
  suggestions: (props) => <Sparkles {...props} />,
}

/** Canon's lane header type size (`.title2.weight(.bold)`). */
const SECTION_TITLE_GLYPH_SIZE = 22

export interface DoLanesFragmentProps {
  readonly lanes: {
    readonly featuredNow: readonly EndeavorCardModel[]
    readonly overdue: readonly EndeavorCardModel[]
    readonly now: readonly EndeavorCardModel[]
    readonly expired: readonly EndeavorCardModel[]
    readonly next: readonly EndeavorCardModel[]
    readonly anytime: readonly EndeavorCardModel[]
    readonly completedToday: readonly EndeavorCardModel[]
  }
  readonly reminders: readonly EndeavorCardModel[]
  readonly allDayEvents: readonly EndeavorCardModel[]
  /** Canon groups overlapping timed events into columns; each group is one column. */
  readonly timedEventGroups: readonly (readonly EndeavorCardModel[])[]
  readonly suggestions: readonly (SuggestionCardModel & {
    readonly source: DoSuggestionSource
  })[]
  readonly showsSuggestions: boolean
  /** `selectHasNoDoEndeavors` — the true empty day, not a filtered-empty one. */
  readonly hasNoEndeavors: boolean
  readonly selectedCardKey: string | null
  readonly isInMarkCompleteMode: boolean
  readonly now: Date
  readonly locale?: string
  /**
   * A width to draw the hero lane at before (or instead of) a measurement — a
   * story, a snapshot test, or the first paint of a server-rendered surface.
   */
  readonly initialLaneWidth?: number
  /** Reported on every observed resize; the Page turns it into a capacity. */
  readonly onLaneWidthChanged?: (width: number) => void
  readonly onExpandSection: (destination: DoTasksListDestination) => void
  readonly onCreateEndeavor: () => void
  readonly handlers: DoCardHandlers
  readonly suggestionHandlers: DoSuggestionHandlers
  readonly className?: string
}

export function DoLanesFragment(props: DoLanesFragmentProps) {
  const {
    lanes,
    reminders,
    allDayEvents,
    timedEventGroups,
    suggestions,
    showsSuggestions,
    hasNoEndeavors,
    now,
    locale,
    onCreateEndeavor,
    suggestionHandlers,
    className,
  } = props

  const laneForSection = (section: DoSectionDescriptor) => {
    switch (section.lane) {
      case DoLane.overdue:
        return lanes.overdue
      case DoLane.now:
        return lanes.now
      case DoLane.expired:
        return lanes.expired
      case DoLane.next:
        return lanes.next
      case DoLane.anytime:
        return lanes.anytime
      case DoLane.completed:
        return lanes.completedToday
      // The featured lane is the adaptive stack, never a `DO_TASK_SECTIONS` row.
      case DoLane.featured:
        return lanes.featuredNow
    }
  }

  const hasEvents = allDayEvents.length > 0 || timedEventGroups.length > 0

  return (
    <div
      data-testid="do-lanes"
      className={cn('flex flex-col gap-kro-large pt-kro-medium', className)}
      /*
        The day's own surface, with the shell's header slab fading into it over
        its first 32px.

        Without this the first lane's title lands on whatever the slab happens
        to be at that height — a dark title on mid-ramp purple, which measures
        around 3:1 and fails the epic's own 4.5:1 bar on a compact window where
        the header is short. Canon has the same problem solved a different way
        (`DoScreen` paints indigoGrape behind the WHOLE surface and every title
        is white); the web shell paints a 180px slab instead, so the day is a
        page surface and the fade is what keeps the join from being a hard
        line. 32px is `--kro-space-x-large`, the same distance
        `GradientBackdrop`'s own fade uses.

        `color-mix(… 0%, transparent)` rather than the `transparent` keyword:
        the keyword interpolates through transparent BLACK, which greys the
        ramp in light mode.
      */
      style={{
        backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${colorVar('back')} 0%, transparent), ${colorVar('back')} var(--kro-space-x-large))`,
      }}
    >
      {showsSuggestions && suggestions.length > 0 ? (
        <SuggestionsLane
          suggestions={suggestions}
          handlers={suggestionHandlers}
        />
      ) : null}

      {hasNoEndeavors ? (
        /*
          The promotion inset is drawn white-on-translucent-black, because canon
          shows it over `DoScreen`'s full-screen indigoGrape gradient. The web
          shell's slab stops 180px down, so the inset would otherwise land on
          the page surface and paint 0.85-white text on light grey — measured
          well under the 4.5:1 the epic's own contrast bar requires. Restoring
          the field the component was designed against is a wrapper, not a fork
          of the component: the two gradient stops are the design system's own,
          so the inset and the header slab cannot drift apart.
        */
        <div className="px-kro-medium">
          <div
            data-testid="do-empty-day"
            style={{
              borderRadius: radiusVar('surface'),
              backgroundImage: `linear-gradient(to bottom right, ${colorVar('headerGradientIndigo')}, ${colorVar('headerGradientGrape')})`,
            }}
          >
            <EmptyDayStateView onCreateEndeavor={onCreateEndeavor} />
          </div>
        </div>
      ) : (
        <>
          {reminders.length > 0 ? (
            <RemindersLane
              reminders={reminders}
              locale={locale}
              onShowDetails={props.handlers.onShowDetails}
            />
          ) : null}

          {hasEvents ? (
            <EventsLane
              allDayEvents={allDayEvents}
              timedEventGroups={timedEventGroups}
              selectedCardKey={props.selectedCardKey}
              isInMarkCompleteMode={props.isInMarkCompleteMode}
              locale={locale}
              handlers={props.handlers}
              onExpand={props.onExpandSection}
            />
          ) : null}

          {lanes.featuredNow.length > 0 ? (
            <FeaturedLane
              cards={lanes.featuredNow}
              selectedCardKey={props.selectedCardKey}
              isInMarkCompleteMode={props.isInMarkCompleteMode}
              now={now}
              locale={locale}
              initialWidth={props.initialLaneWidth}
              onWidthChanged={props.onLaneWidthChanged}
              handlers={props.handlers}
            />
          ) : null}

          {DO_TASK_SECTIONS.map((section) => {
            const cards = laneForSection(section)
            if (cards.length === 0) return null
            return (
              <TaskLane
                key={section.tag}
                section={section}
                cards={cards}
                selectedCardKey={props.selectedCardKey}
                isInMarkCompleteMode={props.isInMarkCompleteMode}
                now={now}
                locale={locale}
                handlers={props.handlers}
                onExpand={props.onExpandSection}
              />
            )
          })}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* The section header — canon's `SectionHeader(style: .prominent)`            */
/* ------------------------------------------------------------------------ */

function SectionHeader({
  title,
  glyph,
  badgeText,
  onBadgeTap,
}: {
  readonly title: string
  readonly glyph: DoSectionGlyph | null
  readonly badgeText: string | null
  readonly onBadgeTap?: () => void
}) {
  const Glyph = glyph === null ? null : SECTION_GLYPH[glyph]

  return (
    <div className="flex items-center gap-2 px-kro-medium">
      {Glyph === null ? null : (
        <span className="shrink-0" style={{ color: colorVar('fore') }}>
          {Glyph({ size: SECTION_TITLE_GLYPH_SIZE, 'aria-hidden': true })}
        </span>
      )}
      {/*
        WEB ADAPTATION, and the reason is a real difference in the two
        backgrounds. Canon draws every section title in white because `DoScreen`
        paints the indigoGrape gradient behind the WHOLE surface, so every lane
        sits on it. The web shell (`KC-IS-#13`) paints a 180px header slab
        instead and lets the day scroll onto the page's own surface, so a white
        title below the slab is white on white — invisible in light, and only
        accidentally legible in dark. The token foreground is the same decision
        canon made (ink that contrasts with what is behind it), read against
        the background this shell actually provides. Named in the PR as a
        cross-lane observation for the shell child.
      */}
      <h2
        className="m-0 font-bold text-xl"
        style={{ color: colorVar('fore') }}
      >
        {title}
      </h2>

      {badgeText === null ? null : (
        <span className="ml-auto">
          {onBadgeTap === undefined ? (
            /*
              Canon hides a non-tappable badge from assistive technology — the
              count it prints is already in the lane's own contents, so
              announcing it again is noise.
            */
            <span aria-hidden className={badgeClassName} style={badgeStyle}>
              {badgeText}
            </span>
          ) : (
            <button
              type="button"
              onClick={onBadgeTap}
              aria-label={`${title}, ${badgeText}`}
              className={cn(
                badgeClassName,
                'outline-none focus-visible:shadow-[var(--kro-ring)]',
              )}
              style={{
                ...badgeStyle,
                minHeight: 'var(--kro-size-min-touch-target)',
              }}
            >
              {badgeText}
              <span aria-hidden>›</span>
            </button>
          )}
        </span>
      )}
    </div>
  )
}

const badgeClassName =
  'inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-xs'

/**
 * The lane badge, in the kit's own reward-pill pair.
 *
 * Canon paints it `scotchMist.opacity(0.6)` with a dark olive label — the 0.6
 * exists so the indigoGrape gradient shows through, and this surface has the
 * page colour behind it instead. Sixty percent of a pale sand over a dark page
 * mixes to a muddy olive, which is how a 9:1 label in light becomes a 3:1 one
 * in dark. So the fill is solid, and the ink is `REWARD_FOREGROUND_ROLE` —
 * `scotchMist` + `bannerWarning` is precisely the pair `RewardBadge` uses and
 * the design system's contrast suite already regression-tests in both schemes.
 * A `charcoal` label would have looked right and quietly failed the dark half,
 * because that token flips to a mid grey.
 */
const badgeStyle = {
  borderRadius: radiusVar('pill'),
  backgroundColor: colorVar(REWARD_BACKGROUND_ROLE),
  color: colorVar(REWARD_FOREGROUND_ROLE),
} as const

/* ------------------------------------------------------------------------ */
/* Suggestions                                                               */
/* ------------------------------------------------------------------------ */

function SuggestionsLane({
  suggestions,
  handlers,
}: {
  readonly suggestions: readonly (SuggestionCardModel & {
    readonly source: DoSuggestionSource
  })[]
  readonly handlers: DoSuggestionHandlers
}) {
  return (
    <section data-testid="do-lane-suggestions" aria-label="Suggestions">
      <div className="flex flex-col gap-3">
        <SectionHeader title="Suggestions" glyph="suggestions" badgeText={null} />
        <Carousel>
          {suggestions.map((suggestion) => (
            <div key={suggestion.source} className="flex items-center gap-2">
              <SuggestionCard
                model={suggestion}
                onAction={() => handlers.onAction(suggestion.source)}
              />
              {/*
                Canon dismisses with a swipe-up gesture and a swipe action. On
                the web a gesture with no visible control is unreachable by
                keyboard and invisible to a pointer, so the same intent is a
                real button — the swipe stays available through the card kit's
                own action surface where a surface opts into it.
              */}
              <button
                type="button"
                aria-label={`Dismiss ${suggestion.title}`}
                onClick={() => handlers.onDismiss(suggestion.source)}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  minWidth: 'var(--kro-size-min-touch-target)',
                  minHeight: 'var(--kro-size-min-touch-target)',
                  color: colorVar('foreSecondary'),
                }}
              >
                <span aria-hidden className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Reminders                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Canon's reminder capsules: a bell, the title, the time — 36pt tall, on a thin
 * material with a `kindReminder` rim. Not cards: a reminder has no duration and
 * no session to start, so it never gets the preparation overlay.
 */
function RemindersLane({
  reminders,
  locale,
  onShowDetails,
}: {
  readonly reminders: readonly EndeavorCardModel[]
  readonly locale?: string
  readonly onShowDetails: (card: EndeavorCardModel) => void
}) {
  return (
    <section data-testid="do-lane-reminders" aria-label="Reminders">
      <div className="flex flex-col gap-1.5">
        <SectionHeader
          title="Reminders"
          glyph="reminders"
          badgeText={doRemindersBadgeText(reminders.length)}
        />
        <Carousel>
          {reminders.map((reminder) => (
            <button
              key={reminder.id}
              type="button"
              data-testid="do-reminder-capsule"
              onClick={() => onShowDetails(reminder)}
              onContextMenu={(event) => {
                event.preventDefault()
                onShowDetails(reminder)
              }}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 px-3',
                'kro-glass kro-glass--control rounded-kro-pill',
                'outline-none focus-visible:shadow-[var(--kro-ring)]',
              )}
              style={{
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${semanticVar('kindReminder')} 45%, transparent)`,
              }}
            >
              <Bell
                size={13}
                aria-hidden
                style={{ color: semanticVar('kindReminder') }}
              />
              <span
                className="max-w-52 truncate font-medium text-sm"
                style={{ color: colorVar('fore') }}
              >
                {reminder.title}
              </span>
              {reminder.dueTime === null ? null : (
                <span
                  className="text-xs"
                  style={{ color: colorVar('foreSecondary') }}
                >
                  {formatTime(reminder.dueTime, locale)}
                </span>
              )}
            </button>
          ))}
        </Carousel>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Calendar                                                                  */
/* ------------------------------------------------------------------------ */

function EventsLane({
  allDayEvents,
  timedEventGroups,
  selectedCardKey,
  isInMarkCompleteMode,
  locale,
  handlers,
  onExpand,
}: {
  readonly allDayEvents: readonly EndeavorCardModel[]
  readonly timedEventGroups: readonly (readonly EndeavorCardModel[])[]
  readonly selectedCardKey: string | null
  readonly isInMarkCompleteMode: boolean
  readonly locale?: string
  readonly handlers: DoCardHandlers
  readonly onExpand: (destination: DoTasksListDestination) => void
}) {
  const total =
    allDayEvents.length +
    timedEventGroups.reduce((sum, group) => sum + group.length, 0)

  return (
    <section data-testid="do-lane-events" aria-label="Calendar">
      <div className="flex flex-col gap-0.5">
        <SectionHeader
          title="Calendar"
          glyph="calendar"
          badgeText={doEventsBadgeText(total)}
          onBadgeTap={() => onExpand({ title: 'Calendar', tag: 'events' })}
        />

        {allDayEvents.length === 0 ? null : (
          <Carousel className="py-1.5">
            {allDayEvents.map((card) => (
              <AllDayEventCard
                key={card.id}
                card={card}
                isSelected={
                  selectedCardKey === `${DoViewSection.eventsAllDay}:${card.id}`
                }
                isInMarkCompleteMode={isInMarkCompleteMode}
                handlers={handlers}
              />
            ))}
          </Carousel>
        )}

        {timedEventGroups.length === 0 ? null : (
          <Carousel className="items-start py-1.5">
            {timedEventGroups.map((group) => (
              <div
                key={group[0]?.id ?? 'empty-group'}
                className="flex shrink-0 flex-col gap-1.5"
              >
                {group.map((card) => (
                  <TimedEventCard
                    key={card.id}
                    card={card}
                    isSelected={
                      selectedCardKey ===
                      `${DoViewSection.eventsTimed}:${card.id}`
                    }
                    isInMarkCompleteMode={isInMarkCompleteMode}
                    locale={locale}
                    handlers={handlers}
                  />
                ))}
              </div>
            ))}
          </Carousel>
        )}
      </div>
    </section>
  )
}

function AllDayEventCard({
  card,
  isSelected,
  isInMarkCompleteMode,
  handlers,
}: {
  readonly card: EndeavorCardModel
  readonly isSelected: boolean
  readonly isInMarkCompleteMode: boolean
  readonly handlers: DoCardHandlers
}) {
  return (
    <button
      type="button"
      data-testid="do-event-allday"
      data-selected={isSelected}
      onClick={() => {
        if (isInMarkCompleteMode) return
        handlers.onPrepare(DoViewSection.eventsAllDay, card.id)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        handlers.onShowDetails(card)
      }}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 px-3',
        'kro-glass kro-glass--control rounded-kro-pill',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        boxShadow: isSelected
          ? `inset 0 0 0 2px ${colorVar('accent')}`
          : `inset 0 0 0 1px color-mix(in srgb, ${semanticVar('kindEvent')} 45%, transparent)`,
      }}
    >
      <span aria-hidden className="text-base leading-none">
        {card.symbol}
      </span>
      <span
        className="max-w-52 truncate font-medium text-sm"
        style={{ color: colorVar('fore') }}
      >
        {card.title}
      </span>
    </button>
  )
}

function TimedEventCard({
  card,
  isSelected,
  isInMarkCompleteMode,
  locale,
  handlers,
}: {
  readonly card: EndeavorCardModel
  readonly isSelected: boolean
  readonly isInMarkCompleteMode: boolean
  readonly locale?: string
  readonly handlers: DoCardHandlers
}) {
  const start = card.dueTime
  const end =
    start === null || card.duration === null
      ? null
      : new Date(start.getTime() + card.duration * 1000)

  return (
    <button
      type="button"
      data-testid="do-event-timed"
      data-selected={isSelected}
      onClick={() => {
        if (isInMarkCompleteMode) return
        handlers.onPrepare(DoViewSection.eventsTimed, card.id)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        handlers.onShowDetails(card)
      }}
      className={cn(
        'flex w-56 shrink-0 flex-col items-start gap-1 px-3 py-2 text-left',
        'kro-glass kro-glass--control',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        borderRadius: radiusVar('card'),
        boxShadow: isSelected
          ? `inset 0 0 0 2px ${colorVar('accent')}`
          : `inset 0 0 0 1px color-mix(in srgb, ${semanticVar('kindEvent')} 45%, transparent)`,
      }}
    >
      <span className="flex w-full items-center gap-2">
        <span aria-hidden className="text-base leading-none">
          {card.symbol}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-semibold text-sm"
          style={{ color: colorVar('fore') }}
        >
          {card.title}
        </span>
      </span>
      {start === null ? null : (
        <span className="text-xs" style={{ color: colorVar('foreSecondary') }}>
          {end === null
            ? formatTime(start, locale)
            : formatTimeRange(start, end, locale)}
        </span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------------ */
/* The hero lane                                                             */
/* ------------------------------------------------------------------------ */

function FeaturedLane({
  cards,
  selectedCardKey,
  isInMarkCompleteMode,
  now,
  locale,
  initialWidth,
  onWidthChanged,
  handlers,
}: {
  readonly cards: readonly EndeavorCardModel[]
  readonly selectedCardKey: string | null
  readonly isInMarkCompleteMode: boolean
  readonly now: Date
  readonly locale?: string
  readonly initialWidth?: number
  readonly onWidthChanged?: (width: number) => void
  readonly handlers: DoCardHandlers
}) {
  const laneRef = useRef<HTMLDivElement | null>(null)
  /**
   * View geometry, not feature state (`RC-4`/`UZF-4`): the *capacity* the lane
   * may show is in the slice — this is only the pixel width the browser is
   * currently giving the row, which nothing outside this lane can use.
   */
  const [laneWidth, setLaneWidth] = useState<number>(
    initialWidth ?? FEATURED_LANE_METRICS.horizontalPadding * 2,
  )

  const report = useCallback(
    (width: number) => {
      setLaneWidth(width)
      onWidthChanged?.(width)
    },
    [onWidthChanged],
  )

  useEffect(() => {
    const element = laneRef.current
    if (element === null) return
    // jsdom has no ResizeObserver, and a server render has no layout at all —
    // both fall back to `initialWidth`, which is why stories and snapshot
    // tests pass one rather than asserting against a measured zero.
    if (typeof ResizeObserver !== 'function') {
      if (element.clientWidth > 0) report(element.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? element.clientWidth
      if (width > 0) report(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [report])

  const widths = featuredCardWidths({
    availableWidth: laneWidth,
    visibleCount: cards.length,
  })
  const heroIndex = featuredHeroIndex(cards.length)

  return (
    <section data-testid="do-lane-featured" aria-label="Now!">
      <div className="flex flex-col gap-1.5">
        <SectionHeader title="Now!" glyph={null} badgeText={null} />
        <div
          ref={laneRef}
          data-testid="do-featured-row"
          data-card-count={cards.length}
          /*
            `justify-start`, never `justify-center`: the row is anchored at the
            standard leading inset and spare width stays after the trailing
            card. Canon's own `.frame(alignment: .leading)`.
          */
          className="flex items-center justify-start overflow-hidden"
          style={{
            gap: FEATURED_LANE_METRICS.spacing,
            height: FEATURED_LANE_METRICS.laneHeight,
            paddingInline: FEATURED_LANE_METRICS.horizontalPadding / 2,
          }}
        >
          {cards.map((card, index) => {
            const isHero = index === heroIndex
            return (
              <div
                key={card.id}
                data-do-card-key={`${DoLane.featured}:${card.id}`}
                className="shrink-0"
                onContextMenu={(event) => {
                  event.preventDefault()
                  handlers.onShowDetails(card)
                }}
              >
              <EndeavorCard
                model={card}
                size={isHero ? 'large' : 'small'}
                cardSize={{
                  width: isHero ? widths.hero : widths.side,
                  height: isHero
                    ? FEATURED_LANE_METRICS.heroHeight
                    : FEATURED_LANE_METRICS.sideHeight,
                }}
                now={now}
                locale={locale}
                isSelected={
                  selectedCardKey === `${DoLane.featured}:${card.id}`
                }
                isInMarkCompleteMode={isInMarkCompleteMode}
                onPrepare={
                  isInMarkCompleteMode
                    ? undefined
                    : (id) => handlers.onPrepare(DoLane.featured, id)
                }
                onExecute={() => handlers.onExecute(card)}
                onMarkComplete={handlers.onMarkComplete}
                onSkip={() => handlers.onSkip(card)}
                onDefer={(target) => handlers.onDefer(card, target)}
                onDelegate={() => handlers.onDelegate(card)}
                onShowDetails={() => handlers.onShowDetails(card)}
                onDelete={() => handlers.onDelete(card)}
                className={cn(isHero && 'z-[1]')}
              />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* A scrolling task lane                                                     */
/* ------------------------------------------------------------------------ */

function TaskLane({
  section,
  cards,
  selectedCardKey,
  isInMarkCompleteMode,
  now,
  locale,
  handlers,
  onExpand,
}: {
  readonly section: DoSectionDescriptor
  readonly cards: readonly EndeavorCardModel[]
  readonly selectedCardKey: string | null
  readonly isInMarkCompleteMode: boolean
  readonly now: Date
  readonly locale?: string
  readonly handlers: DoCardHandlers
  readonly onExpand: (destination: DoTasksListDestination) => void
}) {
  return (
    <section
      data-testid={`do-lane-${section.tag}`}
      data-do-section={section.tag}
      id={`do-section-${section.tag}`}
      aria-label={section.title}
    >
      <div className="flex flex-col gap-1.5">
        <SectionHeader
          title={section.title}
          glyph={section.glyph}
          badgeText={doSectionBadgeText(section, cards.length)}
          onBadgeTap={() =>
            onExpand({ title: section.title, tag: section.tag })
          }
        />
        {/*
          Canon's `.onLongPressGesture { onShowDetails(task) }` on every card.
          The web's equivalent of a long press is the context-menu event: a
          touch-and-hold raises it on a phone and a secondary click raises it
          with a pointer, which is exactly the two gestures canon binds.
          `preventDefault` keeps the browser's own menu out of the way of the
          one the product is offering.
        */}
        <Carousel className="py-1.5">
          {cards.map((card) => (
            <div
              key={card.id}
              data-do-card-key={`${section.tag}:${card.id}`}
              className="shrink-0"
              onContextMenu={(event) => {
                event.preventDefault()
                handlers.onShowDetails(card)
              }}
            >
              <EndeavorCard
                model={card}
                size="medium"
                now={now}
                locale={locale}
                isSelected={selectedCardKey === `${section.tag}:${card.id}`}
                isInMarkCompleteMode={isInMarkCompleteMode}
                onPrepare={
                  isInMarkCompleteMode
                    ? undefined
                    : (id) => handlers.onPrepare(section.tag, id)
                }
                onExecute={() => handlers.onExecute(card)}
                onMarkComplete={handlers.onMarkComplete}
                onSkip={() => handlers.onSkip(card)}
                onDefer={(target) => handlers.onDefer(card, target)}
                onDelegate={() => handlers.onDelegate(card)}
                onShowDetails={() => handlers.onShowDetails(card)}
                onDelete={() => handlers.onDelete(card)}
              />
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* The shared horizontal scroller                                            */
/* ------------------------------------------------------------------------ */

/**
 * Every non-hero lane's row. One component, so the 24pt inter-card gap
 * `Do.md` fixes for *"task, reminder, calendar, and suggestion lanes"* is
 * declared once — three copies of a gap is how one lane ends up at 16.
 */
function Carousel({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div
      data-testid="do-carousel"
      className={cn(
        'flex items-center overflow-x-auto overflow-y-hidden px-kro-medium',
        // The scrollbar is chrome the phone does not draw; the row is
        // reachable by keyboard because every card in it is focusable.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      style={{ gap: DO_LANE_CARD_SPACING }}
    >
      {children}
    </div>
  )
}
