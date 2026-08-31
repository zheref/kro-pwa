/**
 * `KroChip` and `ChipFlow` — canon `KroUI/Components/KroChip.swift`.
 *
 * The tinted capsule Kro uses everywhere identity or status is shown: the Find
 * lens filters, a row's kind/status pills, the Detail surfaces' property values.
 *
 * Canon's own header states the rule this port keeps literally: *"Color is
 * never the only signal: every chip pairs its tint with a glyph and a text
 * label, so it survives grayscale, color-blindness, and VoiceOver."* The
 * `icon` prop is therefore optional in the type and present at every call site
 * in this kit — a chip with no glyph is legal for a caller that has genuinely
 * nothing to draw, and `KroChip.test.tsx` proves the label is never the thing
 * that goes missing.
 *
 * ## Emphasis, and the label colour that follows the scheme
 *
 * `prominent` fills with the tint and puts a WHITE label on it in light mode
 * and a BLACK one in dark. That inversion is canon's, with canon's reason: the
 * badge tokens are a deep variant in light and a bright variant in dark, so a
 * fixed white label falls to ≈2.2:1 on the dark variant. Both pairings are the
 * design system's asserted chip contract, measured in
 * `contrastContracts.ts` — this component is the consumer that contract exists
 * for, so it must not invent a third label colour.
 *
 * `soft` (the workhorse) is the tint at 16% with the tint itself as the label;
 * `outline` is a hairline ring with no fill. Both read the tint as text on the
 * page surface, which is the contract's other measured pairing.
 */

import type { ReactNode } from 'react'
import type { ColorRole, SemanticRole } from '../system/tokens/roles'
import { colorVar, semanticVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { type KitSymbolName, endeavorIcon } from './endeavorIcons'

export type ChipEmphasis = 'prominent' | 'soft' | 'outline'
export type ChipSize = 'small' | 'regular'

/**
 * A chip is tinted by a SEMANTIC role (`kindTask`, `statusBlocked`, …) or by a
 * base palette role for the few chips that are not semantic. Both are token
 * names; neither is a colour value.
 */
export type ChipTint =
  | { readonly kind: 'semantic'; readonly role: SemanticRole }
  | { readonly kind: 'color'; readonly role: ColorRole }

export const semanticTint = (role: SemanticRole): ChipTint => ({
  kind: 'semantic',
  role,
})

export const colorTint = (role: ColorRole): ChipTint => ({
  kind: 'color',
  role,
})

/** `var(--…)` for either flavour. */
export function chipTintVar(tint: ChipTint): string {
  return tint.kind === 'semantic' ? semanticVar(tint.role) : colorVar(tint.role)
}

export interface KroChipProps {
  readonly title: string
  readonly icon?: KitSymbolName
  readonly tint?: ChipTint
  readonly emphasis?: ChipEmphasis
  readonly size?: ChipSize
  readonly className?: string
}

export function KroChip({
  title,
  icon,
  tint = colorTint('accent'),
  emphasis = 'soft',
  size = 'regular',
  className,
}: KroChipProps) {
  const Icon = icon === undefined ? null : endeavorIcon(icon)
  const value = chipTintVar(tint)
  const isSmall = size === 'small'

  /**
   * `prominent` is the one emphasis whose label follows the scheme. `absolute`
   * is the token that says so — "pure white in light, pure black in dark", at
   * its own declaration — which is canon's `colorScheme == .dark ? .black :
   * .white` expressed once instead of at every call site. Not `onAccent`, which
   * looks identical today but is rewritten at runtime by `useAccentColor` and
   * would make a status chip's label follow the ACCENT's contrast needs.
   */
  const style =
    emphasis === 'prominent'
      ? { backgroundColor: value, color: colorVar('absolute') }
      : emphasis === 'soft'
        ? { backgroundColor: `color-mix(in srgb, ${value} 16%, transparent)`, color: value }
        : { color: value, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${value} 55%, transparent)` }

  return (
    <span
      data-emphasis={emphasis}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center rounded-kro-pill font-semibold',
        isSmall ? 'gap-1 px-2 py-1 text-[11px]' : 'gap-[5px] px-2.5 py-1.5 text-xs',
        className,
      )}
      style={style}
    >
      {Icon === null ? null : (
        <Icon size={isSmall ? 9 : 11} strokeWidth={2.5} aria-hidden />
      )}
      <span className="truncate">{title}</span>
    </span>
  )
}

/**
 * `ChipFlow` — chips wrap onto as many lines as they need.
 *
 * Canon's reason, kept verbatim in spirit: *"A row of tags that silently
 * scrolls off-screen is a discoverability bug."* Canon reuses its `FlowLayout`;
 * the web equivalent is one `flex-wrap`, so the wrapping math canon had to
 * write does not exist here at all.
 */
export function ChipFlow({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {children}
    </div>
  )
}
