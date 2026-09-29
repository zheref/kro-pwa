/**
 * DropdownMenu's own parts — the wrapper logic this file adds over Radix.
 *
 * The real panel cannot mount under jsdom in a test's budget (5–12 s per mount;
 * `__tests__/radixEnvironment.tsx` has the measurement), so Radix's primitives
 * are swapped here for plain elements that record the props they receive. What
 * is asserted is exactly what this module decides: the collision padding it
 * hands the panel (the shell's sidebar folded in, a caller's own gap kept), the
 * offsets and flip it defaults to, and the class and slot contract of every
 * part. Radix's own positioning is Radix's to test.
 */
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const recorded: Record<string, unknown>[] = []

vi.mock('@radix-ui/react-dropdown-menu', () => {
  const part =
    (slot: string) =>
    ({
      children,
      ...props
    }: { children?: ReactNode } & Record<string, unknown>) => {
      if (slot === 'content') recorded.push(props)
      const {
        sideOffset: _sideOffset,
        avoidCollisions: _avoidCollisions,
        collisionPadding: _collisionPadding,
        checked: _checked,
        ...dom
      } = props
      return (
        <div data-part={slot} {...(dom as Record<string, string>)}>
          {children}
        </div>
      )
    }
  return {
    Root: part('root'),
    Trigger: part('trigger'),
    Portal: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Content: part('content'),
    Item: part('item'),
    CheckboxItem: part('checkbox-item'),
    ItemIndicator: part('indicator'),
    Label: part('label'),
    Separator: part('separator'),
    Group: part('group'),
    Sub: part('sub'),
    SubTrigger: part('sub-trigger'),
    SubContent: part('sub-content'),
    RadioGroup: part('radio-group'),
    RadioItem: part('radio-item'),
  }
})

const {
  DROPDOWN_MENU_CLASSES,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} = await import('./dropdown-menu')
const { CollisionInsetsProvider } = await import('./collision')

afterEach(() => {
  cleanup()
  recorded.length = 0
})

describe('DropdownMenuContent — where the panel may sit', () => {
  it('keeps the standard 8px gap from every edge by default, and flips to fit', () => {
    render(<DropdownMenuContent>menu</DropdownMenuContent>)

    expect(recorded[0]).toMatchObject({
      sideOffset: 8,
      avoidCollisions: true,
      collisionPadding: { top: 8, right: 8, bottom: 8, left: 8 },
    })
  })

  it('clears the shell’s sidebar on the leading edge', () => {
    render(
      <CollisionInsetsProvider
        insets={{ top: 0, right: 0, bottom: 0, left: 208 }}
      >
        <DropdownMenuContent>menu</DropdownMenuContent>
      </CollisionInsetsProvider>,
    )

    expect(recorded[0]?.collisionPadding).toEqual({
      top: 8,
      right: 8,
      bottom: 8,
      left: 216,
    })
  })

  it('takes a caller’s explicit gap and offset, and still clears the sidebar', () => {
    render(
      <CollisionInsetsProvider
        insets={{ top: 0, right: 0, bottom: 0, left: 208 }}
      >
        <DropdownMenuContent collisionPadding={16} sideOffset={4}>
          menu
        </DropdownMenuContent>
      </CollisionInsetsProvider>,
    )

    expect(recorded[0]).toMatchObject({
      sideOffset: 4,
      collisionPadding: { top: 16, right: 16, bottom: 16, left: 224 },
    })
  })

  it('wears the glass panel classes, and a caller’s own on top', () => {
    render(<DropdownMenuContent className="w-60">menu</DropdownMenuContent>)

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-content"]',
    )
    expect(panel?.className).toContain('w-60')
    for (const token of DROPDOWN_MENU_CLASSES.content.split(' ').slice(0, 3)) {
      expect(panel?.className).toContain(token)
    }
  })
})

describe('the menu’s rows', () => {
  it('draws an ordinary item with the row highlight', () => {
    render(<DropdownMenuItem>Rename</DropdownMenuItem>)

    const item = screen.getByText('Rename')
    expect(item.getAttribute('data-slot')).toBe('dropdown-menu-item')
    expect(item.getAttribute('data-destructive')).toBeNull()
  })

  it('marks a destructive item and tints it', () => {
    render(<DropdownMenuItem destructive>Delete</DropdownMenuItem>)

    const item = screen.getByText('Delete')
    expect(item.getAttribute('data-destructive')).toBe('true')
    expect(item.className).toContain(
      DROPDOWN_MENU_CLASSES.itemDestructive.split(' ')[0],
    )
  })

  it('draws a checkbox item with its tick indicator slot', () => {
    render(
      <DropdownMenuCheckboxItem checked>
        Show completed
      </DropdownMenuCheckboxItem>,
    )

    const item = screen.getByText('Show completed')
    expect(item.getAttribute('data-slot')).toBe('dropdown-menu-checkbox-item')
    expect(item.querySelector('[data-part="indicator"] svg')).not.toBeNull()
  })

  it('draws a section label and a separator', () => {
    render(
      <>
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        <DropdownMenuSeparator />
      </>,
    )

    expect(screen.getByText('Sort').getAttribute('data-slot')).toBe(
      'dropdown-menu-label',
    )
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]')
        ?.className,
    ).toContain(DROPDOWN_MENU_CLASSES.separator.split(' ')[0])
  })
})
