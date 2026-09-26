/**
 * The Apple HIG component catalog, as Kro Web realises it.
 *
 * Titles, categories and purposes come from Apple's Components index
 * (https://developer.apple.com/design/human-interface-guidelines/components).
 * Visual language does NOT: every realised control paints with KroTokens,
 * KroGlass and the indigoGrape field, never Apple's default tints.
 *
 * `availability` is the contract the Storybook gallery and the export barrel
 * both read. A title marked `out-of-scope` is still listed so the gallery is
 * complete, with the reason a web PWA cannot honour that platform chrome.
 */

export const HIG_COMPONENTS_INDEX =
  'https://developer.apple.com/design/human-interface-guidelines/components'

export type HigCategory =
  | 'Actions'
  | 'Content'
  | 'Layout and organization'
  | 'Navigation and search'
  | 'Presentation'
  | 'Selection and input'
  | 'Status'

export type HigAvailability = 'implemented' | 'existing' | 'out-of-scope'

export interface HigCatalogEntry {
  readonly title: string
  readonly slug: string
  readonly category: HigCategory
  readonly applePath: string
  readonly purpose: string
  readonly availability: HigAvailability
  /** The Kro export that realises this title, when we have one. */
  readonly kroName?: string
  readonly outOfScopeReason?: string
}

function apple(path: string): string {
  return `https://developer.apple.com/design/human-interface-guidelines/${path}`
}

