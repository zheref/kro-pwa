import { describe, expect, it } from 'vitest'
import { emojiIcon, glyphIcon } from '../IconRepresentation'

describe('IconRepresentation', () => {
  it('tags a glyph with the SF Symbol name canon supplies', () => {
    expect(glyphIcon('bolt.fill')).toEqual({ type: 'glyph', name: 'bolt.fill' })
  })

  it('tags an emoji with its literal value', () => {
    expect(emojiIcon('🎮')).toEqual({ type: 'emoji', value: '🎮' })
  })

  it('discriminates the two cases on `type`, so a switch can narrow', () => {
    const icons = [glyphIcon('calendar'), emojiIcon('🗓️')]
    const names = icons.map((icon) =>
      icon.type === 'glyph' ? icon.name : icon.value,
    )
    expect(names).toEqual(['calendar', '🗓️'])
  })
})
