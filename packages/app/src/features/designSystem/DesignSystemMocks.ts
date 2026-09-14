/**
 * Canned Design System gallery states (`RC-31`; implements `UZF-18`).
 *
 * There is no slice: selected story is view-local on the Page. These are the
 * Fragment props every story and render test reads, never constructed inline.
 */
import { DEFAULT_APP_PALETTE } from '../../design/system/tokens/appPalette'
import type { DesignSystemFragmentProps } from './pages/DesignSystemFragment'
import { STORY_CATALOG, storyOrDefault } from './storyCatalog'

const noop = (_storyId: string) => {}
const noopScheme: DesignSystemFragmentProps['onSelectScheme'] = () => {}
const noopPalette: DesignSystemFragmentProps['onSelectPalette'] = () => {}

const fragment = (
  selectedStoryId: string,
  appearance: Partial<
    Pick<DesignSystemFragmentProps, 'scheme' | 'palette'>
  > = {},
): DesignSystemFragmentProps => ({
  catalog: STORY_CATALOG,
  selectedStoryId,
  onSelectStory: noop,
  scheme: 'light',
  palette: DEFAULT_APP_PALETTE,
  onSelectScheme: noopScheme,
  onSelectPalette: noopPalette,
  ...appearance,
})

export const designSystemMocks = {
  /** Lands on the first gallery — Overview. */
  default: fragment(STORY_CATALOG.defaultStoryId),
  /** A primitive, so the canvas is a control rather than a token grid. */
  buttonVariants: fragment('Button/Gallery'),
  /** An overlay primitive — the trigger is what the gallery shows. */
  dialogDefault: fragment('Dialog/Gallery'),
  /** The endeavor card matrix, the kit's densest story. */
  endeavorCard: fragment('EndeavorCard/Gallery'),
  /** The same gallery pinned to the dark scheme. */
  darkScheme: fragment('EndeavorCard/Gallery', { scheme: 'dark' }),
  /** Bottom chrome — the FAB against the busy backdrop. */
  chromeFab: fragment('LiquidGlassFAB/Gallery'),
  /** A story id the catalog does not have — the Fragment falls back. */
  unknown: fragment('NotAComponent/NotAStory'),
  /** The last chrome story, so the nav has to scroll to stay honest. */
  lastChrome: fragment(
    STORY_CATALOG.stories[STORY_CATALOG.stories.length - 1]?.id ??
      STORY_CATALOG.defaultStoryId,
  ),
}

export const selectedStoryFrom = (mocks: DesignSystemFragmentProps) =>
  storyOrDefault(mocks.catalog, mocks.selectedStoryId)
