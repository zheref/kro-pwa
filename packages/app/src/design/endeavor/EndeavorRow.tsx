/**
 * `EndeavorRow` — canon `KroUI/Components/EndeavorRow.swift`.
 *
 * The unified list row behind Inbox, Find and every other endeavor list. Canon
 * merged `InboxRow` and `FindEndeavorRow` into one component with a
 * CONFIGURATION rather than two components with 90% shared markup, and the port
 * keeps that: `ENDEAVOR_ROW_CONFIGS` holds the four presets canon ships, and a
 * surface picks one instead of inventing a fifth set of paddings.
 *
 * | Preset                 | Icon | Title    | Min height | Badges      | Time |
 * |------------------------|------|----------|-----------|-------------|------|
 * | `default`              | 56   | headline | 80        | below title | yes  |
 * | `inbox`                | 56   | headline | 80        | below title | no   |
 * | `compactDesktopInbox`  | 34   | subhead  | 52        | below title | no   |
 * | `find`                 | 52   | headline | 90        | trailing    | yes  |
 *
 * `compactDesktopInbox` is the pointer-first one and canon says why: *"Brand
 * styling remains unchanged; only control geometry and spacing are reduced for
 * pointer-first use."* That is the epic's 44px↔28px idiom rule expressed as a
 * preset, so a desktop Inbox does not have to re-derive it.
 *
 * ## Input duality
 *
 * The row itself draws; `EndeavorActionSurface` supplies the grammar. Pass
 * `capabilities` and `onOperation` and the same bindings become swipe surfaces
 * on touch and a hover strip plus a context menu on pointer — see
 * `rowActions.ts`. Omit them and the row is a pure, actionless list item, which
 * is what a read-only vista wants.
 */

