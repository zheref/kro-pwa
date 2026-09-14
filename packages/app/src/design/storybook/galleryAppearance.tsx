'use client'

/**
 * The appearance the in-app Storybook gallery (and the Storybook canvas)
 * is currently showing.
 *
 * Stages pin `data-theme` so a snapshot can still paint light and dark
 * side by side. When this provider is present, those stages follow the
 * gallery pick instead — every preview on the page moves together, and
 * dark palettes apply because `[data-theme="dark"][data-palette]` has
 * to land on the same element as the scheme.
 */
import {
  createContext,
  useContext,
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import {
  DEFAULT_APP_PALETTE,
  PALETTE_ATTRIBUTE,
  type AppPaletteId,
} from '../system/tokens/appPalette'
import {
  THEME_ATTRIBUTE,
  setPalettePreference,
  setThemePreference,
} from '../system/tokens/readToken'

export type GalleryScheme = 'light' | 'dark'

export interface GalleryAppearance {
  readonly scheme: GalleryScheme
  readonly palette: AppPaletteId
}

const GalleryAppearanceContext = createContext<GalleryAppearance | null>(null)

export function GalleryAppearanceProvider({
  appearance,
  children,
}: {
  readonly appearance: GalleryAppearance
  readonly children: ReactNode
}) {
  return (
    <GalleryAppearanceContext.Provider value={appearance}>
      {children}
    </GalleryAppearanceContext.Provider>
  )
}

export function useGalleryAppearance(): GalleryAppearance | null {
  return useContext(GalleryAppearanceContext)
}

/** Light and dark, unless the gallery is pinning one scheme. */
export function useSchemesToPaint(): readonly GalleryScheme[] {
  const gallery = useGalleryAppearance()
  return gallery === null ? ['light', 'dark'] : [gallery.scheme]
}

export function bothSchemesGridStyle(count: number): {
  readonly display: 'grid'
  readonly gridTemplateColumns: '1fr' | '1fr 1fr'
} {
  return {
    display: 'grid',
    gridTemplateColumns: count === 1 ? '1fr' : '1fr 1fr',
  }
}

export function useStoryThemeAttributes(theme?: GalleryScheme): {
  readonly 'data-theme': GalleryScheme
  readonly 'data-palette'?: AppPaletteId
} {
  const gallery = useGalleryAppearance()
  if (gallery !== null) {
    return {
      'data-theme': gallery.scheme,
      'data-palette': gallery.palette,
    }
  }
  return { 'data-theme': theme ?? 'light' }
}

/** A themed subtree for story files that do not share HigStage. */
export function StoryTheme({
  theme,
  children,
  ...rest
}: ComponentPropsWithoutRef<'div'> & {
  readonly theme?: GalleryScheme
}) {
  const appearance = useStoryThemeAttributes(theme)
  return (
    <div {...appearance} {...rest}>
      {children}
    </div>
  )
}

/**
 * Pins the document so portaled dialogs and the shell follow the gallery.
 * Restores whatever was on the root when the effect cleaned up.
 */
export function PinDocumentAppearance({
  appearance,
}: {
  readonly appearance: GalleryAppearance
}) {
  const { scheme, palette } = appearance
  useEffect(() => pinDocumentAppearance({ scheme, palette }), [scheme, palette])
  return null
}

export function pinDocumentAppearance(
  appearance: GalleryAppearance,
): () => void {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const previousTheme = root.getAttribute(THEME_ATTRIBUTE)
  const previousPalette = root.getAttribute(PALETTE_ATTRIBUTE)
  setThemePreference(appearance.scheme)
  setPalettePreference(appearance.palette)
  return () => {
    if (previousTheme === 'light' || previousTheme === 'dark') {
      setThemePreference(previousTheme)
    } else {
      setThemePreference('system')
    }
    if (previousPalette === null) {
      root.removeAttribute(PALETTE_ATTRIBUTE)
    } else {
      setPalettePreference(previousPalette)
    }
  }
}

export const DEFAULT_GALLERY_APPEARANCE: GalleryAppearance = {
  scheme: 'light',
  palette: DEFAULT_APP_PALETTE,
}
