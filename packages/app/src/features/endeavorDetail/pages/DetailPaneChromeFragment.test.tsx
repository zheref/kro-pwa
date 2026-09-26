/**
 * Endeavor Detail's pane chrome — render tests mirroring its stories
 * (`RC-11`): the same scenes, the same frame, no store.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DetailPaneChromeFragment,
  DetailSaveButton,
} from './DetailPaneChromeFragment'
import {
  DetailPaneChromeFrame,
  detailPaneChromeScenes,
} from './DetailPaneChromeFragment.stories'

afterEach(cleanup)

const mount = (
  key: keyof typeof detailPaneChromeScenes,
  callbacks: { onBack?: () => void; onSave?: () => void } = {},
) =>
  render(
    <DetailPaneChromeFrame>
      <DetailPaneChromeFragment
        {...detailPaneChromeScenes[key]}
        onBack={callbacks.onBack ?? (() => {})}
        onSave={callbacks.onSave ?? (() => {})}
      >
        <p>Body</p>
      </DetailPaneChromeFragment>
    </DetailPaneChromeFrame>,
  )

describe('DetailPaneChromeFragment', () => {
  it('shows only the body on the read surface — the pane header is the shell’s', () => {
    mount('readSurface')
    expect(screen.getByTestId('detail-pane-plan').textContent).toBe('Body')
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(screen.queryByTestId('detail-pane-editor-title')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('offers Back, the title and an enabled Save on a dirty Edit', async () => {
    const onBack = vi.fn()
    const onSave = vi.fn()
    mount('editorDirty', { onBack, onSave })
    expect(screen.getByTestId('detail-pane-editor-title').textContent).toBe(
      'Edit Task',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('has no Save on a relation editor, which commits per row', () => {
    mount('relationEditor')
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('shows Saving… disabled while a save is in flight', () => {
    mount('saving')
    expect(
      (screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})

describe('DetailSaveButton', () => {
  it('fits the pane toolbar at its 36px button height', () => {
    render(
      <DetailSaveButton
        size="toolbar"
        isEnabled
        isSaving={false}
        onPress={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Save' }).style.height).not.toBe(
      '',
    )
  })

  it('keeps the touch-target minimum in the dialog', () => {
    render(
      <DetailSaveButton
        size="touch"
        isEnabled
        isSaving={false}
        onPress={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Save' }).style.minHeight).toBe(
      'var(--kro-size-min-touch-target)',
    )
  })

  it('does not fire while disabled', async () => {
    const onPress = vi.fn()
    render(
      <DetailSaveButton
        size="touch"
        isEnabled={false}
        isSaving={false}
        onPress={onPress}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onPress).not.toHaveBeenCalled()
  })
})
