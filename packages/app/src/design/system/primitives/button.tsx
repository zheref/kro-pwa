import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import {
  type ControlDensity,
  buttonSizeForDensity,
  controlDensity,
  controlMinSizeVar,
  iconButtonSizeForDensity,
} from '../density'
import { cn } from '../utils/cn'

/**
 * Button — the shadcn/ui primitive, themed on KroTokens and KroGlass.
 *
 * Filled variants (primary, secondary, destructive) are glass controls with
 * an accent, field, or danger tint — the same material as a FAB or tab list,
 * not a flat fill. Ghost stays borderless. Height comes from `size`; glass
 * no longer forces the 44px touch floor.
 *
 * THE DISABLED FADE IS APPLIED EXACTLY ONCE.
 * `--kro-opacity-disabled` (0.62) appears in the base classes and nowhere
 * else. A wrapper that dims its subtree while this also dims itself multiplies
 * the two to ~0.38 and drops the control below the 3:1 floor for UI elements —
 * KroApple has the same note at the token's declaration, and
 * `button.test.tsx` asserts the class appears once.
 *
 * Compact (`sm`) is the default, at the 28px pointer floor. Comfortable
 * (`md`) is the mobile preview. `lg` is the 44px iOS floor, opt-in.
 *
 * KEYBOARD SHORTCUTS. `shortcut="return" | "escape"` draws a trailing key
 * glyph (⏎ / esc) at reduced strength of the label colour and sets
 * `aria-keyshortcuts`; the glyph is `aria-hidden` and adds no hit area. Pass
 * `showShortcut={false}` on touch-primary presentations — the attribute stays.
 */
const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center gap-1',
    'cursor-default whitespace-nowrap font-medium',
    'kro-motion-quick transition-[color,background-color,box-shadow,transform]',
    'outline-none focus-visible:shadow-[var(--kro-ring)]',
    'active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
  ),
  {
    variants: {
      variant: {
        /** The one primary action on a surface. Accent-tinted KroGlass. */
        primary:
          'kro-glass kro-glass--control kro-glass--accent kro-glass--interactive text-kro-on-accent',
        /** Everything alongside it. Untinted control glass. */
        secondary:
          'kro-glass kro-glass--control kro-glass--interactive text-kro-fore',
        /** Low-emphasis, inline with content. No fill. */
        ghost: 'text-kro-fore hover:bg-kro-back-inner',
        /** Destructive. Paired with a word — never colour alone (epic AC 9). */
        destructive:
          'kro-glass kro-glass--control kro-glass--danger kro-glass--interactive',
        /**
         * Untinted control glass — the same material as `secondary`. Kept so
         * existing `variant="glass"` call sites keep compiling.
         */
        glass:
          'kro-glass kro-glass--control kro-glass--interactive text-kro-fore',
        /**
         * Fluent 2 `outline`: a hairline, no fill. Colour is never the
         * only signal — the word on the button is.
         */
        outline:
          'border border-kro-hairline bg-transparent text-kro-fore hover:bg-kro-back-inner',
        /**
         * Fluent 2 `subtle`. Same job as `ghost`; kept as its own name so
         * Fluent stories can say `subtle` without a mapping table.
         */
        subtle: 'text-kro-fore hover:bg-kro-back-inner',
        /**
         * Fluent 2 `transparent`: inline with copy, no chrome until hover.
         */
        transparent: 'text-kro-fore hover:text-kro-accent',
      },
      size: {
        /**
         * Compact — default, 28px (`h-7`), the pointer floor. The corner is the menu-row radius
         * (`--kro-radius-small`), the same one the sidebar and a popover use.
         * A mobile idiom overrides that to a pill in `styles.css`; `pill` and
         * `shape="circular"` stay pills, and the FAB disc sets its own radius.
         */
        sm: 'h-7 rounded-kro-small px-2.5 text-xs',
        /** Comfortable — mobile / touch preview. Same corner as `sm`. */
        md: 'h-9 rounded-kro-small px-kro-small text-sm',
        /** The 44px iOS floor, when a surface truly needs it. */
        lg: 'h-11 rounded-kro-small px-kro-medium text-sm',
        /** Icon-only, comfortable. */
        icon: 'size-9 rounded-kro-small',
        /** Icon-only, compact. */
        'icon-sm': 'size-6 rounded-kro-small',
        /** Explicit pill. The idiom rule does not restyle this size. */
        pill: 'h-9 rounded-kro-pill px-kro-medium text-sm',
      },
      shape: {
        /** Fluent 2 `rounded` — the radius comes from `size`. */
        rounded: '',
        circular: 'rounded-kro-pill',
        square: 'rounded-none',
      },
    },
    compoundVariants: [
      {
        size: 'md',
        class: "[&_svg:not([class*='size-'])]:size-4",
      },
      {
        size: 'lg',
        class: "[&_svg:not([class*='size-'])]:size-4",
      },
      {
        size: 'icon',
        class: "[&_svg:not([class*='size-'])]:size-4",
      },
      {
        size: 'pill',
        class: "[&_svg:not([class*='size-'])]:size-4",
      },
    ],
    defaultVariants: { variant: 'secondary', size: 'sm', shape: 'rounded' },
  },
)

