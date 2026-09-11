/**
 * The Fluent 2 component catalog, as Kro Web realises it.
 *
 * Titles, purposes and variant vocabularies come from Fluent 2 Web
 * (https://fluent2.microsoft.design/components/web/react). Visual language
 * does NOT: every realised control paints with KroTokens, KroGlass and
 * the indigoGrape field, never Fluent's default brand ramp.
 *
 * `availability` is the contract the Storybook gallery and the export
 * barrel both read. A title marked `existing` already has a Kro/HIG
 * export of the same job; a title marked `conflict` is the same *name*
 * as a live `@kro/app/design` export and is restaged, not re-exported,
 * until the human picks which name to keep.
 */

export const FLUENT_COMPONENTS_INDEX =
  'https://fluent2.microsoft.design/components/web/react'

export type FluentCategory =
  | 'Actions'
  | 'Content'
  | 'Forms'
  | 'Navigation'
  | 'Surfaces'
  | 'Status'
  | 'Utilities'

export type FluentAvailability =
  | 'implemented'
  | 'existing'
  | 'conflict'
  | 'out-of-scope'

export type FluentConflictKind = 'exact' | 'conceptual'

export interface FluentConflict {
  readonly kind: FluentConflictKind
  readonly kroName: string
  readonly note: string
}

export interface FluentCatalogEntry {
  readonly title: string
  readonly slug: string
  readonly category: FluentCategory
  readonly fluentPath: string
  readonly purpose: string
  readonly variants: readonly string[]
  readonly sizes: readonly string[]
  readonly availability: FluentAvailability
  /** The Kro export that realises this title, when we have one. */
  readonly kroName?: string
  readonly conflict?: FluentConflict
  readonly outOfScopeReason?: string
}

function fluent(path: string): string {
  return `https://fluent2.microsoft.design/components/web/react/${path}`
}

