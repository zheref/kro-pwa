import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GLOW_SHAPES } from '../glow/RotatingGlow'
import { type FABMenuEntry, LiquidGlassFABMenu } from './LiquidGlassFABMenu'

afterEach(cleanup)

/** KroApple's own quick-input set — Event, Task, Reminder, Habit. */
function captureEntries(
  overrides: Partial<Record<string, () => void>> = {},
): FABMenuEntry[] {
  return [
    {
      id: 'event',
      label: 'Event',
      glyph: 'calendar',
      onSelect: overrides.event ?? vi.fn(),
    },
    {
      id: 'task',
      label: 'Task',
      glyph: 'checkmark.circle.fill',
      onSelect: overrides.task ?? vi.fn(),
    },
    {
      id: 'reminder',
      label: 'Reminder',
      glyph: 'bell',
      onSelect: overrides.reminder ?? vi.fn(),
    },
    {
      id: 'habit',
      label: 'Habit',
      glyph: 'repeat',
      onSelect: overrides.habit ?? vi.fn(),
    },
  ]
}

function renderMenu(items = captureEntries()) {
  return render(
    <LiquidGlassFABMenu
      items={items}
      mainGlyph="plus"
      mainAccessibilityLabel="Quick input"
    />,
  )
}

const rows = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-kro-fab-menu-item]'),
  )

const rowNamed = (label: string) =>
  screen.getByRole('button', { name: new RegExp(label) })

describe('opening and closing the menu', () => {
  it('starts collapsed, with the trigger saying so', () => {
    renderMenu()

    const trigger = screen.getByRole('button', { name: 'Quick input' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
  })

  it('does not claim the ARIA menu model it does not implement', () => {
    // `role="menu"` promises arrow-key navigation and a roving tabindex. This
    // is a column of buttons you tab through, so it says so: a labelled group.
    // Announcing an interaction model that is not there is worse than
    // announcing none — the user reaches for the arrow keys and finds nothing.
    renderMenu()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.querySelector('[role="menuitem"]')).toBeNull()
    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-haspopup'),
    ).toBeNull()
    expect(
      document.querySelector('[role="group"]')?.getAttribute('aria-label'),
    ).toBe('Quick input')
  })

  it('unfurls the labelled actions when the user taps the FAB', async () => {
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))

    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(rows()).toHaveLength(4)
    expect(rowNamed('Event')).toBeDefined()
  })

  it('keeps a collapsed row out of the tab order, not merely out of sight', () => {
    renderMenu()

    // `opacity: 0` alone leaves the rows focusable, which is how a keyboard
    // user ends up tabbing into a menu that is not on screen. `inert` is what
    // takes them out of the tab order and the accessibility tree; jsdom does
    // not model it, so the attribute is what can be asserted here and the
    // Storybook run is where the behaviour is exercised.
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group.hasAttribute('inert')).toBe(true)
    expect(group.style.pointerEvents).toBe('none')
    for (const row of rows()) {
      expect(row.style.opacity).toBe('0')
    }
  })

  it('puts the disc BEFORE the rows in the DOM, so Tab reaches them after it', () => {
    // The rows paint above the disc and must be tabbed to after it — opposite
    // orders. The DOM carries tab order and `flex-col-reverse` carries paint;
    // rows-first in the DOM sends the next Tab straight past the component.
    renderMenu()

    const root = document.querySelector('[data-kro-fab-menu]') as HTMLElement
    const fab = root.querySelector('[data-kro-fab]') as HTMLElement
    const group = root.querySelector('[role="group"]') as HTMLElement

    expect(
      fab.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(root.className).toContain('flex-col-reverse')
  })

  it('tabs from the disc into the first row once open', async () => {
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    screen.getByRole('button', { name: 'Quick input' }).focus()
    await userEvent.tab()

    expect(document.activeElement).toBe(rows()[0])
  })

  it('swaps the glyph for a close mark while open — canon`s xmark', async () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Quick input' })
    const closed = trigger.innerHTML

    await userEvent.click(trigger)

    expect(
      screen.getByRole('button', { name: 'Quick input' }).innerHTML,
    ).not.toBe(closed)
  })

  it('closes again on a second tap', async () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Quick input' })

    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))

    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('closes on Escape — the keyboard user`s way out', async () => {
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    await userEvent.keyboard('{Escape}')

    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('hands focus back to the disc on Escape, rather than dropping it', async () => {
    // Closing makes the open rows `inert`, and an `inert` element holding focus
    // loses it to the document — so a keyboard user would be dumped at the top
    // of the page.
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    rows()[0]?.focus()
    await userEvent.keyboard('{Escape}')

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Quick input' }),
    )
  })
})

describe('choosing an action', () => {
  it('fires that action and nothing else — the user captures a Task', async () => {
    const task = vi.fn()
    const event = vi.fn()
    renderMenu(captureEntries({ task, event }))

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    await userEvent.click(rowNamed('Task'))

    expect(task).toHaveBeenCalledOnce()
    expect(event).not.toHaveBeenCalled()
  })

  it('snaps the menu shut afterwards — canon`s triggerAndCollapse', async () => {
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    await userEvent.click(rowNamed('Habit'))

    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('hands focus back to the disc after a choice, for the same reason', async () => {
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    await userEvent.click(rowNamed('Habit'))

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Quick input' }),
    )
  })

  it('does not fire a disabled action', async () => {
    const onSelect = vi.fn()
    const items = captureEntries()
    const first = items[0]
    if (!first) throw new Error('fixture lost its first entry')
    renderMenu([{ ...first, disabled: true, onSelect }, ...items.slice(1)])

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))
    await userEvent.click(rowNamed('Event'))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('can be driven from outside, for a shell that owns the open state', async () => {
    const onExpandedChange = vi.fn()
    render(
      <LiquidGlassFABMenu
        items={captureEntries()}
        mainGlyph="plus"
        mainAccessibilityLabel="Quick input"
        isExpanded={false}
        onExpandedChange={onExpandedChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))

    expect(onExpandedChange).toHaveBeenCalledWith(true)
    // Controlled: the menu did NOT open itself.
    expect(
      screen
        .getByRole('button', { name: 'Quick input' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })
})

describe('the glow decorates the button, never the menu', () => {
  it('wraps only the main button, so an open menu grows no full-height halo', async () => {
    render(
      <LiquidGlassFABMenu
        items={captureEntries()}
        mainGlyph="plus"
        mainAccessibilityLabel="Quick input"
        glow={{ shape: GLOW_SHAPES.circle }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quick input' }))

    const glow = document.querySelector('[data-kro-glow]') as HTMLElement
    // The glow's subtree holds the FAB and nothing from the row list.
    expect(glow.querySelector('[data-kro-fab]')).not.toBeNull()
    expect(glow.querySelector('[data-kro-fab-menu-item]')).toBeNull()
  })

  it('can be switched off without dropping its configuration — canon`s isMainGlowActive', () => {
    render(
      <LiquidGlassFABMenu
        items={captureEntries()}
        mainGlyph="plus"
        mainAccessibilityLabel="Quick input"
        glow={{ shape: GLOW_SHAPES.circle }}
        isGlowActive={false}
      />,
    )

    expect(document.querySelectorAll('[data-kro-glow-band]')).toHaveLength(0)
  })

  it('leaves the button plain when no glow is asked for — canon`s nil default', () => {
    renderMenu()

    expect(document.querySelector('[data-kro-glow]')).toBeNull()
  })
})
