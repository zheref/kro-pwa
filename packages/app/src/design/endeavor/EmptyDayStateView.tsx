/**
 * The two full-surface empty states — canon
 * `KroUI/Components/EmptyDayStateView.swift` (which declares `EmptyStateView`)
 * and the private `InboxEmptyState` in `KroUI/Inbox/InboxView.swift`.
 *
 * They are different shapes for different situations and canon keeps them
 * apart, so this port does too:
 *
 *   · `EmptyDayStateView` is the Do tab's first-launch promotion — shown when the
 *     user has zero endeavors anywhere. It sits on the page field, centred,
 *     with on-gradient ink and a KroGlass Create control. There is no inset
 *     well: the copy lives at the root of the content area.
 *   · `InboxTrayEmptyState` is the tray's centred illustration — a glyph, a
 *     headline and one supporting line, vertically centred in whatever height
 *     the parent gives it (canon's Spacer–Image–Spacer), under a header the
 *     parent pins. It offers no action, because an empty inbox is not a problem
 *     to fix.
 */

import { OnGradient } from '../system/gradient/OnGradient'
import { Button } from '../system/primitives/button'
import { colorVar } from '../system/tokens/roles'
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
    <div
      data-slot="empty-day-state"
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-kro-medium px-kro-medium text-center',
        className,
      )}
    >
      <CalendarPlus
        size={36}
        aria-hidden
        className="kro-on-gradient"
        style={{ opacity: 0.7 }}
      />
      <OnGradient as="p" className="m-0 text-lg font-bold">
        {title}
      </OnGradient>
      <OnGradient as="p" className="m-0 max-w-prose text-sm leading-relaxed">
        {message}
      </OnGradient>
      {onCreateEndeavor === undefined ? null : (
        <Button
          variant="glass"
          size="pill"
          onClick={onCreateEndeavor}
          className="mt-kro-tiny"
        >
          <PlusCircle size={18} aria-hidden />
          {actionTitle}
        </Button>
      )}
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