import type {
  EndeavorCapabilities,
  EndeavorKind,
  EndeavorStatus,
} from '@kro/core'
import type { ReactNode } from 'react'
import { colorVar, radiusVar, shadowVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import {
  EndeavorActionSurface,
  POINTER_GUTTER_VAR,
} from './EndeavorActionSurface'
import { RewardBadge, UrgencyBadge } from './CardBadge'
import { KroChip, semanticTint } from './KroChip'
import type { EndeavorCardModel, EndeavorUrgency } from './endeavorCardModel'
import { EndeavorUrgency as Urgency } from './endeavorCardModel'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'
import {
  kindGlyph,
  kindShortLabel,
  kindTint,
  statusGlyph,
  statusShortLabel,
  statusTint,
} from './endeavorProjections'
import { formatDueCaption, formatDuration, formatTimeRange } from './formatting'
import type { OnEndeavorOperation } from './rowActions'
import type { InputCapability } from './useInputCapability'

const Clock = endeavorIcon('clock')
const TimerGlyph = endeavorIcon('timer')

/* ------------------------------------------------------------------------ */
/* Time info                                                                 */
/* ------------------------------------------------------------------------ */

/** Canon's `EndeavorRowTimeInfo`. */
export type EndeavorRowTimeInfo =
  | {
      readonly kind: 'dueTime'
      readonly date: Date
      readonly duration: number | null
    }
  | { readonly kind: 'timeRange'; readonly start: Date; readonly end: Date }
  | { readonly kind: 'duration'; readonly seconds: number }

/* ------------------------------------------------------------------------ */
/* Badges                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `EndeavorRowBadge` with its two styles — `filled` is the card's
 * `CardBadge`, `pill` is the soft `KroChip`. Expressed as a union of the four
 * things a row actually shows rather than as a colour-carrying struct, so a
 * caller cannot hand the row a colour that has never been contrast-measured.
 */
export type EndeavorRowBadge =
  | { readonly kind: 'urgency'; readonly urgency: EndeavorUrgency }
  | { readonly kind: 'reward'; readonly amount: number }
  | { readonly kind: 'endeavorKind'; readonly value: EndeavorKind }
  | { readonly kind: 'status'; readonly value: EndeavorStatus }

export function RowBadge({ badge }: { readonly badge: EndeavorRowBadge }) {
  switch (badge.kind) {
    case 'urgency':
      return <UrgencyBadge urgency={badge.urgency} />
    case 'reward':
      return <RewardBadge amount={badge.amount} />
    case 'endeavorKind':
      return (
        <KroChip
          title={kindShortLabel(badge.value)}
          icon={kindGlyph(badge.value)}
          tint={semanticTint(kindTint(badge.value))}
          size="small"
        />
      )
    case 'status':
      return (
        <KroChip
          title={statusShortLabel(badge.value)}
          icon={statusGlyph(badge.value)}
          tint={semanticTint(statusTint(badge.value))}
          size="small"
        />
      )
  }
}

/* ------------------------------------------------------------------------ */
/* Configuration                                                             */
/* ------------------------------------------------------------------------ */

export interface EndeavorRowConfiguration {
  readonly iconSize: number
  readonly titleClassName: string
  readonly titleLineClamp: number
  readonly minHeight: number
  readonly badgesPosition: 'belowTitle' | 'trailing'
  readonly showTimeInfo: boolean
  readonly horizontalPadding: number
  readonly verticalPadding: number
  readonly rowSpacing: number
  readonly cornerRadius: string
}

const BASE: EndeavorRowConfiguration = {
  iconSize: 56,
  titleClassName: 'text-base font-bold',
  titleLineClamp: 3,
  minHeight: 80,
  badgesPosition: 'belowTitle',
  showTimeInfo: true,
  horizontalPadding: 16,
  verticalPadding: 14,
  rowSpacing: 14,
  cornerRadius: radiusVar('surface'),
}

/** Canon's four presets, values ported 1:1. */
export const ENDEAVOR_ROW_CONFIGS = {
  default: BASE,
  inbox: { ...BASE, titleLineClamp: 1, showTimeInfo: false },
  compactDesktopInbox: {
    ...BASE,
    iconSize: 34,
    titleClassName: 'text-sm font-bold',
    titleLineClamp: 1,
    minHeight: 52,
    showTimeInfo: false,
    horizontalPadding: 10,
    verticalPadding: 7,
    rowSpacing: 8,
    cornerRadius: radiusVar('field'),
  },
  find: {
    ...BASE,
    iconSize: 52,
    titleLineClamp: 1,
    minHeight: 90,
    badgesPosition: 'trailing',
  },
} as const satisfies Record<string, EndeavorRowConfiguration>

export type EndeavorRowConfigName = keyof typeof ENDEAVOR_ROW_CONFIGS

/* ------------------------------------------------------------------------ */
/* The row                                                                   */
/* ------------------------------------------------------------------------ */

export interface EndeavorRowProps {
  /** Emoji, or an SF Symbol name when `isGenericSymbol` is set. */
  readonly symbol: string
  /**
   * Canon's flag: a generic glyph gets a recessed square behind it, an emoji
   * does not. A 📊 on a grey tile reads as a broken image.
   */
  readonly isGenericSymbol?: boolean
  readonly title: string
  readonly timeInfo?: EndeavorRowTimeInfo
  readonly badges?: readonly EndeavorRowBadge[]
  readonly config?: EndeavorRowConfigName
  /** Trailing controls — the Inbox's Triage / Add for Today buttons. */
  readonly trailing?: ReactNode
  /** `now` is explicit; see `formatting.ts`. */
  readonly now: Date
  readonly locale?: string
  /** Wire the input-duality surface. Omit for a read-only vista. */
  readonly capabilities?: EndeavorCapabilities
  readonly onOperation?: OnEndeavorOperation
  readonly endeavorId?: string
  readonly input?: InputCapability
  readonly className?: string
}

export function EndeavorRow({
  symbol,
  isGenericSymbol = false,
  title,
  timeInfo,
  badges = [],
  config = 'default',
  trailing,
  now,
  locale,
  capabilities,
  onOperation,
  endeavorId,
  input,
  className,
}: EndeavorRowProps) {
  const preset = ENDEAVOR_ROW_CONFIGS[config]
  const leftBadges = preset.badgesPosition === 'belowTitle' ? badges : []
  const rightBadges = preset.badgesPosition === 'trailing' ? badges : []

  /**
   * Whether anything of ours sits at the trailing edge — and therefore under
   * `EndeavorActionSurface`'s hover strip and menu trigger, which are anchored
   * to that same edge and become clickable on hover. The surface publishes how
   * much room its chrome needs; this is the row deciding to reserve it.
   *
   * Scoped to rows that HAVE trailing content on purpose: a row with nothing
   * there loses no control to the overlay, and indenting it would be a layout
   * change with no defect behind it. The fallback in the `var()` keeps a row
   * rendered outside a surface exactly as it was.
   */
  const hasTrailingContent =
    rightBadges.length > 0 || (trailing !== undefined && trailing !== null)

  const body = (
    <div
      data-slot="endeavor-row"
      data-config={config}
      className={cn('flex w-full items-center', className)}
      style={{
        gap: preset.rowSpacing,
        minHeight: preset.minHeight,
        padding: `${preset.verticalPadding}px ${preset.horizontalPadding}px`,
        ...(hasTrailingContent
          ? {
              paddingRight: `calc(${preset.horizontalPadding}px + var(${POINTER_GUTTER_VAR}, 0px))`,
            }
          : {}),
        borderRadius: preset.cornerRadius,
        backgroundColor: colorVar('absolute'),
        boxShadow: shadowVar('card'),
      }}
    >
      <RowSymbol
        symbol={symbol}
        isGenericSymbol={isGenericSymbol}
        size={preset.iconSize}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className={cn('m-0', preset.titleClassName)}
          style={{
            color: colorVar('fore'),
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: preset.titleLineClamp,
            overflow: 'hidden',
          }}
        >
          {title}
        </p>

        {preset.showTimeInfo && timeInfo !== undefined ? (
          <TimeInfoRow info={timeInfo} now={now} locale={locale} />
        ) : null}

        {leftBadges.length === 0 ? null : (
          <div className="flex flex-wrap items-center gap-1.5">
            {leftBadges.map((badge) => (
              <RowBadge key={badgeKey(badge)} badge={badge} />
            ))}
          </div>
        )}
      </div>

      {rightBadges.length > 0 ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {rightBadges.map((badge) => (
            <RowBadge key={badgeKey(badge)} badge={badge} />
          ))}
        </div>
      ) : (
        trailing
      )}
    </div>
  )

  if (
    capabilities === undefined ||
    onOperation === undefined ||
    endeavorId === undefined
  ) {
    return body
  }

  return (
    <EndeavorActionSurface
      endeavorId={endeavorId}
      capabilities={capabilities}
      onOperation={onOperation}
      input={input}
      label={title}
    >
      {body}
    </EndeavorActionSurface>
  )
}

