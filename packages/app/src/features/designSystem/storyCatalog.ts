/**
 * The design-system Storybook catalog — every `design/**` story module, in
 * the same groups Storybook's sidebar already uses.
 *
 * One Kro gallery. HIG, Fluent 2, Material and Primer names live on the
 * catalog's also-known-as column, not as sidebar groups.
 *
 * The subject of the in-app gallery is THE STORY ITSELF, not a lookalike
 * retyped here. That is the same property the snapshot suites
 * (`design/__tests__/stories.test.tsx` and its chrome/endeavor twins) rely
 * on: a copy of a component would stay green while the thing people look at
 * drifted away from it.
 *
 * No store, no Service, no fetch. The catalog is a static module the Design
 * System destination renders. Adding a `*.stories.tsx` under `design/` and
 * a row here is what makes a new component appear in both Storybook and the
 * in-app gallery.
 */
import type { ReactElement } from 'react'
import type { StoryKind } from '../../design/storybook/storyKind'
import * as overviewStories from '../../design/Overview.stories'
import * as toastStories from '../../design/chrome/toast/ActiveToast.stories'
import * as ringsStories from '../../design/chrome/rings/ActivityRings.stories'
import * as dialStories from '../../design/chrome/dial/DurationDial.stories'
import * as emojiStories from '../../design/chrome/emoji/EmojiPicker.stories'
import * as fabStories from '../../design/chrome/fab/LiquidGlassFAB.stories'
import * as fabMenuStories from '../../design/chrome/fab/LiquidGlassFABMenu.stories'
import * as glowStories from '../../design/chrome/glow/RotatingGlow.stories'
import * as actionSurfaceStories from '../../design/endeavor/EndeavorActionSurface.stories'
import * as cardBadgeStories from '../../design/endeavor/CardBadge.stories'
import * as cardStories from '../../design/endeavor/EndeavorCard.stories'
import * as compactHeaderStories from '../../design/endeavor/CompactPresentationHeader.stories'
import * as emptyDayStories from '../../design/endeavor/EmptyDayStateView.stories'
import * as emptyStateCardStories from '../../design/endeavor/EmptyStateCard.stories'
import * as inlineBannerStories from '../../design/endeavor/InlineBanner.stories'
import * as kroChipStories from '../../design/endeavor/KroChip.stories'
import * as endeavorPopoverStories from '../../design/endeavor/endeavorPopovers.stories'
import * as propertyRowStories from '../../design/endeavor/PropertyRow.stories'
import * as rowStories from '../../design/endeavor/EndeavorRow.stories'
import * as suggestionStories from '../../design/endeavor/SuggestionCard.stories'
import * as surfaceCardStories from '../../design/endeavor/SurfaceCard.stories'
import * as taskRowStories from '../../design/endeavor/TaskRow.stories'
import * as glassStories from '../../design/system/glass/GlassSurface.stories'
import * as gradientStories from '../../design/system/gradient/GradientBackdrop.stories'
import * as detailBackdropStories from '../../design/system/gradient/DetailBackdrop.stories'
import * as onGradientStories from '../../design/system/gradient/OnGradient.stories'
import * as buttonStories from '../../design/system/primitives/button.stories'
import * as dialogStories from '../../design/system/primitives/dialog.stories'
import * as dropdownMenuStories from '../../design/system/primitives/dropdown-menu.stories'
import * as inputStories from '../../design/system/primitives/input.stories'
import * as popoverStories from '../../design/system/primitives/popover.stories'
import * as sheetStories from '../../design/system/primitives/sheet.stories'
import * as tabsStories from '../../design/system/primitives/tabs.stories'
import * as tokenStories from '../../design/system/tokens/Tokens.stories'
import * as compoundButtonStories from '../../design/fluent/actions/CompoundButton.stories'
import * as linkStories from '../../design/fluent/actions/Link.stories'
import * as splitButtonStories from '../../design/fluent/actions/SplitButton.stories'
import * as toggleButtonStories from '../../design/fluent/actions/ToggleButton.stories'
import * as avatarStories from '../../design/fluent/content/Avatar.stories'
import * as avatarGroupStories from '../../design/fluent/content/AvatarGroup.stories'
import * as personaStories from '../../design/fluent/content/Persona.stories'
import * as textStories from '../../design/fluent/content/Text.stories'
import * as fieldStories from '../../design/fluent/forms/Field.stories'
import * as infoLabelStories from '../../design/fluent/forms/InfoLabel.stories'
import * as selectStories from '../../design/fluent/forms/Select.stories'
import * as spinButtonStories from '../../design/fluent/forms/SpinButton.stories'
import * as tagPickerStories from '../../design/fluent/forms/TagPicker.stories'
import * as accordionStories from '../../design/fluent/navigation/Accordion.stories'
import * as badgeStories from '../../design/fluent/status/Badge.stories'
import * as skeletonStories from '../../design/fluent/status/Skeleton.stories'
import * as tagStories from '../../design/fluent/status/Tag.stories'
import * as cardSurfaceStories from '../../design/fluent/surfaces/Card.stories'
import * as carouselStories from '../../design/fluent/surfaces/Carousel.stories'
import * as tooltipStories from '../../design/fluent/surfaces/Tooltip.stories'
import * as popupButtonStories from '../../design/hig/actions/PopupButton.stories'
import * as pullDownButtonStories from '../../design/hig/actions/PullDownButton.stories'
import * as chartStories from '../../design/hig/content/Chart.stories'
import * as imageViewStories from '../../design/hig/content/ImageView.stories'
import * as textViewStories from '../../design/hig/content/TextView.stories'
import * as webViewStories from '../../design/hig/content/WebView.stories'
import * as groupedBoxStories from '../../design/hig/layout/GroupedBox.stories'
import * as collectionStories from '../../design/hig/layout/Collection.stories'
import * as columnViewStories from '../../design/hig/layout/ColumnView.stories'
import * as disclosureStories from '../../design/hig/layout/Disclosure.stories'
import * as labelStories from '../../design/hig/layout/Label.stories'
import * as listStories from '../../design/hig/layout/List.stories'
import * as lockupStories from '../../design/hig/layout/Lockup.stories'
import * as outlineStories from '../../design/hig/layout/OutlineView.stories'
import * as splitViewStories from '../../design/hig/layout/SplitView.stories'
import * as separatorStories from '../../design/hig/layout/Separator.stories'
import * as scrollViewStories from '../../design/hig/layout/ScrollView.stories'
import * as menuListStories from '../../design/hig/navigation/Menu.stories'
import * as navigationBarStories from '../../design/hig/navigation/NavigationBar.stories'
import * as pathControlStories from '../../design/hig/navigation/PathControl.stories'
import * as searchFieldStories from '../../design/hig/navigation/SearchField.stories'
import * as sidebarStories from '../../design/hig/navigation/Sidebar.stories'
import * as tabBarStories from '../../design/hig/navigation/TabBar.stories'
import * as toolbarStories from '../../design/hig/navigation/Toolbar.stories'
import * as alertStories from '../../design/hig/presentation/Alert.stories'
import * as actionSheetStories from '../../design/hig/presentation/ActionSheet.stories'
import * as panelStories from '../../design/hig/presentation/Panel.stories'
import * as checkboxStories from '../../design/hig/selection/Checkbox.stories'
import * as colorWellStories from '../../design/hig/selection/ColorWell.stories'
import * as comboBoxStories from '../../design/hig/selection/ComboBox.stories'
import * as digitEntryStories from '../../design/hig/selection/DigitEntry.stories'
import * as pickerStories from '../../design/hig/selection/Picker.stories'
import * as radioStories from '../../design/hig/selection/RadioGroup.stories'
import * as sliderStories from '../../design/hig/selection/Slider.stories'
import * as stepperStories from '../../design/hig/selection/Stepper.stories'
import * as toggleStories from '../../design/hig/selection/Toggle.stories'
import * as gaugeStories from '../../design/hig/status/Gauge.stories'
import * as progressStories from '../../design/hig/status/ProgressIndicator.stories'
import * as ratingStories from '../../design/hig/status/RatingIndicator.stories'

