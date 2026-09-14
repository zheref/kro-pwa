import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RATING_MAX, RatingIndicator } from './RatingIndicator'

afterEach(cleanup)

describe('RatingIndicator', () => {
  it('names each star and prints the numeric score so colour is not the only signal', () => {
    render(<RatingIndicator value={3} label="Session energy" />)

    expect(screen.getByRole('group', { name: 'Session energy' })).toBeTruthy()
    expect(screen.getByLabelText('1 of 5')).toBeTruthy()
    expect(screen.getByLabelText('3 of 5')).toBeTruthy()
    expect(screen.getByLabelText(`${RATING_MAX} of ${RATING_MAX}`)).toBeTruthy()
    expect(screen.getByText('(3 of 5)')).toBeTruthy()
  })

  it('reports a new value when a star is pressed', async () => {
    const onValueChange = vi.fn()
    render(
      <RatingIndicator
        value={2}
        label="Session energy"
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '4 of 5' }))

    expect(onValueChange).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenCalledWith(4)
  })

  it('does not fire when read-only, and speaks the score as an image', async () => {
    const onValueChange = vi.fn()
    render(
      <RatingIndicator
        value={5}
        label="Session energy"
        readOnly
        onValueChange={onValueChange}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Session energy: 5 of 5' }),
    ).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('(5 of 5)')).toBeTruthy()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps interactive stars at the compact icon-sm floor', () => {
    render(<RatingIndicator value={1} label="Session energy" />)

    for (const star of screen.getAllByRole('button')) {
      expect(star.className).toContain('size-6')
    }
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <RatingIndicator value={1} label="Session energy" />,
    )
    expect(
      document
        .querySelector('[data-slot="rating-indicator"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')
    expect(screen.getAllByRole('button')[0]?.className).toContain('size-6')

    rerender(
      <RatingIndicator
        value={1}
        label="Session energy"
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="rating-indicator"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getAllByRole('button')[0]?.className).toContain('size-9')
  })

  it('treats a non-finite score as none of five', () => {
    render(
      <RatingIndicator value={Number.NaN} label="Session energy" readOnly />,
    )

    expect(
      screen.getByRole('img', { name: 'Session energy: 0 of 5' }),
    ).toBeTruthy()
    expect(screen.getByText('(0 of 5)')).toBeTruthy()
  })
})
