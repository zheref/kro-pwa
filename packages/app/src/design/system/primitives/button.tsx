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
 * Compact (`sm`) is the default. Comfortable (`md`) is the mobile preview.
 * `lg` is the 44px iOS floor, opt-in.
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
      },
      size: {
        /** Compact — default. Smaller type than Apple's compact control. */
        sm: 'h-6 rounded-kro-small px-2 text-xs',
        /** Comfortable — mobile / touch preview. */
        md: 'h-9 rounded-kro-field px-kro-small text-sm',
        /** The 44px iOS floor, when a surface truly needs it. */
        lg: 'h-11 rounded-kro-field px-kro-medium text-sm',
        /** Icon-only, comfortable. */
        icon: 'size-9 rounded-kro-field',
        /** Icon-only, compact. */
        'icon-sm': 'size-6 rounded-kro-small',
        pill: 'h-9 rounded-kro-pill px-kro-medium text-sm',
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
    defaultVariants: { variant: 'secondary', size: 'sm' },
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
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...rest
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      data-slot="button"
      // A button inside a form defaults to `submit` in HTML, which is how a
      // "Cancel" control ends up submitting the form it sits in.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    />
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
