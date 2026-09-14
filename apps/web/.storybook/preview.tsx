import type { Decorator, Preview } from '@storybook/nextjs'
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
 * Scheme and Theme live on the Storybook toolbar so every preview on the
 * canvas follows the same pick the in-app `/storybook` page offers.
 * `PinDocumentAppearance` writes them on `<html>` so Radix portals
 * (menus, dialogs) inherit the pick; stages already follow the provider.
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
  return (
    <GalleryAppearanceProvider appearance={{ scheme, palette }}>
      <PinDocumentAppearance appearance={{ scheme, palette }} />
      <div
        data-theme={scheme}
        data-palette={palette}
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
  },
  initialGlobals: {
    kroScheme: 'light',
    kroPalette: 'purple',
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
