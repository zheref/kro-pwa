import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENU_CLASSES, Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

function Sample({
  density,
  onSelect = () => {},
}: {
  readonly density?: 'compact' | 'comfortable'
  readonly onSelect?: () => void
}) {
  return (
    <Menu density={density} label="Endeavor">
      <MenuLabel>Endeavor</MenuLabel>
      <MenuItem onSelect={onSelect}>Edit</MenuItem>
      <MenuItem disabled>Repeat weekly</MenuItem>
      <MenuSeparator />
      <MenuItem destructive onSelect={onSelect}>
        Delete endeavor
      </MenuItem>
    </Menu>
  )
}

describe('Menu', () => {
  it('names itself as a menu and defaults to compact', () => {
    render(<Sample />)

    const menu = screen.getByRole('menu', { name: 'Endeavor' })
    expect(menu.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).toContain(
      'min-h-8',
    )
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).toContain(
      'py-kro-small',
    )
  })

  it('reports a tap and leaves a disabled row inert', async () => {
    const onSelect = vi.fn()
    render(<Sample onSelect={onSelect} />)

    const disabled = screen.getByRole('menuitem', { name: 'Repeat weekly' })
    expect(disabled.hasAttribute('disabled')).toBe(true)

    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('moves between enabled rows with the arrow keys', async () => {
    render(<Sample />)

    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    edit.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Delete endeavor' }),
    )

    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(edit)
  })

  it('grows rows for the comfortable density and keeps the sidebar hover', () => {
    render(<Sample density="comfortable" />)

    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    expect(screen.getByRole('menu').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(edit.getAttribute('data-density')).toBe('comfortable')
    expect(edit.className).toContain('min-h-10')
    expect(edit.className).toContain('text-base')
    expect(edit.className).toContain('py-kro-medium')
    expect(edit.className).toContain('hover:bg-kro-absolute/25')
    expect(edit.className).not.toContain('hover:bg-kro-total')
  })
})

describe('the menu’s theming contract', () => {
  it('hovers a row with the sidebar’s translucent fill and keeps the type color', () => {
    expect(MENU_CLASSES.item).toContain('hover:bg-kro-absolute/25')
    expect(MENU_CLASSES.item).toContain('hover:border-(--kro-glass-rim)')
    expect(MENU_CLASSES.item).toContain('border-transparent')
    expect(MENU_CLASSES.item).toContain('focus-visible:bg-kro-absolute/25')
    expect(MENU_CLASSES.item).not.toContain('hover:text-kro-absolute')
    expect(MENU_CLASSES.itemCompact).not.toContain('hover:bg-kro-total')
    expect(MENU_CLASSES.itemCompact).toContain('min-h-8')
    expect(MENU_CLASSES.itemCompact).toContain('text-sm')
    expect(MENU_CLASSES.itemCompact).toContain('py-kro-small')
  })

  it('keeps one inset on the frame, the rows, the labels and the separators', () => {
    expect(MENU_CLASSES.frame).toBe('p-kro-small')
    expect(MENU_CLASSES.inset).toContain('px-kro-small')
    expect(MENU_CLASSES.inset).toContain('py-kro-small')
    expect(MENU_CLASSES.itemCompact).toContain(MENU_CLASSES.inset)
    expect(MENU_CLASSES.labelCompact).toContain('px-kro-small')
    expect(MENU_CLASSES.separatorCompact).toContain('mx-kro-small')
    expect(MENU_CLASSES.separatorCompact).toContain('my-kro-small')
  })

  it('tints a destructive row without that being the only signal', () => {
    expect(MENU_CLASSES.itemDestructive).toContain('text-kro-banner-danger')
    expect(MENU_CLASSES.item).not.toContain('banner-danger')
  })

  it('fades a disabled row exactly once', () => {
    const fades = MENU_CLASSES.item
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
  })
})
