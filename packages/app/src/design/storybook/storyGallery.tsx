import type { ReactNode } from 'react'

/**
 * Stacks every variant, density and scheme of one design-kit title on a
 * single canvas. Storybook and the in-app catalog each list one row per
 * title; this is the page that row opens.
 */
export function StoryGallery({ children }: { readonly children: ReactNode }) {
  return (
    <div
      data-slot="story-gallery"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--kro-space-large)',
      }}
    >
      {children}
    </div>
  )
}
