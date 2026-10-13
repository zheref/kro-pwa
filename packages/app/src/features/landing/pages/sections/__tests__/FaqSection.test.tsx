import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { faqEntries } from '../../../LandingCopy'
import { FaqSection } from '../FaqSection'
import * as stories from '../FaqSection.stories'

afterEach(cleanup)

describe('FaqSection (mirrors FaqSection.stories)', () => {
  it('Closed — six questions as buttons, none expanded', () => {
    render(stories.Closed.render())
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(
      faqEntries.map((e) => e.question),
    )
    for (const button of buttons)
      expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('OpenDark — only the open entry is expanded and its answer is on screen', () => {
    render(stories.OpenDark.render())
    expect(
      screen
        .getByRole('button', { name: 'Is Kro free?' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'What is an endeavor?' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(screen.getByText(/Plus is not on sale yet/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'See pricing' }).getAttribute('href'),
    ).toBe('/pricing')
  })

  it('OpenPhone — the h2 names the section and every target is at least 44px tall by class', () => {
    const { container } = render(stories.OpenPhone.render())
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'Good questions, plainly answered.',
    })
    expect(
      container.querySelector('section#faq')?.getAttribute('aria-labelledby'),
    ).toBe(h2.id)
    expect(
      container.querySelector('[data-slot="accordion"]')?.className,
    ).toContain('min-h-11')
  })
})

describe('FaqSection intents', () => {
  it('opening a closed entry reports its id', () => {
    const onOpen = vi.fn()
    render(<FaqSection openId={null} onOpen={onOpen} onClose={vi.fn()} />)
    press(screen.getByRole('button', { name: 'Where is my data stored?' }))
    expect(onOpen).toHaveBeenCalledWith('data')
  })

  it('pressing the open entry again reports a close', () => {
    const onClose = vi.fn()
    render(<FaqSection openId="data" onOpen={vi.fn()} onClose={onClose} />)
    press(screen.getByRole('button', { name: 'Where is my data stored?' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opening another entry while one is open reports the new id, not a close', () => {
    const onOpen = vi.fn()
    const onClose = vi.fn()
    render(<FaqSection openId="data" onOpen={onOpen} onClose={onClose} />)
    press(screen.getByRole('button', { name: 'Does it work offline?' }))
    expect(onOpen).toHaveBeenLastCalledWith('offline')
    expect(onClose).not.toHaveBeenCalled()
  })
})
