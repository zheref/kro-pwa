import { ProgressIndicator } from '../../hig/status/ProgressIndicator'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Status/Progress bar',
  component: ProgressIndicator,
}

const Default = {
  name: 'Determinate · 0–1, the label is the non-colour signal',
  render: () => (
    <FluentStage>
      <FluentRow label="Syncing">
        <ProgressIndicator kind="bar" value={0.72} label="Syncing calendar" />
      </FluentRow>
    </FluentStage>
  ),
}

const Indeterminate = {
  name: 'Indeterminate · the spinner is already in hig.css',
  render: () => (
    <FluentStage>
      <FluentRow label="Loading">
        <ProgressIndicator kind="indeterminate" label="Loading" />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Bar">
        <ProgressIndicator kind="bar" value={0.4} label="Uploading capture" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <ProgressIndicator
          density={density}
          kind="bar"
          value={0.5}
          label="Syncing"
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
      {Indeterminate.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
