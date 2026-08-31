import type { CSSProperties } from 'react'
import { iconForSymbol } from '../../system/icons/icons'
import { cn } from '../../system/utils/cn'
import { CHROME_LAYOUT } from '../layout/chromeLayout'
import {
  type ActiveToastModel,
  TOAST_ICON_COLOR_VAR,
  type ToastAction,
  type ToastActionStyle,
} from './activeToast'

/**
 * The Active Toast itself — the glass pill, without any opinion about where it
 * sits or how long it lives.
 *
 * Port of `Kro/Application/Fragments/ActiveToast/ActiveToastView.swift` and
 * `docs/Features/ActiveToast.md` § Visual Design. Placement, entry/exit and the
 * dismiss timer belong to `ActiveToastLayer` and `ActiveToastHost`; splitting
 * them is what lets the placement matrix be storied without a timer running and
 * the pill be snapshotted without a viewport.
 *
 * ==========================================================================
 * A DIVERGENCE INSIDE CANON ITSELF, AND WHICH SIDE THIS PORT TOOK
 * ==========================================================================
 *
 * The spec and the shipped Swift view disagree about this component's shape:
 *
 *   `docs/Features/ActiveToast.md`     "Rounded rectangle with 16pt continuous
 *                                       corner radius", "Minimum 72pt height,
 *                                       adapts to content", "18pt horizontal,
 *                                       16pt vertical" padding.
 *   `ActiveToastView.swift` at 9d1e395  `Capsule()`, `.frame(height: 62)`,
 *                                       `.padding(.horizontal, 18)
 *                                        .padding(.vertical, 12)`.
 *
 * The Swift view drifted to a 62pt capsule to share a baseline with the FAB and
 * the Session Pill, and its own comment says so. The epic's canon rule is
 * "docs/Features/*.md is the binding reference; code is the tie-breaker" — but
 * the tie-breaker resolves an ambiguity, and this is not one: the two state
 * different numbers for the same property, and the ISSUE (`#15`) restates the
 * spec's numbers as its acceptance criteria. So this port follows the SPEC —
 * 16px radius, 72px minimum height — and the divergence is named in the PR
 * rather than silently chosen. Flipping to the capsule later is two constants
 * in `chromeLayout.ts`.
 */

export interface ActiveToastViewProps {
  readonly toast: ActiveToastModel
  readonly className?: string
  readonly style?: CSSProperties
}

const RewardGlyph = iconForSymbol('sparkles')

const ACTION_STYLES: Record<ToastActionStyle, CSSProperties> = {
  /** Canon: plain text in the accent colour, no background. */
  standard: { color: 'var(--kro-color-accent)', background: 'transparent' },
  /** Canon: plain text in red. Paired with a word, never colour alone. */
  destructive: { color: 'var(--kro-color-kro-red)', background: 'transparent' },
  /** Canon: white on an accent fill at 90%. */
  prominent: {
    color: 'var(--kro-color-on-accent)',
    background: 'color-mix(in srgb, var(--kro-color-accent) 90%, transparent)',
  },
}

export function ActiveToastView({ toast, className, style }: ActiveToastViewProps) {
  const Icon = toast.icon ? iconForSymbol(toast.icon) : null
  const iconColor = TOAST_ICON_COLOR_VAR[toast.iconColor ?? 'primary']
  const hasReward = typeof toast.rewardAmount === 'number'

  return (
    <div
      className={cn('kro-glass text-kro-fore', className)}
      data-kro-toast=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: CHROME_LAYOUT.toastMinHeight,
        maxWidth: CHROME_LAYOUT.toastMaxWidth,
        width: '100%',
        // 16px, not `--kro-radius-surface` (20px). See the divergence note.
        borderRadius: CHROME_LAYOUT.toastCornerRadius,
        padding: `${CHROME_LAYOUT.toastPaddingY}px ${CHROME_LAYOUT.toastPaddingX}px`,
        ...style,
      }}
    >
      {/* Leading: icon + message + reward. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {Icon ? (
          <Icon
            aria-hidden="true"
            style={{
              width: toast.iconSize ?? 16,
              height: toast.iconSize ?? 16,
              // Canon reserves a fixed 24pt column so messages line up whether
              // or not the icon is the same width as its neighbour's.
              flex: `0 0 24px`,
              color: iconColor,
            }}
            strokeWidth={2.25}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span
            data-kro-toast-message=""
            style={{
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.3,
              // Canon: `.lineLimit(2)`.
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {toast.message}
          </span>

          {hasReward ? (
            <span
              data-kro-toast-reward=""
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--kro-color-reward-yellow)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {/*
                Canon draws `bolt.fill`. The SF-Symbol map has no bolt row yet
                and adding one lives in `system/icons`, outside this issue's
                file lane — so the reward badge borrows the mapped `sparkles`,
                which carries the same "you earned something" reading. The
                point value beside it is what actually conveys the amount, and
                it is text, so a screen reader gets it either way.
              */}
              <RewardGlyph className="size-3.5" aria-hidden="true" strokeWidth={2.5} />
              <span>{`+${toast.rewardAmount}`}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/*
        Trailing: up to two actions. Canon stacks them vertically when both are
        present and puts the SECONDARY on top — the affirmative "View"/"Share"
        sits above the reversing "Undo".
      */}
      {toast.primaryAction ? (
        <div
          data-kro-toast-actions={toast.secondaryAction ? 'stacked' : 'single'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {toast.secondaryAction ? <ToastActionButton action={toast.secondaryAction} /> : null}
          <ToastActionButton action={toast.primaryAction} />
        </div>
      ) : null}
    </div>
  )
}

function ToastActionButton({ action }: { action: ToastAction }) {
  const style = ACTION_STYLES[action.style ?? 'standard']

  return (
    <button
      type="button"
      onClick={action.onSelect}
      data-kro-toast-action={action.style ?? 'standard'}
      className="kro-motion-quick outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        // Canon: `.padding(.horizontal, 12).padding(.vertical, 6)`, radius 8.
        padding: '6px 12px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {action.title}
    </button>
  )
}
