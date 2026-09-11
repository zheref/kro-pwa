import { ImageView } from '../../hig/content/ImageView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Content/Image',
  component: ImageView,
}

const Default = {
  name: 'Missing capture · fallback, not a broken glyph',
  render: () => (
    <FluentStage>
      <FluentRow label="No src">
        <ImageView
          src=""
          alt="Cover for Write the port"
          aspect="4/3"
          caption="Write the port"
          fallback={
            <span className="text-2xl" aria-hidden="true">
              📌
            </span>
          }
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Aspects = {
  name: 'Fit · 1/1, 4/3, 16/9',
  render: () => (
    <FluentStage>
      <FluentRow label="Aspects">
        <ImageView
          src=""
          alt="Square cover"
          aspect="1/1"
          fallback={<span aria-hidden="true">1:1</span>}
        />
        <ImageView
          src=""
          alt="Wide cover"
          aspect="16/9"
          fallback={<span aria-hidden="true">16:9</span>}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Fallback">
        <ImageView
          src=""
          alt="Cover"
          aspect="4/3"
          fallback={<span aria-hidden="true">📌</span>}
        />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <ImageView
          density={density}
          src=""
          alt="Cover"
          aspect="4/3"
          caption="Write the port"
          fallback={<span aria-hidden="true">📌</span>}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Aspects.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
