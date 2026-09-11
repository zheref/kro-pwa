import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../../system/primitives/button'
import { installRadixEnvironment } from '../../system/primitives/__tests__/radixEnvironment'
import {
  Alert,
  AlertActions,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from './Alert'

let teardown: () => void

beforeEach(() => {
  teardown = installRadixEnvironment()
})

afterEach(() => {
  cleanup()
  teardown()
})

function ConfirmAlert({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Alert defaultOpen onOpenChange={onOpenChange}>
      <AlertContent>
        <AlertTitle>Start this session?</AlertTitle>
        <AlertDescription>
          Twenty-five minutes against Write the KroTokens port.
        </AlertDescription>
        <AlertActions>
          <Button variant="secondary">Not now</Button>
          <Button variant="primary">Start session</Button>
        </AlertActions>
      </AlertContent>
    </Alert>
  )
}

describe('Alert', () => {
  it('announces itself as a dialog with its title and description', () => {
    render(<ConfirmAlert />)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Start this session?')).toBeDefined()
    expect(
      screen.getByText('Twenty-five minutes against Write the KroTokens port.'),
    ).toBeDefined()
  })

  it('withholds the dismiss-X — an alert is a choice, not chrome', () => {
    render(<ConfirmAlert />)

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeDefined()
  })

  it("keeps DialogContent's forced position:fixed", () => {
    render(<ConfirmAlert />)

    expect(screen.getByRole('dialog').style.position).toBe('fixed')
    expect(screen.getByRole('dialog').className).toContain('kro-glass')
  })

  it('stacks actions as a footer the caller fills', () => {
    render(<ConfirmAlert />)

    const actions = screen
      .getByRole('dialog')
      .querySelector('[data-slot="alert-actions"]')
    expect(actions?.className).toContain('flex-col-reverse')
    expect(actions?.className).toContain('sm:flex-row')
  })

  it('still dismisses on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<ConfirmAlert onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<ConfirmAlert />)

    const actions = screen
      .getByRole('dialog')
      .querySelector('[data-slot="alert-actions"]')
    expect(actions?.getAttribute('data-density')).toBe('compact')
    expect(actions?.className).toContain('text-xs')

    rerender(
      <Alert defaultOpen>
        <AlertContent>
          <AlertTitle>Start this session?</AlertTitle>
          <AlertActions density="comfortable">
            <Button variant="primary">Start session</Button>
          </AlertActions>
        </AlertContent>
      </Alert>,
    )
    const comfortable = screen
      .getByRole('dialog')
      .querySelector('[data-slot="alert-actions"]')
    expect(comfortable?.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable?.className).toContain('text-sm')
  })
})
