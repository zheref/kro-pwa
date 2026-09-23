import type { Decorator, Preview } from '@storybook/nextjs'
import { useEffect } from 'react'
import '../src/app/globals.css'
import {
  GalleryAppearanceProvider,
  PinDocumentAppearance,
} from '../../../packages/app/src/design/storybook/galleryAppearance'
import { StoryKindBadge } from '../../../packages/app/src/design/storybook/StoryKindBadge'
import {
  STORY_KINDS,
  kindFromStoryTitle,
  type StoryKind,
} from '../../../packages/app/src/design/storybook/storyKind'
import { appPaletteNamed } from '../../../packages/app/src/design/system/tokens/appPalette'

/**
 * Global story configuration.
 *
 * The stylesheet import is the whole point of this file: it pulls in
 * Tailwind and the Kro design system, so a story renders against exactly
 * the stylesheet the app ships.
 *
 * The kind banner is the other: HIG titles, primitives, materials and
 * tokens share a sidebar, and a badge is how a reviewer tells them apart.
 *
 * Scheme, Theme and Idiom live on the Storybook toolbar so every preview
 * on the canvas follows the same pick. `PinDocumentAppearance` writes
 * scheme and palette on `<html>` so Radix portals inherit them.
 * `PinButtonIdiom` does the same for `data-kro-idiom`: default buttons
 * use the menu-row corner on Desktop and a pill on Mobile.
 */

function KindBanner({
  kind,
  title,
}: {
  readonly kind: StoryKind
  readonly title: string
}) {
  const spec = STORY_KINDS[kind]
  return (
    <aside
      data-slot="story-kind-banner"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        marginBottom: 8,
        borderBottom: '1px solid var(--kro-color-hairline)',
        background: 'var(--kro-color-back-inner)',
        color: 'var(--kro-color-fore)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <StoryKindBadge kind={kind} />
      <span style={{ fontSize: 12, color: 'var(--kro-color-fore-secondary)' }}>
        {title}
      </span>
      <span style={{ fontSize: 12, flex: '1 1 16rem' }}>{spec.useAs}</span>
    </aside>
  )
}

function PinButtonIdiom({ idiom }: { readonly idiom: 'desktop' | 'mobile' }) {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-kro-idiom')
    root.setAttribute('data-kro-idiom', idiom)
    return () => {
      if (root.getAttribute('data-kro-idiom') !== idiom) return
      if (previous === null) root.removeAttribute('data-kro-idiom')
      else root.setAttribute('data-kro-idiom', previous)
    }
  }, [idiom])
  return null
}

const withAppearance: Decorator = (Story, context) => {
  const kind =
    (context.parameters.kro?.kind as StoryKind | undefined) ??
    kindFromStoryTitle(context.title)
  const scheme = context.globals.kroScheme === 'dark' ? 'dark' : 'light'
  const palette = appPaletteNamed(
    typeof context.globals.kroPalette === 'string'
      ? context.globals.kroPalette
      : undefined,
  )
  const idiom = context.globals.kroIdiom === 'mobile' ? 'mobile' : 'desktop'
  return (
    <GalleryAppearanceProvider appearance={{ scheme, palette }}>
      <PinDocumentAppearance appearance={{ scheme, palette }} />
      <PinButtonIdiom idiom={idiom} />
      <div
        data-theme={scheme}
        data-palette={palette}
        data-kro-idiom={idiom}
        style={{ minHeight: '100%' }}
      >
        <KindBanner kind={kind} title={context.title} />
        <Story />
      </div>
    </GalleryAppearanceProvider>
  )
}

const preview: Preview = {
  decorators: [withAppearance],
  globalTypes: {
    kroScheme: {
      description: 'Color scheme',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    kroPalette: {
      description: 'Appearance theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'purple', title: 'Purple' },
          { value: 'green', title: 'Green' },
          { value: 'orange', title: 'Orange' },
          { value: 'red', title: 'Red' },
        ],
        dynamicTitle: true,
      },
    },
    kroIdiom: {
      description: 'Button corner: menu-row on desktop, pill on mobile',
      toolbar: {
        title: 'Idiom',
        icon: 'mobile',
        items: [
          { value: 'desktop', title: 'Desktop' },
          { value: 'mobile', title: 'Mobile' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    kroScheme: 'light',
    kroPalette: 'purple',
    kroIdiom: 'desktop',
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
