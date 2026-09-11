/**
 * Where a Storybook title comes from, and how to use what it names.
 *
 * The gallery mixes HIG components, Kro primitives, materials, tokens and
 * HIG restages of an existing export. The sidebar title is the HIG or kit
 * name; the kind is how to treat it.
 */

export const STORY_KINDS = {
  component: {
    badge: 'Component',
    useAs:
      'Import from `@kro/app/design` and render. Props in, pixels out — not a style.',
  },
  primitive: {
    badge: 'Primitive',
    useAs:
      'Radix-backed building block. Compose it; paint only with KroTokens / KroGlass.',
  },
  material: {
    badge: 'Material',
    useAs:
      'A surface recipe (KroGlass, gradient). Apply via class or `GlassSurface` — not a control.',
  },
  token: {
    badge: 'Token',
    useAs:
      'A CSS custom property. Not a component — reference `var(--kro-…)` or a utility.',
  },
  modifier: {
    badge: 'Modifier',
    useAs:
      'A density, tone or class recipe that changes an existing control. Not a standalone export.',
  },
  pattern: {
    badge: 'Pattern',
    useAs:
      'HIG configurations of an existing Kro export. Same component, HIG use-cases — do not duplicate.',
  },
  catalog: {
    badge: 'Catalog',
    useAs: 'An index of titles. Not a component — use it to find the export.',
  },
  chrome: {
    badge: 'Chrome',
    useAs:
      'Shell chrome (FAB, toast, dial). App-frame only — not a form control.',
  },
  domain: {
    badge: 'Domain',
    useAs:
      'Endeavor-kit composition. Product UI built from primitives, not a HIG title.',
  },
} as const

export type StoryKind = keyof typeof STORY_KINDS

/**
 * Canvas / in-app badge paint. Storybook's manager chrome does not load
 * KroTokens, so the manager uses `STORY_KIND_BADGE_PAINT` instead.
 */
export const STORY_KIND_BADGE_CSS: Record<
  StoryKind,
  { readonly background: string; readonly color: string }
> = {
  component: {
    background: 'var(--kro-color-accent)',
    color: 'var(--kro-color-on-accent)',
  },
  primitive: {
    background: 'var(--kro-color-cozy-blue)',
    color: 'var(--kro-color-on-accent)',
  },
  material: {
    background: 'var(--kro-color-celeste)',
    color: 'var(--kro-color-charcoal)',
  },
  token: {
    background: 'var(--kro-color-mist)',
    color: 'var(--kro-color-charcoal)',
  },
  modifier: {
    background: 'var(--kro-color-payne-gray)',
    color: 'var(--kro-color-absolute)',
  },
  pattern: {
    background: 'var(--kro-color-melon)',
    color: 'var(--kro-color-charcoal)',
  },
  catalog: {
    background: 'var(--kro-color-athens-gray)',
    color: 'var(--kro-color-charcoal)',
  },
  chrome: {
    background: 'var(--kro-color-header-gradient-indigo)',
    color: 'var(--kro-color-on-accent)',
  },
  domain: {
    background: 'var(--kro-color-kro)',
    color: 'var(--kro-color-on-accent)',
  },
}

/** Manager-sidebar paint — hex, because that iframe has no KroTokens. */
export const STORY_KIND_BADGE_PAINT: Record<
  StoryKind,
  { readonly background: string; readonly color: string }
> = {
  component: { background: '#5856d6', color: '#ffffff' },
  primitive: { background: '#32ade6', color: '#ffffff' },
  material: { background: '#64d2ff', color: '#1c1c1e' },
  token: { background: '#e5e5ea', color: '#1c1c1e' },
  modifier: { background: '#636366', color: '#ffffff' },
  pattern: { background: '#ff9f0a', color: '#1c1c1e' },
  catalog: { background: '#d1d1d6', color: '#1c1c1e' },
  chrome: { background: '#5e5ce6', color: '#ffffff' },
  domain: { background: '#af52de', color: '#ffffff' },
}

/** HIG titles that restage an existing Kro export rather than a new control. */
const HIG_PATTERN_TITLES: ReadonlySet<string> = new Set([
  'HIG/Actions/Buttons',
  'HIG/Actions/Context menus',
  'HIG/Actions/Menus',
  'HIG/Presentation/Sheets',
  'HIG/Presentation/Popovers',
  'HIG/Selection and input/Segmented controls',
  'HIG/Selection and input/Text fields',
  'HIG/Layout and organization/Tab views',
  'HIG/Navigation and search/Token views',
  'HIG/Status/Activity rings',
])

