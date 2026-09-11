import { List, ListRow, ListSection } from '../../hig/layout/List'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/List',
  component: List,
}

const Default = {
  name: 'Like items stacked vertically',
  render: () => (
    <FluentStage>
      <FluentRow label="Today">
        <List>
          <ListSection header="Morning">
            <ListRow title="Inbox triage" subtitle="15 min" />
            <ListRow title="Deep work" selected />
          </ListSection>
        </List>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled row · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <List>
          <ListRow title="Imported event" disabled />
        </List>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · selected is a check, not a tint',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Selected">
        <List>
          <ListRow title="Deep work" selected />
        </List>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <List density={density}>
          <ListRow density={density} title="Deep work" />
        </List>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
