import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DoLanesFragment, type DoLanesFragmentProps } from '../DoLanesFragment'
import { noopDoCardHandlers } from '../doCardHandlers'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from '../doSurfaceMocks'

afterEach(cleanup)

/**
 * Built from `doSurfaceProps`, which is itself the real projection of
 * `doStateMocks` — no props are assembled inline (`RC-31`).
 */
const propsFor = (
  state: (typeof doSurfaceMocks)[keyof typeof doSurfaceMocks],
  overrides: Partial<DoLanesFragmentProps> = {},
): DoLanesFragmentProps => {
  const surface = doSurfaceProps(state)
  return {
    lanes: surface.lanes,
    reminders: surface.reminders,
    allDayEvents: surface.allDayEvents,
    timedEventGroups: surface.timedEventGroups,
    suggestions: surface.suggestions,
    showsSuggestions: surface.showsSuggestions,
    hasNoEndeavors: surface.hasNoEndeavors,
    selectedCardKey: surface.selectedCardKey,
    isInMarkCompleteMode: surface.isInMarkCompleteMode,
    now: DO_SURFACE_MOCK_NOW,
    locale: DO_SURFACE_MOCK_LOCALE,
    initialLaneWidth: 1120,
    onExpandSection: () => {},
    onCreateEndeavor: () => {},
    handlers: noopDoCardHandlers,
    suggestionHandlers: { onAction: () => {}, onDismiss: () => {} },
    ...overrides,
  }
}

/** Every rendered lane, in DOM order — the acceptance criterion's evidence. */
const renderedLaneOrder = (): string[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid^="do-lane-"]'),
  ).map((node) => node.dataset.testid ?? '')

describe("the lane order is canon's", () => {
  it('renders Reminders, Calendar, Now! and the task lanes in canon order', () => {
    render(<DoLanesFragment {...propsFor(doSurfaceMocks.typicalDay)} />)

    expect(renderedLaneOrder()).toEqual([
      'do-lane-reminders',
      'do-lane-events',
      'do-lane-featured',
      'do-lane-overdue',
      'do-lane-now',
      'do-lane-expired',
      'do-lane-next',
      'do-lane-anytime',
      'do-lane-completed',
    ])
  })

  it('puts the Suggestions lane above everything, including the empty state', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.suggestionOffered, {
          hasNoEndeavors: true,
        })}
      />,
    )

    const first = renderedLaneOrder()[0]
    expect(first).toBe('do-lane-suggestions')
    expect(screen.getByText('Start Building Your Day')).toBeTruthy()
  })

  it('omits a lane the day has nothing for', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.typicalDay, {
          lanes: {
            ...propsFor(doSurfaceMocks.typicalDay).lanes,
            anytime: [],
          },
        })}
      />,
    )

    expect(renderedLaneOrder()).not.toContain('do-lane-anytime')
  })
})

describe('the hero lane', () => {
  it('draws the top-scoring card larger, at the centre of the sequence', () => {
    const props = propsFor(doSurfaceMocks.typicalDay)
    render(<DoLanesFragment {...props} />)

    const row = screen.getByTestId('do-featured-row')
    const shells = row.querySelectorAll<HTMLElement>(
      '[data-slot="endeavor-card-shell"]',
    )
    expect(shells.length).toBe(props.lanes.featuredNow.length)

    const heroIndex = Math.floor(shells.length / 2)
    const hero = shells[heroIndex]
    const flanker = shells[0]
    // Canon's fixed 200 / 120 at a width that fits them.
    expect(hero?.style.width).toBe('200px')
    expect(flanker?.style.width).toBe('120px')
  })

  it('anchors the row at the leading inset instead of centring it', () => {
    render(<DoLanesFragment {...propsFor(doSurfaceMocks.typicalDay)} />)
    const row = screen.getByTestId('do-featured-row')
    expect(row.className).toContain('justify-start')
  })

  it('shrinks the cards proportionally at a phone-width lane', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.typicalDay, { initialLaneWidth: 358 })}
      />,
    )

    const row = screen.getByTestId('do-featured-row')
    const hero = row.querySelectorAll<HTMLElement>(
      '[data-slot="endeavor-card-shell"]',
    )[
      Math.floor(
        row.querySelectorAll('[data-slot="endeavor-card-shell"]').length / 2,
      )
    ]
    expect(Number.parseFloat(hero?.style.width ?? '0')).toBeLessThan(200)
  })
})

