import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PALETTE_ATTRIBUTE } from '../system/tokens/appPalette'
import { THEME_ATTRIBUTE } from '../system/tokens/readToken'
import {
  GalleryAppearanceProvider,
  StoryTheme,
  bothSchemesGridStyle,
  pinDocumentAppearance,
  useSchemesToPaint,
  useStoryThemeAttributes,
} from './galleryAppearance'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE)
})

function ThemeProbe({ theme }: { readonly theme?: 'light' | 'dark' }) {
  const attributes = useStoryThemeAttributes(theme)
  const schemes = useSchemesToPaint()
  return (
    <div data-testid="probe" data-schemes={schemes.join(',')} {...attributes} />
  )
}

describe('useStoryThemeAttributes', () => {
  it('defaults a stage to light when the gallery is not pinning', () => {
    render(<ThemeProbe />)

    const probe = document.querySelector('[data-testid="probe"]')
    expect(probe?.getAttribute('data-theme')).toBe('light')
    expect(probe?.getAttribute('data-palette')).toBeNull()
  })

  it('keeps an explicit dark stage when the gallery is not pinning', () => {
    render(<ThemeProbe theme="dark" />)

    expect(
      document
        .querySelector('[data-testid="probe"]')
        ?.getAttribute('data-theme'),
    ).toBe('dark')
  })

  it('follows the gallery scheme and palette, even over an explicit theme', () => {
    render(
      <GalleryAppearanceProvider
        appearance={{ scheme: 'dark', palette: 'green' }}
      >
        <ThemeProbe theme="light" />
      </GalleryAppearanceProvider>,
    )

    const probe = document.querySelector('[data-testid="probe"]')
    expect(probe?.getAttribute('data-theme')).toBe('dark')
    expect(probe?.getAttribute('data-palette')).toBe('green')
  })
})

describe('useSchemesToPaint', () => {
  it('paints both schemes outside the gallery', () => {
    render(<ThemeProbe />)

    expect(
      document
        .querySelector('[data-testid="probe"]')
        ?.getAttribute('data-schemes'),
    ).toBe('light,dark')
  })

  it('paints only the gallery scheme when one is pinned', () => {
    render(
      <GalleryAppearanceProvider
        appearance={{ scheme: 'dark', palette: 'orange' }}
      >
        <ThemeProbe />
      </GalleryAppearanceProvider>,
    )

    expect(
      document
        .querySelector('[data-testid="probe"]')
        ?.getAttribute('data-schemes'),
    ).toBe('dark')
  })

  it('collapses the both-schemes grid to one column when pinned', () => {
    expect(bothSchemesGridStyle(2).gridTemplateColumns).toBe('1fr 1fr')
    expect(bothSchemesGridStyle(1).gridTemplateColumns).toBe('1fr')
  })
})

describe('StoryTheme', () => {
  it('forwards the gallery palette onto the subtree', () => {
    render(
      <GalleryAppearanceProvider
        appearance={{ scheme: 'light', palette: 'red' }}
      >
        <StoryTheme>swatch</StoryTheme>
      </GalleryAppearanceProvider>,
    )

    const node = document.querySelector('[data-palette="red"]')
    expect(node?.getAttribute('data-theme')).toBe('light')
    expect(node?.textContent).toBe('swatch')
  })
})

describe('pinDocumentAppearance', () => {
  it('writes scheme and palette onto the document', () => {
    pinDocumentAppearance({ scheme: 'dark', palette: 'green' })

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe(
      'green',
    )
  })

  it('restores the previous attributes when the pin is released', () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'light')
    document.documentElement.setAttribute(PALETTE_ATTRIBUTE, 'purple')

    const restore = pinDocumentAppearance({
      scheme: 'dark',
      palette: 'red',
    })
    restore()

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe(
      'purple',
    )
  })

  it('hands the scheme back to the OS when nothing was pinned before', () => {
    const restore = pinDocumentAppearance({
      scheme: 'dark',
      palette: 'orange',
    })
    restore()

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false)
  })
})
