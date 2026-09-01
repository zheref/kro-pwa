import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_EMOJI_CATEGORIES } from './emojiCategories'
import { EmojiPicker } from './EmojiPicker'

afterEach(cleanup)

const FOOD = DEFAULT_EMOJI_CATEGORIES.find((category) => category.id === 'food')
if (!FOOD) throw new Error('the ported palette lost its Food & Drink category')

/** The palette itself is checked in `emojiCategories.test.ts`. */

describe('picking a glyph', () => {
  it('renders every emoji in a category as its own labelled control', () => {
    render(<EmojiPicker categories={[FOOD]} />)

    expect(screen.getAllByRole('button')).toHaveLength(FOOD.emojis.length)
    expect(screen.getByRole('button', { name: '🍎' })).toBeDefined()
  })

  it('reports the glyph the user chose', async () => {
    const onPick = vi.fn()
    render(<EmojiPicker categories={[FOOD]} onPick={onPick} />)

    await userEvent.click(screen.getByRole('button', { name: '🍕' }))

    expect(onPick).toHaveBeenCalledWith('🍕')
  })

  it('marks the current selection, so reopening the picker shows where you are', () => {
    render(<EmojiPicker categories={[FOOD]} selection="🍕" />)

    expect(
      screen.getByRole('button', { name: '🍕' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: '🍎' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('marks nothing when the endeavor has no symbol yet', () => {
    render(<EmojiPicker categories={[FOOD]} />)

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('false')
    }
  })

  it('does not dismiss itself — the container decides that', async () => {
    render(<EmojiPicker categories={[FOOD]} />)

    await userEvent.click(screen.getByRole('button', { name: '🍕' }))

    expect(screen.getAllByRole('button').length).toBe(FOOD.emojis.length)
  })
})

describe('navigation and reach', () => {
  it('heads each category, and pins the heading so the grid scrolls under it', () => {
    render(<EmojiPicker categories={DEFAULT_EMOJI_CATEGORIES.slice(0, 2)} />)

    const heading = screen.getByRole('heading', { name: 'Smileys & People' })
    expect((heading as HTMLElement).style.position).toBe('sticky')
  })

  it('groups each grid under its category name for a screen reader', () => {
    render(<EmojiPicker categories={[FOOD]} />)

    expect(screen.getByRole('group', { name: 'Food & Drink' })).toBeDefined()
  })

  it('gives every cell a full 44px touch target — the one canon number not taken', () => {
    render(<EmojiPicker categories={[FOOD]} />)

    for (const button of screen.getAllByRole('button')) {
      expect(button.style.minHeight).toBe('var(--kro-size-min-touch-target)')
    }
  })

  it('is reachable by keyboard alone', async () => {
    const onPick = vi.fn()
    render(<EmojiPicker categories={[FOOD]} onPick={onPick} />)

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onPick).toHaveBeenCalledWith(FOOD.emojis[0])
  })
})
