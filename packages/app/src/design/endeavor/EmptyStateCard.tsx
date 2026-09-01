/**
 * `EmptyStateCard` — canon `KroUI/Components/EmptyStateCard.swift`.
 *
 * The compact empty state a grouped card shows when its collection has no
 * entries: "no performances yet", "not attached to any host".
 *
 * Canon's reason for it existing at all is worth keeping in view, because it is
 * the difference between this and a `PropertyRow` with an empty value: those
 * screens used to render an empty collection as *a property whose value happens
 * to be blank* rather than *an invitation*. An empty state says what the thing
 * is, why it is empty, and — when there is one — offers the action that fills
 * it.
 *
 * Deliberately distinct from `EmptyDayStateView`, the full-bleed gradient-backed
 * Do-tab promotion. This one is an inset FOR a card.
 *
 * The action clears the 44px touch floor (`--kro-size-min-touch-target`), which
 * canon also does explicitly — `.frame(minHeight: KroTokens.Size.minTouchTarget)`
 * on a `.controlSize(.small)` button, for the same reason.
 */

import { colorVar, radiusVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export interface EmptyStateCardProps {
  readonly icon: KitSymbolName
  readonly title: string
  readonly message?: string
  readonly actionTitle?: string
  readonly onAction?: () => void
  readonly className?: string
}

export function EmptyStateCard({
  icon,
  title,
  message,
  actionTitle,
  onAction,
  className,
}: EmptyStateCardProps) {
  const Icon = endeavorIcon(icon)
  const hasAction = actionTitle !== undefined && onAction !== undefined

  return (
    <div
      data-slot="empty-state-card"
      className={cn(
        'flex w-full flex-col items-center gap-kro-small py-kro-small text-center',
        className,
      )}
    >
      <Icon
        size={22}
        aria-hidden
        style={{
          color: `color-mix(in srgb, ${colorVar('foreSecondary')} 65%, transparent)`,
        }}
      />
      <p
        className="m-0 text-sm font-semibold"
        style={{ color: colorVar('fore') }}
      >
        {title}
      </p>
      {message === undefined ? null : (
        <p
          className="m-0 text-[13px]"
          style={{ color: colorVar('foreSecondary') }}
        >
          {message}
        </p>
      )}
      {hasAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'mt-kro-tiny inline-flex items-center px-4 text-[13px] font-semibold',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            minHeight: 'var(--kro-size-min-touch-target)',
            borderRadius: radiusVar('pill'),
            backgroundColor: colorVar('accent'),
            color: colorVar('onAccent'),
          }}
        >
          {actionTitle}
        </button>
      ) : null}
    </div>
  )
}