export const HIG_CATALOG: readonly HigCatalogEntry[] = [
  // —— Actions ————————————————————————————————————————————————
  {
    title: 'Buttons',
    slug: 'buttons',
    category: 'Actions',
    applePath: 'buttons',
    purpose:
      'Trigger an action. One primary per surface; destructive named in words, not colour alone.',
    availability: 'existing',
    kroName: 'Button',
  },
  {
    title: 'Context menus',
    slug: 'context-menus',
    category: 'Actions',
    applePath: 'context-menus',
    purpose:
      'Reveal a small set of actions for a specific item, on long-press or right-click.',
    availability: 'existing',
    kroName: 'DropdownMenu',
  },
  {
    title: 'Dock menus',
    slug: 'dock-menus',
    category: 'Actions',
    applePath: 'dock-menus',
    purpose: 'macOS Dock icon menus for an app that is already running.',
    availability: 'out-of-scope',
    outOfScopeReason: 'OS Dock chrome. A PWA has no Dock icon menu to own.',
  },
  {
    title: 'Edit menus',
    slug: 'edit-menus',
    category: 'Actions',
    applePath: 'edit-menus',
    purpose: 'System Cut / Copy / Paste / Undo around a text insertion point.',
    availability: 'out-of-scope',
    outOfScopeReason:
      'The browser owns the edit menu; a web app does not replace it.',
  },
  {
    title: 'Menus',
    slug: 'menus',
    category: 'Actions',
    applePath: 'menus',
    purpose: 'A list of commands and choices, grouped and keyboard-navigable.',
    availability: 'existing',
    kroName: 'DropdownMenu',
  },
  {
    title: 'The menu bar',
    slug: 'the-menu-bar',
    category: 'Actions',
    applePath: 'the-menu-bar',
    purpose: 'The always-available macOS command bar at the top of the screen.',
    availability: 'out-of-scope',
    outOfScopeReason:
      'OS menu bar. Web desktop uses a Toolbar inside the window instead.',
  },
  {
    title: 'Pop-up buttons',
    slug: 'pop-up-buttons',
    category: 'Actions',
    applePath: 'pop-up-buttons',
    purpose:
      'A button that displays the current choice and opens a menu of mutually exclusive options.',
    availability: 'implemented',
    kroName: 'PopupButton',
  },
  {
    title: 'Pull-down buttons',
    slug: 'pull-down-buttons',
    category: 'Actions',
    applePath: 'pull-down-buttons',
    purpose:
      'A button that opens a menu of actions. The button label does not change to the last action.',
    availability: 'implemented',
    kroName: 'PullDownButton',
  },

  // —— Content ————————————————————————————————————————————————
  {
    title: 'Charts',
    slug: 'charts',
    category: 'Content',
    applePath: 'charts',
    purpose:
      'Visualise a small set of values so a trend or comparison is readable at a glance.',
    availability: 'implemented',
    kroName: 'Chart',
  },
  {
    title: 'Image views',
    slug: 'image-views',
    category: 'Content',
    applePath: 'image-views',
    purpose:
      'Display a still image at a known aspect, with a caption or placeholder when empty.',
    availability: 'implemented',
    kroName: 'ImageView',
  },
  {
    title: 'Text views',
    slug: 'text-views',
    category: 'Content',
    applePath: 'text-views',
    purpose:
      'Edit or display multiline text, with the same recessed field surface as a one-line field.',
    availability: 'implemented',
    kroName: 'TextView',
  },
  {
    title: 'Web views',
    slug: 'web-views',
    category: 'Content',
    applePath: 'web-views',
    purpose:
      'Embed another document inside the app chrome without leaving the current surface.',
    availability: 'implemented',
    kroName: 'WebView',
  },

  // —— Layout and organization ——————————————————————————————
  {
    title: 'Boxes',
    slug: 'boxes',
    category: 'Layout and organization',
    applePath: 'boxes',
    purpose:
      'Group related content inside a rounded card, with an optional section title.',
    availability: 'implemented',
    kroName: 'GroupedBox',
  },
  {
    title: 'Collections',
    slug: 'collections',
    category: 'Layout and organization',
    applePath: 'collections',
    purpose:
      'A grid of equally sized cells for browsing many items of one kind.',
    availability: 'implemented',
    kroName: 'Collection',
  },
  {
    title: 'Column views',
    slug: 'column-views',
    category: 'Layout and organization',
    applePath: 'column-views',
    purpose:
      'Browse a hierarchy by revealing the next level in a column to the right.',
    availability: 'implemented',
    kroName: 'ColumnView',
  },
  {
    title: 'Disclosure controls',
    slug: 'disclosure-controls',
    category: 'Layout and organization',
    applePath: 'disclosure-controls',
    purpose:
      'Show or hide a related block of content without leaving the page.',
    availability: 'implemented',
    kroName: 'Disclosure',
  },
  {
    title: 'Labels',
    slug: 'labels',
    category: 'Layout and organization',
    applePath: 'labels',
    purpose:
      'Name a control or a value. Never the only way a colour-coded state is communicated.',
    availability: 'implemented',
    kroName: 'Label',
  },
  {
    title: 'Lists and tables',
    slug: 'lists-and-tables',
    category: 'Layout and organization',
    applePath: 'lists-and-tables',
    purpose:
      'Present rows of related data, grouped, with optional leading/trailing accessories.',
    availability: 'implemented',
    kroName: 'List',
  },
  {
    title: 'Lockups',
    slug: 'lockups',
    category: 'Layout and organization',
    applePath: 'lockups',
    purpose:
      'Pair an image with a title and supporting text as one tappable unit.',
    availability: 'implemented',
    kroName: 'Lockup',
  },
  {
    title: 'Outline views',
    slug: 'outline-views',
    category: 'Layout and organization',
    applePath: 'outline-views',
    purpose:
      'A hierarchical list whose rows expand in place to reveal children.',
    availability: 'implemented',
    kroName: 'OutlineView',
  },
  {
    title: 'Split views',
    slug: 'split-views',
    category: 'Layout and organization',
    applePath: 'split-views',
    purpose:
      'Two (or more) panes side by side, sharing one task — typically a list and its detail.',
    availability: 'implemented',
    kroName: 'SplitView',
  },
  {
    title: 'Tab views',
    slug: 'tab-views',
    category: 'Layout and organization',
    applePath: 'tab-views',
    purpose:
      'Switch mutually exclusive modes of the same surface. Not top-level navigation.',
    availability: 'existing',
    kroName: 'Tabs',
  },

  // —— Navigation and search ———————————————————————————————————
  {
    title: 'Navigation bars',
    slug: 'navigation-bars',
    category: 'Navigation and search',
    applePath: 'navigation-bars',
    purpose:
      'Title the current screen and host leading/trailing actions above the content.',
    availability: 'implemented',
    kroName: 'NavigationBar',
  },
  {
    title: 'Path controls',
    slug: 'path-controls',
    category: 'Navigation and search',
    applePath: 'path-controls',
    purpose:
      'Show the current location in a hierarchy and let a person jump to any ancestor.',
    availability: 'implemented',
    kroName: 'PathControl',
  },
  {
    title: 'Search fields',
    slug: 'search-fields',
    category: 'Navigation and search',
    applePath: 'search-fields',
    purpose:
      'Filter or find. A search glyph is always present; a clear control appears once there is text.',
    availability: 'implemented',
    kroName: 'SearchField',
  },
  {
    title: 'Sidebars',
    slug: 'sidebars',
    category: 'Navigation and search',
    applePath: 'sidebars',
    purpose:
      'Persistent destination list for a desktop-width shell, floating in glass over the field.',
    availability: 'implemented',
    kroName: 'Sidebar',
  },
  {
    title: 'Tab bars',
    slug: 'tab-bars',
    category: 'Navigation and search',
    applePath: 'tab-bars',
    purpose:
      'Top-level destinations on a compact width, as a floating glass dock.',
    availability: 'implemented',
    kroName: 'TabBar',
  },
  {
    title: 'Token views',
    slug: 'token-views',
    category: 'Navigation and search',
    applePath: 'token-views',
    purpose:
      'A wrap of discrete tokens (chips) that name a filter, a person or a tag.',
    availability: 'existing',
    kroName: 'KroChip',
  },

  // —— Presentation ————————————————————————————————————————————
  {
    title: 'Action sheets',
    slug: 'action-sheets',
    category: 'Presentation',
    applePath: 'action-sheets',
    purpose:
      'A mobile set of choices related to the current context, rising from the bottom edge.',
    availability: 'implemented',
    kroName: 'ActionSheet',
  },
  {
    title: 'Alerts',
    slug: 'alerts',
    category: 'Presentation',
    applePath: 'alerts',
    purpose:
      'A modal choice that must be made before work can continue. Destructive actions are named.',
    availability: 'implemented',
    kroName: 'Alert',
  },
  {
    title: 'Panels',
    slug: 'panels',
    category: 'Presentation',
    applePath: 'panels',
    purpose:
      'An inspector or accessory pane that floats beside or over the working surface.',
    availability: 'implemented',
    kroName: 'Panel',
  },
  {
    title: 'Popovers',
    slug: 'popovers',
    category: 'Presentation',
    applePath: 'popovers',
    purpose:
      'A desktop-idiom panel anchored to the control that presented it. The pointer is part of the same glass shape, aimed at that control. The same content becomes a sheet on mobile.',
    availability: 'existing',
    kroName: 'Popover',
  },
  {
    title: 'Scroll views',
    slug: 'scroll-views',
    category: 'Presentation',
    applePath: 'scroll-views',
    purpose:
      'A clipping region that scrolls its content. Respect reduced-motion for any snap.',
    availability: 'implemented',
    kroName: 'ScrollView',
  },
  {
    title: 'Sheets',
    slug: 'sheets',
    category: 'Presentation',
    applePath: 'sheets',
    purpose:
      'A modal surface that covers part of the screen from an edge. Default is the bottom edge.',
    availability: 'existing',
    kroName: 'Sheet',
  },
  {
    title: 'Windows',
    slug: 'windows',
    category: 'Presentation',
    applePath: 'windows',
    purpose:
      'An OS-level window with traffic lights, a title bar and a resize handle.',
    availability: 'out-of-scope',
    outOfScopeReason:
      'The browser window is the window. A PWA does not draw window chrome.',
  },

  // —— Selection and input —————————————————————————————————————
  {
    title: 'Color wells',
    slug: 'color-wells',
    category: 'Selection and input',
    applePath: 'color-wells',
    purpose:
      'Pick a colour. The well itself is the swatch, not a labelled button that hides the value.',
    availability: 'implemented',
    kroName: 'ColorWell',
  },
  {
    title: 'Combo boxes',
    slug: 'combo-boxes',
    category: 'Selection and input',
    applePath: 'combo-boxes',
    purpose:
      'Type a value or pick one from a list. The field is editable; the menu is a suggestion.',
    availability: 'implemented',
    kroName: 'ComboBox',
  },
  {
    title: 'Digit entry views',
    slug: 'digit-entry-views',
    category: 'Selection and input',
    applePath: 'digit-entry-views',
    purpose:
      'Enter a short numeric code, one digit per cell, with a single hidden input for assistive tech.',
    availability: 'implemented',
    kroName: 'DigitEntry',
  },
  {
    title: 'Pickers',
    slug: 'pickers',
    category: 'Selection and input',
    applePath: 'pickers',
    purpose:
      'Choose a date, a time, a duration or one value from a short list.',
    availability: 'implemented',
    kroName: 'Picker',
  },
  {
    title: 'Segmented controls',
    slug: 'segmented-controls',
    category: 'Selection and input',
    applePath: 'segmented-controls',
    purpose:
      'Two to five mutually exclusive options in one compact control. Same primitive as Tab views.',
    availability: 'implemented',
    kroName: 'SegmentedControl',
  },
  {
    title: 'Sliders',
    slug: 'sliders',
    category: 'Selection and input',
    applePath: 'sliders',
    purpose:
      'Pick a value from a continuous range by dragging a thumb along a track.',
    availability: 'implemented',
    kroName: 'Slider',
  },
  {
    title: 'Steppers',
    slug: 'steppers',
    category: 'Selection and input',
    applePath: 'steppers',
    purpose: 'Nudge a discrete numeric value up or down, one step at a time.',
    availability: 'implemented',
    kroName: 'Stepper',
  },
  {
    title: 'Text fields',
    slug: 'text-fields',
    category: 'Selection and input',
    applePath: 'text-fields',
    purpose: 'Enter a single line of text on the recessed field surface.',
    availability: 'existing',
    kroName: 'Input',
  },
  {
    title: 'Toggles',
    slug: 'toggles',
    category: 'Selection and input',
    applePath: 'toggles',
    purpose:
      'A binary on/off. The state is visible from the knob position, not from colour alone.',
    availability: 'implemented',
    kroName: 'Toggle',
  },

  // —— Status ——————————————————————————————————————————————————
  {
    title: 'Activity rings',
    slug: 'activity-rings',
    category: 'Status',
    applePath: 'activity-rings',
    purpose: 'Three concentric rings that fill toward a daily goal.',
    availability: 'existing',
    kroName: 'ActivityRings',
  },
  {
    title: 'Gauges',
    slug: 'gauges',
    category: 'Status',
    applePath: 'gauges',
    purpose:
      'A single value on a circular or linear scale, with a label stating what it measures.',
    availability: 'implemented',
    kroName: 'Gauge',
  },
  {
    title: 'Progress indicators',
    slug: 'progress-indicators',
    category: 'Status',
    applePath: 'progress-indicators',
    purpose:
      'Show how far a determinate task has got, or that an indeterminate one is still running.',
    availability: 'implemented',
    kroName: 'ProgressIndicator',
  },
  {
    title: 'Rating indicators',
    slug: 'rating-indicators',
    category: 'Status',
    applePath: 'rating-indicators',
    purpose:
      'A discrete 1-to-N score, drawn as symbols, never as colour alone.',
    availability: 'implemented',
    kroName: 'RatingIndicator',
  },

  // —— Extra HIG-adjacent chrome Apple lists with toolbars ——————
  {
    title: 'Toolbars',
    slug: 'toolbars',
    category: 'Navigation and search',
    applePath: 'toolbars',
    purpose:
      'A cluster of related actions for the current view, grouped, in glass.',
    availability: 'implemented',
    kroName: 'Toolbar',
  },
]

export function higUrl(entry: HigCatalogEntry): string {
  return apple(entry.applePath)
}

export function higEntriesByCategory(
  category: HigCategory,
): readonly HigCatalogEntry[] {
  return HIG_CATALOG.filter((entry) => entry.category === category)
}

export const HIG_CATEGORIES: readonly HigCategory[] = [
  'Actions',
  'Content',
  'Layout and organization',
  'Navigation and search',
  'Presentation',
  'Selection and input',
  'Status',
]

export function higEntryNamed(title: string): HigCatalogEntry | undefined {
  return HIG_CATALOG.find((entry) => entry.title === title)
}
