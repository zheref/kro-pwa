/**
 * `InlineBanner` — canon `KroUI/Components/InlineBanner.swift`.
 *
 * A surface's inline feedback: the failure a relation screen surfaces after a
 * save, an offline notice, a read-only explanation. Canon's header names the
 * three rules the bare `Text(error).foregroundStyle(.kroRed)` it replaced was
 * breaking — no glyph (colour as the only signal), no container (reads as body
 * copy), no recovery path — and all three are kept here: glyph plus a spoken
 * severity prefix, a filled container, and an optional action.
 *
 * ## The one deliberate departure: the fill is OPAQUE
 *
 * Canon paints `kind.tint.opacity(0.12)` with a 0.35 border. This port fills
 * with `bannerWarning` / `bannerDanger` at full opacity and puts white text on
 * it. The reason is written at those tokens' declaration in `tokens.css`: *"a
 * translucent fill's contrast is a property of whatever is behind it, so it
 * cannot be verified once."* On iOS a banner only ever sits on a known grouped
 * background; on the web it can land on a glass sheet, a gradient header inset,
 * or a card — three different answers to the same measurement. The opaque pair
 * is the design system's own decision, already contract-asserted at 4.5:1 for
 * a white title and a 70%-white supporting line in BOTH schemes, and this
 * component is the consumer that contract was written for.
 *
 * ## `info` is not a banner token, and is not invented as one
 *
 * Canon's third kind is `.info` on `cozyBlue`. `cozyBlue` is declared in
 * `tokens.css` as a decorative tint with no contrast duty, and there is no
 * third banner token. Rather than mint a colour in a lane that does not own
 * colours, `info` is drawn on `backInner` with `fore` / `foreSecondary` text —
 * a pairing the contrast suite already measures on every surface, in both
 * schemes. It reads as a quiet note rather than an alert, which is what an
 * `info` banner is for.
 */

import type { ColorRole } from '../system/tokens/roles'
import { colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export type InlineBannerKind = 'info' | 'warning' | 'error'

interface BannerStyle {
  readonly fill: ColorRole
  readonly title: ColorRole
  readonly body: string
  readonly symbol: KitSymbolName
  /** Prefixed to the accessible name so severity is spoken, never only shown. */
  readonly spokenPrefix: string
}

const STYLES: Readonly<Record<InlineBannerKind, BannerStyle>> = {
  error: {
    fill: 'bannerDanger',
    title: 'snow',
    body: 'rgb(255 255 255 / 0.7)',
    symbol: 'exclamationmark.triangle',
    spokenPrefix: 'Error',
  },
  warning: {
    fill: 'bannerWarning',
    title: 'snow',
    body: 'rgb(255 255 255 / 0.7)',
    symbol: 'clock.badge.exclamationmark.fill',
    spokenPrefix: 'Warning',
  },
  info: {
    fill: 'backInner',
    title: 'fore',
    body: colorVar('foreSecondary'),
    symbol: 'info.circle.fill',
    spokenPrefix: 'Note',
  },
}

export interface InlineBannerProps {
  readonly message: string
  readonly kind?: InlineBannerKind
  /** A supporting second line. Optional; the message alone is a valid banner. */
  readonly detail?: string
  /** The recovery path. Canon: an error with no next step is the third defect. */
  readonly actionTitle?: string
  readonly onAction?: () => void
  readonly className?: string
}

export function InlineBanner({
  message,
  kind = 'error',
  detail,
  actionTitle,
  onAction,
  className,
}: InlineBannerProps) {
  const style = STYLES[kind]
  const Icon = endeavorIcon(style.symbol)
  const hasAction = actionTitle !== undefined && onAction !== undefined

  return (
    <div
      role="status"
      aria-label={`${style.spokenPrefix}: ${message}`}
      data-kind={kind}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-kro-field p-3',
        className,
      )}
      style={{ backgroundColor: colorVar(style.fill), color: colorVar(style.title) }}
    >
      <Icon size={16} strokeWidth={2.5} className="mt-px shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="m-0 text-[13px] font-semibold leading-snug">{message}</p>
        {detail === undefined ? null : (
          <p className="m-0 text-[13px] leading-snug" style={{ color: style.body }}>
            {detail}
          </p>
        )}
        {hasAction ? (
          <button
            type="button"
            onClick={onAction}
            className={cn(
              'inline-flex h-11 w-fit items-center rounded-kro-small px-3',
              'text-[13px] font-semibold underline underline-offset-2',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{ color: colorVar(style.title) }}
          >
            {actionTitle}
          </button>
        ) : null}
      </div>
    </div>
  )
}
