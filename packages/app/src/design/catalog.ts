/**
 * The Kro design-system catalog.
 *
 * One list of what we ship. HIG, Fluent 2, Material and Primer are
 * provenance — they are not gallery groups. When two systems name the
 * same job, the Kro export keeps the HIG name and the other names sit
 * on `alsoKnownAs`. When the jobs differ, both exports stay, with
 * names that cannot be mistaken for each other.
 */

export type KroCategory =
  | 'Actions'
  | 'Content'
  | 'Forms'
  | 'Layout'
  | 'Navigation'
  | 'Surfaces'
  | 'Status'

export type NameSource = 'HIG' | 'Fluent 2' | 'Material' | 'Primer'

export interface AlsoKnownAs {
  readonly name: string
  readonly source: NameSource
}

export interface KroCatalogEntry {
  readonly kroName: string
  readonly title: string
  readonly slug: string
  readonly category: KroCategory
  readonly purpose: string
  readonly alsoKnownAs: readonly AlsoKnownAs[]
}

export const KRO_CATEGORIES: readonly KroCategory[] = [
  'Actions',
  'Content',
  'Forms',
  'Layout',
  'Navigation',
  'Surfaces',
  'Status',
]

const aka = (name: string, source: NameSource): AlsoKnownAs => ({
  name,
  source,
})

