/**
 * Where a Storybook title comes from, and how to use what it names.
 *
 * One Kro gallery. HIG, Fluent 2, Material and Primer are provenance on
 * the catalog's also-known-as column — they are not sidebar groups.
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
      'A named configuration of an existing export. Same component, extra use-cases — do not duplicate.',
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
      'Endeavor-kit composition. Product UI built from primitives, not a catalog title.',
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

/** Radix-backed building blocks that live in the Kro groups, not a kit group. */
const PRIMITIVE_TITLES: ReadonlySet<string> = new Set([
  'Actions/Button',
  'Forms/Input',
  'Navigation/Tabs',
  'Surfaces/Dialog',
  'Surfaces/Sheet',
  'Surfaces/Popover',
  'Surfaces/Menu',
])

const PRIMITIVE_IDS: ReadonlySet<string> = new Set([
  'actions-button',
  'forms-input',
  'navigation-tabs',
  'surfaces-dialog',
  'surfaces-sheet',
  'surfaces-popover',
  'surfaces-menu',
])

export function kindFromStoryTitle(title: string): StoryKind {
  if (title === 'Overview' || title.startsWith('Overview/')) return 'catalog'
  if (title === 'Tokens' || title.startsWith('Tokens/')) return 'token'
  if (title === 'Materials/OnGradient') return 'modifier'
  if (title.startsWith('Materials/')) return 'material'
  if (title.startsWith('Chrome/')) return 'chrome'
  if (title.startsWith('Endeavor/')) return 'domain'
  if (PRIMITIVE_TITLES.has(title)) return 'primitive'
  return 'component'
}

/**
 * Storybook sidebar ids are kebab-case title paths (`actions-button`).
 * Stories append `--story-name`.
 */
export function kindFromStorybookId(id: string): StoryKind {
  const path = id.split('--')[0] ?? id
  if (path === 'overview') return 'catalog'
  if (path === 'tokens' || path.startsWith('tokens-')) return 'token'
  if (path === 'materials-ongradient') return 'modifier'
  if (path.startsWith('materials-')) return 'material'
  if (path.startsWith('chrome-')) return 'chrome'
  if (path.startsWith('endeavor-')) return 'domain'
  if (PRIMITIVE_IDS.has(path)) return 'primitive'
  return kindFromStoryTitle(storyTitleFromId(path))
}

export function storyTitleFromId(path: string): string {
  const mapped: Record<string, string> = {
    overview: 'Overview',
    tokens: 'Tokens',
    'materials-kroglass': 'Materials/KroGlass',
    'materials-gradientbackdrop': 'Materials/GradientBackdrop',
    'materials-detailbackdrop': 'Materials/DetailBackdrop',
    'materials-ongradient': 'Materials/OnGradient',
    'actions-button': 'Actions/Button',
    'actions-compound-button': 'Actions/Compound button',
    'actions-link': 'Actions/Link',
    'actions-pull-down-button': 'Actions/Pull-down button',
    'actions-pop-up-button': 'Actions/Pop-up button',
    'actions-split-button': 'Actions/Split button',
    'actions-toggle-button': 'Actions/Toggle button',
    'forms-input': 'Forms/Input',
    'forms-toggle': 'Forms/Toggle',
    'navigation-tabs': 'Navigation/Tabs',
    'surfaces-dialog': 'Surfaces/Dialog',
    'surfaces-sheet': 'Surfaces/Sheet',
    'surfaces-popover': 'Surfaces/Popover',
    'surfaces-menu': 'Surfaces/Menu',
    'chrome-liquidglassfab': 'Chrome/LiquidGlassFAB',
    'endeavor-endeavorcard': 'Endeavor/EndeavorCard',
  }
  if (mapped[path] !== undefined) return mapped[path]
  const groups: readonly [string, string][] = [
    ['materials-', 'Materials/'],
    ['actions-', 'Actions/'],
    ['content-', 'Content/'],
    ['forms-', 'Forms/'],
    ['layout-', 'Layout/'],
    ['navigation-', 'Navigation/'],
    ['surfaces-', 'Surfaces/'],
    ['status-', 'Status/'],
    ['chrome-', 'Chrome/'],
    ['endeavor-', 'Endeavor/'],
  ]
  for (const [prefix, group] of groups) {
    if (path.startsWith(prefix)) {
      return `${group}${humanizeSegment(path.slice(prefix.length))}`
    }
  }
  return path
}

function humanizeSegment(segment: string): string {
  const specials: Record<string, string> = {
    kroglass: 'KroGlass',
    liquidglassfab: 'LiquidGlassFAB',
    liquidglassfabmenu: 'LiquidGlassFABMenu',
    activetoast: 'ActiveToast',
    durationdial: 'DurationDial',
    activityrings: 'ActivityRings',
    emojipicker: 'EmojiPicker',
    rotatingglow: 'RotatingGlow',
    cardbadge: 'CardBadge',
    krochip: 'KroChip',
    endeavorcard: 'EndeavorCard',
    endeavorrow: 'EndeavorRow',
    taskrow: 'TaskRow',
  }
  if (specials[segment] !== undefined) return specials[segment]
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