export interface CatalogStory {
  readonly id: string
  readonly exportName: string
  readonly name: string
  readonly render: () => ReactElement
}

export interface CatalogComponent {
  readonly id: string
  readonly title: string
  readonly kind: StoryKind
  readonly stories: readonly CatalogStory[]
}

export interface CatalogGroup {
  readonly id: string
  readonly title: string
  readonly components: readonly CatalogComponent[]
}

export interface StoryCatalog {
  readonly groups: readonly CatalogGroup[]
  readonly stories: readonly CatalogStory[]
  readonly defaultStoryId: string
}

interface StoryExport {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const storiesOf = (
  componentTitle: string,
  module: StoryModule,
): readonly CatalogStory[] =>
  Object.entries(module)
    .filter(
      (entry): entry is [string, StoryExport] =>
        entry[0] !== 'default' &&
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        typeof (entry[1] as StoryExport).render === 'function',
    )
    .map(([exportName, story]) => ({
      id: `${componentTitle}/${exportName}`,
      exportName,
      name: story.name ?? exportName,
      render: story.render,
    }))

const component = (
  title: string,
  module: StoryModule,
  kind: StoryKind,
): CatalogComponent => ({
  id: title,
  title,
  kind,
  stories: storiesOf(title, module),
})

const group = (
  title: string,
  components: readonly CatalogComponent[],
): CatalogGroup => ({
  id: title,
  title,
  components,
})

/**
 * One row per Storybook title. The snapshot suites list the same modules;
 * a component that ships stories in one place and not the other is a
 * catalog bug, caught by `storyCatalog.test.ts`.
 */
export const STORY_CATALOG_GROUPS: readonly CatalogGroup[] = [
  group('Overview', [component('Overview', overviewStories, 'catalog')]),
  group('Tokens', [component('Tokens', tokenStories, 'token')]),
  group('Materials', [
    component('KroGlass', glassStories, 'material'),
    component('GradientBackdrop', gradientStories, 'material'),
    component('DetailBackdrop', detailBackdropStories, 'material'),
    component('OnGradient', onGradientStories, 'modifier'),
  ]),
  group('Actions', [
    component('Button', buttonStories, 'primitive'),
    component('Compound button', compoundButtonStories, 'component'),
    component('Link', linkStories, 'component'),
    component('Pull-down button', pullDownButtonStories, 'component'),
    component('Pop-up button', popupButtonStories, 'component'),
    component('Split button', splitButtonStories, 'component'),
    component('Toggle button', toggleButtonStories, 'component'),
  ]),
  group('Content', [
    component('Avatar', avatarStories, 'component'),
    component('Avatar group', avatarGroupStories, 'component'),
    component('Chart', chartStories, 'component'),
    component('Image view', imageViewStories, 'component'),
    component('Lockup', lockupStories, 'component'),
    component('Persona', personaStories, 'component'),
    component('Text', textStories, 'component'),
    component('Text view', textViewStories, 'component'),
    component('Web view', webViewStories, 'component'),
  ]),
  group('Forms', [
    component('Checkbox', checkboxStories, 'component'),
    component('Color well', colorWellStories, 'component'),
    component('Combo box', comboBoxStories, 'component'),
    component('Digit entry', digitEntryStories, 'component'),
    component('Field', fieldStories, 'component'),
    component('Info label', infoLabelStories, 'component'),
    component('Input', inputStories, 'primitive'),
    component('Label', labelStories, 'component'),
    component('Picker', pickerStories, 'component'),
    component('Radio group', radioStories, 'component'),
    component('Rating indicator', ratingStories, 'component'),
    component('Search field', searchFieldStories, 'component'),
    component('Select', selectStories, 'component'),
    component('Slider', sliderStories, 'component'),
    component('Spin button', spinButtonStories, 'component'),
    component('Stepper', stepperStories, 'component'),
    component('Tag picker', tagPickerStories, 'component'),
    component('Toggle', toggleStories, 'component'),
  ]),
  group('Layout', [
    component('Collection', collectionStories, 'component'),
    component('Column view', columnViewStories, 'component'),
    component('Disclosure', disclosureStories, 'component'),
    component('Grouped box', groupedBoxStories, 'component'),
    component('List', listStories, 'component'),
    component('Outline view', outlineStories, 'component'),
    component('Scroll view', scrollViewStories, 'component'),
    component('Separator', separatorStories, 'component'),
    component('Split view', splitViewStories, 'component'),
  ]),
  group('Navigation', [
    component('Accordion', accordionStories, 'component'),
    component('Menu list', menuListStories, 'component'),
    component('Navigation bar', navigationBarStories, 'component'),
    component('Popover', popoverStories, 'primitive'),
    component('Path control', pathControlStories, 'component'),
    component('Sidebar', sidebarStories, 'component'),
    component('Tab bar', tabBarStories, 'component'),
    component('Tabs', tabsStories, 'primitive'),
    component('Toolbar', toolbarStories, 'component'),
  ]),
  group('Surfaces', [
    component('Action sheet', actionSheetStories, 'component'),
    component('Alert', alertStories, 'component'),
    component('Card', cardSurfaceStories, 'component'),
    component('Carousel', carouselStories, 'component'),
    component('Dialog', dialogStories, 'primitive'),
    component('Menu', dropdownMenuStories, 'primitive'),
    component('Panel', panelStories, 'component'),
    component('Sheet', sheetStories, 'primitive'),
    component('Tooltip', tooltipStories, 'component'),
  ]),
  group('Status', [
    component('Badge', badgeStories, 'component'),
    component('Gauge', gaugeStories, 'component'),
    component('Inline banner', inlineBannerStories, 'component'),
    component('Progress indicator', progressStories, 'component'),
    component('Skeleton', skeletonStories, 'component'),
    component('Tag', tagStories, 'component'),
  ]),
  group('Chrome', [
    component('LiquidGlassFAB', fabStories, 'chrome'),
    component('LiquidGlassFABMenu', fabMenuStories, 'chrome'),
    component('RotatingGlow', glowStories, 'chrome'),
    component('ActiveToast', toastStories, 'chrome'),
    component('DurationDial', dialStories, 'chrome'),
    component('ActivityRings', ringsStories, 'chrome'),
    component('EmojiPicker', emojiStories, 'chrome'),
  ]),
  group('Endeavor', [
    component('CardBadge', cardBadgeStories, 'domain'),
    component('KroChip', kroChipStories, 'domain'),
    component('SurfaceCard', surfaceCardStories, 'domain'),
    component('PropertyRow', propertyRowStories, 'domain'),
    component('EmptyStateCard', emptyStateCardStories, 'domain'),
    component('EmptyStates', emptyDayStories, 'domain'),
    component('CompactPresentationHeader', compactHeaderStories, 'domain'),
    component('SuggestionCard', suggestionStories, 'domain'),
    component('TaskRow', taskRowStories, 'domain'),
    component('Popovers', endeavorPopoverStories, 'domain'),
    component('EndeavorActionSurface', actionSurfaceStories, 'domain'),
    component('EndeavorRow', rowStories, 'domain'),
    component('EndeavorCard', cardStories, 'domain'),
  ]),
]

const flattenStories = (
  groups: readonly CatalogGroup[],
): readonly CatalogStory[] =>
  groups.flatMap((nextGroup) =>
    nextGroup.components.flatMap((nextComponent) => nextComponent.stories),
  )

const catalogStories = flattenStories(STORY_CATALOG_GROUPS)
const defaultStory = catalogStories[0]

if (defaultStory === undefined) {
  throw new Error('the design-system catalog has no stories')
}

export const STORY_CATALOG: StoryCatalog = {
  groups: STORY_CATALOG_GROUPS,
  stories: catalogStories,
  defaultStoryId: defaultStory.id,
}

export const storyById = (
  catalog: StoryCatalog,
  id: string,
): CatalogStory | undefined => catalog.stories.find((story) => story.id === id)

export const storyOrDefault = (
  catalog: StoryCatalog,
  id: string,
): CatalogStory => storyById(catalog, id) ?? catalog.stories[0] ?? defaultStory

/** The group (and component) a story sits under, used to open that section. */
export interface CatalogPlacement {
  readonly groupId: string
  readonly componentId: string
}

export const placementOfStory = (
  catalog: StoryCatalog,
  storyId: string,
): CatalogPlacement => {
  const story = storyOrDefault(catalog, storyId)
  for (const nextGroup of catalog.groups) {
    for (const nextComponent of nextGroup.components) {
      if (
        nextComponent.stories.some((candidate) => candidate.id === story.id)
      ) {
        return { groupId: nextGroup.id, componentId: nextComponent.id }
      }
    }
  }
  return {
    groupId: catalog.groups[0]?.id ?? '',
    componentId: catalog.groups[0]?.components[0]?.id ?? '',
  }
}

export const componentOfStory = (
  catalog: StoryCatalog,
  storyId: string,
): CatalogComponent | undefined => {
  const placement = placementOfStory(catalog, storyId)
  return catalog.groups
    .find((group) => group.id === placement.groupId)
    ?.components.find((next) => next.id === placement.componentId)
}
