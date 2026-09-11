/**
 * Fluent 2 Message bar, painted with KroTokens.
 *
 * Same philosophy as Endeavor `InlineBanner`: the fill is opaque so contrast
 * can be measured once, and the intent is spoken as an `sr-only` prefix
 * inside `role="status"` — never as an `aria-label` that a live region may
 * skip. Colour is never the only signal.
 */

import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { ColorRole } from '../../system/tokens/roles'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

export type MessageBarIntent = 'info' | 'success' | 'warning' | 'error'
export type MessageBarLayout = 'singleline' | 'multiline'

export interface MessageBarAction {
  readonly label: string
  readonly onAction: () => void
}

interface IntentStyle {
  readonly fill: ColorRole
  readonly title: ColorRole
  readonly body: string
  readonly spokenPrefix: string
}

const INTENTS: Readonly<Record<MessageBarIntent, IntentStyle>> = {
  info: {
    fill: 'backInner',
    title: 'fore',
    body: colorVar('foreSecondary'),
    spokenPrefix: 'Note',
  },
  success: {
    fill: 'focusGreen',
    title: 'snow',
    body: 'rgb(255 255 255 / 0.7)',
    spokenPrefix: 'Success',
  },
  warning: {
    fill: 'bannerWarning',
    title: 'snow',
    body: 'rgb(255 255 255 / 0.7)',
    spokenPrefix: 'Warning',
  },
  error: {
    fill: 'bannerDanger',
    title: 'snow',
    body: 'rgb(255 255 255 / 0.7)',
    spokenPrefix: 'Error',
  },
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleAlert,
} as const

export interface MessageBarProps {
  readonly intent?: MessageBarIntent
  readonly layout?: MessageBarLayout
  readonly title: string
  readonly body?: string
  readonly action?: MessageBarAction
  readonly onDismiss?: () => void
  readonly className?: string
}

export function MessageBar({
  intent = 'info',
  layout = 'singleline',
  title,
  body,
  action,
  onDismiss,
  className,
}: MessageBarProps) {
  const style = INTENTS[intent]
  const Icon = ICONS[intent]
  const titleColor = colorVar(style.title)
  const single = layout === 'singleline'

  return (
    <div
      role="status"
      data-slot="message-bar"
      data-intent={intent}
      data-layout={layout}
      className={cn(
        'flex w-full gap-2.5 rounded-kro-field p-3',
        single ? 'items-center' : 'items-start',
        className,
      )}
      style={{
        backgroundColor: colorVar(style.fill),
        color: titleColor,
      }}
    >
      <span className="sr-only">{`${style.spokenPrefix}: `}</span>
      <Icon
        size={16}
        strokeWidth={2.5}
        className="mt-px shrink-0"
        aria-hidden
      />
      <div
        className={cn(
          'flex min-w-0 flex-1',
          single
            ? 'flex-row items-center gap-2'
            : 'flex-col items-stretch gap-1.5',
        )}
      >
        <p
          className={cn(
            'm-0 text-[13px] font-semibold leading-snug',
            single ? 'shrink-0' : undefined,
          )}
        >
          {title}
        </p>
        {body === undefined ? null : (
          <p
            className={cn(
              'm-0 text-[13px] leading-snug',
              single ? 'truncate' : undefined,
            )}
            style={{ color: style.body }}
          >
            {body}
          </p>
        )}
        {action === undefined ? null : (
          <button
            type="button"
            onClick={action.onAction}
            className={cn(
              'inline-flex h-11 w-fit shrink-0 items-center',
              'rounded-kro-small px-3 text-[13px] font-semibold',
              'underline underline-offset-2 outline-none',
              'focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{ color: titleColor }}
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss === undefined ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center',
            'rounded-kro-small outline-none',
            'focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{ color: titleColor }}
        >
          <X size={16} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  )
}
