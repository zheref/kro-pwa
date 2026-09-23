import { describe, expect, it } from 'vitest'
import {
  ROW_HIGHLIGHT,
  TOOLBAR_GLYPH_BUTTON,
  TOOLBAR_GLYPH_BUTTON_PX,
} from './rowHighlight'

describe('ROW_HIGHLIGHT', () => {
  it('rests on a transparent border so the row does not grow', () => {
    expect(ROW_HIGHLIGHT).toContain('border-transparent')
  })

  it('fills with the translucent absolute wash and a lighter rim', () => {
    expect(ROW_HIGHLIGHT).toContain('hover:bg-kro-absolute/25')
    expect(ROW_HIGHLIGHT).toContain('hover:border-(--kro-glass-rim)')
    expect(ROW_HIGHLIGHT).toContain('focus-visible:bg-kro-absolute/25')
    expect(ROW_HIGHLIGHT).toContain('focus-visible:border-(--kro-glass-rim)')
  })

  it('does not invert the label onto a solid fill', () => {
    expect(ROW_HIGHLIGHT).not.toContain('hover:bg-kro-total')
    expect(ROW_HIGHLIGHT).not.toContain('hover:text-kro-absolute')
  })
})

describe('TOOLBAR_GLYPH_BUTTON', () => {
  it('uses the menu-row corner and the same glass wash', () => {
    expect(TOOLBAR_GLYPH_BUTTON).toContain('rounded-kro-small')
    expect(TOOLBAR_GLYPH_BUTTON).toContain('hover:bg-kro-absolute/25')
    expect(TOOLBAR_GLYPH_BUTTON).toContain('hover:border-(--kro-glass-rim)')
  })

  it('is a step larger than the pointer target', () => {
    expect(TOOLBAR_GLYPH_BUTTON_PX).toBe(32)
  })
})
