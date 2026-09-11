/**
 * The design-system Storybook catalog — every `design/**` story module, in
 * the same groups Storybook's sidebar already uses.
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
import * as higOverviewStories from '../../design/hig/HIGOverview.stories'
import * as higPopupButtonStories from '../../design/hig/actions/PopupButton.stories'
import * as higPullDownButtonStories from '../../design/hig/actions/PullDownButton.stories'
import * as higChartStories from '../../design/hig/content/Chart.stories'
import * as higImageViewStories from '../../design/hig/content/ImageView.stories'
import * as higTextViewStories from '../../design/hig/content/TextView.stories'
import * as higWebViewStories from '../../design/hig/content/WebView.stories'
import * as higButtonsStories from '../../design/hig/existing/Buttons.stories'
import * as higMenusStories from '../../design/hig/existing/Menus.stories'
import * as higContextMenusStories from '../../design/hig/existing/ContextMenus.stories'
import * as higTabViewsStories from '../../design/hig/existing/TabViews.stories'
import * as higSegmentedStories from '../../design/hig/existing/SegmentedControls.stories'
import * as higTextFieldsStories from '../../design/hig/existing/TextFields.stories'
import * as higPopoversStories from '../../design/hig/existing/Popovers.stories'
import * as higSheetsStories from '../../design/hig/existing/Sheets.stories'
import * as higTokenViewsStories from '../../design/hig/existing/TokenViews.stories'
import * as higActivityRingsStories from '../../design/hig/existing/ActivityRings.stories'
import * as higGroupedBoxStories from '../../design/hig/layout/GroupedBox.stories'
import * as higCollectionStories from '../../design/hig/layout/Collection.stories'
import * as higColumnViewStories from '../../design/hig/layout/ColumnView.stories'
import * as higDisclosureStories from '../../design/hig/layout/Disclosure.stories'
import * as higLabelStories from '../../design/hig/layout/Label.stories'
import * as higListStories from '../../design/hig/layout/List.stories'
import * as higLockupStories from '../../design/hig/layout/Lockup.stories'
import * as higOutlineStories from '../../design/hig/layout/OutlineView.stories'
import * as higSplitViewStories from '../../design/hig/layout/SplitView.stories'
import * as higSeparatorStories from '../../design/hig/layout/Separator.stories'
import * as higScrollViewStories from '../../design/hig/layout/ScrollView.stories'
import * as higNavigationBarStories from '../../design/hig/navigation/NavigationBar.stories'
import * as higPathControlStories from '../../design/hig/navigation/PathControl.stories'
import * as higSearchFieldStories from '../../design/hig/navigation/SearchField.stories'
import * as higSidebarStories from '../../design/hig/navigation/Sidebar.stories'
import * as higTabBarStories from '../../design/hig/navigation/TabBar.stories'
import * as higToolbarStories from '../../design/hig/navigation/Toolbar.stories'
import * as higAlertStories from '../../design/hig/presentation/Alert.stories'
import * as higActionSheetStories from '../../design/hig/presentation/ActionSheet.stories'
import * as higPanelStories from '../../design/hig/presentation/Panel.stories'
import * as higCheckboxStories from '../../design/hig/selection/Checkbox.stories'
import * as higColorWellStories from '../../design/hig/selection/ColorWell.stories'
import * as higComboBoxStories from '../../design/hig/selection/ComboBox.stories'
import * as higDigitEntryStories from '../../design/hig/selection/DigitEntry.stories'
import * as higPickerStories from '../../design/hig/selection/Picker.stories'
import * as higRadioStories from '../../design/hig/selection/RadioGroup.stories'
import * as higSliderStories from '../../design/hig/selection/Slider.stories'
import * as higStepperStories from '../../design/hig/selection/Stepper.stories'
import * as higToggleStories from '../../design/hig/selection/Toggle.stories'
import * as higGaugeStories from '../../design/hig/status/Gauge.stories'
import * as higProgressStories from '../../design/hig/status/ProgressIndicator.stories'
import * as higRatingStories from '../../design/hig/status/RatingIndicator.stories'

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
 * One row per Storybook title. The three snapshot suites list the same
 * modules; a component that ships stories in one place and not the other is
 * a catalog bug, caught by `storyCatalog.test.ts`.
 */
