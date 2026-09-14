import { createElement } from 'react'
import { addons } from 'storybook/manager-api'
import {
  STORY_KIND_BADGE_PAINT,
  storyKindBadgeForItem,
} from '../../../packages/app/src/design/storybook/storyKind'
import './manager.css'

/**
 * Sidebar badges sit on the trailing edge of each leaf. Folders stay
 * unlabelled. Showcase galleries hide the addon panel — a stacked page
 * of variants has nothing useful in Controls.
 */
addons.setConfig({
  layoutCustomisations: {
    showPanel(state, defaultValue) {
      const tags = state.index?.[state.storyId]?.tags ?? []
      if (tags.includes('showcase')) return false
      return defaultValue
    },
  },
  sidebar: {
    filters: {
      /**
       * Design-kit titles each ship one Gallery story. Hide that leaf so
       * the sidebar row is the component/modifier/style itself.
       *
       * Storybook keeps an item when the predicate returns true
       * (`Array.filter`). Folders stay; `--gallery` leaves go.
       */
      hideGalleries: (item) => {
        if (item.type !== 'story') return true
        return !item.id.endsWith('--gallery')
      },
    },
    renderLabel: (item) => {
      const spec = storyKindBadgeForItem(item)
      if (spec === null) return item.name
      const paint = STORY_KIND_BADGE_PAINT[spec.kind]
      return createElement(
        'span',
        { className: 'kro-sb-row' },
        createElement('span', { className: 'kro-sb-name' }, item.name),
        createElement(
          'span',
          {
            className: 'kro-sb-badge',
            style: {
              background: paint.background,
              color: paint.color,
            },
          },
          spec.badge,
        ),
      )
    },
  },
})
