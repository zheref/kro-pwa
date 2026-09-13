import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProgressIndicator, clampUnitInterval } from './ProgressIndicator'

afterEach(cleanup)

describe('ProgressIndicator', () => {
  it('exposes a bar on a 0–1 scale, with the fill matching the value', () => {
    const { container } = render(
      <ProgressIndicator kind="bar" value={0.72} label="Syncing calendar" />,
    )

    const bar = screen.getByRole('progressbar', { name: 'Syncing calendar' })
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('1')
    expect(bar.getAttribute('aria-valuenow')).toBe('0.72')
    expect(bar.className).toContain('bg-kro-back-inner')
    expect(bar.className).toContain('rounded-kro-pill')
    expect(container.innerHTML).toContain('bg-kro-accent')
    expect(screen.getByText('Syncing calendar')).toBeTruthy()
  })

  it('draws a 28px circular indicator whose stroke is the live accent', () => {
    render(
      <ProgressIndicator
        kind="circular"
        value={0.4}
        label="Uploading capture"
      />,
    )

    const ring = screen.getByRole('progressbar', { name: 'Uploading capture' })
    expect(ring.tagName).toBe('svg')
    expect(ring.getAttribute('width')).toBe('28')
    expect(ring.getAttribute('data-density')).toBe('compact')
    expect(ring.getAttribute('aria-valuenow')).toBe('0.4')
    expect(ring.innerHTML).toContain('var(--kro-color-accent)')
    expect(ring.innerHTML).toContain('var(--kro-color-hairline)')
  })

  it('defaults to compact and grows the circular for comfortable', () => {
    const { rerender } = render(
      <ProgressIndicator kind="circular" value={0.4} />,
    )
    expect(screen.getByRole('progressbar').getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByRole('progressbar').getAttribute('width')).toBe('28')

    rerender(
      <ProgressIndicator kind="circular" value={0.4} density="comfortable" />,
    )
    expect(screen.getByRole('progressbar').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByRole('progressbar').getAttribute('width')).toBe('36')
  })

  it('uses the hig spinner for an indeterminate load and has no valuemin', () => {
    render(<ProgressIndicator kind="indeterminate" label="Opening session" />)

    const spinner = screen.getByRole('progressbar', { name: 'Opening session' })
    expect(spinner.className).toContain('kro-hig-spinner')
    expect(spinner.getAttribute('aria-valuetext')).toBe('Loading')
    expect(spinner.getAttribute('aria-valuemin')).toBeNull()
    expect(spinner.getAttribute('aria-valuenow')).toBeNull()

    const { unmount } = render(
      <ProgressIndicator kind="indeterminate" size="sm" label="Quiet sync" />,
    )
    expect(
      screen.getByRole('progressbar', { name: 'Quiet sync' }).className,
    ).toContain('size-4')
    unmount()
  })

  it('inverts the spinner for accent glass and can stack the label', () => {
    render(
      <ProgressIndicator
        kind="indeterminate"
        appearance="inverted"
        labelPosition="below"
        label="Opening session"
      />,
    )

    const spinner = screen.getByRole('progressbar', {
      name: 'Opening session',
    })
    expect(spinner.getAttribute('data-appearance')).toBe('inverted')
    expect(
      document
        .querySelector('[data-slot="progress-indicator"]')
        ?.getAttribute('data-label-position'),
    ).toBe('below')
  })

  it('clamps a unit interval and treats a non-finite value as empty', () => {
    expect(clampUnitInterval(1.4)).toBe(1)
    expect(clampUnitInterval(-2)).toBe(0)
    expect(clampUnitInterval(Number.NaN)).toBe(0)

    render(<ProgressIndicator kind="bar" value={1.8} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '1',
    )
  })
})
