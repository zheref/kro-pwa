/**
 * `EndeavorCard` — canon `KroUI/Components/EndeavorCard.swift` and the binding
 * spec `docs/Features/EndeavorCard.md`.
 *
 * ONE COMPONENT, TWO LAYOUTS, and canon is emphatic that it is one: the private
 * `DoTaskListRow` was retired in favour of `EndeavorCard(layout: .horizontal)`
 * precisely so the badge composition, the wiggle and the action set could not
 * drift between a carousel card and a list row. This port keeps that: the two
 * layouts share the model, the wiggle, the popovers and the intent callbacks,
 * and differ only in where things are placed.
 *
 * ## The Do-mode badge composition — the canon geometry
 *
 * `EndeavorCard.md` calls the iOS card "the *reference* for the Do-tab badge
 * composition" that Android matches exactly, so every number below is a
 * cross-platform contract, not a local style choice. `EndeavorCard.test.tsx`
 * asserts each one.
 *
 * | Element               | Placement                    | Rule                              |
 * |-----------------------|------------------------------|-----------------------------------|
 * | urgency pill          | top-left, inside 12px padding | HIDDEN on Low; circle form on `small` |
 * | reward pill           | top-right, inside 12px padding | ALWAYS shown                     |
 * | floating warning      | `translate(-6px, -6px)` outside the chrome | Medium urgency, and only when not selected |
 * | check / skip glyph    | `translate(14px, -8px)` from the emoji's top-trailing | mark-complete mode only |
 * | card                  | 160×200 default, radius 20   | `cardSize` overrides              |
 * | horizontal card       | full width, `min-height: 100` | emoji 56×56 leading, corner action at (8, −8) |
 *
 * The warning is Medium-only. That is not a typo in canon: High already shouts
 * through the red pill, so the extra floating glyph is spent on the level that
 * would otherwise read as ordinary.
 *
 * ## The checkmark is a TRIGGER, never the completion
 *
 * `EndeavorCard.md`: the picker "allows users to backdate completions for tasks
 * they finished earlier but forgot to mark complete at the time". So tapping
 * the check opens `MarkCompletePopover` and `onMarkComplete` fires with the
 * chosen date, once, on confirm. An event card shows the grey skip glyph
 * instead and calls `onSkip` immediately — an event cannot be "completed".
 *
 * ## Reduced motion
 *
 * The wiggle is `useWiggle`, which refuses to run under
 * `prefers-reduced-motion: reduce` and settles the angle to exactly 0 — see
 * that file for why a CSS keyframe animation cannot do this correctly.
 */

