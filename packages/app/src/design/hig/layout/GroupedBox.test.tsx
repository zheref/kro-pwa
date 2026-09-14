import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GroupedBox } from './GroupedBox'

afterEach(cleanup)

describe('GroupedBox', () => {
  it('sits the title above the card in the grouped-inset style', () => {
    render(
      <GroupedBox title="Plan">
        <div>Inbox triage</div>
      </GroupedBox>,
    )

    expect(screen.getByText('Plan').className).toContain(
      'text-kro-fore-secondary',
    )
    expect(screen.getByText('Plan').className).toContain('uppercase')

    const card = document.querySelector('[data-slot="grouped-box-card"]')
    expect(card?.className).toContain('bg-kro-absolute')
    expect(card?.className).toContain('rounded-kro-card')
    expect(card?.className).toContain('shadow-kro-surface')
    expect(screen.getByText('Inbox triage')).toBeTruthy()
  })

  it('draws hairlines between children when divided', () => {
    render(
      <GroupedBox divided>
        <div>Morning session</div>
        <div>Weekly review</div>
        <div>Earn sweep</div>
      </GroupedBox>,
    )

    expect(
      document.querySelectorAll('[data-slot="grouped-box-divider"]'),
    ).toHaveLength(2)
  })

  it('paints glass instead of the opaque card when asked', () => {
    render(
      <GroupedBox material="glass" footer="Sessions stay on this device">
        <div>Focus sounds</div>
      </GroupedBox>,
    )

    const card = document.querySelector('[data-slot="grouped-box-card"]')
    expect(card?.className).toContain('kro-glass')
    expect(card?.getAttribute('data-material')).toBe('glass')
    expect(screen.getByText('Sessions stay on this device')).toBeTruthy()
  })

  it('defaults to compact and pads the card for comfortable', () => {
    const { rerender } = render(
      <GroupedBox title="Plan">
        <div>Inbox triage</div>
      </GroupedBox>,
    )

    const root = document.querySelector('[data-slot="grouped-box"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(
      document.querySelector('[data-slot="grouped-box-card"]')?.className,
    ).not.toContain('p-kro-tiny')

    rerender(
      <GroupedBox title="Plan" density="comfortable">
        <div>Inbox triage</div>
      </GroupedBox>,
    )
    expect(
      document
        .querySelector('[data-slot="grouped-box"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      document.querySelector('[data-slot="grouped-box-card"]')?.className,
    ).toContain('p-kro-tiny')
  })
})