function badgeKey(badge: EndeavorRowBadge): string {
  switch (badge.kind) {
    case 'urgency':
      return `urgency-${badge.urgency}`
    case 'reward':
      return `reward-${badge.amount}`
    case 'endeavorKind':
      return `kind-${badge.value}`
    case 'status':
      return `status-${badge.value}`
  }
}

function RowSymbol({
  symbol,
  isGenericSymbol,
  size,
}: {
  readonly symbol: string
  readonly isGenericSymbol: boolean
  readonly size: number
}) {
  if (!isGenericSymbol) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.7) }}
      >
        {symbol}
      </span>
    )
  }

  const Icon = endeavorIcon(symbol as KitSymbolName)
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radiusVar('field'),
        backgroundColor: colorVar('backInner'),
        color: colorVar('foreSecondary'),
      }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  )
}

function TimeInfoRow({
  info,
  now,
  locale,
}: {
  readonly info: EndeavorRowTimeInfo
  readonly now: Date
  readonly locale?: string
}) {
  const caption = (glyph: ReactNode, text: string, overdue = false) => (
    <span
      className="inline-flex items-center gap-1 text-xs"
      style={{
        color: overdue ? colorVar('bannerWarning') : colorVar('foreSecondary'),
      }}
    >
      {glyph}
      {text}
    </span>
  )

  switch (info.kind) {
    case 'dueTime': {
      const overdue = info.date.getTime() < now.getTime()
      return (
        <div className="flex flex-wrap items-center gap-3">
          {caption(
            <Clock size={12} aria-hidden />,
            formatDueCaption(info.date, now, locale),
            overdue,
          )}
          {info.duration === null
            ? null
            : caption(
                <TimerGlyph size={12} aria-hidden />,
                formatDuration(info.duration),
              )}
        </div>
      )
    }
    case 'timeRange':
      return (
        <div className="flex flex-wrap items-center gap-3">
          {caption(
            <Clock size={12} aria-hidden />,
            formatTimeRange(info.start, info.end, locale),
          )}
        </div>
      )
    case 'duration':
      return (
        <div className="flex flex-wrap items-center gap-3">
          {caption(
            <TimerGlyph size={12} aria-hidden />,
            formatDuration(info.seconds),
          )}
        </div>
      )
  }
}

/* ------------------------------------------------------------------------ */
/* Convenience builders                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `init(model:config:)` — the Inbox-shaped row from a card model.
 *
 * The Low urgency badge is dropped here, matching canon: an Inbox row shows
 * urgency only when it is worth reading.
 */
export function endeavorRowPropsFromCardModel(
  model: EndeavorCardModel,
): Pick<EndeavorRowProps, 'symbol' | 'title' | 'timeInfo' | 'badges'> {
  const badges: EndeavorRowBadge[] = []
  if (model.urgency !== Urgency.low) {
    badges.push({ kind: 'urgency', urgency: model.urgency })
  }
  badges.push({ kind: 'reward', amount: model.reward })

  const timeInfo: EndeavorRowTimeInfo | undefined =
    model.dueTime !== null
      ? { kind: 'dueTime', date: model.dueTime, duration: model.duration }
      : model.duration !== null
        ? { kind: 'duration', seconds: model.duration }
        : undefined

  return { symbol: model.symbol, title: model.title, timeInfo, badges }
}