import { useState } from 'react'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '../system/primitives/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../system/primitives/dropdown-menu'
import { colorVar, radiusVar, shadowVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { RewardBadge, UrgencyBadge } from './CardBadge'
import type { EndeavorCardModel } from './endeavorCardModel'
import { EndeavorUrgency } from './endeavorCardModel'
import { endeavorIcon } from './endeavorIcons'
import {
  type OverflowAction,
  type OverflowFlow,
  selectOverflowAction,
} from './endeavorOverflow'
import {
  DeferPopover,
  DeleteConfirmationPopover,
  MarkCompletePopover,
  defaultDeferTarget,
} from './endeavorPopovers'
import { formatDueCaption, formatDuration } from './formatting'
import { useWiggle, wiggleStyle } from './useWiggle'

const Check = endeavorIcon('checkmark')
const Skip = endeavorIcon('forward.end')
const Play = endeavorIcon('play.fill')
const Ellipsis = endeavorIcon('ellipsis')
const DeferGlyph = endeavorIcon('calendar.badge.clock')
const Delegate = endeavorIcon('person.fill.checkmark')
const Details = endeavorIcon('info.circle')
const Trash = endeavorIcon('trash')
const Warning = endeavorIcon('exclamationmark.circle.fill')
const Clock = endeavorIcon('clock')
const TimerGlyph = endeavorIcon('timer')

/* ------------------------------------------------------------------------ */
/* Size class                                                                */
/* ------------------------------------------------------------------------ */

export type EndeavorCardSize = 'small' | 'medium' | 'large'

/** Canon's `EndeavorCard.Size` computed properties, ported value for value. */
export interface EndeavorCardMetrics {
  readonly primaryButton: number
  readonly secondaryButton: number
  readonly primaryIconSize: number
  readonly secondaryIconSize: number
  readonly stackSpacing: number
  readonly emojiSize: number
  readonly titleClassName: string
}

export const CARD_METRICS: Readonly<Record<EndeavorCardSize, EndeavorCardMetrics>> = {
  small: {
    primaryButton: 44,
    secondaryButton: 30,
    primaryIconSize: 20,
    secondaryIconSize: 13,
    stackSpacing: 8,
    emojiSize: 34,
    titleClassName: 'text-xs',
  },
  medium: {
    primaryButton: 54,
    secondaryButton: 38,
    primaryIconSize: 24,
    secondaryIconSize: 16,
    stackSpacing: 10,
    emojiSize: 44,
    titleClassName: 'text-sm',
  },
  large: {
    primaryButton: 64,
    secondaryButton: 44,
    primaryIconSize: 28,
    secondaryIconSize: 18,
    stackSpacing: 12,
    emojiSize: 44,
    titleClassName: 'text-sm',
  },
}

/** Canon's default carousel card. */
export const DEFAULT_CARD_WIDTH = 160
export const DEFAULT_CARD_HEIGHT = 200

/** Canon's `minHeight: 100` on the horizontal layout. */
export const HORIZONTAL_MIN_HEIGHT = 100

/* ------------------------------------------------------------------------ */
/* Props                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `Intent`. `do` reveals the preparation overlay on tap; `plan` does
 * not, because on that surface the container (a list row) owns the gesture.
 */
export type EndeavorCardIntent = 'do' | 'plan'

export type EndeavorCardLayout = 'vertical' | 'horizontal'

export interface EndeavorCardProps {
  readonly model: EndeavorCardModel
  readonly intent?: EndeavorCardIntent
  readonly layout?: EndeavorCardLayout
  /** Preparation mode. Controlled by the parent, as in canon. */
  readonly isSelected?: boolean
  readonly size?: EndeavorCardSize
  readonly cardSize?: { readonly width: number; readonly height: number }
  /** Canon's toolbar-driven mark-complete mode: wiggle + corner check/skip. */
  readonly isInMarkCompleteMode?: boolean
  /** `now` is explicit; see `formatting.ts`. */
  readonly now: Date
  readonly locale?: string

  /* Intent callbacks — plain closures, no store (`RC-14`). */
  /** A short tap on a `do`-intent card: the parent flips `isSelected`. */
  readonly onPrepare?: (id: string) => void
  readonly onExecute?: () => void
  readonly onMarkComplete?: (model: EndeavorCardModel, completedAt: Date) => void
  readonly onSkip?: () => void
  readonly onDefer?: (target: Date) => void
  readonly onDelegate?: () => void
  /** Omitted from the overflow menu when absent, so surfaces opt in. */
  readonly onShowDetails?: () => void
  readonly onDelete?: () => void

  readonly className?: string
}

/* ------------------------------------------------------------------------ */
/* The card                                                                  */
/* ------------------------------------------------------------------------ */

export function EndeavorCard(props: EndeavorCardProps) {
  const {
    model,
    intent = 'do',
    layout = 'vertical',
    isSelected = false,
    isInMarkCompleteMode = false,
    now,
    onPrepare,
    className,
  } = props

  const wiggle = useWiggle(isInMarkCompleteMode)
  const showsOverlay = intent === 'do' && isSelected
  // A short tap prepares the card. The handler sits on the container as a
  // POINTER convenience only — the card holds other controls, so it cannot be a
  // `button` itself, and the keyboard route into preparation mode is the title,
  // which is a real button. No action here is pointer-only.
  const prepareOnTap =
    intent === 'do' && onPrepare !== undefined ? () => onPrepare(model.id) : undefined

  return (
    <div
      data-slot="endeavor-card"
      data-layout={layout}
      data-selected={isSelected}
      data-mark-complete-mode={isInMarkCompleteMode}
      className={cn('relative', className)}
      style={wiggleStyle(wiggle)}
      onClick={prepareOnTap}
    >
      {/*
        The floating warning sits OUTSIDE the card chrome at (−6, −6), which is
        why the wrapper is `relative` and the glyph is absolutely positioned
        rather than living inside the card's padding.

        VERTICAL ONLY. Canon puts this overlay in `verticalBody`; the horizontal
        row carries its own warning INSIDE, on the trailing edge, because a
        glyph hanging off the corner of a full-width row would collide with the
        row above it. Rendering both — which an earlier cut of this file did —
        shows the same signal twice on one card.
      */}
      {layout === 'vertical' && model.showWarning && !isSelected ? (
        <span
          data-slot="endeavor-card-warning"
          aria-label="Due soon"
          className="absolute top-0 left-0 z-10 inline-flex items-center justify-center rounded-kro-pill"
          style={{
            transform: 'translate(-6px, -6px)',
            backgroundColor: colorVar('snow'),
            color: colorVar('ringGold'),
            padding: 2,
            // WEB ADAPTATION. Canon draws the yellow glyph on a bare white
            // circle; on a white card that disc measures 1.9:1, under SC
            // 1.4.11's 3:1 for a graphical object. The amber ring keeps canon's
            // yellow and gives the shape a boundary that clears the floor.
            boxShadow: `0 0 0 1px ${colorVar('bannerWarning')}`,
          }}
        >
          <Warning size={20} />
        </span>
      ) : null}

      {layout === 'vertical' ? (
        <VerticalCard {...props} showsOverlay={showsOverlay} />
      ) : (
        <HorizontalCard {...props} showsOverlay={showsOverlay} now={now} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Vertical — the carousel card                                              */
/* ------------------------------------------------------------------------ */

function VerticalCard({
  model,
  size = 'medium',
  cardSize,
  isSelected = false,
  isInMarkCompleteMode = false,
  showsOverlay,
  now,
  locale,
  onPrepare,
  onExecute,
  onMarkComplete,
  onSkip,
  onDefer,
  onDelegate,
  onShowDetails,
  onDelete,
}: EndeavorCardProps & { readonly showsOverlay: boolean }) {
  const metrics = CARD_METRICS[size]

  return (
    <div
      data-slot="endeavor-card-shell"
      className="relative flex flex-col overflow-hidden"
      style={{
        width: cardSize?.width ?? DEFAULT_CARD_WIDTH,
        height: cardSize?.height ?? DEFAULT_CARD_HEIGHT,
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('absolute'),
        boxShadow: shadowVar('card'),
      }}
    >
      {/* Layer 1 — the card content, blurred behind the overlay (canon: 10). */}
      <div
        data-slot="endeavor-card-content"
        className="absolute inset-0 flex flex-col p-3"
        style={{
          filter: showsOverlay ? 'blur(10px)' : undefined,
          transition: 'filter 200ms var(--kro-ease-standard)',
        }}
      >
        <div className="flex items-start justify-between gap-1">
          {model.urgency === EndeavorUrgency.low ? (
            <span />
          ) : (
            <UrgencyBadge urgency={model.urgency} compact={size === 'small'} />
          )}
          <RewardBadge amount={model.reward} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
          <span className="relative inline-flex">
            <span aria-hidden style={{ fontSize: metrics.emojiSize, lineHeight: 1 }}>
              {model.symbol}
            </span>
            {isInMarkCompleteMode ? (
              <span
                className="absolute top-0 right-0"
                style={{ transform: 'translate(14px, -8px)' }}
              >
                <MarkCompleteControl
                  model={model}
                  diameter={28}
                  glyphSize={14}
                  onMarkComplete={onMarkComplete}
                  onSkip={onSkip}
                />
              </span>
            ) : null}
          </span>

          {/* The title is a button so preparation mode has a keyboard route. */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onPrepare?.(model.id)
            }}
            className={cn(
              'm-0 line-clamp-2 max-w-full font-bold outline-none',
              'focus-visible:shadow-[var(--kro-ring)]',
              metrics.titleClassName,
            )}
            style={{ color: colorVar('fore') }}
          >
            {model.title}
          </button>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {model.dueTime === null ? null : (
            <Caption
              glyph={<Clock size={10} aria-hidden />}
              text={formatDueCaption(model.dueTime, now, locale)}
            />
          )}
          {model.duration === null ? null : (
            <Caption
              glyph={<TimerGlyph size={10} aria-hidden />}
              text={formatDuration(model.duration)}
            />
          )}
        </div>
      </div>

      {/* Layer 2 — the preparation overlay. Always in the tree, opacity-driven,
          so revealing it never changes layout (canon's own note). */}
      <div
        data-slot="endeavor-card-prep-overlay"
        aria-hidden={!showsOverlay}
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          gap: metrics.stackSpacing,
          opacity: showsOverlay ? 1 : 0,
          pointerEvents: showsOverlay ? 'auto' : 'none',
          transition: 'opacity 200ms var(--kro-ease-standard)',
        }}
      >
        <MarkCompleteControl
          model={model}
          diameter={metrics.secondaryButton}
          glyphSize={metrics.secondaryIconSize}
          tabbable={showsOverlay}
          onMarkComplete={onMarkComplete}
          onSkip={onSkip}
        />

        <CircleAction
          label="Start"
          diameter={metrics.primaryButton}
          glyphSize={metrics.primaryIconSize}
          fill="badgeGreen"
          tabbable={showsOverlay}
          onPress={() => onExecute?.()}
        >
          <Play size={metrics.primaryIconSize} aria-hidden />
        </CircleAction>

        <div className="flex items-center" style={{ gap: metrics.stackSpacing }}>
          <OverflowMenu
            model={model}
            diameter={metrics.secondaryButton}
            glyphSize={metrics.secondaryIconSize}
            tabbable={showsOverlay}
            now={now}
            onSkip={onSkip}
            onDefer={onDefer}
            onDelegate={onDelegate}
            onShowDetails={onShowDetails}
            onDelete={onDelete}
          />
          {size === 'large' ? (
            <DeferControl
              model={model}
              diameter={metrics.secondaryButton}
              glyphSize={metrics.secondaryIconSize}
              tabbable={showsOverlay}
              now={now}
              onDefer={onDefer}
              onSkip={onSkip}
            />
          ) : null}
        </div>
      </div>

      {/*
        NO selection ring here, deliberately. Canon draws the 3pt accent stroke
        in `horizontalBody` ONLY — the vertical card signals preparation by
        blurring its own content behind the action stack, which is a stronger
        signal than an outline and does not compete with the badge corners.
        Adding one "for consistency" is the edit to resist.
      */}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Horizontal — the full-width list card                                     */
/* ------------------------------------------------------------------------ */

function HorizontalCard({
  model,
  isSelected = false,
  isInMarkCompleteMode = false,
  showsOverlay,
  now,
  locale,
  onPrepare,
  onExecute,
  onMarkComplete,
  onSkip,
  onDefer,
  onDelete,
}: EndeavorCardProps & { readonly showsOverlay: boolean }) {
  const overdue = model.dueTime !== null && model.dueTime.getTime() < now.getTime()

  return (
    <div
      data-slot="endeavor-card-shell"
      className="relative flex w-full items-center overflow-hidden"
      style={{
        minHeight: HORIZONTAL_MIN_HEIGHT,
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('absolute'),
        boxShadow: shadowVar('card'),
      }}
    >
      {/*
        A GRID, not a flex row, and deliberately: canon's `HStack` separates the
        text column from the trailing warning with `Spacer(minLength: 0)`, and
        the flex equivalent of that (`flex-1` on the column) distributes free
        space in a way that depends on every sibling's basis — it left the glyph
        stranded mid-row rather than at the trailing edge. `auto 1fr auto` states
        the three columns outright: the emoji hugs, the text takes the rest, the
        warning sits at the edge, whatever the title's length.
      */}
      <div
        data-slot="endeavor-card-content"
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5"
      >
        <span className="relative inline-flex shrink-0">
          <span
            aria-hidden
            className="inline-flex size-14 items-center justify-center"
            style={{ fontSize: 40, lineHeight: 1 }}
          >
            {model.symbol}
          </span>
          {isInMarkCompleteMode ? (
            <span
              className="absolute top-0 right-0"
              style={{ transform: 'translate(8px, -8px)' }}
            >
              <MarkCompleteControl
                model={model}
                diameter={26}
                glyphSize={12}
                onMarkComplete={onMarkComplete}
                onSkip={onSkip}
              />
            </span>
          ) : null}
        </span>

        <div className="flex min-w-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onPrepare?.(model.id)
            }}
            className={cn(
              'line-clamp-3 max-w-full text-left text-base font-bold outline-none',
              'focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{ color: colorVar('fore') }}
          >
            {model.title}
          </button>

          {model.dueTime !== null || model.duration !== null ? (
            <div className="flex flex-wrap items-center gap-3">
              {model.dueTime === null ? null : (
                <Caption
                  glyph={<Clock size={12} aria-hidden />}
                  text={formatDueCaption(model.dueTime, now, locale)}
                  emphasis={overdue ? 'bannerWarning' : undefined}
                />
              )}
              {model.duration === null ? null : (
                <Caption
                  glyph={<TimerGlyph size={12} aria-hidden />}
                  text={formatDuration(model.duration)}
                />
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {model.urgency === EndeavorUrgency.low ? null : (
              <UrgencyBadge urgency={model.urgency} />
            )}
            <RewardBadge amount={model.reward} />
          </div>
        </div>

        {model.showWarning && !isSelected && !isInMarkCompleteMode ? (
          <span
            data-slot="endeavor-card-warning"
            aria-label="Due soon"
            className="inline-flex shrink-0 items-center justify-center rounded-kro-pill"
            style={{
              backgroundColor: colorVar('snow'),
              color: colorVar('ringGold'),
              padding: 2,
              boxShadow: `0 0 0 1px ${colorVar('bannerWarning')}`,
            }}
          >
            <Warning size={18} />
          </span>
        ) : null}
      </div>

      {/* The horizontal preparation overlay: canon's five circles in a row. */}
      {/*
        `kro-glass` MUST NOT sit on the positioned element.
        `glass.css` declares `.kro-glass { position: relative }` as UNLAYERED
        css, and unlayered css outranks every `@layer` — including Tailwind's
        utilities. So `absolute inset-0 … kro-glass` silently resolves to
        `position: relative`, the overlay rejoins the flow, and it eats a
        column of the row: measured at 268px of a 1232px card, which is what
        pushed the trailing warning glyph into the middle of the row. The
        material therefore lives on an inner element that fills this one.
      */}
      <div
        data-slot="endeavor-card-prep-overlay"
        aria-hidden={!showsOverlay}
        className="absolute inset-0"
        style={{
          opacity: showsOverlay ? 1 : 0,
          pointerEvents: showsOverlay ? 'auto' : 'none',
          transition: 'opacity 200ms var(--kro-ease-standard)',
        }}
      >
        <div className="kro-glass flex size-full items-center justify-center gap-3.5">
        <MarkCompleteControl
          model={model}
          diameter={40}
          glyphSize={16}
          tabbable={showsOverlay}
          onMarkComplete={onMarkComplete}
          onSkip={onSkip}
        />
        <DeferControl
          model={model}
          diameter={40}
          glyphSize={16}
          tabbable={showsOverlay}
          now={now}
          onDefer={onDefer}
        />
        <CircleAction
          label="Start"
          diameter={52}
          glyphSize={20}
          fill="badgeGreen"
          tabbable={showsOverlay}
          onPress={() => onExecute?.()}
        >
          <Play size={20} aria-hidden />
        </CircleAction>
        {model.isEvent ? null : (
          <CircleAction
            label="Skip"
            diameter={40}
            glyphSize={16}
            fill="badgeNeutral"
            tabbable={showsOverlay}
            onPress={() => onSkip?.()}
          >
            <Skip size={16} aria-hidden />
          </CircleAction>
        )}
        <DeleteControl
          model={model}
          diameter={40}
          glyphSize={16}
          tabbable={showsOverlay}
          onDelete={onDelete}
        />
        </div>
      </div>

      {isSelected ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radiusVar('surface'),
            boxShadow: `inset 0 0 0 3px ${colorVar('accent')}`,
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Shared pieces                                                             */
/* ------------------------------------------------------------------------ */

function Caption({
  glyph,
  text,
  emphasis,
}: {
  readonly glyph: React.ReactNode
  readonly text: string
  readonly emphasis?: 'bannerWarning'
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px]"
      style={{
        color: emphasis === undefined ? colorVar('foreSecondary') : colorVar(emphasis),
      }}
    >
      {glyph}
      {text}
    </span>
  )
}

function CircleAction({
  label,
  diameter,
  glyphSize,
  fill,
  tabbable = true,
  onPress,
  children,
}: {
  readonly label: string
  readonly diameter: number
  readonly glyphSize: number
  readonly fill: 'badgeGreen' | 'badgeNeutral' | 'completeBlue' | 'badgeOrange' | 'badgeRed' | 'charcoal'
  readonly tabbable?: boolean
  readonly onPress: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={tabbable ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation()
        onPress()
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        width: diameter,
        height: diameter,
        fontSize: glyphSize,
        backgroundColor: colorVar(fill),
        // The label on a BADGE fill follows the scheme — those tokens are a
        // deep variant in light and a bright variant in dark, so a fixed white
        // glyph falls to about 2:1 on the bright one. `completeBlue` is the one
        // fill that does not flip, and it keeps canon's white checkmark.
        color: colorVar(fill === 'completeBlue' ? 'snow' : 'absolute'),
        boxShadow: shadowVar('subtle'),
      }}
    >
      {children}
    </button>
  )
}

/**
 * The check (tasks) or skip (events) control.
 *
 * A task's check OPENS the backdate popover; an event's skip fires directly.
 * That asymmetry is canon's and is the whole reason the two are one component:
 * the geometry is identical and the behaviour is not, so keeping them apart
 * would put the same offsets in two places to keep in sync.
 */
function MarkCompleteControl({
  model,
  diameter,
  glyphSize,
  tabbable = true,
  onMarkComplete,
  onSkip,
}: {
  readonly model: EndeavorCardModel
  readonly diameter: number
  readonly glyphSize: number
  readonly tabbable?: boolean
  readonly onMarkComplete?: (model: EndeavorCardModel, completedAt: Date) => void
  readonly onSkip?: () => void
}) {
  const [open, setOpen] = useState(false)

  if (model.isEvent) {
    return (
      <CircleAction
        label="Skip event"
        diameter={diameter}
        glyphSize={glyphSize}
        fill="badgeNeutral"
        tabbable={tabbable}
        onPress={() => onSkip?.()}
      >
        <Skip size={glyphSize} aria-hidden />
      </CircleAction>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mark complete"
          tabIndex={tabbable ? 0 : -1}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            width: diameter,
            height: diameter,
            backgroundColor: colorVar('completeBlue'),
            color: colorVar('snow'),
            boxShadow: shadowVar('subtle'),
          }}
        >
          <Check size={glyphSize} strokeWidth={3} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(event) => event.stopPropagation()}>
        <MarkCompletePopover
          initialDate={new Date()}
          onConfirm={(completedAt) => {
            setOpen(false)
            onMarkComplete?.(model, completedAt)
          }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function DeferControl({
  model,
  diameter,
  glyphSize,
  tabbable = true,
  now,
  onDefer,
  onSkip,
}: {
  readonly model: EndeavorCardModel
  readonly diameter: number
  readonly glyphSize: number
  readonly tabbable?: boolean
  readonly now: Date
  readonly onDefer?: (target: Date) => void
  readonly onSkip?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Defer"
          tabIndex={tabbable ? 0 : -1}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            width: diameter,
            height: diameter,
            backgroundColor: colorVar('badgeOrange'),
            color: colorVar('absolute'),
            boxShadow: shadowVar('subtle'),
          }}
        >
          <DeferGlyph size={glyphSize} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(event) => event.stopPropagation()}>
        <DeferPopover
          initialTarget={defaultDeferTarget(model.dueTime, now)}
          onConfirm={(target) => {
            setOpen(false)
            onDefer?.(target)
          }}
          onSkip={
            onSkip === undefined
              ? undefined
              : () => {
                  setOpen(false)
                  onSkip()
                }
          }
        />
      </PopoverContent>
    </Popover>
  )
}

function DeleteControl({
  model,
  diameter,
  glyphSize,
  tabbable = true,
  onDelete,
}: {
  readonly model: EndeavorCardModel
  readonly diameter: number
  readonly glyphSize: number
  readonly tabbable?: boolean
  readonly onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Delete"
          tabIndex={tabbable ? 0 : -1}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            width: diameter,
            height: diameter,
            backgroundColor: colorVar('badgeRed'),
            color: colorVar('absolute'),
            boxShadow: shadowVar('subtle'),
          }}
        >
          <Trash size={glyphSize} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(event) => event.stopPropagation()}>
        <DeleteConfirmationPopover
          title={model.title}
          onConfirm={() => {
            setOpen(false)
            onDelete?.()
          }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * The overflow menu — canon's `moreActionsMenu`, in canon's order: Defer, Skip,
 * Delegate, Details (only when the surface opts in), a separator, then Delete.
 *
 * ## The menu is a shortcut INTO a flow, never past it
 *
 * Defer and Delete open the same two popovers the dedicated `DeferControl` and
 * `DeleteControl` open. Reaching an action by a second route must not skip the
 * step the first route exists for — a menu Defer that fired
 * `defaultDeferTarget` picked the time on the user's behalf, and a menu Delete
 * that fired `onDelete` removed the endeavor from every source with no warning.
 * The routing rule itself lives in `endeavorOverflow.ts`, where `onDefer` and
 * `onDelete` are not in scope at all.
 *
 * The popover is anchored rather than triggered: one button cannot be both a
 * `DropdownMenuTrigger` and a `PopoverTrigger`, so the trigger opens the menu
 * and the flow's panel hangs off a `PopoverAnchor` wrapping it.
 */
function OverflowMenu({
  model,
  diameter,
  glyphSize,
  tabbable = true,
  now,
  onSkip,
  onDefer,
  onDelegate,
  onShowDetails,
  onDelete,
}: {
  readonly model: EndeavorCardModel
  readonly diameter: number
  readonly glyphSize: number
  readonly tabbable?: boolean
  readonly now: Date
  readonly onSkip?: () => void
  readonly onDefer?: (target: Date) => void
  readonly onDelegate?: () => void
  readonly onShowDetails?: () => void
  readonly onDelete?: () => void
}) {
  const [flow, setFlow] = useState<OverflowFlow | null>(null)

  const select = (action: OverflowAction) =>
    selectOverflowAction(action, {
      openFlow: setFlow,
      skip: onSkip,
      delegate: onDelegate,
      showDetails: onShowDetails,
    })

  return (
    <Popover
      open={flow !== null}
      onOpenChange={(open) => {
        if (!open) setFlow(null)
      }}
    >
      <PopoverAnchor asChild>
        <span
          data-slot="endeavor-card-overflow"
          data-flow={flow ?? 'none'}
          className="inline-flex"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                tabIndex={tabbable ? 0 : -1}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-kro-pill',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  width: diameter,
                  height: diameter,
                  backgroundColor: colorVar('charcoal'),
                  color: colorVar('absolute'),
                  boxShadow: shadowVar('subtle'),
                }}
              >
                <Ellipsis size={glyphSize} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => select('defer')}>
                <DeferGlyph size={18} aria-hidden />
                Defer
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => select('skip')}>
                <Skip size={18} aria-hidden />
                Skip
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => select('delegate')}>
                <Delegate size={18} aria-hidden />
                Delegate
              </DropdownMenuItem>
              {onShowDetails === undefined ? null : (
                <DropdownMenuItem onSelect={() => select('details')}>
                  <Details size={18} aria-hidden />
                  Details
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => select('delete')}>
                <Trash size={18} aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </PopoverAnchor>
      <PopoverContent align="start" onClick={(event) => event.stopPropagation()}>
        {flow === 'delete' ? (
          <DeleteConfirmationPopover
            title={model.title}
            onConfirm={() => {
              setFlow(null)
              onDelete?.()
            }}
            onCancel={() => setFlow(null)}
          />
        ) : (
          <DeferPopover
            initialTarget={defaultDeferTarget(model.dueTime, now)}
            onConfirm={(target) => {
              setFlow(null)
              onDefer?.(target)
            }}
            onSkip={
              onSkip === undefined
                ? undefined
                : () => {
                    setFlow(null)
                    onSkip()
                  }
            }
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
