import { EndeavorsVistas } from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { POINTER_GUTTER_VAR } from './EndeavorActionSurface'
import {
  ENDEAVOR_ROW_CONFIGS,
  EndeavorRow,
  endeavorRowPropsFromCardModel,
  rowShadow,
} from './EndeavorRow'
import { EndeavorUrgency } from './endeavorCardModel'
import { NOW, endeavorCardMocks } from './endeavorMocks'

afterEach(cleanup)

describe('EndeavorRow presets', () => {
  it('carries canon’s four, with canon’s numbers', () => {
    expect(ENDEAVOR_ROW_CONFIGS.inbox.minHeight).toBe(80)
    expect(ENDEAVOR_ROW_CONFIGS.find.minHeight).toBe(90)
    expect(ENDEAVOR_ROW_CONFIGS.find.badgesPosition).toBe('trailing')
    expect(ENDEAVOR_ROW_CONFIGS.default.showTimeInfo).toBe(true)
    expect(ENDEAVOR_ROW_CONFIGS.inbox.showTimeInfo).toBe(false)
  })

  it('makes the compact desktop preset genuinely denser, per the pointer idiom', () => {
    const compact = ENDEAVOR_ROW_CONFIGS.compactDesktopInbox
    const touch = ENDEAVOR_ROW_CONFIGS.inbox

    expect(compact.minHeight).toBeLessThan(touch.minHeight)
    expect(compact.iconSize).toBeLessThan(touch.iconSize)
    expect(compact.horizontalPadding).toBeLessThan(touch.horizontalPadding)
  })

  it('applies the preset’s geometry to the rendered row', () => {
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="compactDesktopInbox"
        now={NOW}
      />,
    )

    const row = container.querySelector(
      '[data-slot="endeavor-row"]',
    ) as HTMLElement
    expect(row.style.minHeight).toBe('52px')
    expect(row.style.padding).toBe('7px 10px')
  })
})

describe('EndeavorRow content', () => {
  it('puts badges below the title on an Inbox row and beside it on a Find row', () => {
    const { container, rerender } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        badges={[{ kind: 'reward', amount: 50 }]}
        config="inbox"
        now={NOW}
      />,
    )
    const row = () =>
      container.querySelector('[data-slot="endeavor-row"]') as HTMLElement
    const titleColumn = () => row().children[1] as HTMLElement

    expect(titleColumn().textContent).toContain('50')

    rerender(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        badges={[{ kind: 'reward', amount: 50 }]}
        config="find"
        now={NOW}
      />,
    )
    expect(titleColumn().textContent).not.toContain('50')
  })

  it('renders kind and status as chips with their glyph AND their word', () => {
    render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        badges={[
          { kind: 'endeavorKind', value: 'calendarEvent' },
          { kind: 'status', value: 'blocked' },
        ]}
        config="find"
        now={NOW}
      />,
    )

    expect(screen.getByText('Event')).not.toBeNull()
    expect(screen.getByText('Blocked')).not.toBeNull()
  })

  it('backs a generic glyph with a tile and leaves an emoji bare', () => {
    const { container, rerender } = render(
      <EndeavorRow symbol="calendar" isGenericSymbol title="Sync" now={NOW} />,
    )
    const symbolCell = () =>
      (container.querySelector('[data-slot="endeavor-row"]') as HTMLElement)
        .firstElementChild as HTMLElement

    expect(symbolCell().style.backgroundColor).toBe(
      'var(--kro-color-back-inner)',
    )

    rerender(<EndeavorRow symbol="📊" title="Slides" now={NOW} />)
    expect(symbolCell().style.backgroundColor).toBe('')
  })

  it('prints an overdue caption in the warning role, never in colour alone', () => {
    render(
      <EndeavorRow
        symbol="🧾"
        title="Taxes"
        timeInfo={{
          kind: 'dueTime',
          date: new Date(NOW.getTime() - 259_200_000),
          duration: null,
        }}
        now={NOW}
        locale="en-US"
      />,
    )

    // The caption itself changes wording, so the signal survives grayscale.
    expect(screen.getByText('3 days ago')).not.toBeNull()
  })

  it('prints a time range, and a duration-only row, from the same prop', () => {
    const { rerender } = render(
      <EndeavorRow
        symbol="🤝"
        title="Sync"
        timeInfo={{
          kind: 'timeRange',
          start: new Date(2026, 3, 15, 16, 0),
          end: new Date(2026, 3, 15, 17, 0),
        }}
        now={NOW}
        locale="en-US"
      />,
    )
    expect(screen.getByText('4:00 PM – 5:00 PM')).not.toBeNull()

    rerender(
      <EndeavorRow
        symbol="🤝"
        title="Sync"
        timeInfo={{ kind: 'duration', seconds: 900 }}
        now={NOW}
        locale="en-US"
      />,
    )
    expect(screen.getByText('15m')).not.toBeNull()
  })

  it('renders trailing content only when the preset does not claim that slot', () => {
    const { rerender } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="inbox"
        now={NOW}
        trailing={<button type="button">Triage</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Triage' })).not.toBeNull()

    rerender(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="find"
        badges={[{ kind: 'status', value: 'pending' }]}
        now={NOW}
        trailing={<button type="button">Triage</button>}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Triage' })).toBeNull()
  })
})

