import { EndeavorsVistas } from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ENDEAVOR_ROW_CONFIGS,
  EndeavorRow,
  endeavorRowPropsFromCardModel,
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
      <EndeavorRow symbol="📊" title="Slides" config="compactDesktopInbox" now={NOW} />,
    )

    const row = container.querySelector('[data-slot="endeavor-row"]') as HTMLElement
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
    const row = () => container.querySelector('[data-slot="endeavor-row"]') as HTMLElement
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

    expect(symbolCell().style.backgroundColor).toBe('var(--kro-color-back-inner)')

    rerender(<EndeavorRow symbol="📊" title="Slides" now={NOW} />)
    expect(symbolCell().style.backgroundColor).toBe('')
  })

  it('prints an overdue caption in the warning role, never in colour alone', () => {
    render(
      <EndeavorRow
        symbol="🧾"
        title="Taxes"
        timeInfo={{ kind: 'dueTime', date: new Date(NOW.getTime() - 259_200_000), duration: null }}
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
    const { container } = render(<EndeavorRow symbol="📊" title="Slides" now={NOW} />)

    expect(container.querySelector('[data-slot="endeavor-action-surface"]')).toBeNull()
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