export const STORY_CATALOG_GROUPS: readonly CatalogGroup[] = [
  group('Tokens', [component('Tokens', tokenStories, 'token')]),
  group('Materials', [
    component('KroGlass', glassStories, 'material'),
    component('GradientBackdrop', gradientStories, 'material'),
    component('DetailBackdrop', detailBackdropStories, 'material'),
    component('OnGradient', onGradientStories, 'modifier'),
  ]),
  group('Primitives', [
    component('Button', buttonStories, 'primitive'),
    component('Input', inputStories, 'primitive'),
    component('Dialog', dialogStories, 'primitive'),
    component('Sheet', sheetStories, 'primitive'),
    component('Popover', popoverStories, 'primitive'),
    component('DropdownMenu', dropdownMenuStories, 'primitive'),
    component('Tabs', tabsStories, 'primitive'),
  ]),
  group('Endeavor', [
    component('CardBadge', cardBadgeStories, 'domain'),
    component('KroChip', kroChipStories, 'domain'),
    component('InlineBanner', inlineBannerStories, 'domain'),
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
  group('Chrome', [
    component('LiquidGlassFAB', fabStories, 'chrome'),
    component('LiquidGlassFABMenu', fabMenuStories, 'chrome'),
    component('RotatingGlow', glowStories, 'chrome'),
    component('ActiveToast', toastStories, 'chrome'),
    component('DurationDial', dialStories, 'chrome'),
    component('ActivityRings', ringsStories, 'chrome'),
    component('EmojiPicker', emojiStories, 'chrome'),
  ]),
  group('HIG', [component('HIG Overview', higOverviewStories, 'catalog')]),
  group('HIG · Actions', [
    component('HIG Buttons', higButtonsStories, 'pattern'),
    component('HIG Menus', higMenusStories, 'pattern'),
    component('HIG Context menus', higContextMenusStories, 'pattern'),
    component('HIG Pop-up buttons', higPopupButtonStories, 'component'),
    component('HIG Pull-down buttons', higPullDownButtonStories, 'component'),
  ]),
  group('HIG · Content', [
    component('HIG Charts', higChartStories, 'component'),
    component('HIG Image views', higImageViewStories, 'component'),
    component('HIG Text views', higTextViewStories, 'component'),
    component('HIG Web views', higWebViewStories, 'component'),
  ]),
  group('HIG · Layout', [
    component('HIG Boxes', higGroupedBoxStories, 'component'),
    component('HIG Collections', higCollectionStories, 'component'),
    component('HIG Column views', higColumnViewStories, 'component'),
    component('HIG Disclosure controls', higDisclosureStories, 'component'),
    component('HIG Labels', higLabelStories, 'component'),
    component('HIG Lists and tables', higListStories, 'component'),
    component('HIG Lockups', higLockupStories, 'component'),
    component('HIG Outline views', higOutlineStories, 'component'),
    component('HIG Split views', higSplitViewStories, 'component'),
    component('HIG Separators', higSeparatorStories, 'component'),
    component('HIG Tab views', higTabViewsStories, 'pattern'),
  ]),
  group('HIG · Navigation', [
    component('HIG Navigation bars', higNavigationBarStories, 'component'),
    component('HIG Path controls', higPathControlStories, 'component'),
    component('HIG Search fields', higSearchFieldStories, 'component'),
    component('HIG Sidebars', higSidebarStories, 'component'),
    component('HIG Tab bars', higTabBarStories, 'component'),
    component('HIG Token views', higTokenViewsStories, 'pattern'),
    component('HIG Toolbars', higToolbarStories, 'component'),
  ]),
  group('HIG · Presentation', [
    component('HIG Action sheets', higActionSheetStories, 'component'),
    component('HIG Alerts', higAlertStories, 'component'),
    component('HIG Panels', higPanelStories, 'component'),
    component('HIG Popovers', higPopoversStories, 'pattern'),
    component('HIG Scroll views', higScrollViewStories, 'component'),
    component('HIG Sheets', higSheetsStories, 'pattern'),
  ]),
  group('HIG · Selection', [
    component('HIG Checkboxes', higCheckboxStories, 'component'),
    component('HIG Color wells', higColorWellStories, 'component'),
    component('HIG Combo boxes', higComboBoxStories, 'component'),
    component('HIG Digit entry', higDigitEntryStories, 'component'),
    component('HIG Pickers', higPickerStories, 'component'),
    component('HIG Radio buttons', higRadioStories, 'component'),
    component('HIG Segmented controls', higSegmentedStories, 'pattern'),
    component('HIG Sliders', higSliderStories, 'component'),
    component('HIG Steppers', higStepperStories, 'component'),
    component('HIG Text fields', higTextFieldsStories, 'pattern'),
    component('HIG Toggles', higToggleStories, 'component'),
  ]),
  group('HIG · Status', [
    component('HIG Activity rings', higActivityRingsStories, 'pattern'),
    component('HIG Gauges', higGaugeStories, 'component'),
    component('HIG Progress indicators', higProgressStories, 'component'),
    component('HIG Rating indicators', higRatingStories, 'component'),
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