export function kindFromStoryTitle(title: string): StoryKind {
  if (title === 'HIG/Overview' || title.startsWith('HIG/Overview/')) {
    return 'catalog'
  }
  if (HIG_PATTERN_TITLES.has(title) || title.startsWith('HIG/existing/')) {
    return 'pattern'
  }
  if (title.startsWith('HIG/')) return 'component'
  if (title.startsWith('Design system/Primitives/')) return 'primitive'
  if (title.startsWith('Design system/OnGradient')) return 'modifier'
  if (
    title === 'Design system/KroGlass' ||
    title.startsWith('Design system/Gradient') ||
    title.startsWith('Design system/DetailBackdrop')
  ) {
    return 'material'
  }
  if (title.startsWith('Design system/Tokens')) return 'token'
  if (title.startsWith('Design system/Chrome/')) return 'chrome'
  if (title.startsWith('Endeavor/')) return 'domain'
  return 'component'
}

/**
 * Storybook sidebar ids are kebab-case title paths (`hig-actions-buttons`).
 * Stories append `--story-name`.
 */
export function kindFromStorybookId(id: string): StoryKind {
  const path = id.split('--')[0] ?? id
  const title = storyTitleFromId(path)
  return kindFromStoryTitle(title)
}

export function storyTitleFromId(path: string): string {
  const mapped: Record<string, string> = {
    'hig-overview': 'HIG/Overview',
    'hig-actions-buttons': 'HIG/Actions/Buttons',
    'hig-actions-context-menus': 'HIG/Actions/Context menus',
    'hig-actions-menus': 'HIG/Actions/Menus',
    'hig-actions-pop-up-buttons': 'HIG/Actions/Pop-up buttons',
    'hig-actions-pull-down-buttons': 'HIG/Actions/Pull-down buttons',
    'hig-presentation-sheets': 'HIG/Presentation/Sheets',
    'hig-presentation-popovers': 'HIG/Presentation/Popovers',
    'hig-presentation-alerts': 'HIG/Presentation/Alerts',
    'hig-presentation-action-sheets': 'HIG/Presentation/Action sheets',
    'hig-presentation-panels': 'HIG/Presentation/Panels',
    'hig-presentation-scroll-views': 'HIG/Presentation/Scroll views',
    'hig-selection-and-input-segmented-controls':
      'HIG/Selection and input/Segmented controls',
    'hig-selection-and-input-text-fields':
      'HIG/Selection and input/Text fields',
    'hig-selection-and-input-toggles': 'HIG/Selection and input/Toggles',
    'hig-selection-and-input-checkboxes': 'HIG/Selection and input/Checkboxes',
    'hig-selection-and-input-radio-buttons':
      'HIG/Selection and input/Radio buttons',
    'hig-selection-and-input-sliders': 'HIG/Selection and input/Sliders',
    'hig-selection-and-input-steppers': 'HIG/Selection and input/Steppers',
    'hig-selection-and-input-pickers': 'HIG/Selection and input/Pickers',
    'hig-selection-and-input-combo-boxes':
      'HIG/Selection and input/Combo boxes',
    'hig-selection-and-input-color-wells':
      'HIG/Selection and input/Color wells',
    'hig-selection-and-input-digit-entry-views':
      'HIG/Selection and input/Digit entry views',
    'hig-layout-and-organization-tab-views':
      'HIG/Layout and organization/Tab views',
    'hig-layout-and-organization-lists-and-tables':
      'HIG/Layout and organization/Lists and tables',
    'hig-layout-and-organization-labels': 'HIG/Layout and organization/Labels',
    'hig-layout-and-organization-boxes': 'HIG/Layout and organization/Boxes',
    'hig-layout-and-organization-collections':
      'HIG/Layout and organization/Collections',
    'hig-layout-and-organization-column-views':
      'HIG/Layout and organization/Column views',
    'hig-layout-and-organization-disclosure-controls':
      'HIG/Layout and organization/Disclosure controls',
    'hig-layout-and-organization-lockups':
      'HIG/Layout and organization/Lockups',
    'hig-layout-and-organization-outline-views':
      'HIG/Layout and organization/Outline views',
    'hig-layout-and-organization-split-views':
      'HIG/Layout and organization/Split views',
    'hig-layout-and-organization-separators':
      'HIG/Layout and organization/Separators',
    'hig-navigation-and-search-token-views':
      'HIG/Navigation and search/Token views',
    'hig-navigation-and-search-navigation-bars':
      'HIG/Navigation and search/Navigation bars',
    'hig-navigation-and-search-path-controls':
      'HIG/Navigation and search/Path controls',
    'hig-navigation-and-search-search-fields':
      'HIG/Navigation and search/Search fields',
    'hig-navigation-and-search-sidebars': 'HIG/Navigation and search/Sidebars',
    'hig-navigation-and-search-tab-bars': 'HIG/Navigation and search/Tab bars',
    'hig-navigation-and-search-toolbars': 'HIG/Navigation and search/Toolbars',
    'hig-status-activity-rings': 'HIG/Status/Activity rings',
    'hig-status-gauges': 'HIG/Status/Gauges',
    'hig-status-progress-indicators': 'HIG/Status/Progress indicators',
    'hig-status-rating-indicators': 'HIG/Status/Rating indicators',
    'hig-content-charts': 'HIG/Content/Charts',
    'hig-content-image-views': 'HIG/Content/Image views',
    'hig-content-text-views': 'HIG/Content/Text views',
    'hig-content-web-views': 'HIG/Content/Web views',
    'design-system-primitives-button': 'Design system/Primitives/Button',
    'design-system-primitives-input': 'Design system/Primitives/Input',
    'design-system-primitives-tabs': 'Design system/Primitives/Tabs',
    'design-system-primitives-dialog': 'Design system/Primitives/Dialog',
    'design-system-primitives-sheet': 'Design system/Primitives/Sheet',
    'design-system-primitives-popover': 'Design system/Primitives/Popover',
    'design-system-primitives-dropdownmenu':
      'Design system/Primitives/DropdownMenu',
    'design-system-kroglass': 'Design system/KroGlass',
    'design-system-tokens': 'Design system/Tokens',
    'design-system-gradientbackdrop': 'Design system/GradientBackdrop',
    'design-system-detailbackdrop': 'Design system/DetailBackdrop',
    'design-system-ongradient': 'Design system/OnGradient',
    'design-system-chrome-liquidglassfab':
      'Design system/Chrome/LiquidGlassFAB',
    'design-system-chrome-liquidglassfabmenu':
      'Design system/Chrome/LiquidGlassFABMenu',
    'design-system-chrome-emojipicker': 'Design system/Chrome/EmojiPicker',
    'design-system-chrome-durationdial': 'Design system/Chrome/DurationDial',
    'design-system-chrome-activityrings': 'Design system/Chrome/ActivityRings',
    'design-system-chrome-activetoast': 'Design system/Chrome/ActiveToast',
    'design-system-chrome-rotatingglow': 'Design system/Chrome/RotatingGlow',
    'endeavor-cardbadge': 'Endeavor/CardBadge',
    'endeavor-krochip': 'Endeavor/KroChip',
    'endeavor-endeavorcard': 'Endeavor/EndeavorCard',
    'endeavor-endeavorrow': 'Endeavor/EndeavorRow',
    'endeavor-taskrow': 'Endeavor/TaskRow',
    'endeavor-empty-states': 'Endeavor/Empty states',
    'endeavor-popovers': 'Endeavor/Popovers',
  }
  if (mapped[path] !== undefined) return mapped[path]
  if (path.startsWith('hig-')) return `HIG/${path.slice(4)}`
  if (path.startsWith('design-system-primitives-')) {
    return `Design system/Primitives/${path.slice('design-system-primitives-'.length)}`
  }
  if (path.startsWith('design-system-chrome-')) {
    return `Design system/Chrome/${path.slice('design-system-chrome-'.length)}`
  }
  if (path.startsWith('design-system-')) {
    return `Design system/${path.slice('design-system-'.length)}`
  }
  if (path.startsWith('endeavor-')) return `Endeavor/${path.slice(9)}`
  return path
}

export function storyKindMeta(kind: StoryKind): {
  tags: string[]
  parameters: { kro: { kind: StoryKind; badge: string; useAs: string } }
} {
  const spec = STORY_KINDS[kind]
  return {
    tags: [`kro-${kind}`],
    parameters: {
      kro: { kind, badge: spec.badge, useAs: spec.useAs },
    },
  }
}

/**
 * Folders stay unbadged. Leaves — a component row, or a flattened
 * singleton story — carry the kind so the trailing badge has something
 * to say.
 */
export function storyKindBadgeForItem(item: {
  readonly type: string
  readonly id: string
}): { readonly kind: StoryKind; readonly badge: string } | null {
  if (item.type !== 'story' && item.type !== 'component') return null
  const kind = kindFromStorybookId(item.id)
  return { kind, badge: STORY_KINDS[kind].badge }
}
