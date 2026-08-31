import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompactPresentationHeader } from './CompactPresentationHeader'

afterEach(cleanup)

describe('CompactPresentationHeader', () => {
  it('titles the presentation, and subtitles it when there is more to say', () => {
    render(<CompactPresentationHeader title="Inbox" subtitle="3 endeavors" />)

    expect(screen.getByText('Inbox')).not.toBeNull()
    expect(screen.getByText('3 endeavors')).not.toBeNull()
  })

  it('names the dismiss control "Close" and raises it', async () => {
    const onPress = vi.fn()
    render(
      <CompactPresentationHeader
        title="Inbox"
        leadingAction={{ kind: 'dismiss', onPress }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('names the back control "Back" — a different action needs a different word', async () => {
    const onPress = vi.fn()
    render(
      <CompactPresentationHeader title="Triage" leadingAction={{ kind: 'back', onPress }} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('keeps canon’s 30px circle while giving the BUTTON the 44px floor', () => {
    // The drawing is canon's; the hit area is the web's touch rule. Growing the
    // circle instead would change the chrome on every popover in the app.
    render(
      <CompactPresentationHeader
        title="Inbox"
        leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
      />,
    )

    const button = screen.getByRole('button', { name: 'Close' })
    expect(button.style.minWidth).toBe('var(--kro-size-min-touch-target)')
    expect(button.style.minHeight).toBe('var(--kro-size-min-touch-target)')
    expect((button.firstElementChild as HTMLElement).className).toContain('size-[30px]')
  })

  it('renders no leading control when the presentation has no way back', () => {
    render(<CompactPresentationHeader title="Visibility" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('truncates a long title rather than pushing the control off the panel', () => {
    render(
      <CompactPresentationHeader title="Reconciliation conflicts across every connected host" />,
    )

    expect(
      screen.getByText('Reconciliation conflicts across every connected host').className,
    ).toContain('truncate')
  })
})
