/** CapsuleSegmentGroup — render tests mirroring its gallery's three scenes. */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CapsuleSegmentGroup,
  capsuleSegmentRadius,
} from './CapsuleSegmentGroup'

afterEach(cleanup)

const READINGS = [
  { value: 'session', label: 'Session', icon: () => <span>S</span> },
  { value: 'performance', label: 'Performance', icon: () => <span>P</span> },
  { value: 'plan', label: 'Plan', icon: () => <span>L</span> },
] as const

describe('CapsuleSegmentGroup', () => {
  it('presses only the selected reading inside a labelled group', () => {
    render(
      <CapsuleSegmentGroup
        label="Detail pane"
        options={READINGS}
        value="performance"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Detail pane' })).toBeTruthy()
    const pressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Performance',
    ])
  })

  it('presses nothing when no reading is selected', () => {
    render(
      <CapsuleSegmentGroup
        label="Detail pane"
        options={READINGS}
        value={null}
        onSelect={() => {}}
      />,
    )
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('false')
    }
  })

  it('reports the pressed option, even the one already selected', async () => {
    const onSelect = vi.fn()
    render(
      <CapsuleSegmentGroup
        label="Detail pane"
        options={READINGS}
        value="plan"
        onSelect={onSelect}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Session' }))
    expect(onSelect.mock.calls).toEqual([['plan'], ['session']])
  })

  it('rounds the end options to the capsule on their outer side', () => {
    render(
      <CapsuleSegmentGroup
        label="Detail pane"
        options={READINGS}
        value="session"
        onSelect={() => {}}
      />,
    )
    const [first, middle, last] = screen.getAllByRole('button')
    expect(first?.style.borderRadius).toBe(capsuleSegmentRadius(0, 3))
    expect(middle?.style.borderRadius).toBe(capsuleSegmentRadius(1, 3))
    expect(last?.style.borderRadius).toBe(capsuleSegmentRadius(2, 3))
  })
})

describe('capsuleSegmentRadius', () => {
  it('gives the leading option a full curve on its left only', () => {
    expect(capsuleSegmentRadius(0, 3)).toBe(
      '9999px var(--kro-radius-small, 8px) var(--kro-radius-small, 8px) 9999px',
    )
  })

  it('gives the trailing option a full curve on its right only', () => {
    expect(capsuleSegmentRadius(2, 3)).toBe(
      'var(--kro-radius-small, 8px) 9999px 9999px var(--kro-radius-small, 8px)',
    )
  })

  it('makes a lone option a full capsule on both sides', () => {
    expect(capsuleSegmentRadius(0, 1)).toBe('9999px 9999px 9999px 9999px')
  })
})