export const FLUENT_CATALOG: readonly FluentCatalogEntry[] = [
  // —— Actions ————————————————————————————————————————————————
  {
    title: 'Button',
    slug: 'button',
    category: 'Actions',
    fluentPath: 'core/button/usage',
    purpose:
      'Trigger a single action. One primary per surface; outline, subtle and transparent for the rest.',
    variants: ['primary', 'secondary', 'outline', 'subtle', 'transparent'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'Button',
    conflict: {
      kind: 'exact',
      kroName: 'Button',
      note: 'Same export name as the Kro primitive. Fluent appearances (outline, subtle, transparent) and shapes (rounded, circular, square) are folded into that primitive rather than a second Button.',
    },
  },
  {
    title: 'Compound button',
    slug: 'compound-button',
    category: 'Actions',
    fluentPath: 'core/button/usage',
    purpose:
      'A button with a title and a supporting line. Use when the extra detail helps choose.',
    variants: ['primary', 'secondary', 'outline', 'subtle', 'transparent'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'CompoundButton',
  },
  {
    title: 'Menu button',
    slug: 'menu-button',
    category: 'Actions',
    fluentPath: 'core/button/usage',
    purpose:
      'A button that only opens a menu. Unlike a split button, there is no primary action on the face.',
    variants: ['primary', 'secondary', 'outline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'MenuButton',
    conflict: {
      kind: 'conceptual',
      kroName: 'PullDownButton',
      note: 'HIG Pull-down button is the same job. MenuButton is the Fluent name and variant set; both exist until you pick one name.',
    },
  },
  {
    title: 'Split button',
    slug: 'split-button',
    category: 'Actions',
    fluentPath: 'core/button/usage',
    purpose:
      'A primary action plus a chevron that opens related actions. The dominant action is not repeated in the menu.',
    variants: ['primary', 'secondary', 'outline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'SplitButton',
  },
  {
    title: 'Toggle button',
    slug: 'toggle-button',
    category: 'Actions',
    fluentPath: 'core/button/usage',
    purpose:
      'A button that stays pressed. Off is rest, on is selected. Not a switch — use Switch/Toggle for settings.',
    variants: ['primary', 'secondary', 'outline', 'subtle', 'transparent'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'ToggleButton',
    conflict: {
      kind: 'conceptual',
      kroName: 'Toggle',
      note: 'HIG Toggle is a switch. Fluent ToggleButton is a pressed button (toolbar idiom). Different jobs, easy to confuse by name.',
    },
  },
  {
    title: 'Link',
    slug: 'link',
    category: 'Actions',
    fluentPath: 'core/link/usage',
    purpose:
      'Interactive text that navigates. Inline with copy, or standalone. Appearance is default or subtle.',
    variants: ['default', 'subtle'],
    sizes: ['inherit'],
    availability: 'implemented',
    kroName: 'Link',
  },

  // —— Content ————————————————————————————————————————————————
  {
    title: 'Avatar',
    slug: 'avatar',
    category: 'Content',
    fluentPath: 'core/avatar/usage',
    purpose:
      'An image or initials representing a person, with optional presence and activity.',
    variants: ['image', 'initials', 'icon'],
    sizes: [
      '16',
      '20',
      '24',
      '28',
      '32',
      '36',
      '40',
      '48',
      '56',
      '64',
      '72',
      '96',
      '120',
      '128',
    ],
    availability: 'implemented',
    kroName: 'Avatar',
  },
  {
    title: 'Avatar group',
    slug: 'avatar-group',
    category: 'Content',
    fluentPath: 'core/avatar-group/usage',
    purpose: 'Several avatars stacked or spread, with an overflow count.',
    variants: ['spread', 'stack', 'pie'],
    sizes: ['20', '24', '32', '40', '48'],
    availability: 'implemented',
    kroName: 'AvatarGroup',
  },
  {
    title: 'Icon',
    slug: 'icon',
    category: 'Content',
    fluentPath: 'core/icon/usage',
    purpose:
      'A glyph with semantic purpose. Kro maps SF Symbol names onto lucide-react.',
    variants: ['regular', 'filled'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'iconForSymbol',
    conflict: {
      kind: 'conceptual',
      kroName: 'iconForSymbol',
      note: 'Fluent Icon is a wrapper around SVG glyphs, not a second icon set.',
    },
  },
  {
    title: 'Image',
    slug: 'image',
    category: 'Content',
    fluentPath: 'core/image/usage',
    purpose: 'A still image that can block, fit or be circular.',
    variants: ['default', 'shadow', 'circular'],
    sizes: ['fit', 'fill'],
    availability: 'existing',
    kroName: 'ImageView',
    conflict: {
      kind: 'conceptual',
      kroName: 'ImageView',
      note: 'HIG Image views already own still frames. Fluent Image would collide on the short name Image if exported.',
    },
  },
  {
    title: 'Persona',
    slug: 'persona',
    category: 'Content',
    fluentPath: 'core/persona/usage',
    purpose:
      'A person plus secondary and tertiary text. Presence rides on the avatar, not on colour alone.',
    variants: ['start', 'center'],
    sizes: ['extra-small', 'small', 'medium', 'large', 'extra-large', 'huge'],
    availability: 'implemented',
    kroName: 'Persona',
    conflict: {
      kind: 'conceptual',
      kroName: 'Lockup',
      note: 'HIG Lockup is the generic image+title pair. Persona adds presence and a sized type ramp for people.',
    },
  },
  {
    title: 'Text',
    slug: 'text',
    category: 'Content',
    fluentPath: 'core/text/usage',
    purpose:
      'Typography opinions as a component: size, weight, wrap, truncate, italic.',
    variants: ['body', 'caption', 'subtitle', 'title'],
    sizes: [
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '1000',
    ],
    availability: 'implemented',
    kroName: 'Text',
    conflict: {
      kind: 'conceptual',
      kroName: 'Label',
      note: 'HIG Label names a control. Fluent Text is the type ramp for any copy. Easy to mix up.',
    },
  },

  // —— Forms ——————————————————————————————————————————————————
  {
    title: 'Checkbox',
    slug: 'checkbox',
    category: 'Forms',
    fluentPath: 'core/checkbox/usage',
    purpose: 'Select several options, or switch one option on or off.',
    variants: ['unchecked', 'checked', 'mixed'],
    sizes: ['medium', 'large'],
    availability: 'conflict',
    kroName: 'Checkbox',
    conflict: {
      kind: 'exact',
      kroName: 'Checkbox',
      note: 'Same export name as the HIG checkbox. Restaged under Fluent 2 with Fluent size names mapped onto density.',
    },
  },
  {
    title: 'Combobox',
    slug: 'combobox',
    category: 'Forms',
    fluentPath: 'core/combobox/usage',
    purpose:
      'Type a value or pick one (or more) from a list. The field stays editable.',
    variants: ['outline', 'underline', 'filled-darker', 'filled-lighter'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'ComboBox',
    conflict: {
      kind: 'exact',
      kroName: 'ComboBox',
      note: 'Fluent spells Combobox; Kro exports ComboBox. Same control. Not re-exported under a second casing.',
    },
  },
  {
    title: 'Dropdown',
    slug: 'dropdown',
    category: 'Forms',
    fluentPath: 'core/dropdown/usage',
    purpose:
      'Choose one or more options from a closed list. The field is not free text.',
    variants: ['outline', 'underline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'PopupButton',
    conflict: {
      kind: 'conceptual',
      kroName: 'PopupButton',
      note: 'HIG pop-up button is the closed-list picker. Fluent Dropdown is the same job with a field-shaped trigger.',
    },
  },
  {
    title: 'Field',
    slug: 'field',
    category: 'Forms',
    fluentPath: 'core/field/usage',
    purpose:
      'A label plus any form control, with hint, required mark and a validation message.',
    variants: ['vertical', 'horizontal'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Field',
  },
  {
    title: 'Info label',
    slug: 'info-label',
    category: 'Forms',
    fluentPath: 'core/info-label/usage',
    purpose: 'A label with an info button that opens extra copy in a popover.',
    variants: ['default'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'InfoLabel',
  },
  {
    title: 'Input',
    slug: 'input',
    category: 'Forms',
    fluentPath: 'core/input/usage',
    purpose: 'Short free-form text. Outline, underline or filled.',
    variants: ['outline', 'underline', 'filled-darker', 'filled-lighter'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'Input',
    conflict: {
      kind: 'exact',
      kroName: 'Input',
      note: 'Same export name as the Kro field primitive. Fluent appearances are restaged, not a second Input.',
    },
  },
  {
    title: 'Label',
    slug: 'label',
    category: 'Forms',
    fluentPath: 'core/label/usage',
    purpose: 'Names a control or group. Required is a mark, not colour alone.',
    variants: ['regular', 'required', 'disabled'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'Label',
    conflict: {
      kind: 'exact',
      kroName: 'Label',
      note: 'Same export name as the HIG Label. Restaged with Fluent size names mapped onto density.',
    },
  },
  {
    title: 'Radio group',
    slug: 'radio-group',
    category: 'Forms',
    fluentPath: 'core/radio-group/usage',
    purpose: 'Pick exactly one item from a short list.',
    variants: ['vertical', 'horizontal'],
    sizes: ['medium'],
    availability: 'conflict',
    kroName: 'RadioGroup',
    conflict: {
      kind: 'exact',
      kroName: 'RadioGroup',
      note: 'Same export name as the HIG radio group.',
    },
  },
  {
    title: 'Rating',
    slug: 'rating',
    category: 'Forms',
    fluentPath: 'core/rating/usage',
    purpose: 'A discrete 1-to-N score. The number is always spoken and shown.',
    variants: ['filled', 'outline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'RatingIndicator',
    conflict: {
      kind: 'conceptual',
      kroName: 'RatingIndicator',
      note: 'HIG rating indicator is the same control. Fluent short name Rating would collide if exported.',
    },
  },
  {
    title: 'Select',
    slug: 'select',
    category: 'Forms',
    fluentPath: 'core/select/usage',
    purpose:
      'A native select of four or more options. The platform owns the menu.',
    variants: ['outline', 'underline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Select',
    conflict: {
      kind: 'conceptual',
      kroName: 'Picker',
      note: 'HIG Picker (list) and pop-up button cover the same choice. Fluent Select is the native <select> styling.',
    },
  },
  {
    title: 'Slider',
    slug: 'slider',
    category: 'Forms',
    fluentPath: 'core/slider/usage',
    purpose: 'A value from a continuous range, by dragging a thumb.',
    variants: ['default', 'disabled'],
    sizes: ['small', 'medium'],
    availability: 'conflict',
    kroName: 'Slider',
    conflict: {
      kind: 'exact',
      kroName: 'Slider',
      note: 'Same export name as the HIG slider.',
    },
  },
  {
    title: 'Spin button',
    slug: 'spin-button',
    category: 'Forms',
    fluentPath: 'core/spin-button/usage',
    purpose:
      'Nudge a numeric value inside a range. The value is in a field, unlike a stepper.',
    variants: ['outline', 'underline'],
    sizes: ['small', 'medium'],
    availability: 'implemented',
    kroName: 'SpinButton',
    conflict: {
      kind: 'conceptual',
      kroName: 'Stepper',
      note: 'HIG Stepper is plus/minus around a readout. Fluent SpinButton puts the value in an editable field.',
    },
  },
  {
    title: 'Switch',
    slug: 'switch',
    category: 'Forms',
    fluentPath: 'core/switch/usage',
    purpose:
      'Two mutually exclusive options, like on or off. The knob is the state.',
    variants: ['on', 'off'],
    sizes: ['small', 'medium'],
    availability: 'existing',
    kroName: 'Toggle',
    conflict: {
      kind: 'conceptual',
      kroName: 'Toggle',
      note: 'HIG calls it Toggle; Fluent calls it Switch. Same binary control. Not duplicated.',
    },
  },
  {
    title: 'Tag picker',
    slug: 'tag-picker',
    category: 'Forms',
    fluentPath: 'core/tag-picker/usage',
    purpose:
      'A field of dismissible tags plus a dropdown, for picking several values.',
    variants: ['filled', 'outline'],
    sizes: ['small', 'medium'],
    availability: 'implemented',
    kroName: 'TagPicker',
  },
  {
    title: 'Textarea',
    slug: 'textarea',
    category: 'Forms',
    fluentPath: 'core/textarea/usage',
    purpose: 'Long free-form text. Same recessed field as Input.',
    variants: ['outline', 'filled'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'TextView',
    conflict: {
      kind: 'conceptual',
      kroName: 'TextView',
      note: 'HIG Text views is the multiline field. Fluent Textarea would collide if exported as Textarea next to TextView.',
    },
  },

  // —— Navigation ———————————————————————————————————————————————
  {
    title: 'Accordion',
    slug: 'accordion',
    category: 'Navigation',
    fluentPath: 'core/accordion/usage',
    purpose:
      'Grouped sections that open and close. Multiple, collapsible, or exclusive.',
    variants: ['exclusive', 'multiple', 'collapsible'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Accordion',
    conflict: {
      kind: 'conceptual',
      kroName: 'Disclosure',
      note: 'HIG Disclosure is one block. Fluent Accordion is a list of those blocks with exclusive/multiple modes.',
    },
  },
  {
    title: 'Breadcrumb',
    slug: 'breadcrumb',
    category: 'Navigation',
    fluentPath: 'core/breadcrumb/usage',
    purpose: 'The current place in a hierarchy, with ancestors that jump back.',
    variants: ['default', 'overflow'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Breadcrumb',
    conflict: {
      kind: 'conceptual',
      kroName: 'PathControl',
      note: 'HIG Path control is the same trail. Breadcrumb is the Fluent name with overflow. Both exist until you pick one.',
    },
  },
  {
    title: 'Nav',
    slug: 'nav',
    category: 'Navigation',
    fluentPath: 'core/nav/usage',
    purpose:
      'A list of links through the main sections of an app. Categories can nest.',
    variants: ['default', 'subtle'],
    sizes: ['small', 'medium'],
    availability: 'implemented',
    kroName: 'Nav',
    conflict: {
      kind: 'conceptual',
      kroName: 'Sidebar',
      note: 'HIG Sidebar is the destination list. Fluent Nav adds nested categories and a selected indicator.',
    },
  },
  {
    title: 'Tablist',
    slug: 'tablist',
    category: 'Navigation',
    fluentPath: 'core/tablist/usage',
    purpose:
      'Switch categories of related information without leaving the page. Not top-level navigation.',
    variants: ['transparent', 'subtle'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'Tabs',
    conflict: {
      kind: 'conceptual',
      kroName: 'Tabs',
      note: 'Kro Tabs is the segmented control / tablist. Fluent Tablist is the same pattern.',
    },
  },
  {
    title: 'Toolbar',
    slug: 'toolbar',
    category: 'Navigation',
    fluentPath: 'core/toolbar/usage',
    purpose: 'Frequent actions for the current view, grouped.',
    variants: ['transparent', 'subtle'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'Toolbar',
    conflict: {
      kind: 'exact',
      kroName: 'Toolbar',
      note: 'Same export name as the HIG toolbar.',
    },
  },
  {
    title: 'Tree',
    slug: 'tree',
    category: 'Navigation',
    fluentPath: 'core/tree/usage',
    purpose: 'Hierarchical nested data. Rows expand in place.',
    variants: ['default', 'subtle'],
    sizes: ['small', 'medium'],
    availability: 'existing',
    kroName: 'OutlineView',
    conflict: {
      kind: 'conceptual',
      kroName: 'OutlineView',
      note: 'HIG Outline views is the tree. Fluent Tree would collide if exported as Tree.',
    },
  },

  // —— Surfaces ——————————————————————————————————————————————
  {
    title: 'Card',
    slug: 'card',
    category: 'Surfaces',
    fluentPath: 'core/card/usage',
    purpose:
      'A container for one concept: header, preview, body, footer. Filled, outline or subtle.',
    variants: ['filled', 'filled-alternative', 'outline', 'subtle'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Card',
    conflict: {
      kind: 'conceptual',
      kroName: 'SurfaceCard',
      note: 'Endeavor SurfaceCard / HIG GroupedBox already group content. Fluent Card adds header/preview/footer anatomy and appearance variants. Short name Card is new.',
    },
  },
  {
    title: 'Carousel',
    slug: 'carousel',
    category: 'Surfaces',
    fluentPath: 'core/carousel/usage',
    purpose:
      'Cycle through peer content without leaving the page. Pagination is numbered, not colour alone.',
    variants: ['default'],
    sizes: ['medium'],
    availability: 'implemented',
    kroName: 'Carousel',
  },
  {
    title: 'Dialog',
    slug: 'dialog',
    category: 'Surfaces',
    fluentPath: 'core/dialog/usage',
    purpose:
      'A supplemental surface that can require an action before work continues.',
    variants: ['modal', 'non-modal'],
    sizes: ['small', 'medium', 'large'],
    availability: 'conflict',
    kroName: 'Dialog',
    conflict: {
      kind: 'exact',
      kroName: 'Dialog',
      note: 'Same export name as the Kro/Radix dialog primitive. Also overlaps HIG Alert.',
    },
  },
  {
    title: 'Divider',
    slug: 'divider',
    category: 'Surfaces',
    fluentPath: 'core/divider/usage',
    purpose: 'A hairline that groups sections. Optional label.',
    variants: ['horizontal', 'vertical'],
    sizes: ['medium'],
    availability: 'existing',
    kroName: 'Separator',
    conflict: {
      kind: 'conceptual',
      kroName: 'Separator',
      note: 'HIG Separator is the hairline. Fluent Divider is the same control.',
    },
  },
  {
    title: 'Drawer',
    slug: 'drawer',
    category: 'Surfaces',
    fluentPath: 'core/drawer/usage',
    purpose: 'A secondary surface that slides in from an edge.',
    variants: ['overlay', 'inline'],
    sizes: ['small', 'medium', 'large'],
    availability: 'existing',
    kroName: 'Sheet',
    conflict: {
      kind: 'conceptual',
      kroName: 'Sheet',
      note: 'Kro Sheet already slides from any edge. Fluent Drawer is the same presentation.',
    },
  },
  {
    title: 'List',
    slug: 'list',
    category: 'Surfaces',
    fluentPath: 'core/list/usage',
    purpose: 'Like items stacked vertically.',
    variants: ['default'],
    sizes: ['medium'],
    availability: 'conflict',
    kroName: 'List',
    conflict: {
      kind: 'exact',
      kroName: 'List',
      note: 'Same export name as the HIG list.',
    },
  },
  {
    title: 'Menu',
    slug: 'menu',
    category: 'Surfaces',
    fluentPath: 'core/menu/usage',
    purpose: 'A hidden list of options shown from a trigger.',
    variants: ['default'],
    sizes: ['medium'],
    availability: 'existing',
    kroName: 'DropdownMenu',
    conflict: {
      kind: 'conceptual',
      kroName: 'DropdownMenu',
      note: 'Kro DropdownMenu is the menu. Fluent Menu would collide if exported as Menu.',
    },
  },
  {
    title: 'Popover',
    slug: 'popover',
    category: 'Surfaces',
    fluentPath: 'core/popover/usage',
    purpose: 'A small surface anchored to a control for nonessential context.',
    variants: ['default'],
    sizes: ['medium'],
    availability: 'conflict',
    kroName: 'Popover',
    conflict: {
      kind: 'exact',
      kroName: 'Popover',
      note: 'Same export name as the Kro popover primitive.',
    },
  },
  {
    title: 'Tooltip',
    slug: 'tooltip',
    category: 'Surfaces',
    fluentPath: 'core/tooltip/usage',
    purpose:
      'Supplemental context near a target. Relationship is label, description or inaccessible.',
    variants: ['label', 'description'],
    sizes: ['medium'],
    availability: 'implemented',
    kroName: 'Tooltip',
  },

  // —— Status ————————————————————————————————————————————————
  {
    title: 'Badge',
    slug: 'badge',
    category: 'Status',
    fluentPath: 'core/badge/usage',
    purpose:
      'A status or description of an associated control. Colour is never the only signal — the text is.',
    variants: ['filled', 'ghost', 'outline', 'tint'],
    sizes: ['tiny', 'extra-small', 'small', 'medium', 'large', 'extra-large'],
    availability: 'implemented',
    kroName: 'Badge',
    conflict: {
      kind: 'conceptual',
      kroName: 'CardBadge',
      note: 'Endeavor CardBadge is a 20px capsule for card corners. Fluent Badge is the generic status chip with appearances, sizes and colours.',
    },
  },
  {
    title: 'Message bar',
    slug: 'message-bar',
    category: 'Status',
    fluentPath: 'core/message-bar/usage',
    purpose:
      'Important information about the product or the current surface. Intent is named in words.',
    variants: ['info', 'success', 'warning', 'error'],
    sizes: ['singleline', 'multiline'],
    availability: 'implemented',
    kroName: 'MessageBar',
    conflict: {
      kind: 'conceptual',
      kroName: 'InlineBanner',
      note: 'Endeavor InlineBanner is info/warning/error. Fluent MessageBar adds success and single/multiline layouts.',
    },
  },
  {
    title: 'Progress bar',
    slug: 'progress-bar',
    category: 'Status',
    fluentPath: 'core/progress-bar/usage',
    purpose:
      'How far a determinate task has got, or that one is still running.',
    variants: ['determinate', 'indeterminate'],
    sizes: ['medium', 'large'],
    availability: 'existing',
    kroName: 'ProgressIndicator',
    conflict: {
      kind: 'conceptual',
      kroName: 'ProgressIndicator',
      note: 'HIG Progress indicators already cover bar, circular and indeterminate.',
    },
  },
  {
    title: 'Skeleton',
    slug: 'skeleton',
    category: 'Status',
    fluentPath: 'core/skeleton/usage',
    purpose:
      'A section is loading, without blocking the rest of the page. Shape, not colour, is the signal.',
    variants: ['opaque', 'translucent'],
    sizes: ['small', 'medium', 'large'],
    availability: 'implemented',
    kroName: 'Skeleton',
  },
  {
    title: 'Spinner',
    slug: 'spinner',
    category: 'Status',
    fluentPath: 'core/spinner/usage',
    purpose: 'Something is processing. The label says what, not the colour.',
    variants: ['primary', 'inverted'],
    sizes: [
      'tiny',
      'extra-small',
      'small',
      'medium',
      'large',
      'extra-large',
      'huge',
    ],
    availability: 'implemented',
    kroName: 'Spinner',
    conflict: {
      kind: 'conceptual',
      kroName: 'ProgressIndicator',
      note: 'HIG ProgressIndicator kind=indeterminate is the spinner. Fluent Spinner is a dedicated export with a size ramp.',
    },
  },
  {
    title: 'Tag',
    slug: 'tag',
    category: 'Status',
    fluentPath: 'core/tag/usage',
    purpose:
      'A value someone picked (a recipient, a category). Dismissible, with a glyph and a word.',
    variants: ['filled', 'outline', 'brand'],
    sizes: ['extra-small', 'small', 'medium'],
    availability: 'implemented',
    kroName: 'Tag',
    conflict: {
      kind: 'conceptual',
      kroName: 'KroChip',
      note: 'KroChip is the endeavor identity/status capsule. Fluent Tag is the generic dismissible token.',
    },
  },
  {
    title: 'Toast',
    slug: 'toast',
    category: 'Status',
    fluentPath: 'core/toast/usage',
    purpose:
      'The status of an action, or something that happened elsewhere. Transient.',
    variants: ['info', 'success', 'warning', 'error'],
    sizes: ['medium'],
    availability: 'existing',
    kroName: 'ActiveToast',
    conflict: {
      kind: 'conceptual',
      kroName: 'ActiveToast',
      note: 'Chrome ActiveToast is the product toast. Fluent Toast is the same job.',
    },
  },

  // —— Utilities ———————————————————————————————————————————————
  {
    title: 'Fluent provider',
    slug: 'fluent-provider',
    category: 'Utilities',
    fluentPath: 'core/fluent-provider/usage',
    purpose:
      'Defines the styles used in the app. Kro already does this with tokens and data-theme.',
    variants: ['light', 'dark'],
    sizes: [],
    availability: 'out-of-scope',
    outOfScopeReason:
      'KroTokens, palettes and data-theme already provide the theme. A FluentProvider would wrap a second token set we do not ship.',
  },
]

export function fluentUrl(entry: FluentCatalogEntry): string {
  return fluent(entry.fluentPath)
}

export function fluentEntriesByCategory(
  category: FluentCategory,
): readonly FluentCatalogEntry[] {
  return FLUENT_CATALOG.filter((entry) => entry.category === category)
}

export const FLUENT_CATEGORIES: readonly FluentCategory[] = [
  'Actions',
  'Content',
  'Forms',
  'Navigation',
  'Surfaces',
  'Status',
  'Utilities',
]

export function fluentEntryNamed(
  title: string,
): FluentCatalogEntry | undefined {
  return FLUENT_CATALOG.find((entry) => entry.title === title)
}

export function fluentConflicts(): readonly FluentCatalogEntry[] {
  return FLUENT_CATALOG.filter((entry) => entry.conflict !== undefined)
}
