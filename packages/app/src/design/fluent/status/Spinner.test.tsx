import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SPINNER_PX, Spinner } from './Spinner'

afterEach(cleanup)

describe('Spinner', () => {
  it('uses the hig spinner and speaks Loading when there is no label', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('progressbar')
    expect(spinner.getAttribute('data-slot')).toBe('spinner')
    expect(spinner.getAttribute('aria-valuetext')).toBe('Loading')
    expect(spinner.querySelector('.kro-hig-spinner')).not.toBeNull()
    expect(spinner.getAttribute('aria-valuemin')).toBeNull()
  })

  it('shows the label and uses it as valuetext', () => {
    render(<Spinner label="Opening session" />)
    const spinner = screen.getByRole('progressbar')
    expect(screen.getByText('Opening session')).not.toBeNull()
    expect(spinner.getAttribute('aria-valuetext')).toBe('Opening session')
    expect(spinner.getAttribute('data-label-position')).toBe('after')
  })

  it('maps every size onto the Fluent pixel ramp', () => {
    const { rerender } = render(<Spinner size="tiny" />)
    const face = () => document.querySelector('.kro-hig-spinner') as HTMLElement

    expect(SPINNER_PX.tiny).toBe(16)
    expect(face().style.width).toBe('16px')

    rerender(<Spinner size="huge" />)
    expect(face().style.width).toBe('48px')
    expect(face().style.height).toBe('48px')
  })

  it('inverts the sweep onto on-accent for accent glass', () => {
    render(<Spinner appearance="inverted" label="Saving" />)
    const face = document.querySelector('.kro-hig-spinner') as HTMLElement
    expect(face.style.borderTopColor).toBe('var(--kro-color-on-accent)')
    expect(face.getAttribute('style') ?? '').toContain('--kro-color-on-accent')
    expect(
      screen.getByRole('progressbar').getAttribute('data-appearance'),
    ).toBe('inverted')
  })

  it('stacks the label above or below when asked', () => {
    const { rerender } = render(
      <Spinner label="Syncing" labelPosition="above" />,
    )
    expect(
      screen.getByRole('progressbar').getAttribute('data-label-position'),
    ).toBe('above')
    expect(screen.getByRole('progressbar').className).toContain('flex-col')

    rerender(<Spinner label="Syncing" labelPosition="before" />)
    expect(
      screen.getByRole('progressbar').getAttribute('data-label-position'),
    ).toBe('before')
    expect(screen.getByRole('progressbar').className).toContain('flex-row')
  })
})
