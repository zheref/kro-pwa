import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHROME_LAYOUT } from '../layout/chromeLayout'
import { ActiveToastView } from './ActiveToastView'
import { resetActiveToastSequence, toActiveToast } from './activeToast'

beforeEach(resetActiveToastSequence)
afterEach(cleanup)

describe('the toast reads the outcome back to the user', () => {
  it('shows the message — "Buy groceries" marked complete', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({ message: '"Buy groceries" marked complete' })}
      />,
    )

    expect(screen.getByText('"Buy groceries" marked complete')).toBeDefined()
  })

  it('badges the points earned when there are any', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: '"Buy groceries" marked complete',
          rewardAmount: 30,
        })}
      />,
    )

    expect(screen.getByText('+30')).toBeDefined()
  })

  it('shows no badge for a skip, which earns nothing', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({ message: '"Morning workout" skipped' })}
      />,
    )

    expect(document.querySelector('[data-kro-toast-reward]')).toBeNull()
  })

  it('badges a zero reward rather than hiding it — 0 is a fact, not an absence', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: '"Tidy inbox" marked complete',
          rewardAmount: 0,
        })}
      />,
    )

    expect(screen.getByText('+0')).toBeDefined()
  })
})

describe('the action buttons', () => {
  it('shows one button for a plain undo', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: '"Old project" deleted',
          primaryAction: {
            title: 'Undo',
            style: 'destructive',
            onSelect: vi.fn(),
          },
        })}
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(
      document
        .querySelector('[data-kro-toast-actions]')
        ?.getAttribute('data-kro-toast-actions'),
    ).toBe('single')
  })

  it('stacks two, with the affirmative one on top — canon`s Undo + View', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: '"Team meeting" deferred to 3:00 PM',
          primaryAction: { title: 'Undo', onSelect: vi.fn() },
          secondaryAction: {
            title: 'View',
            style: 'prominent',
            onSelect: vi.fn(),
          },
        })}
      />,
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]?.textContent).toBe('View')
    expect(buttons[1]?.textContent).toBe('Undo')
    expect(
      document
        .querySelector('[data-kro-toast-actions]')
        ?.getAttribute('data-kro-toast-actions'),
    ).toBe('stacked')
  })

  it('shows none at all for a confirmation the user cannot act on', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({ message: 'Changes saved successfully' })}
      />,
    )

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('fires the handler the caller attached — the user taps Undo', async () => {
    const undo = vi.fn()
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: '"Buy groceries" marked complete',
          primaryAction: { title: 'Undo', onSelect: undo },
        })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(undo).toHaveBeenCalledOnce()
  })

  it('paints the three canon styles differently, and never by colour alone', () => {
    const { rerender } = render(
      <ActiveToastView
        toast={toActiveToast({
          message: 'm',
          primaryAction: {
            title: 'Undo',
            style: 'standard',
            onSelect: vi.fn(),
          },
        })}
      />,
    )
    expect(
      document
        .querySelector('[data-kro-toast-action]')
        ?.getAttribute('data-kro-toast-action'),
    ).toBe('standard')

    rerender(
      <ActiveToastView
        toast={toActiveToast({
          message: 'm',
          primaryAction: {
            title: 'Delete',
            style: 'destructive',
            onSelect: vi.fn(),
          },
        })}
      />,
    )
    // The word carries the meaning; the colour only reinforces it.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined()
    expect(
      document
        .querySelector('[data-kro-toast-action]')
        ?.getAttribute('data-kro-toast-action'),
    ).toBe('destructive')

    rerender(
      <ActiveToastView
        toast={toActiveToast({
          message: 'm',
          primaryAction: {
            title: 'Share',
            style: 'prominent',
            onSelect: vi.fn(),
          },
        })}
      />,
    )
    expect(
      document
        .querySelector('[data-kro-toast-action]')
        ?.getAttribute('data-kro-toast-action'),
    ).toBe('prominent')
  })
})

describe('the shape follows the spec, not the drifted Swift view', () => {
  it('is a 16px rounded rectangle at least 72px tall', () => {
    render(<ActiveToastView toast={toActiveToast({ message: 'Saved' })} />)

    const toast = document.querySelector('[data-kro-toast]') as HTMLElement
    expect(toast.style.borderRadius).toBe(
      `${CHROME_LAYOUT.toastCornerRadius}px`,
    )
    expect(toast.style.minHeight).toBe(`${CHROME_LAYOUT.toastMinHeight}px`)
  })

  it('caps at the documented ~360pt width rather than filling a desktop', () => {
    render(<ActiveToastView toast={toActiveToast({ message: 'Saved' })} />)

    const toast = document.querySelector('[data-kro-toast]') as HTMLElement
    expect(toast.style.maxWidth).toBe(`${CHROME_LAYOUT.toastMaxWidth}px`)
  })

  it('asks glass.css for the material', () => {
    render(<ActiveToastView toast={toActiveToast({ message: 'Saved' })} />)

    expect(
      (document.querySelector('[data-kro-toast]') as HTMLElement).className,
    ).toContain('kro-glass')
  })

  it('hides the icon from assistive technology — the message already says it', () => {
    render(
      <ActiveToastView
        toast={toActiveToast({
          message: 'Saved',
          icon: 'checkmark.circle.fill',
          iconColor: 'green',
        })}
      />,
    )

    const icon = document.querySelector('[data-kro-toast] svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
