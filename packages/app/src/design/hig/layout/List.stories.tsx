import { List, ListRow, ListSection } from './List'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Layout/List',
  component: List,
}

const Grouped = {
  name: 'Grouped · header, rows, footer',
  render: () => (
    <HigStage>
      <List>
        <ListSection header="Do" footer="Today's sessions">
          <ListRow title="Inbox triage" subtitle="Plan · Task" />
          <ListRow title="Deep work" subtitle="25 min session" selected />
          <ListRow title="Morning run" subtitle="Habit" trailing="Earn" />
        </ListSection>
      </List>
    </HigStage>
  ),
}

const SelectedAndDisabled = {
  name: 'Selected and disabled · check plus words, fade once',
  render: () => (
    <HigStage>
      <HigRow label="States">
        <List className="w-full">
          <ListRow title="Weekly review" selected />
          <ListRow title="Archive endeavor" disabled />
        </List>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · hairlines still separate rows',
  render: () => (
    <HigBothSchemes>
      <List>
        <ListSection header="Plan">
          <ListRow title="Inbox triage" />
          <ListRow title="Blueprint: launch kit" selected />
        </ListSection>
      </List>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <List density={density} className="w-full">
          <ListRow
            density={density}
            title="Inbox triage"
            subtitle="Plan · Task"
          />
          <ListRow density={density} title="Deep work" selected />
        </List>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Grouped.render()}
      {SelectedAndDisabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
