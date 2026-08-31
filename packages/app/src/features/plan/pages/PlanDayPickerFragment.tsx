'use client'

/**
 * The floating five-day picker — the port of `TimelineDayView.datePicker`.
 *
 * Pure (`RC-15`): the five dates arrive already computed by
 * `selectPlanDayPickerDates`, which wraps #18's `planDayPickerDates` /
 * `planDayPickerCenter`. This Fragment owns none of that arithmetic — it owns
 * only what a day chip *looks* like, which is where canon's contrast reasoning
 * lives.
 *
 * ## The selected chip and the today letter are one contrast decision
 *
 * Canon spells it out at `pickerWeekdayForeground`: the selected cell takes an
 * **opaque `fore` fill** — near-black in light, white in dark — so the number
 * on it must be `absolute`, the inverse. Today keeps its crimson accent, *"but
 * only while unselected: on the selected fill that crimson falls to 2.57:1 in
 * light mode"*, so today-and-selected switches to the lightened
 * `timelineTodaySelectedForeground` (5.56:1 light, 6.62:1 dark). All four cases
 * are ported, and the design system already declares both tokens, so nothing
 * here mints a colour.
 *
 * ## Seven items, not five
 *
 * Canon lays out `chevron.left + ForEach(-2...2) + chevron.right` in one
 * `HStack` of seven equal columns, so a chip's width is a seventh of the row
 * and the two arrows are the same size as a day. That is why the arrows are
 * part of this Fragment rather than of the header: they share the row's
 * geometry, and pulling them out would leave the five chips wider than canon's.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ICON_SIZE } from '../../../design/system/icons/icons'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { isSamePlanDay } from '../PlanCalendar'
import {
  dayPickerAccessibleDate,
  dayPickerDayNumber,
  dayPickerWeekdayLetter,
} from './timeline/timelineFormat'

/** `PlanLayoutMetrics.dayPickerHeight`. */
export const DAY_PICKER_HEIGHT = 52
/** Canon's `HStack(spacing: 8)`. */
const ITEM_SPACING = 8
/** Canon's `RoundedRectangle(cornerRadius: 14, style: .continuous)`. */
const ITEM_RADIUS = 14

export interface PlanDayPickerFragmentProps {
  /** The five days, ascending — `selectPlanDayPickerDates`. */
  readonly dates: readonly Date[]
  readonly selectedDate: Date
  /** The wall clock, so "today" is a value rather than a `Date.now()` read. */
  readonly now: Date
  readonly onSelectDate: (date: Date) => void
  readonly onStepDay: (days: number) => void
  readonly className?: string
}

/**
 * `TimelineDayView.pickerWeekdayForeground(isToday:isSelected:)` — all four
 * cases, exported so the contrast rule is assertable without rendering.
 */
export const pickerWeekdayColor = (
  isToday: boolean,
  isSelected: boolean,
): string => {
  if (isToday && isSelected) return colorVar('timelineTodaySelectedForeground')
  if (isToday) return colorVar('timelineTodayForeground')
  if (isSelected) return colorVar('absolute')
  return colorVar('fore')
}

export function PlanDayPickerFragment({
  dates,
  selectedDate,
  now,
  onSelectDate,
  onStepDay,
  className,
}: PlanDayPickerFragmentProps) {
  return (
    <div
      data-testid="plan-day-picker"
      className={cn('grid w-full items-stretch', className)}
      style={{
        // Seven equal columns — canon's `itemWidth` computed from an item
        // count of 7. A grid rather than a flex row with a measured width: the
        // browser divides the track, so there is nothing to measure and
        // nothing to re-measure on rotation.
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: ITEM_SPACING,
        height: DAY_PICKER_HEIGHT,
      }}
    >
      <PickerArrow
        label="Previous day"
        onClick={() => onStepDay(-1)}
        icon={<ChevronLeft size={ICON_SIZE.small} aria-hidden="true" />}
      />

      {dates.map((date) => {
        const isSelected = isSamePlanDay(date, selectedDate)
        const isToday = isSamePlanDay(date, now)
        return (
          <button
            key={date.toISOString()}
            type="button"
            aria-label={dayPickerAccessibleDate(date)}
            aria-pressed={isSelected}
            data-testid="plan-day-chip"
            data-selected={isSelected ? 'true' : 'false'}
            data-today={isToday ? 'true' : 'false'}
            onClick={() => onSelectDate(date)}
            className={cn(
              'flex flex-col items-center justify-center gap-[1px]',
              'cursor-pointer',
              // The glass only carries the *unselected* chip. A selected one is
              // an opaque fill by design — see the header note — so putting the
              // material under it would tint the fill the contrast pair was
              // measured against.
              !isSelected && 'kro-glass kro-glass--control kro-glass--interactive',
            )}
            style={{
              borderRadius: ITEM_RADIUS,
              ...(isSelected
                ? {
                    background: colorVar('fore'),
                    border: `3px solid ${colorVar('timelineSelectionOutline')}`,
                  }
                : { border: 'none' }),
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1,
                color: pickerWeekdayColor(isToday, isSelected),
              }}
            >
              {dayPickerWeekdayLetter(date)}
            </span>
            <span
              aria-hidden="true"
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.2,
                color: isSelected ? colorVar('absolute') : colorVar('fore'),
              }}
            >
              {dayPickerDayNumber(date)}
            </span>
          </button>
        )
      })}

      <PickerArrow
        label="Next day"
        onClick={() => onStepDay(1)}
        icon={<ChevronRight size={ICON_SIZE.small} aria-hidden="true" />}
      />
    </div>
  )
}

function PickerArrow({
  label,
  onClick,
  icon,
}: {
  readonly label: string
  readonly onClick: () => void
  readonly icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'kro-glass kro-glass--control kro-glass--interactive',
        'flex cursor-pointer items-center justify-center text-kro-fore',
      )}
      style={{ borderRadius: ITEM_RADIUS, border: 'none' }}
    >
      {icon}
    </button>
  )
}