describe('endeavorRowPropsFromCardModel', () => {
  it('drops the Low urgency badge, as canon’s Inbox row does', () => {
    const props = endeavorRowPropsFromCardModel(endeavorCardMocks.lowUrgency)

    expect(props.badges?.some((badge) => badge.kind === 'urgency')).toBe(false)
    expect(props.badges?.some((badge) => badge.kind === 'reward')).toBe(true)
  })

  it('keeps a Medium or High badge', () => {
    const props = endeavorRowPropsFromCardModel(endeavorCardMocks.mediumUrgency)

    expect(props.badges?.[0]).toEqual({
      kind: 'urgency',
      urgency: EndeavorUrgency.medium,
    })
  })

  it('falls back to a duration-only caption when there is no due time', () => {
    const props = endeavorRowPropsFromCardModel(endeavorCardMocks.lowUrgency)
    expect(props.timeInfo?.kind).toBe('duration')
  })

  it('reports no time info at all when the model has neither', () => {
    const props = endeavorRowPropsFromCardModel(endeavorCardMocks.bare)
    expect(props.timeInfo).toBeUndefined()
  })
})

describe('the row’s optional action surface', () => {
  it('stays a plain list item when no capabilities are given', () => {
    const { container } = render(
      <EndeavorRow symbol="📊" title="Slides" now={NOW} />,
    )

    expect(
      container.querySelector('[data-slot="endeavor-action-surface"]'),
    ).toBeNull()
  })

  it('wraps itself in the duality surface when they are', () => {
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        now={NOW}
        endeavorId="e1"
        capabilities={EndeavorsVistas.inbox.capabilities}
        onOperation={() => undefined}
        input="pointer"
      />,
    )

    const surface = container.querySelector(
      '[data-slot="endeavor-action-surface"]',
    ) as HTMLElement
    expect(surface.dataset.input).toBe('pointer')
  })
})

