/**
 * The card's tests — the badge matrix, the wiggle, and the intent plumbing.
 *
 * WHAT IS ASSERTED HERE AND WHAT IS ASSERTED IN A STORY. The backdate popover
 * and the overflow menu are Radix poppers, and mounting one under jsdom costs
 * 5–12 seconds — the measurement, and the fact that it made `make test` fail, is
 * written up in `system/primitives/__tests__/radixEnvironment.tsx`. So this file
 * asserts the TRIGGERS (their presence, their accessible names, their geometry,
 * their event isolation) and `endeavorPopovers.test.tsx` asserts the PANELS
 * directly, without a trigger. The one seam neither covers — a click on the
 * trigger opening the panel — is Radix's own behaviour and is exercised in the
 * stories. That is the split the design system already made, for the same
 * measured reason.
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CARD_METRICS,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  EndeavorCard,
  HORIZONTAL_MIN_HEIGHT,
} from './EndeavorCard'
import { EndeavorUrgency, endeavorUrgencies } from './endeavorCardModel'
import { NOW, endeavorCardMocks } from './endeavorMocks'

afterEach(cleanup)

const card = () => document.querySelector('[data-slot="endeavor-card"]') as HTMLElement
const shell = () =>
  document.querySelector('[data-slot="endeavor-card-shell"]') as HTMLElement
const warnings = () => document.querySelectorAll('[data-slot="endeavor-card-warning"]')
const warning = () => warnings()[0] ?? null

describe('the Do-mode badge composition — canon geometry', () => {
  it('HIDES the urgency pill on Low and shows it on Medium and High', () => {
    for (const urgency of endeavorUrgencies) {
      cleanup()
      render(
        <EndeavorCard
          model={{ ...endeavorCardMocks.lowUrgency, urgency }}
          now={NOW}
          locale="en-US"
        />,
      )

      const label = urgency === 'low' ? 'Low' : urgency === 'medium' ? 'Medium' : 'High'
      if (urgency === EndeavorUrgency.low) {
        expect(screen.queryByText(label)).toBeNull()
      } else {
        expect(screen.getByText(label)).not.toBeNull()
      }
    }
  })

  it('ALWAYS shows the reward pill, at every urgency and both layouts', () => {
    for (const layout of ['vertical', 'horizontal'] as const) {
      for (const urgency of endeavorUrgencies) {
        cleanup()
        render(
          <EndeavorCard
            model={{ ...endeavorCardMocks.lowUrgency, urgency, reward: 42 }}
            layout={layout}
            now={NOW}
            locale="en-US"
          />,
        )
        expect(
          screen.getByLabelText('42 reward points'),
          `${layout}/${urgency} lost the reward pill`,
        ).not.toBeNull()
      }
    }
  })

  it('floats the warning at (−6, −6), OUTSIDE the card chrome', () => {
    render(<EndeavorCard model={endeavorCardMocks.mediumUrgency} now={NOW} />)

    expect((warning() as HTMLElement).style.transform).toBe('translate(-6px, -6px)')
  })

  it('shows the warning for MEDIUM only — High already shouts through the red pill', () => {
    const { rerender } = render(
      <EndeavorCard model={endeavorCardMocks.mediumUrgency} now={NOW} />,
    )
    expect(warning()).not.toBeNull()

    rerender(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)
    expect(warning()).toBeNull()
  })

  it('shows the warning EXACTLY ONCE per card, in each layout', () => {
    // The floating (−6, −6) overlay is the vertical card's; the horizontal row
    // carries its own on the trailing edge. Rendering the shared overlay for
    // both put the same signal on one row twice.
    const { rerender } = render(
      <EndeavorCard model={endeavorCardMocks.mediumUrgency} now={NOW} />,
    )
    expect(warnings()).toHaveLength(1)

    rerender(
      <EndeavorCard
        model={endeavorCardMocks.mediumUrgency}
        layout="horizontal"
        now={NOW}
      />,
    )
    expect(warnings()).toHaveLength(1)
  })

  it('withdraws the warning while the card is prepared, so it never sits over the overlay', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.mediumUrgency} isSelected now={NOW} />,
    )

    expect(warning()).toBeNull()
  })

  it('puts the mark-complete glyph at (14, −8) on the vertical card', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isInMarkCompleteMode now={NOW} />,
    )

    const control = screen.getByRole('button', { name: 'Mark complete' })
    expect((control.parentElement as HTMLElement).style.transform).toBe(
      'translate(14px, -8px)',
    )
  })

  it('puts it at (8, −8) on the horizontal card, per canon’s tighter emoji area', () => {
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        layout="horizontal"
        isInMarkCompleteMode
        now={NOW}
      />,
    )

    const control = screen.getByRole('button', { name: 'Mark complete' })
    expect((control.parentElement as HTMLElement).style.transform).toBe(
      'translate(8px, -8px)',
    )
  })

  it('offers SKIP, not complete, on an event — an event cannot be completed', () => {
    render(<EndeavorCard model={endeavorCardMocks.event} isInMarkCompleteMode now={NOW} />)

    expect(screen.getByRole('button', { name: 'Skip event' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark complete' })).toBeNull()
  })

  it('shows no mark-complete control at all outside the mode', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    expect(screen.queryByRole('button', { name: 'Mark complete' })).toBeNull()
  })
})

describe('layout and size', () => {
  it('is 160×200 by default, at canon’s surface radius', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    expect(shell().style.width).toBe(`${DEFAULT_CARD_WIDTH}px`)
    expect(shell().style.height).toBe(`${DEFAULT_CARD_HEIGHT}px`)
    expect(shell().style.borderRadius).toBe('var(--kro-radius-surface)')
  })

  it('honours an explicit card size', () => {
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        cardSize={{ width: 220, height: 260 }}
        now={NOW}
      />,
    )

    expect(shell().style.width).toBe('220px')
  })

  it('stretches to its parent with a 100px floor on the horizontal layout', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} layout="horizontal" now={NOW} />,
    )

    expect(shell().style.minHeight).toBe(`${HORIZONTAL_MIN_HEIGHT}px`)
    expect(shell().className).toContain('w-full')
  })

  it('scales the prep stack with the size class, per canon’s Size enum', () => {
    expect(CARD_METRICS.small.primaryButton).toBe(44)
    expect(CARD_METRICS.medium.primaryButton).toBe(54)
    expect(CARD_METRICS.large.primaryButton).toBe(64)
    expect(CARD_METRICS.small.emojiSize).toBe(34)
    expect(CARD_METRICS.large.emojiSize).toBe(44)
  })

  it('draws the small card’s urgency pill as a circle with no label', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} size="small" now={NOW} />,
    )

    expect(screen.queryByText('High')).toBeNull()
    expect(screen.getByLabelText('High')).not.toBeNull()
  })
})

describe('the preparation overlay', () => {
  it('is hidden and unreachable until the card is prepared', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    const overlay = document.querySelector(
      '[data-slot="endeavor-card-prep-overlay"]',
    ) as HTMLElement
    expect(overlay.style.opacity).toBe('0')
    expect(overlay.style.pointerEvents).toBe('none')
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
  })

  it('is ALWAYS IN THE TREE, so revealing it never changes layout — canon’s own note', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)
    expect(document.querySelector('[data-slot="endeavor-card-prep-overlay"]')).not.toBeNull()
  })

  it('never puts `kro-glass` on the POSITIONED element — it would rejoin the flow', () => {
    // `glass.css` declares `.kro-glass { position: relative }` as UNLAYERED
    // css, which outranks Tailwind's layered `absolute`. Combining the two
    // silently makes the overlay a flex item: measured at 268px of a 1232px
    // card, which pushed the trailing warning glyph into the middle of the row.
    // jsdom does no layout, so the invariant is checked as class composition.
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} layout="horizontal" now={NOW} />,
    )

    const overlay = document.querySelector(
      '[data-slot="endeavor-card-prep-overlay"]',
    ) as HTMLElement
    expect(overlay.className).toContain('absolute')
    expect(overlay.className).not.toContain('kro-glass')
    expect(overlay.querySelector('.kro-glass')).not.toBeNull()
  })

  it('blurs the card content behind it once prepared', () => {
    const { rerender } = render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />,
    )
    const content = () =>
      document.querySelector('[data-slot="endeavor-card-content"]') as HTMLElement
    expect(content().style.filter).toBe('')

    rerender(<EndeavorCard model={endeavorCardMocks.highUrgency} isSelected now={NOW} />)
    expect(content().style.filter).toBe('blur(10px)')
  })

  it('does NOT reveal on a plan-intent card — that surface’s container owns the gesture', () => {
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        intent="plan"
        isSelected
        now={NOW}
      />,
    )

    const overlay = document.querySelector(
      '[data-slot="endeavor-card-prep-overlay"]',
    ) as HTMLElement
    expect(overlay.style.opacity).toBe('0')
  })

  it('raises the prepare intent on a tap', async () => {
    const onPrepare = vi.fn()
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        now={NOW}
        onPrepare={onPrepare}
      />,
    )

    await userEvent.click(card())

    expect(onPrepare).toHaveBeenCalledWith(endeavorCardMocks.highUrgency.id)
  })

  it('gives preparation a KEYBOARD route — the title is a real button', async () => {
    const onPrepare = vi.fn()
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        now={NOW}
        onPrepare={onPrepare}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: endeavorCardMocks.highUrgency.title }),
    )

    expect(onPrepare).toHaveBeenCalledOnce()
  })

  it('raises the execute intent from the Start control, without also preparing again', async () => {
    const onExecute = vi.fn()
    const onPrepare = vi.fn()
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        isSelected
        now={NOW}
        onPrepare={onPrepare}
        onExecute={onExecute}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onExecute).toHaveBeenCalledOnce()
    expect(onPrepare).not.toHaveBeenCalled()
  })

  it('raises skip directly on an event card — no confirmation step', async () => {
    const onSkip = vi.fn()
    render(
      <EndeavorCard
        model={endeavorCardMocks.event}
        layout="horizontal"
        isSelected
        now={NOW}
        onSkip={onSkip}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Skip event' }))

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('takes the overlay’s controls OUT of the tab order while it is hidden', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    // `hidden: true` because the overlay is `aria-hidden` while closed — which
    // is itself half the answer: the controls are out of the accessibility tree
    // AND out of the tab order, so neither a reader nor a keyboard reaches them.
    expect(screen.getByRole('button', { name: 'Start', hidden: true }).tabIndex).toBe(-1)
  })

  it('puts them back once the card is prepared', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} isSelected now={NOW} />)

    expect(screen.getByRole('button', { name: 'Start' }).tabIndex).toBe(0)
  })

  it('adds the dedicated Defer control on the LARGE card only', () => {
    const { rerender } = render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isSelected now={NOW} />,
    )
    expect(screen.queryByRole('button', { name: 'Defer' })).toBeNull()

    rerender(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        size="large"
        isSelected
        now={NOW}
      />,
    )
    expect(screen.getByRole('button', { name: 'Defer' })).not.toBeNull()
  })

  it('exposes the five horizontal actions canon lists, minus Skip on an event', () => {
    const { rerender } = render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        layout="horizontal"
        isSelected
        now={NOW}
      />,
    )
    for (const name of ['Mark complete', 'Defer', 'Start', 'Skip', 'Delete']) {
      expect(screen.getByRole('button', { name }), `${name} missing`).not.toBeNull()
    }

    rerender(
      <EndeavorCard
        model={endeavorCardMocks.event}
        layout="horizontal"
        isSelected
        now={NOW}
      />,
    )
    expect(screen.getByRole('button', { name: 'Skip event' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull()
  })
})

describe('the backdate trigger', () => {
  it('is a TRIGGER, not the completion — the check alone never completes anything', () => {
    const onMarkComplete = vi.fn()
    render(
      <EndeavorCard
        model={endeavorCardMocks.highUrgency}
        isInMarkCompleteMode
        now={NOW}
        onMarkComplete={onMarkComplete}
      />,
    )

    // That asymmetry IS the feature: a task's check opens the picker so the
    // completion can be backdated, while an event's skip fires directly. The
    // confirm path is asserted on `MarkCompletePopover` itself, which needs no
    // popper mount.
    expect(onMarkComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Mark complete' })).not.toBeNull()
  })

  it('opens a dialog rather than acting, and says so to a screen reader', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isInMarkCompleteMode now={NOW} />,
    )

    // Radix's own contract on a popover trigger. Asserted rather than exercised
    // by a click: opening the panel mounts a Radix popper, which costs 5–12
    // seconds under jsdom and is what the header of this file is about. A single
    // click on this trigger measured 26.7s before it was removed.
    const trigger = screen.getByRole('button', { name: 'Mark complete' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('the wiggle', () => {
  it('leaves a card at rest outside mark-complete mode', () => {
    render(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    expect(card().style.transform).toBe('rotate(0deg)')
  })

  it('tilts the card in mark-complete mode', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isInMarkCompleteMode now={NOW} />,
    )

    expect(card().style.transform).toBe('rotate(0.35deg)')
  })

  it('SETTLES back to exactly 0° when the mode is left', () => {
    const { rerender } = render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isInMarkCompleteMode now={NOW} />,
    )
    expect(card().style.transform).not.toBe('rotate(0deg)')

    rerender(<EndeavorCard model={endeavorCardMocks.highUrgency} now={NOW} />)

    expect(card().style.transform).toBe('rotate(0deg)')
  })

  it('marks the mode on the element, so a story can prove which state it is in', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.highUrgency} isInMarkCompleteMode now={NOW} />,
    )

    expect(card().dataset.markCompleteMode).toBe('true')
  })
})

describe('the time captions', () => {
  it('prints the plain time while the due moment is ahead', () => {
    render(
      <EndeavorCard model={endeavorCardMocks.mediumUrgency} now={NOW} locale="en-US" />,
    )

    expect(screen.getByText('3:00 PM')).not.toBeNull()
    expect(screen.getByText('20m')).not.toBeNull()
  })

  it('switches to the relative caption once it has passed', () => {
    render(<EndeavorCard model={endeavorCardMocks.overdue} now={NOW} locale="en-US" />)

    expect(screen.getByText('3 days ago')).not.toBeNull()
  })

  it('prints neither line for a model that has neither', () => {
    render(<EndeavorCard model={endeavorCardMocks.bare} now={NOW} locale="en-US" />)

    expect(screen.queryByText(/m$/)).toBeNull()
  })
})
