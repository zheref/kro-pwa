/**
 * The existing-local-data dialog's render tests, mirroring
 * `LocalDataDialogFragment.stories.tsx` (`RC-11`).
 *
 * The middle block is the issue's three-way test: each of canon's three
 * buttons reports its own choice, and none reports another's.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalDataChoice, localDataChoices } from '../../LocalDataDialog'
import { LocalDataDialogFragment } from '../LocalDataDialogFragment'

afterEach(cleanup)

const renderDialog = (
  overrides: Partial<Parameters<typeof LocalDataDialogFragment>[0]> = {},
) =>
  render(
    <LocalDataDialogFragment
      isPresented
      anonymousCount={3}
      isResolving={false}
      onChoose={() => {}}
      onDismiss={() => {}}
      {...overrides}
    />,
  )

describe('the prompt', () => {
  it('shows canon title and interpolates the row count', () => {
    renderDialog()

    expect(screen.getByText('You Have Local Data')).toBeTruthy()
    expect(screen.getByText(/You have 3 local endeavors/)).toBeTruthy()
  })

  it('says "endeavor" in the singular for a single row', () => {
    renderDialog({ anonymousCount: 1 })

    expect(screen.getByText(/You have 1 local endeavor\./)).toBeTruthy()
  })

  it('renders nothing at all when it is not presented', () => {
    renderDialog({ isPresented: false })

    expect(screen.queryByTestId('local-data-dialog')).toBeNull()
  })
})

describe('the three choices', () => {
  it('offers exactly the three canon arms declares, in canon order', () => {
    renderDialog()

    expect(localDataChoices).toEqual(['signAll', 'clearAll', 'cancel'])
    expect(screen.getByTestId('local-data-sign-all').textContent).toBe(
      'Sign All Endeavors to My Account',
    )
    expect(screen.getByTestId('local-data-clear-all').textContent).toBe(
      'Clear Everything and Start Over',
    )
    expect(screen.getByTestId('local-data-cancel').textContent).toBe('Cancel')
  })

  it('reports signAll and nothing else when the first button is pressed', async () => {
    const onChoose = vi.fn()
    renderDialog({ onChoose })

    await userEvent.click(screen.getByTestId('local-data-sign-all'))

    expect(onChoose.mock.calls).toEqual([[LocalDataChoice.signAll]])
  })

  it('reports clearAll and nothing else when the destructive button is pressed', async () => {
    const onChoose = vi.fn()
    renderDialog({ onChoose })

    await userEvent.click(screen.getByTestId('local-data-clear-all'))

    expect(onChoose.mock.calls).toEqual([[LocalDataChoice.clearAll]])
  })

  it('reports cancel and nothing else when Cancel is pressed', async () => {
    const onChoose = vi.fn()
    renderDialog({ onChoose })

    await userEvent.click(screen.getByTestId('local-data-cancel'))

    expect(onChoose.mock.calls).toEqual([[LocalDataChoice.cancel]])
  })
})

describe('while a choice is being applied', () => {
  it('locks all three buttons, so a second press cannot double-apply', () => {
    renderDialog({ isResolving: true })

    for (const id of [
      'local-data-sign-all',
      'local-data-clear-all',
      'local-data-cancel',
    ]) {
      expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('keeps the prompt on screen rather than closing optimistically', () => {
    renderDialog({ isResolving: true })

    expect(screen.getByTestId('local-data-dialog')).toBeTruthy()
  })

  it('re-enables them when the attempt ends', () => {
    renderDialog({ isResolving: false })

    expect(
      (screen.getByTestId('local-data-sign-all') as HTMLButtonElement).disabled,
    ).toBe(false)
  })
})

describe('dismissal', () => {
  it('offers no close affordance — the three buttons are the only exits', () => {
    renderDialog()

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('routes Escape to the dismissal handler rather than trapping the keyboard', async () => {
    const onDismiss = vi.fn()
    renderDialog({ onDismiss })

    await userEvent.keyboard('{Escape}')

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not report a choice when it is dismissed', async () => {
    const onChoose = vi.fn()
    renderDialog({ onChoose })

    await userEvent.keyboard('{Escape}')

    expect(onChoose).not.toHaveBeenCalled()
  })
})
