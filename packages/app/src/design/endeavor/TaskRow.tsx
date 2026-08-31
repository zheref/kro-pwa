/**
 * `TaskRow` — canon `KroUI/Components/TaskRow.swift`.
 *
 * The dense, pointer-first list row the macOS All-Tasks surface uses: a
 * checkbox that grows a "Mark Complete" label on hover, the title with a
 * status-derived subline, the host glyphs, the duration or its reward-points
 * stand-in, and a Start control.
 *
 * Canon guards the whole file with `#if os(macOS)`, and the epic's mapping puts
 * macOS on web DESKTOP — so this row is pointer-first by construction. It is
 * the one component in this kit sized to the 28px POINTER target rather than
 * the 44px touch floor, and the two rules do not contradict: the epic sets 44px
 * for touch (8px separation) and 28px for pointer (4px), and this row exists
 * only on the pointer side.
 *
 * ## Geometry, from canon
 *
 * | Canon                        | Here                    |
 * |------------------------------|-------------------------|
 * | `frame(height: 40)`          | `h-10`                  |
 * | `padding(.horizontal, 10)`   | `px-2.5`                |
 * | `padding(.vertical, 7)`      | `py-[7px]`              |
 * | checkbox box `cornerRadius: 7` | `rounded-[7px]`       |
 * | selected row: black fill, dark scheme forced | `data-selected` |
 *
 * The selection treatment is canon's oddest detail and is kept: a selected row
 * paints `Color.black` and forces `colorScheme = .dark` on its subtree, so the
 * row's own contents re-resolve as light-on-dark rather than being individually
 * inverted. The web equivalent is one `data-theme="dark"` on the row, which is
 * precisely what the design system's scoped attribute selectors were built for.
 *
 * ## Reward points as a duration stand-in
 *
 * Canon renders `30.arrow.trianglehead.clockwise` / `60…` / `90…` — SF Symbols
 * that draw the NUMBER inside the arrow. Lucide has no numeral glyphs, so the
 * port prints the minutes as text beside one repeat glyph: "30m", "60m", "90m",
 * and `N × 30m` past three points, which is the same arithmetic canon's symbol
 * choice encodes.
 */

