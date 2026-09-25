import { cn } from './utils/cn'

/**
 * The row highlight shared by menus and sidebars.
 *
 * A translucent `absolute` fill at 25%, plus a glass-rim stroke that is
 * lighter than the resting hairline. The border is always present so the
 * row does not grow on hover. The label color stays put.
 */
export const ROW_HIGHLIGHT = cn(
  'border border-transparent',
  'hover:border-(--kro-glass-rim) hover:bg-kro-absolute/25',
  'focus-visible:border-(--kro-glass-rim) focus-visible:bg-kro-absolute/25',
)

/**
 * The hover a toolbar control takes — the FAB menu rows' glass hover fill
 * (`--kro-glass-surface-hover`: the `absolute` pole at ~70%, so near-black in
 * dark mode), with the glyph switching to `fore` so it stays legible on it.
 * Every toolbar item shares it, so they all answer the pointer the same way.
 */
export const TOOLBAR_HOVER = cn(
  'border border-transparent',
  'hover:border-(--kro-glass-rim) hover:bg-(--kro-glass-surface-hover) hover:text-kro-fore',
  'focus-visible:border-(--kro-glass-rim) focus-visible:bg-(--kro-glass-surface-hover) focus-visible:text-kro-fore',
)

/**
 * Large-screen header glyphs. A step above the 28px pointer target, with the
 * same 8px corner the menu rows use, and the FAB menu's hover fill. The glyph itself stays
 * the small icon step so the surround reads around it.
 */
export const TOOLBAR_GLYPH_BUTTON_PX = 32

export const TOOLBAR_GLYPH_BUTTON = cn(
  'inline-flex shrink-0 items-center justify-center rounded-kro-small text-inherit',
  'outline-none focus-visible:shadow-[var(--kro-ring)]',
  TOOLBAR_HOVER,
)
