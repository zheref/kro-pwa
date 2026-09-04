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

export interface CatalogStory {
  readonly id: string
  readonly exportName: string
  readonly name: string
  readonly render: () => ReactElement
}

export interface CatalogComponent {
  readonly id: string
  readonly title: string
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

const component = (title: string, module: StoryModule): CatalogComponent => ({
  id: title,
  title,
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
  group('Tokens', [component('Tokens', tokenStories)]),
  group('Materials', [
    component('KroGlass', glassStories),
    component('GradientBackdrop', gradientStories),
    component('DetailBackdrop', detailBackdropStories),
    component('OnGradient', onGradientStories),
  ]),
  group('Primitives', [
    component('Button', buttonStories),
    component('Input', inputStories),
    component('Dialog', dialogStories),
    component('Sheet', sheetStories),
    component('Popover', popoverStories),
    component('DropdownMenu', dropdownMenuStories),
    component('Tabs', tabsStories),
  ]),
  group('Endeavor', [
    component('CardBadge', cardBadgeStories),
    component('KroChip', kroChipStories),
    component('InlineBanner', inlineBannerStories),
    component('SurfaceCard', surfaceCardStories),
    component('PropertyRow', propertyRowStories),
    component('EmptyStateCard', emptyStateCardStories),
    component('EmptyStates', emptyDayStories),
    component('CompactPresentationHeader', compactHeaderStories),
    component('SuggestionCard', suggestionStories),
    component('TaskRow', taskRowStories),
    component('Popovers', endeavorPopoverStories),
    component('EndeavorActionSurface', actionSurfaceStories),
    component('EndeavorRow', rowStories),
    component('EndeavorCard', cardStories),
  ]),
  group('Chrome', [
    component('LiquidGlassFAB', fabStories),
    component('LiquidGlassFABMenu', fabMenuStories),
    component('RotatingGlow', glowStories),
    component('ActiveToast', toastStories),
    component('DurationDial', dialStories),
    component('ActivityRings', ringsStories),
    component('EmojiPicker', emojiStories),
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
