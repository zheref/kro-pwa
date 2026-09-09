/**
 * The Design System destination's public surface — a pure re-export barrel,
 * consumed by `apps/web`'s `/storybook` route wrapper via the
 * `@kro/app/design-system` subpath (`packages/app/package.json`). Kept off the
 * main `@kro/app` barrel so importing Do, Plan or the shell does not pull
 * every `design/**` story module into the client graph.
 */
export {
  DesignSystemFragment,
  type DesignSystemFragmentProps,
  DesignSystemPage,
} from './pages'
export {
  designSystemMocks,
  selectedStoryFrom,
} from './DesignSystemMocks'
export {
  STORY_CATALOG,
  STORY_CATALOG_GROUPS,
  type CatalogComponent,
  type CatalogGroup,
  type CatalogPlacement,
  type CatalogStory,
  type StoryCatalog,
  placementOfStory,
  storyById,
  storyOrDefault,
} from './storyCatalog'
