import { STORY_KIND_BADGE_CSS, STORY_KINDS, type StoryKind } from './storyKind'

export function StoryKindBadge({ kind }: { readonly kind: StoryKind }) {
  const spec = STORY_KINDS[kind]
  const paint = STORY_KIND_BADGE_CSS[kind]
  return (
    <span
      data-slot="story-kind-badge"
      data-kind={kind}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        borderRadius: 999,
        padding: '1px 6px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        background: paint.background,
        color: paint.color,
      }}
    >
      {spec.badge}
    </span>
  )
}