export interface ButtonProps
  extends ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the child element instead of a `button`, keeping every class and
   * handler. The escape hatch for a link that must look like a button —
   * without nesting an anchor inside a button, which is invalid.
   */
  readonly asChild?: boolean
  /**
   * The key that performs this command. Draws a trailing key glyph (⏎, esc)
   * after the label and exposes the key to assistive tech through
   * `aria-keyshortcuts`. The glyph itself is decorative (`aria-hidden`).
   */
  readonly shortcut?: ButtonShortcut
  /**
   * Whether the glyph is drawn. Pass `false` on touch-primary presentations,
   * where there is no keyboard to hint at; `aria-keyshortcuts` stays.
   */
  readonly showShortcut?: boolean
}

/** The keys a Button can advertise. */
export type ButtonShortcut = 'return' | 'escape'

/** The glyph drawn for each key — the macOS menu vocabulary. */
export const BUTTON_SHORTCUT_GLYPH: Record<ButtonShortcut, string> = {
  return: '⏎',
  escape: 'esc',
}

/** The `aria-keyshortcuts` value for each key (WAI-ARIA key names). */
export const BUTTON_SHORTCUT_ARIA: Record<ButtonShortcut, string> = {
  return: 'Enter',
  escape: 'Escape',
}

export function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  type,
  shortcut,
  showShortcut = true,
  children,
  ...rest
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  // `asChild` renders exactly one child, so a glyph cannot be appended there.
  const drawsGlyph = shortcut !== undefined && showShortcut && !asChild

  return (
    <Component
      data-slot="button"
      data-shape={shape ?? 'rounded'}
      data-size={size ?? 'sm'}
      // A button inside a form defaults to `submit` in HTML, which is how a
      // "Cancel" control ends up submitting the form it sits in.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      aria-keyshortcuts={
        shortcut === undefined ? undefined : BUTTON_SHORTCUT_ARIA[shortcut]
      }
      {...rest}
    >
      {drawsGlyph && shortcut !== undefined ? (
        <>
          {children}
          <ShortcutGlyph shortcut={shortcut} />
        </>
      ) : (
        children
      )}
    </Component>
  )
}

function ShortcutGlyph({ shortcut }: { readonly shortcut: ButtonShortcut }) {
  return (
    <ShortcutHint className="ms-1">
      {BUTTON_SHORTCUT_GLYPH[shortcut]}
    </ShortcutHint>
  )
}

/**
 * A key hint — the glyph a Button draws for its shortcut, reusable wherever a
 * control advertises a chord (a property pill, a segment). The label's own
 * colour at 55% strength: darker than the fill on a light control, lighter on
 * a dark one. Decorative (`aria-hidden`); the control names the key through
 * `aria-keyshortcuts`.
 *
 * Two placements:
 * - `inline` (the Button's) sits in the label's flow.
 * - `keycap` takes ZERO layout space: a small chip floated over the
 *   top-leading corner of its nearest positioned ancestor, fading with the
 *   motion tokens (instant under reduced motion), never catching the pointer.
 *   This is what a held-to-reveal hint uses, so revealing it — or reserving
 *   for it — can never widen a row.
 */
export function ShortcutHint({
  children,
  reveal = true,
  placement = 'inline',
  className,
}: {
  readonly children: string
  readonly reveal?: boolean
  readonly placement?: 'inline' | 'keycap'
  readonly className?: string
}) {
  if (placement === 'keycap') {
    return (
      <span
        aria-hidden="true"
        data-slot="button-shortcut"
        data-placement="keycap"
        data-revealed={reveal ? 'true' : 'false'}
        className={cn('pointer-events-none font-medium', className)}
        style={{
          position: 'absolute',
          top: -7,
          left: -4,
          zIndex: 1,
          padding: '1px 3px',
          // 11px: the smallest legible keycap (UX-8), still floating in no
          // layout space.
          fontSize: 11,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          borderRadius: 4,
          border: '1px solid var(--kro-color-hairline)',
          background: 'var(--kro-color-back)',
          // `fore-secondary` on the opaque `back` chip — a measured ≥4.5:1
          // pair (contrast suite), where 55% `fore` measured ~3.5:1.
          color: 'var(--kro-color-fore-secondary)',
          opacity: reveal ? 1 : 0,
          transitionProperty: 'opacity',
          transitionDuration: 'var(--kro-duration-quick, 180ms)',
          transitionTimingFunction: 'var(--kro-ease-standard)',
        }}
      >
        {children}
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      data-slot="button-shortcut"
      data-placement="inline"
      data-revealed={reveal ? 'true' : 'false'}
      className={cn('font-normal', className)}
      style={{
        // 85% of the label's own colour: still recessed, but ≥4.5:1 on both
        // the primary (accent) and the secondary (glass) fills — 55% was
        // ~3.3–3.8:1.
        color: 'color-mix(in srgb, currentColor 85%, transparent)',
        visibility: reveal ? 'visible' : 'hidden',
      }}
    >
      {children}
    </span>
  )
}

export type { ControlDensity }

export {
  buttonSizeForDensity,
  controlDensity,
  controlMinSizeVar,
  iconButtonSizeForDensity,
}

export { buttonVariants }