describe('the row reserves the surface’s pointer gutter', () => {
  const row = (container: HTMLElement) =>
    container.querySelector('[data-slot="endeavor-row"]') as HTMLElement

  const reserved = `calc(${ENDEAVOR_ROW_CONFIGS.inbox.horizontalPadding}px + var(${POINTER_GUTTER_VAR}, 0px))`

  it('adds it to the trailing padding when it has controls at that edge', () => {
    // Without it the hover strip and the ⋯ trigger — both anchored to the same
    // edge, both clickable on hover — sit exactly on top of Triage and Add for
    // Today, which is how canon's two in-row buttons became unreachable on a
    // desktop Inbox row.
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="inbox"
        now={NOW}
        endeavorId="e1"
        capabilities={EndeavorsVistas.inbox.capabilities}
        onOperation={() => undefined}
        input="pointer"
        trailing={<button type="button">Triage</button>}
      />,
    )

    expect(row(container).style.paddingRight).toBe(reserved)
  })

  it('reserves it for trailing BADGES too — they are covered the same way', () => {
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="find"
        badges={[{ kind: 'status', value: 'pending' }]}
        now={NOW}
      />,
    )

    expect(row(container).style.paddingRight).toBe(
      `calc(${ENDEAVOR_ROW_CONFIGS.find.horizontalPadding}px + var(${POINTER_GUTTER_VAR}, 0px))`,
    )
  })

  it('leaves a row with nothing at that edge exactly as it was', () => {
    // Scoped on purpose: a row with no trailing control loses nothing to the
    // overlay, so indenting it would be a layout change with no defect behind
    // it.
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="inbox"
        now={NOW}
        endeavorId="e1"
        capabilities={EndeavorsVistas.inbox.capabilities}
        onOperation={() => undefined}
        input="pointer"
      />,
    )

    expect(row(container).style.paddingRight).toBe(
      `${ENDEAVOR_ROW_CONFIGS.inbox.horizontalPadding}px`,
    )
  })

  it('falls back to zero outside a surface, so a bare row is unmoved', () => {
    // The `var()` fallback is what makes the reservation free: nothing
    // publishes the property, so `calc(16px + 0px)` is the padding it had.
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        config="inbox"
        now={NOW}
        trailing={<button type="button">Triage</button>}
      />,
    )

    expect(row(container).style.paddingRight).toContain(
      `var(${POINTER_GUTTER_VAR}, 0px)`,
    )
    expect(
      container.querySelector('[data-slot="endeavor-action-surface"]'),
    ).toBeNull()
  })
})

describe('EndeavorRow footer', () => {
  const mount = (footer?: React.ReactNode) =>
    render(
      <EndeavorRow
        symbol="📊"
        title="Review quarterly plan"
        badges={[{ kind: 'reward', amount: 30 }]}
        config="compactDesktopInbox"
        footer={footer}
        now={NOW}
      />,
    )

  it('draws the footer inside the card, beneath the title and badges', () => {
    const { container } = mount(<button type="button">Triage</button>)
    const card = container.querySelector('[data-slot="endeavor-row"]')
    const footer = container.querySelector('[data-slot="endeavor-row-footer"]')
    expect(footer).not.toBeNull()
    expect(card?.contains(footer)).toBe(true)
    const column = footer?.parentElement
    expect(column?.lastElementChild).toBe(footer)
    expect(column?.textContent).toContain('Review quarterly plan')
  })

  it('draws no footer slot when none is given', () => {
    const { container } = mount()
    expect(
      container.querySelector('[data-slot="endeavor-row-footer"]'),
    ).toBeNull()
  })

  it('keeps the title’s full column when the footer carries the controls', () => {
    const { container } = mount(<span>actions</span>)
    const card = container.querySelector('[data-slot="endeavor-row"]')
    // Symbol + title column only: nothing competes at the trailing edge.
    expect(card?.children).toHaveLength(2)
    expect(screen.getByText('actions')).toBeTruthy()
  })
})

