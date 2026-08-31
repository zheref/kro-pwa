import { describe, expect, it } from 'vitest'
import { DEFAULT_EMOJI_CATEGORIES, EMOJI_GRID_COLUMNS } from './emojiCategories'

/**
 * The palette is transcribed data, so the suite is a transcription check: it
 * proves the port did not quietly drop, reorder or duplicate a glyph. A picker
 * that is missing a row nobody notices until someone goes looking for the
 * emoji they always use.
 */

describe('the palette is KroApple`s defaultCategories', () => {
  it('ships the same seven categories in the same order', () => {
    expect(DEFAULT_EMOJI_CATEGORIES.map((category) => category.id)).toEqual([
      'smileys',
      'activities',
      'objects',
      'food',
      'symbols',
      'travel',
      'animals',
    ])
  })

  it('names each of them as canon does', () => {
    expect(DEFAULT_EMOJI_CATEGORIES.map((category) => category.name)).toEqual([
      'Smileys & People',
      'Activities',
      'Objects',
      'Food & Drink',
      'Symbols',
      'Travel & Places',
      'Animals & Nature',
    ])
  })

  it('carries canon`s 60 glyphs in each — six full rows of seven, plus change', () => {
    for (const category of DEFAULT_EMOJI_CATEGORIES) {
      expect(category.emojis, `${category.id} lost or gained a glyph`).toHaveLength(60)
    }
  })

  it('has no duplicate inside a category', () => {
    for (const category of DEFAULT_EMOJI_CATEGORIES) {
      expect(new Set(category.emojis).size, `${category.id} repeats a glyph`).toBe(
        category.emojis.length,
      )
    }
  })

  it('opens each category with the glyph canon opens it with', () => {
    // A spot check on the first entry of every category: a copy-paste that
    // shifted a block would move these before it changed a length.
    expect(DEFAULT_EMOJI_CATEGORIES.map((category) => category.emojis[0])).toEqual([
      '😀',
      '💼',
      '💻',
      '🍎',
      '❤️',
      '🚗',
      '🐶',
    ])
  })

  it('renders seven columns, as canon`s GridItem count does', () => {
    expect(EMOJI_GRID_COLUMNS).toBe(7)
  })
})