describe('badges open the expanded list', () => {
  it('hands the tapped section to the caller', async () => {
    const onExpandSection = vi.fn()
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.typicalDay, { onExpandSection })}
      />,
    )

    const lane = screen.getByTestId('do-lane-overdue')
    const badge = lane.querySelector<HTMLButtonElement>(
      'button[aria-label^="Overdue"]',
    )
    if (badge === null) throw new Error('the Overdue badge is not a button')
    await userEvent.click(badge)

    expect(onExpandSection).toHaveBeenCalledWith({
      title: 'Overdue',
      tag: 'overdue',
    })
  })
})

describe('mark-complete mode', () => {
  it('puts every card into the wiggle and shows the corner glyph', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.typicalDay, { isInMarkCompleteMode: true })}
      />,
    )

    const cards = document.querySelectorAll<HTMLElement>(
      '[data-slot="endeavor-card"]',
    )
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.dataset.markCompleteMode).toBe('true')
    }
    expect(
      screen.getAllByRole('button', { name: 'Mark complete' }).length,
    ).toBeGreaterThan(0)
  })

  it('refuses to prepare a card while bulk mode is on', async () => {
    const onPrepare = vi.fn()
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.typicalDay, {
          isInMarkCompleteMode: true,
          handlers: { ...noopDoCardHandlers, onPrepare },
        })}
      />,
    )

    const lane = screen.getByTestId('do-lane-overdue')
    const card = lane.querySelector<HTMLElement>('[data-slot="endeavor-card"]')
    if (card === null) throw new Error('the Overdue lane rendered no card')
    await userEvent.click(card)

    expect(onPrepare).not.toHaveBeenCalled()
  })
})

describe('the empty day', () => {
  it('shows the promotion inset with its Create call to action', async () => {
    const onCreateEndeavor = vi.fn()
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.emptyDay, { onCreateEndeavor })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreateEndeavor).toHaveBeenCalledTimes(1)
    expect(renderedLaneOrder()).toEqual([])
  })
})

describe('the Suggestions lane', () => {
  it('carousels the cards on a compact surface', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.suggestionOffered, {
          fillsSuggestionWidth: false,
        })}
      />,
    )

    const lane = screen.getByTestId('do-lane-suggestions')
    expect(lane.querySelector('[data-testid="do-carousel"]')).not.toBeNull()
    expect(
      lane.querySelector('[data-testid="do-suggestions-stack"]'),
    ).toBeNull()
  })

  it('stacks them full-width on a regular surface so they can breathe', () => {
    render(
      <DoLanesFragment
        {...propsFor(doSurfaceMocks.suggestionOffered, {
          fillsSuggestionWidth: true,
        })}
      />,
    )

    const lane = screen.getByTestId('do-lane-suggestions')
    expect(
      lane.querySelector('[data-testid="do-suggestions-stack"]'),
    ).not.toBeNull()
    expect(lane.querySelector('[data-testid="do-carousel"]')).toBeNull()
    const card = lane.querySelector(
      '[data-slot="suggestion-card"]',
    ) as HTMLElement
    expect(card.className).toContain('w-full')
  })

  it('keeps a named dismiss next to every suggestion', () => {
    render(<DoLanesFragment {...propsFor(doSurfaceMocks.suggestionOffered)} />)

    expect(screen.getByRole('button', { name: /Dismiss/ })).toBeTruthy()
  })
})
