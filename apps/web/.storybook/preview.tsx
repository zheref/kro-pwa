import type { Decorator, Preview } from '@storybook/nextjs'
import '../src/app/globals.css'
import { StoryKindBadge } from '../../../packages/app/src/design/storybook/StoryKindBadge'
import {
  STORY_KINDS,
  kindFromStoryTitle,
  type StoryKind,
} from '../../../packages/app/src/design/storybook/storyKind'

/**
 * Global story configuration.
 *
 * The stylesheet import is the whole point of this file: it pulls in
 * Tailwind and the Kro design system, so a story renders against exactly
 * the stylesheet the app ships.
 *
 * The kind banner is the other: HIG titles, primitives, materials and
 * tokens share a sidebar, and a badge is how a reviewer tells them apart.
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

const withKindBanner: Decorator = (Story, context) => {
  const kind =
    (context.parameters.kro?.kind as StoryKind | undefined) ??
    kindFromStoryTitle(context.title)
  return (
    <>
      <KindBanner kind={kind} title={context.title} />
      <Story />
    </>
  )
}

const preview: Preview = {
  decorators: [withKindBanner],
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
