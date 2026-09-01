/**
 * `PropertyRow` — canon `KroUI/Components/PropertyRow.swift`.
 *
 * The labelled read row behind the Detail and summary surfaces. Pure: the
 * caller maps its own model into a `PropertyRowValue` before handing it in, so
 * the row never learns a domain type (`RC-14`).
 *
 * Canon's UI pass is ported with it, because each of its four fixes is a real
 * defect and not a style preference:
 *   · the label sits in a fixed glyph column, so rows align optically;
 *   · `tags` WRAP through `ChipFlow` instead of scrolling horizontally — canon:
 *     the old rendering "hid every tag past the first";
 *   · `tint` draws a bordered swatch, so a near-white associated colour is
 *     still visible on a white card;
 *   · `chip` / `chips` exist so status and host membership render as the
 *     tinted capsules the app uses elsewhere, not as flat grey text.
 *
 * ## Restacking, and the accessibility-text-size rule
 *
 * Canon restacks the row vertically at accessibility Dynamic Type sizes,
 * because label and value cannot share a line at any reasonable measure. The
 * web has no `dynamicTypeSize` to read; the equivalent signal is the user's own
 * root font size, so the row restacks below a container width expressed in
 * `em`. At 16px that is 26rem-ish; at a 200%-zoomed 32px root it is twice the
 * pixels — which is exactly the behaviour canon gets from Dynamic Type, with
 * one container query instead of an environment read.
 *
 * Chip-shaped values restack unconditionally, also canon's rule: `ChipFlow`
 * claims the full width and lays out from the leading edge, so trailing-
 * aligning it strands the chips mid-row.
 */

import type { ReactNode } from 'react'
import { colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import {
  ChipFlow,
  type ChipTint,
  KroChip,
  chipTintVar,
  colorTint,
} from './KroChip'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

/** One chip in a `chips` value. */
export interface PropertyRowChip {
  readonly id: string
  readonly title: string
  readonly icon?: KitSymbolName
  readonly tint: ChipTint
}

/**
 * What a row prints on its trailing edge. A discriminated union, so the row
 * adapts its presentation without knowing anything about the caller's model.
 */
export type PropertyRowValue =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly text: string }
  | { readonly kind: 'tags'; readonly tags: readonly string[] }
  | {
      readonly kind: 'chip'
      readonly title: string
      readonly icon?: KitSymbolName
      readonly tint: ChipTint
    }
  | { readonly kind: 'chips'; readonly chips: readonly PropertyRowChip[] }
  | {
      readonly kind: 'rating'
      readonly value: number
      readonly outOf: number
      readonly symbol: KitSymbolName
    }
  | { readonly kind: 'tint'; readonly tint: ChipTint; readonly label: string }
  | { readonly kind: 'empty'; readonly placeholder: string }

/**
 * The spoken value for each case.
 *
 * Exported so the test can assert the real mapping instead of duplicating it —
 * canon makes the same call, and for the same reason: a rating that speaks as
 * "star star star" rather than "4 out of 5" is the defect this function exists
 * to prevent, and a test that re-implements the mapping cannot catch it.
 */
export function propertyRowAccessibilityText(value: PropertyRowValue): string {
  switch (value.kind) {
    case 'text':
    case 'emphasis':
      return value.text
    case 'tags':
      return value.tags.length === 0 ? 'None' : value.tags.join(', ')
    case 'chip':
      return value.title
    case 'chips':
      return value.chips.length === 0
        ? 'None'
        : value.chips.map((chip) => chip.title).join(', ')
    case 'rating':
      return `${value.value} out of ${value.outOf}`
    case 'tint':
      return value.label
    case 'empty':
      return value.placeholder
  }
}

/** Chip-shaped values always restack; see the note at the top of the file. */
function wantsStackedValue(value: PropertyRowValue): boolean {
  if (value.kind === 'tags') return value.tags.length > 0
  if (value.kind === 'chips') return value.chips.length > 0
  return false
}

export interface PropertyRowProps {
  readonly label: string
  readonly value: PropertyRowValue
  readonly icon?: KitSymbolName
  readonly className?: string
}

