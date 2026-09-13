import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GalleryAppearanceToolbar } from './GalleryAppearanceToolbar'

afterEach(cleanup)

describe('GalleryAppearanceToolbar', () => {
  it('offers Light and Dark, and names the four palettes', () => {
    render(
      <GalleryAppearanceToolbar
        scheme="light"
        palette="purple"
        onSelectScheme={() => {}}
        onSelectPalette={() => {}}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Light' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Dark' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Purple' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Green' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Orange' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Red' })).toBeTruthy()
  })

  it('reports the scheme that was picked', async () => {
    const onSelectScheme = vi.fn()
    render(
      <GalleryAppearanceToolbar
        scheme="light"
        palette="purple"
        onSelectScheme={onSelectScheme}
        onSelectPalette={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Dark' }))

    expect(onSelectScheme).toHaveBeenCalledWith('dark')
  })

  it('reports the palette that was picked', async () => {
    const onSelectPalette = vi.fn()
    render(
      <GalleryAppearanceToolbar
        scheme="light"
        palette="purple"
        onSelectScheme={() => {}}
        onSelectPalette={onSelectPalette}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Orange' }))

    expect(onSelectPalette).toHaveBeenCalledWith('orange')
  })

  it('rings the selected palette and scheme', () => {
    render(
      <GalleryAppearanceToolbar
        scheme="dark"
        palette="green"
        onSelectScheme={() => {}}
        onSelectPalette={() => {}}
      />,
    )

    expect(
      screen.getByRole('tab', { name: 'Dark' }).getAttribute('aria-selected'),
    ).toBe('true')
    expect(
      screen.getByRole('radio', { name: 'Green' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen
        .getByRole('radio', { name: 'Purple' })
        .getAttribute('aria-checked'),
    ).toBe('false')
  })
})