export const KRO_CATALOG: readonly KroCatalogEntry[] = [
  // —— Actions ————————————————————————————————————————————————
  {
    kroName: 'Button',
    title: 'Button',
    slug: 'button',
    category: 'Actions',
    purpose:
      'Trigger a single action. One primary per surface; outline, subtle and transparent for the rest. Compact is the default size.',
    alsoKnownAs: [
      aka('Buttons', 'HIG'),
      aka('Button', 'Fluent 2'),
      aka('Button', 'Material'),
      aka('Button', 'Primer'),
    ],
  },
  {
    kroName: 'CompoundButton',
    title: 'Compound button',
    slug: 'compound-button',
    category: 'Actions',
    purpose:
      'A button with a title and a supporting line. Use when the extra detail helps choose.',
    alsoKnownAs: [aka('Compound button', 'Fluent 2')],
  },
  {
    kroName: 'Link',
    title: 'Link',
    slug: 'link',
    category: 'Actions',
    purpose:
      'Interactive text that navigates. Inline with copy, or standalone.',
    alsoKnownAs: [aka('Link', 'Fluent 2'), aka('Link', 'Primer')],
  },
  {
    kroName: 'PullDownButton',
    title: 'Pull-down button',
    slug: 'pull-down-button',
    category: 'Actions',
    purpose:
      'A button that only opens a menu. The label names the action and does not change after a choice.',
    alsoKnownAs: [
      aka('Pull-down buttons', 'HIG'),
      aka('Menu button', 'Fluent 2'),
      aka('ActionMenu', 'Primer'),
    ],
  },
  {
    kroName: 'PopupButton',
    title: 'Pop-up button',
    slug: 'pop-up-button',
    category: 'Actions',
    purpose:
      'Choose one option from a closed list. The trigger shows the current choice.',
    alsoKnownAs: [
      aka('Pop-up buttons', 'HIG'),
      aka('Dropdown', 'Fluent 2'),
      aka('Select', 'Material'),
    ],
  },
  {
    kroName: 'SplitButton',
    title: 'Split button',
    slug: 'split-button',
    category: 'Actions',
    purpose:
      'A primary action plus a chevron that opens related actions. The dominant action is not repeated in the menu.',
    alsoKnownAs: [
      aka('Split button', 'Fluent 2'),
      aka('Split button', 'Material'),
    ],
  },
  {
    kroName: 'ToggleButton',
    title: 'Toggle button',
    slug: 'toggle-button',
    category: 'Actions',
    purpose:
      'A button that stays pressed. Off is rest, on is selected. Not a switch — that is Toggle.',
    alsoKnownAs: [
      aka('Toggle button', 'Fluent 2'),
      aka('ToggleButton', 'Material'),
    ],
  },

  // —— Content ————————————————————————————————————————————————
  {
    kroName: 'Avatar',
    title: 'Avatar',
    slug: 'avatar',
    category: 'Content',
    purpose:
      'An image or initials representing a person, with optional presence.',
    alsoKnownAs: [
      aka('Avatar', 'Fluent 2'),
      aka('Avatar', 'Material'),
      aka('Avatar', 'Primer'),
    ],
  },
  {
    kroName: 'AvatarGroup',
    title: 'Avatar group',
    slug: 'avatar-group',
    category: 'Content',
    purpose: 'Several avatars stacked or spread, with an overflow count.',
    alsoKnownAs: [
      aka('Avatar group', 'Fluent 2'),
      aka('AvatarStack', 'Primer'),
    ],
  },
  {
    kroName: 'Chart',
    title: 'Chart',
    slug: 'chart',
    category: 'Content',
    purpose: 'A small data picture. The spoken name is the non-colour signal.',
    alsoKnownAs: [aka('Charts', 'HIG')],
  },
  {
    kroName: 'iconForSymbol',
    title: 'Icon',
    slug: 'icon',
    category: 'Content',
    purpose:
      'A glyph with semantic purpose. Kro maps SF Symbol names onto lucide-react.',
    alsoKnownAs: [
      aka('Icons', 'HIG'),
      aka('Icon', 'Fluent 2'),
      aka('Icon', 'Material'),
    ],
  },
  {
    kroName: 'ImageView',
    title: 'Image view',
    slug: 'image-view',
    category: 'Content',
    purpose:
      'A still image that can block, fit or be circular. `alt` is required.',
    alsoKnownAs: [
      aka('Image views', 'HIG'),
      aka('Image', 'Fluent 2'),
      aka('Image', 'Material'),
    ],
  },
  {
    kroName: 'Lockup',
    title: 'Lockup',
    slug: 'lockup',
    category: 'Content',
    purpose:
      'A generic image-plus-title pair. For a person with presence, use Persona.',
    alsoKnownAs: [aka('Lockups', 'HIG')],
  },
  {
    kroName: 'Persona',
    title: 'Persona',
    slug: 'persona',
    category: 'Content',
    purpose:
      'A person plus secondary and tertiary text. Presence rides on the avatar.',
    alsoKnownAs: [aka('Persona', 'Fluent 2')],
  },
  {
    kroName: 'Text',
    title: 'Text',
    slug: 'text',
    category: 'Content',
    purpose:
      'Typography as a component: size, weight, wrap, truncate. Not a field — that is TextView. Not a control name — that is Label.',
    alsoKnownAs: [
      aka('Text', 'Fluent 2'),
      aka('Typography', 'Material'),
      aka('Text', 'Primer'),
    ],
  },
  {
    kroName: 'TextView',
    title: 'Text view',
    slug: 'text-view',
    category: 'Content',
    purpose: 'Long free-form text. Same recessed field as Input.',
    alsoKnownAs: [
      aka('Text views', 'HIG'),
      aka('Textarea', 'Fluent 2'),
      aka('Textarea', 'Primer'),
    ],
  },
  {
    kroName: 'WebView',
    title: 'Web view',
    slug: 'web-view',
    category: 'Content',
    purpose:
      'An embedded page. Sandbox is restricted unless the caller opts in.',
    alsoKnownAs: [aka('Web views', 'HIG')],
  },

  // —— Forms ——————————————————————————————————————————————————
  {
    kroName: 'Checkbox',
    title: 'Checkbox',
    slug: 'checkbox',
    category: 'Forms',
    purpose: 'Select several options, or switch one option on or off.',
    alsoKnownAs: [
      aka('Checkboxes', 'HIG'),
      aka('Checkbox', 'Fluent 2'),
      aka('Checkbox', 'Material'),
      aka('Checkbox', 'Primer'),
    ],
  },
  {
    kroName: 'ColorWell',
    title: 'Color well',
    slug: 'color-well',
    category: 'Forms',
    purpose: 'Pick a colour. The swatch is the value, not a word.',
    alsoKnownAs: [aka('Color wells', 'HIG')],
  },
  {
    kroName: 'ComboBox',
    title: 'Combo box',
    slug: 'combo-box',
    category: 'Forms',
    purpose: 'Type a value or pick one from a list. The field stays editable.',
    alsoKnownAs: [
      aka('Combo boxes', 'HIG'),
      aka('Combobox', 'Fluent 2'),
      aka('Autocomplete', 'Material'),
    ],
  },
  {
    kroName: 'DigitEntry',
    title: 'Digit entry',
    slug: 'digit-entry',
    category: 'Forms',
    purpose: 'A short numeric code, one cell per digit.',
    alsoKnownAs: [aka('Digit entry views', 'HIG')],
  },
  {
    kroName: 'Field',
    title: 'Field',
    slug: 'field',
    category: 'Forms',
    purpose:
      'A label plus any form control, with hint, required mark and a validation message.',
    alsoKnownAs: [aka('Field', 'Fluent 2'), aka('FormControl', 'Primer')],
  },
  {
    kroName: 'InfoLabel',
    title: 'Info label',
    slug: 'info-label',
    category: 'Forms',
    purpose: 'A label with an info button that opens extra copy in a popover.',
    alsoKnownAs: [aka('Info label', 'Fluent 2')],
  },
  {
    kroName: 'Input',
    title: 'Input',
    slug: 'input',
    category: 'Forms',
    purpose: 'Short free-form text. Outline, underline or filled.',
    alsoKnownAs: [
      aka('Text fields', 'HIG'),
      aka('Input', 'Fluent 2'),
      aka('Text field', 'Material'),
      aka('TextInput', 'Primer'),
    ],
  },
  {
    kroName: 'Label',
    title: 'Label',
    slug: 'label',
    category: 'Forms',
    purpose: 'Names a control or group. Required is a mark, not colour alone.',
    alsoKnownAs: [
      aka('Labels', 'HIG'),
      aka('Label', 'Fluent 2'),
      aka('FormControl.Label', 'Primer'),
    ],
  },
  {
    kroName: 'Picker',
    title: 'Picker',
    slug: 'picker',
    category: 'Forms',
    purpose:
      'A custom list of four or more options. For a native menu, use Select.',
    alsoKnownAs: [aka('Pickers', 'HIG')],
  },
  {
    kroName: 'RadioGroup',
    title: 'Radio group',
    slug: 'radio-group',
    category: 'Forms',
    purpose: 'Pick exactly one item from a short list.',
    alsoKnownAs: [
      aka('Radio buttons', 'HIG'),
      aka('Radio group', 'Fluent 2'),
      aka('Radio', 'Material'),
      aka('RadioGroup', 'Primer'),
    ],
  },
  {
    kroName: 'RatingIndicator',
    title: 'Rating indicator',
    slug: 'rating-indicator',
    category: 'Forms',
    purpose: 'A discrete 1-to-N score. The number is always spoken and shown.',
    alsoKnownAs: [aka('Rating indicators', 'HIG'), aka('Rating', 'Fluent 2')],
  },
  {
    kroName: 'SearchField',
    title: 'Search field',
    slug: 'search-field',
    category: 'Forms',
    purpose: 'Find in the current collection. The field is not a destination.',
    alsoKnownAs: [aka('Search fields', 'HIG'), aka('Search', 'Material')],
  },
  {
    kroName: 'Select',
    title: 'Select',
    slug: 'select',
    category: 'Forms',
    purpose:
      'A native select of four or more options. The platform owns the menu. For a custom list, use Picker; for a closed button, use PopupButton.',
    alsoKnownAs: [aka('Select', 'Fluent 2'), aka('Select', 'Primer')],
  },
  {
    kroName: 'Slider',
    title: 'Slider',
    slug: 'slider',
    category: 'Forms',
    purpose: 'A value from a continuous range, by dragging a thumb.',
    alsoKnownAs: [
      aka('Sliders', 'HIG'),
      aka('Slider', 'Fluent 2'),
      aka('Slider', 'Material'),
    ],
  },
  {
    kroName: 'SpinButton',
    title: 'Spin button',
    slug: 'spin-button',
    category: 'Forms',
    purpose:
      'Nudge a numeric value inside a range. The value is in an editable field, unlike a Stepper.',
    alsoKnownAs: [aka('Spin button', 'Fluent 2')],
  },
  {
    kroName: 'Stepper',
    title: 'Stepper',
    slug: 'stepper',
    category: 'Forms',
    purpose:
      'Plus and minus around a readout. The value is not typed — that is SpinButton.',
    alsoKnownAs: [aka('Steppers', 'HIG')],
  },
  {
    kroName: 'TagPicker',
    title: 'Tag picker',
    slug: 'tag-picker',
    category: 'Forms',
    purpose:
      'A field of dismissible tags plus a dropdown, for picking several values.',
    alsoKnownAs: [aka('Tag picker', 'Fluent 2')],
  },
  {
    kroName: 'Toggle',
    title: 'Toggle',
    slug: 'toggle',
    category: 'Forms',
    purpose:
      'Two mutually exclusive options, like on or off. The knob is the state. Not a pressed button — that is ToggleButton.',
    alsoKnownAs: [
      aka('Toggles', 'HIG'),
      aka('Switch', 'Fluent 2'),
      aka('Switch', 'Material'),
    ],
  },

  // —— Layout ————————————————————————————————————————————————
  {
    kroName: 'Collection',
    title: 'Collection',
    slug: 'collection',
    category: 'Layout',
    purpose: 'A wrapping grid of peer items.',
    alsoKnownAs: [aka('Collections', 'HIG')],
  },
  {
    kroName: 'ColumnView',
    title: 'Column view',
    slug: 'column-view',
    category: 'Layout',
    purpose: 'A hierarchy as adjacent columns, Finder-style.',
    alsoKnownAs: [aka('Column views', 'HIG')],
  },
  {
    kroName: 'Disclosure',
    title: 'Disclosure',
    slug: 'disclosure',
    category: 'Layout',
    purpose:
      'One block that opens and closes. For a list of those blocks, use Accordion.',
    alsoKnownAs: [aka('Disclosure controls', 'HIG')],
  },
  {
    kroName: 'GroupedBox',
    title: 'Grouped box',
    slug: 'grouped-box',
    category: 'Layout',
    purpose:
      'An inset group of related rows. For a header/preview/footer card, use Card.',
    alsoKnownAs: [aka('Boxes', 'HIG')],
  },
  {
    kroName: 'List',
    title: 'List',
    slug: 'list',
    category: 'Layout',
    purpose: 'Like items stacked vertically, with optional sections.',
    alsoKnownAs: [
      aka('Lists and tables', 'HIG'),
      aka('List', 'Fluent 2'),
      aka('List', 'Material'),
      aka('ActionList', 'Primer'),
    ],
  },
  {
    kroName: 'OutlineView',
    title: 'Outline view',
    slug: 'outline-view',
    category: 'Layout',
    purpose: 'Hierarchical nested data. Rows expand in place.',
    alsoKnownAs: [
      aka('Outline views', 'HIG'),
      aka('Tree', 'Fluent 2'),
      aka('TreeView', 'Primer'),
    ],
  },
  {
    kroName: 'ScrollView',
    title: 'Scroll view',
    slug: 'scroll-view',
    category: 'Layout',
    purpose: 'A region that scrolls on one axis when content overflows.',
    alsoKnownAs: [aka('Scroll views', 'HIG')],
  },
  {
    kroName: 'Separator',
    title: 'Separator',
    slug: 'separator',
    category: 'Layout',
    purpose: 'A hairline that groups sections. Optional label.',
    alsoKnownAs: [
      aka('Separators', 'HIG'),
      aka('Divider', 'Fluent 2'),
      aka('Divider', 'Material'),
    ],
  },
  {
    kroName: 'SplitView',
    title: 'Split view',
    slug: 'split-view',
    category: 'Layout',
    purpose: 'Two panes side by side, with a draggable divider.',
    alsoKnownAs: [aka('Split views', 'HIG')],
  },

  // —— Navigation ———————————————————————————————————————————————
  {
    kroName: 'Accordion',
    title: 'Accordion',
    slug: 'accordion',
    category: 'Navigation',
    purpose:
      'Grouped sections that open and close. Multiple, collapsible, or exclusive. One block alone is Disclosure.',
    alsoKnownAs: [aka('Accordion', 'Fluent 2')],
  },
  {
    kroName: 'NavigationBar',
    title: 'Navigation bar',
    slug: 'navigation-bar',
    category: 'Navigation',
    purpose: 'The current place, a back control and trailing actions.',
    alsoKnownAs: [aka('Navigation bars', 'HIG'), aka('AppBar', 'Material')],
  },
  {
    kroName: 'PathControl',
    title: 'Path control',
    slug: 'path-control',
    category: 'Navigation',
    purpose:
      'The current place in a hierarchy, with ancestors that jump back. Overflow collapses the middle.',
    alsoKnownAs: [
      aka('Path controls', 'HIG'),
      aka('Breadcrumb', 'Fluent 2'),
      aka('Breadcrumbs', 'Primer'),
    ],
  },
  {
    kroName: 'Sidebar',
    title: 'Sidebar',
    slug: 'sidebar',
    category: 'Navigation',
    purpose:
      'A list of links through the main sections of an app. Categories can nest. Selecting a row reports an id.',
    alsoKnownAs: [
      aka('Sidebars', 'HIG'),
      aka('Nav', 'Fluent 2'),
      aka('Navigation drawer', 'Material'),
      aka('NavList', 'Primer'),
    ],
  },
  {
    kroName: 'TabBar',
    title: 'Tab bar',
    slug: 'tab-bar',
    category: 'Navigation',
    purpose:
      'Top-level destinations on a compact surface. In-page category switching is Tabs.',
    alsoKnownAs: [aka('Tab bars', 'HIG'), aka('Navigation bar', 'Material')],
  },
  {
    kroName: 'Tabs',
    title: 'Tabs',
    slug: 'tabs',
    category: 'Navigation',
    purpose:
      'Switch categories of related information without leaving the page. Not top-level navigation.',
    alsoKnownAs: [
      aka('Tab views', 'HIG'),
      aka('Segmented controls', 'HIG'),
      aka('Tablist', 'Fluent 2'),
      aka('Tabs', 'Material'),
      aka('UnderlineNav', 'Primer'),
    ],
  },
  {
    kroName: 'Toolbar',
    title: 'Toolbar',
    slug: 'toolbar',
    category: 'Navigation',
    purpose: 'Frequent actions for the current view, grouped.',
    alsoKnownAs: [aka('Toolbars', 'HIG'), aka('Toolbar', 'Fluent 2')],
  },

  // —— Surfaces ——————————————————————————————————————————————
  {
    kroName: 'ActionSheet',
    title: 'Action sheet',
    slug: 'action-sheet',
    category: 'Surfaces',
    purpose: 'A set of actions related to the current context, from an edge.',
    alsoKnownAs: [aka('Action sheets', 'HIG')],
  },
  {
    kroName: 'Alert',
    title: 'Alert',
    slug: 'alert',
    category: 'Surfaces',
    purpose:
      'A confirmation that can require an action before work continues. For a general supplemental surface, use Dialog.',
    alsoKnownAs: [aka('Alerts', 'HIG')],
  },
  {
    kroName: 'Card',
    title: 'Card',
    slug: 'card',
    category: 'Surfaces',
    purpose:
      'A container for one concept: header, preview, body, footer. Filled, outline or subtle. Not an inset group — that is GroupedBox.',
    alsoKnownAs: [aka('Card', 'Fluent 2'), aka('Card', 'Material')],
  },
  {
    kroName: 'Carousel',
    title: 'Carousel',
    slug: 'carousel',
    category: 'Surfaces',
    purpose:
      'Cycle through peer content without leaving the page. Pagination is numbered, not colour alone.',
    alsoKnownAs: [aka('Carousel', 'Fluent 2'), aka('Carousel', 'Material')],
  },
  {
    kroName: 'Dialog',
    title: 'Dialog',
    slug: 'dialog',
    category: 'Surfaces',
    purpose:
      'A supplemental surface that can require an action before work continues.',
    alsoKnownAs: [
      aka('Dialog', 'Fluent 2'),
      aka('Dialog', 'Material'),
      aka('Dialog', 'Primer'),
    ],
  },
  {
    kroName: 'DropdownMenu',
    title: 'Menu',
    slug: 'menu',
    category: 'Surfaces',
    purpose: 'A hidden list of options shown from a trigger.',
    alsoKnownAs: [
      aka('Menus', 'HIG'),
      aka('Context menus', 'HIG'),
      aka('Menu', 'Fluent 2'),
      aka('Menu', 'Material'),
      aka('ActionMenu', 'Primer'),
    ],
  },
  {
    kroName: 'Panel',
    title: 'Panel',
    slug: 'panel',
    category: 'Surfaces',
    purpose: 'A persistent inspector beside the main view.',
    alsoKnownAs: [aka('Panels', 'HIG')],
  },
  {
    kroName: 'Popover',
    title: 'Popover',
    slug: 'popover',
    category: 'Surfaces',
    purpose: 'A small surface anchored to a control for nonessential context.',
    alsoKnownAs: [
      aka('Popovers', 'HIG'),
      aka('Popover', 'Fluent 2'),
      aka('AnchoredOverlay', 'Primer'),
    ],
  },
  {
    kroName: 'Sheet',
    title: 'Sheet',
    slug: 'sheet',
    category: 'Surfaces',
    purpose: 'A secondary surface that slides in from an edge.',
    alsoKnownAs: [
      aka('Sheets', 'HIG'),
      aka('Drawer', 'Fluent 2'),
      aka('Navigation drawer', 'Material'),
    ],
  },
  {
    kroName: 'Tooltip',
    title: 'Tooltip',
    slug: 'tooltip',
    category: 'Surfaces',
    purpose: 'Supplemental context near a target. Relationship is labelled.',
    alsoKnownAs: [
      aka('Tooltip', 'Fluent 2'),
      aka('Tooltip', 'Material'),
      aka('Tooltip', 'Primer'),
    ],
  },

  // —— Status ————————————————————————————————————————————————
  {
    kroName: 'Badge',
    title: 'Badge',
    slug: 'badge',
    category: 'Status',
    purpose:
      'A status or description of an associated control. Colour is never the only signal. For a card-corner capsule, use CardBadge.',
    alsoKnownAs: [
      aka('Badge', 'Fluent 2'),
      aka('Badge', 'Material'),
      aka('CounterLabel', 'Primer'),
    ],
  },
  {
    kroName: 'Gauge',
    title: 'Gauge',
    slug: 'gauge',
    category: 'Status',
    purpose: 'A value on a known scale, as a ring.',
    alsoKnownAs: [aka('Gauges', 'HIG')],
  },
  {
    kroName: 'InlineBanner',
    title: 'Inline banner',
    slug: 'inline-banner',
    category: 'Status',
    purpose:
      'Important information about the product or the current surface. Intent is named in words. Success, dismiss and single/multiline layouts are included.',
    alsoKnownAs: [
      aka('Message bar', 'Fluent 2'),
      aka('Banner', 'Material'),
      aka('Flash', 'Primer'),
    ],
  },
  {
    kroName: 'ProgressIndicator',
    title: 'Progress indicator',
    slug: 'progress-indicator',
    category: 'Status',
    purpose:
      'How far a determinate task has got, or that one is still running. The indeterminate kind is the spinner.',
    alsoKnownAs: [
      aka('Progress indicators', 'HIG'),
      aka('Progress bar', 'Fluent 2'),
      aka('Spinner', 'Fluent 2'),
      aka('Progress indicator', 'Material'),
      aka('Spinner', 'Primer'),
    ],
  },
  {
    kroName: 'Skeleton',
    title: 'Skeleton',
    slug: 'skeleton',
    category: 'Status',
    purpose:
      'A section is loading, without blocking the rest of the page. Shape, not colour, is the signal.',
    alsoKnownAs: [aka('Skeleton', 'Fluent 2'), aka('Skeleton', 'Material')],
  },
  {
    kroName: 'Tag',
    title: 'Tag',
    slug: 'tag',
    category: 'Status',
    purpose:
      'A value someone picked (a recipient, a category). Dismissible. For an identity/status capsule, use KroChip.',
    alsoKnownAs: [
      aka('Tag', 'Fluent 2'),
      aka('Chip', 'Material'),
      aka('Token', 'Primer'),
    ],
  },
]

export function kroEntriesByCategory(
  category: KroCategory,
): readonly KroCatalogEntry[] {
  return KRO_CATALOG.filter((entry) => entry.category === category)
}

export function kroEntryNamed(kroName: string): KroCatalogEntry | undefined {
  return KRO_CATALOG.find((entry) => entry.kroName === kroName)
}

export function formatAlsoKnownAs(aliases: readonly AlsoKnownAs[]): string {
  if (aliases.length === 0) return ''
  return aliases.map((alias) => `${alias.name} (${alias.source})`).join(' · ')
}