export function PropertyRow({
  label,
  value,
  icon,
  className,
}: PropertyRowProps) {
  const Icon = icon === undefined ? null : endeavorIcon(icon)
  const stacked = wantsStackedValue(value)

  const labelBlock = (
    <span className="flex shrink-0 items-center gap-kro-small">
      {Icon === null ? null : (
        <Icon
          size={14}
          aria-hidden
          className="shrink-0"
          style={{
            color: colorVar('foreSecondary'),
            width: 'var(--kro-size-row-icon-column)',
          }}
        />
      )}
      <span className="text-sm" style={{ color: colorVar('foreSecondary') }}>
        {label}
      </span>
    </span>
  )

  return (
    <div
      data-slot="property-row"
      data-stacked={stacked}
      className={cn(
        'flex min-h-7 w-full gap-3',
        stacked
          ? 'flex-col items-start'
          : 'flex-row flex-wrap items-baseline justify-between',
        // The Dynamic-Type equivalent. Tailwind's breakpoints are `rem`, and
        // `rem` IS the user's root font size — so a reader at 200% text gets
        // the stacked layout on a viewport twice as wide, which is the same
        // trade canon makes when `dynamicTypeSize.isAccessibilitySize` flips.
        'max-[26rem]:flex-col max-[26rem]:items-start',
        className,
      )}
    >
      {labelBlock}
      {/*
        The value is drawn `aria-hidden` and spoken by the `sr-only` sibling.
        That is canon's `.accessibilityElement(children: .ignore)` +
        `.accessibilityValue(...)` pair: a rating drawn as five glyphs would
        otherwise be announced as five images, and an em-dash placeholder as
        "em dash" rather than "None".
      */}
      <span
        aria-hidden
        className={cn('min-w-0', stacked ? 'w-full' : 'text-right')}
        style={
          stacked && icon !== undefined
            ? {
                paddingLeft:
                  'calc(var(--kro-size-row-icon-column) + var(--kro-space-small))',
              }
            : undefined
        }
      >
        <PropertyRowValueView value={value} />
      </span>
      <span className="sr-only">{propertyRowAccessibilityText(value)}</span>
    </div>
  )
}

function PropertyRowValueView({
  value,
}: {
  readonly value: PropertyRowValue
}): ReactNode {
  switch (value.kind) {
    case 'text':
      return (
        <span className="text-sm" style={{ color: colorVar('fore') }}>
          {value.text}
        </span>
      )
    case 'emphasis':
      return (
        <span
          className="text-sm font-semibold"
          style={{ color: colorVar('fore') }}
        >
          {value.text}
        </span>
      )
    case 'tags':
      return value.tags.length === 0 ? (
        <Placeholder text="—" />
      ) : (
        <ChipFlow>
          {value.tags.map((tag) => (
            <KroChip
              key={tag}
              title={tag}
              icon="tag"
              tint={colorTint('payneGray')}
              size="small"
            />
          ))}
        </ChipFlow>
      )
    case 'chip':
      return (
        <KroChip
          title={value.title}
          icon={value.icon}
          tint={value.tint}
          size="small"
        />
      )
    case 'chips':
      return value.chips.length === 0 ? (
        <Placeholder text="—" />
      ) : (
        <ChipFlow>
          {value.chips.map((chip) => (
            <KroChip
              key={chip.id}
              title={chip.title}
              icon={chip.icon}
              tint={chip.tint}
              size="small"
            />
          ))}
        </ChipFlow>
      )
    case 'rating': {
      // Not `Symbol`: that shadows the global, and a reader two screens down
      // cannot tell which one a bare `Symbol` is.
      const RatingGlyph = endeavorIcon(value.symbol)
      return (
        <span className="inline-flex items-center gap-[3px]">
          {Array.from({ length: Math.max(value.outOf, 0) }, (_, index) => (
            <RatingGlyph
              // biome-ignore lint/suspicious/noArrayIndexKey: the glyphs are positional — index IS the identity
              key={index}
              size={13}
              aria-hidden
              // The unfilled remainder keeps a visible outline rather than
              // dropping out, so "2 of 5" and "5 of 5" differ at a glance.
              style={{
                color:
                  index < value.value
                    ? colorVar('accent')
                    : `color-mix(in srgb, ${colorVar('foreSecondary')} 30%, transparent)`,
              }}
            />
          ))}
        </span>
      )
    }
    case 'tint':
      return (
        <span className="inline-flex items-center gap-kro-small">
          <span
            aria-hidden
            data-slot="property-row-swatch"
            className="size-3.5 shrink-0 rounded-kro-pill"
            style={{
              backgroundColor: chipTintVar(value.tint),
              boxShadow: `inset 0 0 0 1px ${colorVar('hairline')}`,
            }}
          />
          <span className="text-sm" style={{ color: colorVar('fore') }}>
            {value.label}
          </span>
        </span>
      )
    case 'empty':
      return <Placeholder text={value.placeholder} />
  }
}

function Placeholder({ text }: { readonly text: string }) {
  return (
    <span
      className="text-sm"
      style={{
        color: `color-mix(in srgb, ${colorVar('foreSecondary')} 70%, transparent)`,
      }}
    >
      {text}
    </span>
  )
}
