import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardRow, CardRowStack, SectionCard, SurfaceCard } from './SurfaceCard'

afterEach(cleanup)

describe('SurfaceCard', () => {
  it('is the grouped card surface — the absolute fill, the surface radius, the card shadow', () => {
    const { container } = render(
      <SurfaceCard>
        <p>Two sessions logged</p>
      </SurfaceCard>,
    )

    const card = container.querySelector(
      '[data-slot="surface-card"]',
    ) as HTMLElement
    expect(card.style.backgroundColor).toBe('var(--kro-color-absolute)')
    expect(card.style.borderRadius).toBe('var(--kro-radius-surface)')
    expect(card.style.boxShadow).toBe('var(--kro-shadow-card)')
  })

  it('drops the shadow when asked, for a card nested in another card', () => {
    const { container } = render(
      <SurfaceCard isElevated={false}>x</SurfaceCard>,
    )

    const card = container.querySelector(
      '[data-slot="surface-card"]',
    ) as HTMLElement
    expect(card.style.boxShadow).toBe('')
  })

  it('hands its padding to the content when told to — so hairlines can run edge to edge', () => {
    const { container } = render(<SurfaceCard padding={null}>x</SurfaceCard>)

    const card = container.querySelector(
      '[data-slot="surface-card"]',
    ) as HTMLElement
    expect(card.style.padding).toBe('')
  })
})

describe('CardRowStack', () => {
  it('draws a hairline BETWEEN rows and never above the first', () => {
    const { container } = render(
      <CardRowStack>
        <CardRow>One</CardRow>
        <CardRow>Two</CardRow>
        <CardRow>Three</CardRow>
      </CardRowStack>,
    )

    expect(
      container.querySelectorAll('[data-slot="card-row-separator"]'),
    ).toHaveLength(2)
  })

  it('draws no separator at all for a single row', () => {
    const { container } = render(
      <CardRowStack>
        <CardRow>Only</CardRow>
      </CardRowStack>,
    )

    expect(
      container.querySelectorAll('[data-slot="card-row-separator"]'),
    ).toHaveLength(0)
  })

  it('INSETS the separator, so the card reads as a grouped list not a stack of cuts', () => {
    const { container } = render(
      <CardRowStack separatorInset="24px">
        <CardRow>One</CardRow>
        <CardRow>Two</CardRow>
      </CardRowStack>,
    )

    const separator = container.querySelector(
      '[data-slot="card-row-separator"]',
    ) as HTMLElement
    expect(separator.style.marginLeft).toBe('24px')
    expect(separator.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('SectionCard', () => {
  it('puts the header OUTSIDE the card, so the card edge stays clean', () => {
    const { container } = render(
      <SectionCard title="Core">
        <p>Body</p>
      </SectionCard>,
    )

    const card = container.querySelector('[data-slot="surface-card"]')
    expect(card?.contains(screen.getByRole('heading', { name: 'Core' }))).toBe(
      false,
    )
  })

  it('shows a count beside the title when the section has one', () => {
    render(
      <SectionCard title="Performances" count={2}>
        <p>Body</p>
      </SectionCard>,
    )

    expect(screen.getByText('2')).not.toBeNull()
  })

  it('raises its action, and only renders one when both halves are given', async () => {
    const onAction = vi.fn()
    const { rerender } = render(
      <SectionCard
        title="Performances"
        actionTitle="Manage"
        onAction={onAction}
      >
        <p>Body</p>
      </SectionCard>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Manage' }))
    expect(onAction).toHaveBeenCalledOnce()

    rerender(
      <SectionCard title="Performances" actionTitle="Manage">
        <p>Body</p>
      </SectionCard>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
