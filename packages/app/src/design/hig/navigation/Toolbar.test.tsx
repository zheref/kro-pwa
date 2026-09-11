import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toolbar } from './Toolbar'

afterEach(cleanup)

describe('Toolbar', () => {
  it('clusters groups in glass at control weight', () => {
    render(
      <Toolbar
        groups={[
          [
            <button key="compose" type="button">
              Compose
            </button>,
          ],
          [
            <button key="info" type="button">
              Info
            </button>,
          ],
        ]}
      />,
    )

    const toolbar = screen.getByRole('toolbar')
    expect(toolbar.className).toContain('kro-glass')
    expect(toolbar.className).toContain('kro-glass--control')
    expect(toolbar.className).toContain('inline-flex')
  })

  it('separates groups with a decorative hairline', () => {
    render(
      <Toolbar
        groups={[
          [
            <button key="compose" type="button">
              Compose
            </button>,
          ],
          [
            <button key="info" type="button">
              Info
            </button>,
          ],
        ]}
      />,
    )

    const hairline = screen
      .getByRole('toolbar')
      .querySelector('[aria-hidden="true"]')
    expect(hairline).not.toBeNull()
    expect(hairline?.className).toContain('bg-kro-hairline')
  })

  it("renders the caller's buttons and lets them fire", async () => {
    const onCompose = vi.fn()
    render(
      <Toolbar
        groups={[
          [
            <button key="compose" type="button" onClick={onCompose}>
              Compose
            </button>,
          ],
        ]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Compose' }))

    expect(onCompose).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('toolbar').querySelector('[aria-hidden="true"]'),
    ).toBeNull()
  })

  it('defaults to compact padding and grows for comfortable', () => {
    const { rerender } = render(
      <Toolbar
        groups={[
          [
            <button key="compose" type="button">
              Compose
            </button>,
          ],
        ]}
      />,
    )

    const toolbar = screen.getByRole('toolbar')
    expect(toolbar.getAttribute('data-density')).toBe('compact')
    expect(toolbar.className).toContain('p-0.5')

    rerender(
      <Toolbar
        density="comfortable"
        groups={[
          [
            <button key="compose" type="button">
              Compose
            </button>,
          ],
        ]}
      />,
    )
    expect(screen.getByRole('toolbar').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByRole('toolbar').className).toContain('p-kro-tiny')
  })
})