import { colorVar, radiusVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { formatDuration } from './formatting'
import { endeavorIcon } from './endeavorIcons'
import type { KitSymbolName } from './endeavorIcons'

const Play = endeavorIcon('play')
const Check = endeavorIcon('checkmark')
const Repeat = endeavorIcon('repeat')

/** One session point is one 30-minute block, per canon's glyph ladder. */
export const MINUTES_PER_SESSION_POINT = 30

/** Canon's `durationRow` fallback when an endeavor has points but no duration. */
export function sessionPointsCaption(points: number): string {
  if (points <= 3) return `${points * MINUTES_PER_SESSION_POINT}m`
  return `${points} × ${MINUTES_PER_SESSION_POINT}m`
}

export interface TaskRowModel {
  readonly id: string
  readonly title: string
  /** The status-derived subline: "Created on …", "Due …". */
  readonly subline: string | null
  readonly isCompleted: boolean
  /** Overdue titles paint red — canon's `task.isDue ? .red : .primary`. */
  readonly isOverdue: boolean
  /** Host glyphs on the trailing edge. */
  readonly hostGlyphs: readonly KitSymbolName[]
  /** Seconds. */
  readonly duration: number | null
  readonly sessionPoints: number | null
  /** A spinner while a mutation is in flight — canon's `task.inActivity`. */
  readonly isBusy: boolean
}

export interface TaskRowProps {
  readonly model: TaskRowModel
  readonly isSelected?: boolean
  readonly onToggleComplete?: (id: string, isCompleted: boolean) => void
  readonly onStart?: (id: string) => void
  readonly onSelect?: (id: string) => void
  readonly className?: string
}

export function TaskRow({
  model,
  isSelected = false,
  onToggleComplete,
  onStart,
  onSelect,
  className,
}: TaskRowProps) {
  const durationCaption =
    model.duration !== null
      ? formatDuration(model.duration)
      : model.sessionPoints !== null && model.sessionPoints > 0
        ? sessionPointsCaption(model.sessionPoints)
        : null

  return (
    // A row is a row, not a button: it holds a checkbox and a Start button, and
    // a button may not contain a button. Canon's whole-row `.onTapGesture` is
    // kept as a MOUSE convenience on the container, and the keyboard/AT path is
    // the title, which is a real button. Every action on this row is therefore
    // reachable without a pointer — the container handler is redundant, never
    // load-bearing.
    <div
      data-slot="task-row"
      data-selected={isSelected}
      data-theme={isSelected ? 'dark' : undefined}
      className={cn(
        'group flex h-10 w-full items-center gap-2 px-2.5 py-[7px]',
        className,
      )}
      style={{
        borderRadius: radiusVar('small'),
        // `absolute` INSIDE the `data-theme="dark"` scope above, which resolves
        // to black in both page schemes — canon's literal `Color.black` fill,
        // expressed through the token rather than as a hex. `total` would be
        // the mistake that looks right: re-themed, it resolves to WHITE.
        backgroundColor: isSelected ? colorVar('absolute') : 'transparent',
        color: colorVar('fore'),
      }}
      onClick={() => onSelect?.(model.id)}
    >
      {/* Checkbox. Canon grows a "Mark Complete" label on hover; on the web
          that is `group-hover`, so the label costs no state. */}
      <label
        className={cn(
          'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 px-1.5',
          'outline-none',
        )}
        style={{
          borderRadius: '7px',
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colorVar('foreSecondary')} 30%, transparent)`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={model.isCompleted}
          onChange={(event) => onToggleComplete?.(model.id, event.target.checked)}
        />
        <span
          aria-hidden
          className="inline-flex size-4 items-center justify-center rounded-[4px]"
          style={{
            backgroundColor: model.isCompleted ? colorVar('accent') : 'transparent',
            boxShadow: model.isCompleted
              ? undefined
              : `inset 0 0 0 1px color-mix(in srgb, ${colorVar('foreSecondary')} 45%, transparent)`,
            color: colorVar('onAccent'),
          }}
        >
          {model.isCompleted ? <Check size={11} strokeWidth={3} /> : null}
        </span>
        <span
          className="hidden whitespace-nowrap text-[11px] font-medium group-hover:inline"
          style={{ color: colorVar('foreSecondary') }}
        >
          {model.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
        </span>
      </label>

      <span className="flex min-w-0 flex-1 flex-col items-start">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect?.(model.id)
          }}
          className={cn(
            'max-w-full truncate text-left text-sm',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
            model.isCompleted && 'line-through',
          )}
          style={{
            minHeight: 'var(--kro-size-min-pointer-target)',
            color: model.isOverdue ? colorVar('bannerDanger') : colorVar('fore'),
          }}
        >
          {model.title}
        </button>
        {model.subline === null ? null : (
          <span
            className="truncate text-[11px]"
            style={{ color: colorVar('foreSecondary') }}
          >
            {model.subline}
          </span>
        )}
      </span>

      {model.isBusy ? (
        <span
          role="progressbar"
          aria-label="Working"
          // `animate-spin` is stilled for free under `prefers-reduced-motion`:
          // `motion.css` clamps every animation's duration globally.
          className="size-3 shrink-0 animate-spin rounded-kro-pill border-2 border-current border-t-transparent"
          style={{ color: colorVar('foreSecondary') }}
        />
      ) : null}

      <span aria-hidden className="flex shrink-0 items-center gap-1">
        {model.hostGlyphs.map((glyph) => {
          const HostIcon = endeavorIcon(glyph)
          return (
            <HostIcon
              key={glyph}
              size={13}
              style={{ color: colorVar('foreSecondary') }}
            />
          )
        })}
      </span>

      {durationCaption === null ? null : (
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
          style={{ color: colorVar('foreSecondary') }}
        >
          {model.duration === null ? <Repeat size={12} aria-hidden /> : null}
          {durationCaption}
        </span>
      )}

      <button
        type="button"
        aria-label={`Start ${model.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onStart?.(model.id)
        }}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1 px-2 text-[11px] font-semibold',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
        style={{
          minWidth: 'var(--kro-size-min-pointer-target)',
          borderRadius: radiusVar('small'),
          backgroundColor: colorVar('accent'),
          color: colorVar('onAccent'),
        }}
      >
        <Play size={11} aria-hidden />
        Start
      </button>
    </div>
  )
}
