/**
 * The two full-surface empty states — canon
 * `KroUI/Components/EmptyDayStateView.swift` (which declares `EmptyStateView`)
 * and the private `InboxEmptyState` in `KroUI/Inbox/InboxView.swift`.
 *
 * They are different shapes for different situations and canon keeps them
 * apart, so this port does too:
 *
 *   · `EmptyDayStateView` is the Do tab's PROMOTION inset — shown when the user
 *     has zero endeavors anywhere, typically first launch. It sits on the
 *     indigoGrape gradient, so its whole palette is white-on-translucent-dark
 *     and it carries a prominent Create CTA.
 *   · `InboxTrayEmptyState` is the tray's centred illustration — a glyph, a
 *     headline and one supporting line, vertically centred in whatever height
 *     the parent gives it (canon's Spacer–Image–Spacer), under a header the
 *     parent pins. It offers no action, because an empty inbox is not a problem
 *     to fix.
 *
 * ## The inset background
 *
 * Canon draws a "pressed inside" inset: a translucent black fill, a
 * top-weighted inner shadow, and a faint bottom-edge highlight. All three port
 * directly — `inset` box-shadows are the same idea with less machinery than
 * SwiftUI's stroke-blur-mask stack, and the result is one `boxShadow` rather
 * than three layered shapes.
 *
 * The CTA capsule is the indigoGrape gradient from the design system's own
 * header tokens, so the button and the header slab behind it cannot drift.
 */

import { colorVar, radiusVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { endeavorIcon } from './endeavorIcons'

const CalendarPlus = endeavorIcon('calendar.badge.plus')
const PlusCircle = endeavorIcon('plus.circle.fill')
const Tray = endeavorIcon('tray')

export interface EmptyDayStateViewProps {
  readonly title?: string
  readonly message?: string
  readonly actionTitle?: string
  readonly onCreateEndeavor?: () => void
  readonly className?: string
}

export function EmptyDayStateView({
  title = 'Start Building Your Day',
  message = 'Connect your calendar and reminders to see your existing schedule, or create your first endeavor manually.',
  actionTitle = 'Create',
  onCreateEndeavor,
  className,
}: EmptyDayStateViewProps) {
  return (
    <div className={cn('w-full px-kro-medium py-kro-large', className)}>
      <div
        data-slot="empty-day-state"
        className="flex w-full flex-col items-center gap-kro-medium px-5 py-7 text-center"
        style={{
          borderRadius: radiusVar('surface'),
          backgroundColor: 'rgb(0 0 0 / 0.18)',
          boxShadow: [
            'inset 0 2px 6px rgb(0 0 0 / 0.15)',
            'inset 0 1px 0 rgb(0 0 0 / 0.15)',
            'inset 0 -1px 0 rgb(255 255 255 / 0.05)',
          ].join(', '),
        }}
      >
        <CalendarPlus
          size={36}
          aria-hidden
          style={{ color: 'rgb(255 255 255 / 0.5)' }}
        />
        <p
          className="m-0 text-lg font-bold"
          style={{ color: 'rgb(255 255 255 / 0.85)' }}
        >
          {title}
        </p>
        <p
          className="m-0 max-w-prose text-sm leading-relaxed"
          style={{ color: 'rgb(255 255 255 / 0.55)' }}
        >
          {message}
        </p>
        {onCreateEndeavor === undefined ? null : (
          <button
            type="button"
            onClick={onCreateEndeavor}
            className={cn(
              'mt-kro-tiny inline-flex items-center gap-kro-small px-7 text-base font-semibold text-white',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{
              minHeight: 'var(--kro-size-min-touch-target)',
              borderRadius: radiusVar('pill'),
              backgroundImage: `linear-gradient(90deg, ${colorVar('headerGradientIndigo')}, ${colorVar('headerGradientGrape')})`,
              boxShadow: '0 4px 8px rgb(88 86 214 / 0.4)',
            }}
          >
            <PlusCircle size={18} aria-hidden />
            {actionTitle}
          </button>
        )}
      </div>
    </div>
  )
}

export interface InboxTrayEmptyStateProps {
  readonly title?: string
  readonly message?: string
  readonly className?: string
}

/**
 * The tray's centred illustration. `flex-1` plus `justify-center` is canon's
 * Spacer–Image–Spacer: the block stays optically centred in whatever height the
 * pinned header leaves it, rather than clinging to the top of a short sheet.
 */
export function InboxTrayEmptyState({
  title = 'Inbox is empty',
  message = 'Recently added endeavors will appear here',
  className,
}: InboxTrayEmptyStateProps) {
  return (
    <div
      data-slot="inbox-tray-empty-state"
      className={cn(
        'flex w-full flex-1 flex-col items-center justify-center gap-3 py-kro-x-large text-center',
        className,
      )}
    >
      <Tray
        size={48}
        strokeWidth={1.5}
        aria-hidden
        style={{
          color: `color-mix(in srgb, ${colorVar('foreSecondary')} 45%, transparent)`,
        }}
      />
      <p
        className="m-0 text-base font-semibold"
        style={{ color: colorVar('foreSecondary') }}
      >
        {title}
      </p>
      <p
        className="m-0 text-sm"
        style={{
          color: `color-mix(in srgb, ${colorVar('foreSecondary')} 70%, transparent)`,
        }}
      >
        {message}
      </p>
    </div>
  )
}
