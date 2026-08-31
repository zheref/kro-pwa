'use client'

/**
 * The attention panel — the port of `KroUI/Do/DoNotificationsView.swift`.
 *
 * Canon frames it `380 × 440`, and the epic's Design Direction repeats that as
 * a canonical desktop popover size ("Do notifications 380×440min"). Both
 * numbers are here as a **minimum**, not a fixed frame: a browser popover that
 * cannot fit 440px of viewport should scroll its list rather than overflow the
 * window, which is what `maxHeight` plus the scrolling body gives.
 *
 * A pure Fragment (`RC-15`): the Screen supplies already-derived card models,
 * "keeping this renderer free of store and domain-fetching concerns" — canon's
 * own sentence, and the reason this file reads no lane and no lens.
 */
import { BellOff, CalendarClock, ClockAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  CompactPresentationHeader,
  type EndeavorCardModel,
  formatRelativeTime,
} from '../../../design/endeavor'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { doNotificationsSummary } from './doPresentation'

/**
 * `bell.slash`, `clock.badge.exclamationmark` and
 * `calendar.badge.exclamationmark` — canon's three glyphs here. None is in the
 * kit's SF-Symbol table (which only carries the symbols the *components* draw),
 * so they are resolved straight from lucide, the same way `MainShellFragment`
 * resolves the shell's own chrome glyphs.
 */

/** Canon's `.frame(width: 380, height: 440)`, taken as the panel's minimum. */
export const DO_NOTIFICATIONS_PANEL = { width: 380, minHeight: 440 } as const

export interface DoNotificationsFragmentProps {
  readonly overdue: readonly EndeavorCardModel[]
  readonly expired: readonly EndeavorCardModel[]
  /** Passed in so the relative captions are testable — see `formatting.ts`. */
  readonly now: Date
  readonly locale?: string
  readonly onDismiss: () => void
  readonly className?: string
}

export function DoNotificationsFragment({
  overdue,
  expired,
  now,
  locale,
  onDismiss,
  className,
}: DoNotificationsFragmentProps) {
  const summary = doNotificationsSummary(overdue.length + expired.length)
  const isEmpty = overdue.length === 0 && expired.length === 0

  return (
    <div
      data-testid="do-notifications-panel"
      className={cn('flex flex-col', className)}
      style={{
        width: DO_NOTIFICATIONS_PANEL.width,
        minHeight: DO_NOTIFICATIONS_PANEL.minHeight,
        maxWidth: '100%',
        maxHeight: 'min(80vh, 560px)',
      }}
    >
      <CompactPresentationHeader
        title="Notifications"
        subtitle={summary ?? undefined}
        leadingAction={{ kind: 'dismiss', onPress: onDismiss }}
      />
      <hr
        className="m-0 h-px border-0"
        style={{ backgroundColor: colorVar('hairline') }}
      />

      {isEmpty ? (
        /*
          Canon's `ContentUnavailableView`. The copy is canon's, verbatim: an
          empty panel is a state with a name, not a blank list — and the bell
          never opens one in the first place (`DoScreen` refuses to present it
          with nothing to show), so this is what a panel already open shows the
          moment its last item is completed.
        */
        <div
          data-testid="do-notifications-empty"
          className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center"
        >
          <BellOff
            size={40}
            strokeWidth={1.5}
            aria-hidden
            style={{
              color: `color-mix(in srgb, ${colorVar('foreSecondary')} 45%, transparent)`,
            }}
          />
          <p
            className="m-0 font-semibold text-base"
            style={{ color: colorVar('fore') }}
          >
            You&rsquo;re All Caught Up
          </p>
          <p className="m-0 text-sm" style={{ color: colorVar('foreSecondary') }}>
            There are no updates requiring your attention.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <NotificationSection
            title="Overdue"
            icon={<ClockAlert size={14} aria-hidden />}
            cards={overdue}
            now={now}
            locale={locale}
          />
          <NotificationSection
            title="Expired"
            icon={<CalendarClock size={14} aria-hidden />}
            cards={expired}
            now={now}
            locale={locale}
          />
        </div>
      )}
    </div>
  )
}

function NotificationSection({
  title,
  icon,
  cards,
  now,
  locale,
}: {
  readonly title: string
  readonly icon: ReactNode
  readonly cards: readonly EndeavorCardModel[]
  readonly now: Date
  readonly locale?: string
}) {
  if (cards.length === 0) return null

  return (
    <section
      data-testid={`do-notifications-${title.toLowerCase()}`}
      aria-label={title}
      className="px-1 py-1"
    >
      <h3
        className="m-0 flex items-center gap-1.5 px-3 py-1.5 font-semibold text-sm"
        style={{ color: colorVar('foreSecondary') }}
      >
        {icon}
        {title}
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {cards.map((card) => (
          <li key={card.id} className="flex items-center gap-3 px-3 py-1.5">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center text-lg"
            >
              {card.symbol}
            </span>
            <div className="flex min-w-0 flex-col gap-px">
              <span
                className="line-clamp-2 text-sm"
                style={{ color: colorVar('fore') }}
              >
                {card.title}
              </span>
              {card.dueTime === null ? null : (
                <span
                  className="text-xs"
                  style={{ color: colorVar('foreSecondary') }}
                >
                  {formatRelativeTime(card.dueTime, now, locale)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
