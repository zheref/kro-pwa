/**
 * DropdownMenu.
 *
 * NOTHING HERE MOUNTS THE MENU PANEL — same reason as `popover.test.tsx`, and
 * the measurement is in `__tests__/radixEnvironment.tsx`. The trigger's ARIA
 * and the theming contract are asserted here; the panel on screen belongs to
 * the Storybook test-runner in a real browser, which is wired but is not part
 * of `make test` and has not been executed yet.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DROPDOWN_MENU_CLASSES,
  DropdownMenu,
  DropdownMenuTrigger,
} from './dropdown-menu'

afterEach(cleanup)

const DISABLED_FADE = 'data-[disabled]:opacity-[var(--kro-opacity-disabled)]'

describe('DropdownMenu', () => {
  it('renders a trigger that announces it opens a menu', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      </DropdownMenu>,
    )

    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens from the keyboard — Enter on the trigger', () => {
    const onOpenChange = vi.fn()
    render(
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      </DropdownMenu>,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), {
      key: 'Enter',
    })

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('opens from the keyboard — ArrowDown, which also moves into the first item', () => {
    const onOpenChange = vi.fn()
    render(
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      </DropdownMenu>,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), {
      key: 'ArrowDown',
    })

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('renders no panel while closed', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      </DropdownMenu>,
    )

    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })
})

describe('the menu’s theming contract', () => {
  it('asks glass.css for the panel material', () => {
    expect(DROPDOWN_MENU_CLASSES.content).toContain('kro-glass')
    expect(DROPDOWN_MENU_CLASSES.content).toContain('rounded-kro-field')
  })

  it('keeps rows at the 44px touch floor, because menu rows sit flush', () => {
    // The epic's 28px pointer target comes with 4px separation; a menu has
    // none, so the smaller target would be a mis-tap waiting to happen.
    expect(DROPDOWN_MENU_CLASSES.item).toContain('h-11')
    expect(DROPDOWN_MENU_CLASSES.checkboxItem).toContain('h-11')
  })

  it('fades a disabled row exactly once', () => {
    for (const role of ['item', 'checkboxItem'] as const) {
      const fades = DROPDOWN_MENU_CLASSES[role]
        .split(/\s+/)
        .filter((token) => token === DISABLED_FADE)
      expect(fades, `${role} fades ${fades.length} times`).toHaveLength(1)
    }
  })

  it('tints a destructive row without that being the only signal', () => {
    // The tint is additive; the row's own words carry the meaning. Nothing in
    // the base item class is red, so a caller that forgets `destructive` gets
    // an ordinary row rather than a silently-styled one.
    expect(DROPDOWN_MENU_CLASSES.itemDestructive).toContain(
      'text-kro-banner-danger',
    )
    expect(DROPDOWN_MENU_CLASSES.item).not.toContain('banner-danger')
  })

  it('draws separators and labels from tokens, never raw colours', () => {
    expect(DROPDOWN_MENU_CLASSES.separator).toContain('bg-kro-hairline')
    expect(DROPDOWN_MENU_CLASSES.label).toContain('text-kro-fore-secondary')
  })

  it('sizes its glyphs from the icon scale', () => {
    expect(DROPDOWN_MENU_CLASSES.item).toContain(
      "[&_svg:not([class*='size-'])]:size-5",
    )
  })
})