describe('EndeavorRow pick and selection mode', () => {
  const noop = () => {}

  it('covers the row with one pick button carrying its id and name', () => {
    const picks: boolean[] = []
    render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        now={NOW}
        config="compactDesktopInbox"
        pickId="slides"
        pickLabel="Slides, Task"
        onPick={(event) => picks.push(event.altKey)}
      />,
    )
    const pick = screen.getByRole('button', { name: 'Slides, Task' })
    expect(pick.getAttribute('data-kro-row-pick')).toBe('slides')
    pick.click()
    expect(picks).toEqual([false])
  })

  it('draws a sibling checkbox, never nested in the pick button', () => {
    let toggled = 0
    render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        now={NOW}
        onPick={noop}
        selection={{
          checked: true,
          label: 'Select Slides',
          onToggle: () => {
            toggled += 1
          },
        }}
      />,
    )
    const box = screen.getByRole('checkbox', { name: 'Select Slides' })
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: 'Slides' }).contains(box)).toBe(
      false,
    )
    box.click()
    expect(toggled).toBe(1)
  })

  it('disables a row that cannot be selected, and draws no controls without the props', () => {
    const { unmount } = render(
      <EndeavorRow
        symbol="🤝"
        title="Sync"
        now={NOW}
        selection={{
          checked: false,
          disabled: true,
          label: 'Needs a time',
          onToggle: noop,
        }}
      />,
    )
    expect(
      screen
        .getByRole('checkbox', { name: 'Needs a time' })
        .hasAttribute('disabled'),
    ).toBe(true)
    unmount()
    render(<EndeavorRow symbol="🤝" title="Sync" now={NOW} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})

describe('EndeavorRow emoji box and horizontal card', () => {
  it('surrounds the emoji in canon’s washed tile when given a wash', () => {
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        now={NOW}
        config="horizontalCard"
        symbolWash="var(--kro-role-kind-task)"
      />,
    )
    const box = container.querySelector<HTMLElement>(
      '[data-slot="endeavor-row-emoji-box"]',
    )
    expect(box?.textContent).toBe('📊')
    expect(box?.style.width).toBe('46px')
    expect(box?.style.borderRadius).toBe('12px')
    expect(box?.style.backgroundColor).toContain('18%')
  })

  it('keeps a bare emoji without a wash', () => {
    const { container } = render(
      <EndeavorRow symbol="📊" title="Slides" now={NOW} />,
    )
    expect(
      container.querySelector('[data-slot="endeavor-row-emoji-box"]'),
    ).toBeNull()
  })

  it('pads the horizontal card on the spacing scale', () => {
    const { container } = render(
      <EndeavorRow
        symbol="📊"
        title="Slides"
        now={NOW}
        config="horizontalCard"
      />,
    )
    const row = container.querySelector<HTMLElement>(
      '[data-slot="endeavor-row"]',
    )
    expect(row?.style.padding).toBe('8px 16px')
    expect(row?.style.gap).toBe('8px')
  })
})

describe('EndeavorRow horizontal card bounds', () => {
  it('keeps the title to one line with its full text as the pick tooltip', () => {
    const long = 'Update personal website or portfolio before the conference'
    const { container } = render(
      <EndeavorRow
        symbol="🌐"
        title={long}
        now={NOW}
        config="horizontalCard"
        onPick={() => {}}
      />,
    )
    const title = container.querySelector<HTMLElement>(
      '[data-slot="endeavor-row"] p',
    )
    expect(title?.style.webkitLineClamp).toBe('1')
    const pick = screen.getByRole('button', { name: long })
    expect(pick.getAttribute('title')).toBe(long)
  })

  it('gives the cell a fixed height that clips its text column, not its focus ring', () => {
    const { container } = render(
      <EndeavorRow
        symbol="🌐"
        title="Slides"
        now={NOW}
        config="horizontalCard"
        badges={[{ kind: 'reward', amount: 30 }]}
      />,
    )
    const row = container.querySelector<HTMLElement>(
      '[data-slot="endeavor-row"]',
    )
    expect(row?.style.height).toBe('64px')
    expect(row?.style.overflow).toBe('')
    expect(row?.querySelector('.overflow-hidden')).not.toBeNull()
  })
})

describe('rowShadow — a row on a glass pane casts no card shadow', () => {
  it('lifts a standalone row with the card shadow', () => {
    expect(rowShadow(true, false)).toBe('var(--kro-shadow-card)')
  })

  it('draws only the soft glass-rim outline under a grid card, never a lift', () => {
    expect(rowShadow(false, false)).toBe('inset 0 0 0 1px var(--kro-glass-rim)')
    expect(ENDEAVOR_ROW_CONFIGS.horizontalCard.elevated).toBe(false)
  })

  it('keeps the ticked ring on a flat card, and adds the lift only when elevated', () => {
    expect(rowShadow(false, true)).toBe(
      'inset 0 0 0 2px var(--kro-color-accent), inset 0 0 0 1px var(--kro-glass-rim)',
    )
    expect(rowShadow(true, true)).toBe(
      'inset 0 0 0 2px var(--kro-color-accent), var(--kro-shadow-card)',
    )
  })
})

describe('EndeavorRow pick focus', () => {
  it('rings a focused pick card with the field ring, not the app-wide ring', () => {
    render(
      <EndeavorRow symbol="📊" title="Slides" now={NOW} onPick={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Slides' }).className).toContain(
      'focus-visible:shadow-[var(--kro-ring-field)]',
    )
  })
})
