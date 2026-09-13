'use client'

/**
 * Scheme (light / dark) and the four appearance palettes, for the
 * Storybook gallery header. Props in, intent out — the Page owns the
 * values (`RC-14`).
 */
import { OnGradient } from '../system/gradient/OnGradient'
import { Tabs, TabsList, TabsTrigger } from '../system/primitives/tabs'
import {
  APP_PALETTE_IDS,
  APP_PALETTES,
  type AppPaletteId,
} from '../system/tokens/appPalette'
import { cn } from '../system/utils/cn'
import type { GalleryAppearance, GalleryScheme } from './galleryAppearance'

export interface GalleryAppearanceToolbarProps extends GalleryAppearance {
  readonly onSelectScheme: (scheme: GalleryScheme) => void
  readonly onSelectPalette: (palette: AppPaletteId) => void
}

export function GalleryAppearanceToolbar({
  scheme,
  palette,
  onSelectScheme,
  onSelectPalette,
}: GalleryAppearanceToolbarProps) {
  return (
    <div
      data-testid="design-system-appearance"
      className="flex flex-wrap items-center gap-x-kro-medium gap-y-kro-small"
    >
      <div className="flex items-center gap-kro-small">
        <OnGradient
          as="span"
          id="gallery-scheme-label"
          className="text-[11px] font-semibold uppercase tracking-wide"
        >
          Scheme
        </OnGradient>
        <Tabs
          value={scheme}
          onValueChange={(value) => {
            if (value === 'light' || value === 'dark') onSelectScheme(value)
          }}
        >
          <TabsList aria-labelledby="gallery-scheme-label">
            <TabsTrigger value="light">Light</TabsTrigger>
            <TabsTrigger value="dark">Dark</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-kro-small">
        <OnGradient
          as="span"
          id="gallery-theme-label"
          className="text-[11px] font-semibold uppercase tracking-wide"
        >
          Theme
        </OnGradient>
        <div
          role="radiogroup"
          aria-labelledby="gallery-theme-label"
          className="flex items-center gap-kro-tiny"
        >
          {APP_PALETTE_IDS.map((id) => {
            const spec = APP_PALETTES[id]
            const isSelected = palette === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={spec.label}
                onClick={() => onSelectPalette(id)}
                className={cn(
                  'size-6 shrink-0 overflow-hidden rounded-kro-small',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  backgroundImage: `linear-gradient(135deg, ${spec.light.start}, ${spec.light.end})`,
                  boxShadow: isSelected
                    ? '0 0 0 2px var(--kro-color-absolute), 0 0 0 3px var(--kro-color-snow)'
                    : 'inset 0 0 0 1px rgb(255 255 255 / 0.45)',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
