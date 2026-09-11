import { Separator } from '../../hig/layout/Separator'
import { List, ListRow } from '../../hig/layout/List'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/Divider',
  component: Separator,
}

const Default = {
  name: 'Horizontal hairline, optional label',
  render: () => (
    <FluentStage>
      <FluentRow label="Unlabelled">
        <div style={{ width: 280 }}>
          <Separator />
        </div>
      </FluentRow>
      <FluentRow label="Labelled">
        <Separator label="Today" />
      </FluentRow>
    </FluentStage>
  ),
}

const InAList = {
  name: 'Between rows · inset, not a cut line',
  render: () => (
    <FluentStage>
      <FluentRow label="List">
        <List>
          <ListRow title="Inbox triage" />
          <ListRow title="Deep work" />
        </List>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Today">
        <Separator label="Today" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => <Separator density={density} label="Today" />}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {InAList.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
