import { TagPicker } from './TagPicker'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

const LENSES = ['Work', 'Home', 'Health', 'Deep work', 'Waiting'] as const

export default {
  title: 'Fluent 2/Forms/Tag picker',
  component: TagPicker,
}

const Empty = {
  name: 'Type to filter · pick several',
  render: () => (
    <FluentStage>
      <FluentRow label="Open the field to see lenses">
        <TagPicker label="Lenses" options={LENSES} placeholder="Add a lens" />
      </FluentRow>
    </FluentStage>
  ),
}

const AlreadyPicked = {
  name: 'Selected tags · dismiss by name',
  render: () => (
    <FluentStage>
      <FluentRow label="Work and Home already on">
        <TagPicker
          label="Lenses"
          options={LENSES}
          defaultValue={['Work', 'Home']}
          placeholder="Add a lens"
        />
      </FluentRow>
      <FluentRow label="Disabled · fade once on the field">
        <TagPicker
          label="Lenses"
          options={LENSES}
          defaultValue={['Work']}
          disabled
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · glass still reads over the field',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="On the indigoGrape field">
        <TagPicker
          label="Lenses"
          options={LENSES}
          defaultValue={['Work']}
          placeholder="Add a lens"
        />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <TagPicker
          size={fluentSizeForDensity(density)}
          label="Lenses"
          options={LENSES}
          defaultValue={['Work']}
          placeholder="Add a lens"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Empty.render()}
      {AlreadyPicked.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
