import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Carousel } from './Carousel'

afterEach(cleanup)

const SLIDES = [
  { id: 'one', title: 'Today', content: <p>Morning session</p> },
  { id: 'two', title: 'Plan', content: <p>Inbox triage</p> },
  { id: 'three', title: 'Earn', content: <p>Session points</p> },
] as const

describe('Carousel', () => {
  it('starts on the first slide with numbered pagination, not dots', () => {
    render(<Carousel slides={[...SLIDES]} />)

    const region = screen.getByRole('region', { name: 'Today' })
    expect(region.getAttribute('data-slot')).toBe('carousel')
    expect(region.getAttribute('aria-roledescription')).toBe('carousel')
    expect(screen.getByText('Morning session')).toBeTruthy()
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(screen.queryByText('2 of 3')).toBeNull()
    const previous = screen.getByRole('button', {
      name: 'Previous',
    }) as HTMLButtonElement
    const next = screen.getByRole('button', {
      name: 'Next',
    }) as HTMLButtonElement
    expect(previous.disabled).toBe(true)
    expect(next.disabled).toBe(false)
  })

  it('advances with Next and stops at the last slide', async () => {
    const onIndexChange = vi.fn()
    render(<Carousel slides={[...SLIDES]} onIndexChange={onIndexChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
    expect(screen.getByText('Inbox triage')).toBeTruthy()
    expect(screen.getByText('2 of 3')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('3 of 3')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })

  it('stays controlled when index is passed and names the region from label', async () => {
    const onIndexChange = vi.fn()
    render(
      <Carousel
        slides={[...SLIDES]}
        index={0}
        label="Endeavor highlights"
        onIndexChange={onIndexChange}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Endeavor highlights' }),
    ).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
    expect(screen.getByText('Morning session')).toBeTruthy()
    expect(screen.getByText('1 of 3')).toBeTruthy()
  })
})
